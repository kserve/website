---
title: Kernel Cache Identity and Selection
description: Understand how KServe matches a workload to a prepared kernel cache
---

# Identity and cache selection

The admission webhook must avoid mounting a cache produced for a different runtime configuration. It builds a normalized identity for the workload Pod, then considers only prepared cache entries that are in the same namespace and have compatible artifact paths.

## Identity factors

The identity includes these base factors:

| Factor | Source |
| --- | --- |
| `namespace` | The Pod namespace. |
| `workloadKind` | The owning serving workload kind. |
| `workloadName` | The owning workload name. |
| `runtimeImage` | The runtime container image reference. |
| `modelURIHash` | A SHA-256 hash of the normalized model URI. |
| `commandHash` | A hash of the runtime container command, when present. |
| `argsHash` | A hash of the runtime container arguments, when present. |

The identity also includes supported runtime options and environment variables. Current vLLM factors include tensor and pipeline parallel sizes, model length, dtype, quantization, KV cache dtype, block size, batching limits, chunked prefill, sliding window, eager execution, attention backend, compilation configuration, and selected `VLLM_*` environment variables.

`VLLM_CACHE_ROOT` is used to resolve the runtime cache path when an explicit path is not present; it is not itself an identity factor. Triton environment variables are not currently read for cache path resolution or runtime integration.

The implementation normalizes values before hashing. For example, boolean values are normalized, comma-separated values are sorted, and configuration values are represented by hashes where appropriate.

## Command and argument precedence

For a direct executable, Kubernetes constructs the runtime command line by appending `args` after `command`.

```yaml
command:
- vllm
- serve
- --max-model-len=4096
args:
- --max-model-len=8192
```

The resulting command line is:

```text
vllm serve --max-model-len=4096 --max-model-len=8192
```

For vLLM options that appear in both fields, specify the intended override in `args`. The value in `args` appears later in the final command line and takes precedence.

Use this rule only with a direct executable command. Kernel Cache does not interpret shell wrappers such as `sh -c`; argument handling in those cases is defined by the shell command or script.

## Footprints

The identity contains two derived footprints:

- `compatibilityFootprint` represents runtime image, model URI hash, and runtime configuration factors.
- `workloadFootprint` additionally includes namespace, workload kind, workload name, command hash, and arguments hash.

The footprints are opaque SHA-256 values. Use the `factors` map for diagnosis; do not construct footprint values manually.

## Runtime image references

Runtime image reference stability affects which footprints are generated:

| Runtime image | Selection behavior |
| --- | --- |
| Digest reference, for example `runtime@sha256:<digest>` | Generates workload and compatibility footprints. Supports exact workload and compatibility matching. |
| Non-`latest` tag | Generates a compatibility footprint. It can be reused only through compatibility matching. |
| `latest` tag or an untagged image | Treated as floating. It does not produce a reusable footprint. |

Pin the runtime image by digest when a capture must be reused deterministically. A digest is not enough by itself: model source, runtime options, command, arguments, and cache paths must still be compatible.

## Admission selection order

For each candidate cache, the webhook checks node-local readiness and cache identity. The selection order is:

1. A workload footprint match.
2. A compatibility footprint match.
3. No cache.

Only a `KernelCacheNode` entry in the ready state is a candidate. The selected `KernelCache` must be in the Pod namespace, reference the same artifact identity recorded on the node, use OCI delivery, and contain paths that resolve to the target Pod's runtime containers and filesystem paths.

```text
Build Pod identity
      |
      v
List ready node-local cache entries
      |
      v
Check namespace, artifact, paths, and footprints
      |
      +-- workload footprint match -> select
      |
      +-- compatibility footprint match -> select
      |
      +-- otherwise -> do not mount a cache
```

## Common scenarios

### Same workload restarted

A restart can reuse the cache when the new Pod has the same workload identity, model source, runtime image digest, runtime configuration, command, arguments, and compatible paths.

### Same runtime and model, different arguments

Changing the runtime command or arguments changes the workload footprint. If the compatibility factors are unchanged, the cache may still be eligible through compatibility matching, subject to the other checks.

### Different namespace

Namespace is part of the workload footprint, and the cache must be in the Pod namespace. A cache in another namespace is not selected.

### Floating image tag

An untagged image or the `latest` tag is treated as floating and does not generate a reusable footprint. Pin the image to a digest for predictable reuse.

## Inspecting a selection failure

```bash
kubectl get kernelcache <cache-name> -n <namespace> -o jsonpath='{.spec.artifact.identity}{"\n"}'
kubectl get kernelcachenode <node-name> -o jsonpath='{.status.cacheStatus}{"\n"}'
kubectl get pod <pod-name> -n <namespace> -o yaml
kubectl describe pod <pod-name> -n <namespace>
```

Compare the runtime image, model source annotation, runtime command and arguments, identity factors, cache paths, and node-local preparation state. The webhook does not select a cache merely because the image name looks similar.
