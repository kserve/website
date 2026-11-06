---
title: Kernel Cache Capture Lifecycle
description: Capture runtime-generated kernel data and publish an OCI artifact
---

# Capture lifecycle

`KernelCacheCapture` coordinates one capture target and reports the result in status. The capture sidecar observes the runtime workload, while the controller validates the reported result, applies artifact security policy, and creates or links a `KernelCache`.

## Capture sources and support boundary

The current supported capture flow creates `KernelCacheCapture` resources through the automatic integration for an `InferenceService`. The CRD accepts `InferenceService` as the `sourceRef.kind`.

The following manifest shows the shape of an automatically generated capture. Creating a `KernelCacheCapture` manually is not currently supported as an override mechanism: a user-created capture does not replace or override the automatic capture configuration for the workload.

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheCapture
metadata:
  name: qwen-capture
  namespace: default
spec:
  sourceRef:
    kind: InferenceService
    name: qwen-vllm
  targetImage: registry.example.com/kserve/qwen-kernel-cache
  cachePaths:
    - containerName: kserve-container
      containerPath: /root/.cache/vllm
      ociPath: io.vllm.cache
```

`targetImage` is optional. When it is omitted, the capture integration generates a destination. `cachePaths` is also optional and controls the paths passed to the capture sidecar. A path can identify the runtime container explicitly; otherwise KServe resolves the standard runtime container. When KServe resolves a path without an explicit `containerPath`, it recognizes only `VLLM_CACHE_ROOT`. Triton environment variables are not currently supported for cache path discovery. These fields on a generated capture are not a supported manual override mechanism.

The MCV image format accepts both `io.vllm.cache` and `io.triton.cache` OCI paths, but the accepted Triton path does not provide Triton runtime integration. The current automatic capture flow supports vLLM path discovery only.

Whether a workload is eligible for automatic capture depends on the installed KServe configuration and the workload Pod labels and annotations.

Automatic captures are tied to the source workload revision. In the current implementation, generated captures are created for `InferenceService` revisions. Their names include the workload name and revision identifier, for example `qwen-kcc-669889f77f`, so a new workload revision gets a separate capture session.

## Phase transitions

The capture phase is one of the following values:

| Phase | Meaning |
| --- | --- |
| `Pending` | A capture session has not been selected or is waiting for reconciliation. |
| `WaitingForWorkload` | The selected workload is not ready for capture. |
| `Capturing` | The runtime is generating or collecting cache data. |
| `Pushing` | The captured data is being published to the OCI registry. |
| `Complete` | The artifact passed result validation and is available in status. |
| `Unchanged` | The runtime reported that no new cache directories were created. |
| `Failed` | The capture or result validation failed. |

The exact transition timing depends on workload readiness and runtime behavior. Inspect `status.conditions` and `status.runtimeResult` instead of treating a phase as a progress percentage.

## Active session fencing

`status.activeSession` identifies the Pod and session ID allowed to report results. A session contains:

- `id`: the unique capture session ID.
- `podName`: the producer Pod name.
- `nodeName`: the producer node when known.
- `requestedNodeGroup`: the requested node group when one was provided.

The reporter must match the active session. Reports from a different Pod or session are rejected, including reports from an old Pod after a restart. When a producer restarts, the controller establishes a new active session and accepts reports from that session only.

## Runtime result and status

`status.runtimeResult` is the raw key-value result reported by the capture sidecar. The controller normalizes it into:

- `status.phase` and `status.conditions`;
- `status.artifact`, including the immutable image reference, cache paths, and identity;
- `status.capturedAt` and `status.capturedCacheSizeBytes` when reported;
- `status.signing` when artifact signing is configured;
- `status.kernelCacheRef` after a `KernelCache` is created or linked.

The controller does not treat an arbitrary runtime result as a completed artifact. Completion requires a valid digest reference and the required artifact fields.

For a successful result, the reporter must provide the capture session ID and source Pod name, a digest-pinned `imageReference`, and `runtimeInfo` containing the SHA-256 `modelURIHash`. The capture spec must contain at least one `cachePath`, or the runtime result must provide a non-empty `cachePaths` list. Optional command and argument hashes must also be SHA-256 values. Invalid or incomplete results remain failed rather than becoming a usable `KernelCache`.

## Generated `KernelCache`

After a capture reaches `Complete`, the controller creates a namespaced `KernelCache` for the artifact when the artifact passes signing policy and a node group can be selected. The generated cache uses the completed capture artifact as its immutable `spec.artifact` and records the node group in `spec.nodeGroupRef`.

Inspect the relationship with:

```bash
kubectl get kernelcachecapture qwen-capture -n default -o yaml
kubectl get kernelcache -n default -o yaml
```

The capture and cache are not interchangeable. The capture records how the artifact was produced; the cache represents the artifact that can be prepared and selected for future Pods.

## Retry and recapture

`Unchanged` means the runtime completed without producing new cache directories. It does not create a new artifact. A `Failed` capture may require a new workload revision or a new capture after the underlying issue is fixed.

If the producer Pod disappears before a generated capture completes, the controller handles it according to `abandonedCapturePolicy`. This abandoned-capture cleanup path applies only to automatically generated captures. Manually created captures are not a supported way to override the automatic capture flow and are not handled as user-defined overrides.

## Debugging captures

```bash
kubectl describe kernelcachecapture <capture-name> -n <namespace>
kubectl get kernelcachecapture <capture-name> -n <namespace> -o jsonpath='{.status.phase}{"\n"}'
kubectl get kernelcachecapture <capture-name> -n <namespace> -o jsonpath='{.status.activeSession}{"\n"}'
kubectl logs -n kserve deployment/kserve-controller-manager -c manager
```

If a capture remains pending, check the producer Pod, node group selection, registry access, and the conditions on the capture. If a result is ignored after a restart, compare its session ID and Pod name with `status.activeSession`.
