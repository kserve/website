---
title: Kernel Cache Troubleshooting
description: Diagnose Kernel Cache capture, preparation, selection, and security failures
---

# Troubleshooting

Start with the resources involved in the failing stage:

```bash
kubectl get kernelcachecaptures -A
kubectl get kernelcaches -A
kubectl get kernelcachenodegroups
kubectl get kernelcachenodes -o wide
kubectl get events -A --sort-by=.lastTimestamp
```

Then inspect the relevant object in YAML. Conditions and status reasons are more useful than the short table output.

## Capture is not progressing

Check the capture and its producer Pod:

```bash
kubectl describe kernelcachecapture <capture-name> -n <namespace>
kubectl get pod -n <namespace> -l serving.kserve.io/inferenceservice=<service-name>
kubectl logs -n kserve deployment/kserve-controller-manager -c manager
```

Typical capture states are:

- `Pending`: no active session has been selected yet.
- `WaitingForWorkload`: the producer workload is not ready.
- `Capturing`: the runtime is still generating cache data.
- `Pushing`: the OCI upload is in progress or waiting for registry access.
- `Unchanged`: no new cache directories were created.
- `Failed`: inspect the condition reason and `runtimeResult`.

If a producer Pod restarted, compare `status.activeSession.id` and `status.activeSession.podName` with the Pod that reported the result. Reports from an old session are rejected by design.

If the MCV sidecar is missing or the capture never starts, check that the runtime container has an HTTP readiness probe with a valid port. Also check that the workload exposes a supported model source and that the registry endpoint is configured when no explicit capture `targetImage` is present. The `serving.kserve.io/kernelcache-sidecar-injection` annotation can override the default, but only the literal values `true` and `false` are accepted.

## No `KernelCache` is created

A completed capture must have a valid artifact, pass signing policy, and resolve a node group. Check:

```bash
kubectl get kernelcachecapture <capture-name> -n <namespace> -o yaml
kubectl get kernelcachenodegroups
kubectl get nodes --show-labels
kubectl get events -n <namespace> --field-selector involvedObject.name=<capture-name>
```

Common node group reasons include:

- `ProducerNodePending`: the producer node is not known yet.
- `AmbiguousNodeGroup`: more than one node group matches the producer node.
- `NoMatchingNodeGroup`: no node group matches and no `defaultNodeGroup` is configured.
- `InvalidDefaultNodeGroup`: the configured default group does not exist or is invalid.

Use non-overlapping selectors or explicitly request the intended node group when selectors overlap.

## `KernelCache` is not ready

Inspect aggregate status and node-local status:

```bash
kubectl describe kernelcache <cache-name> -n <namespace>
kubectl get kernelcache <cache-name> -n <namespace> -o jsonpath='{.status.state}{"\n"}'
kubectl get kernelcachenodes -o yaml
```

The aggregate states are:

- `Pending`: no matching nodes or no ready nodes are available.
- `Preparing`: at least one node is preparing the artifact.
- `Ready`: the required node preparation is ready.
- `Error`: preparation or artifact verification failed.

Check node labels, node group tolerations, the preparation Job, the prefetch image, and registry pull permissions.

The preparation namespace must already exist. If it does not, the cache reports a storage-related error; inspect the configured `jobNamespace` and create the namespace before retrying.

## Registry failures

For capture push failures, check the registry endpoint and the push authentication configuration. For node preparation failures, check pull authentication and the node's network path to the registry.

```bash
kubectl get configmap inferenceservice-config -n kserve -o jsonpath='{.data.kernelcache}'
kubectl get jobs -n kserve-kernelcache-jobs
kubectl describe job <preparation-job> -n kserve-kernelcache-jobs
```

If `serviceAccountToken` authentication is enabled, verify the configured push and pull role references, controller `bind` permission, and that the issued token lifetime is sufficient for the operation. See [Registry authentication](./registry-authentication.md).

## Cache is not selected for a new Pod

The webhook requires all of the following:

- Kernel Cache is enabled and the Pod is eligible for injection.
- A ready node-local cache entry exists on the target node.
- The cache is in the Pod namespace.
- The artifact identity and footprints are compatible.
- The OCI cache paths resolve to containers and paths in the new Pod.

Inspect the workload and cache identities:

```bash
kubectl get pod <pod-name> -n <namespace> -o yaml
kubectl get kernelcache <cache-name> -n <namespace> -o yaml
kubectl get kernelcachenode <node-name> -o yaml
```

Common causes are a floating `latest` image, a changed runtime image digest, changed model source, changed runtime arguments or options, a different namespace, or a cache that is not ready on the node.

## Signing or verification failure

Inspect both sides of the security flow:

```bash
kubectl get kernelcachecapture <capture-name> -n <namespace> -o jsonpath='{.status.signing}{"\n"}'
kubectl get kernelcache <cache-name> -n <namespace> -o jsonpath='{.status.verification}{"\n"}'
```

For signing failures, check the signing profile and signer availability. For verification failures, check the trust bundle, certificate subject constraint, artifact digest, and verifier permissions. A signed artifact for a different digest is not accepted.

## `KernelCacheNode` is missing

Check that the node has every label in the node group selector and that the node group is cluster-scoped:

```bash
kubectl get kernelcachenodegroup <group-name> -o yaml
kubectl get nodes -l accelerator=nvidia --show-labels
kubectl get kernelcachenodes
kubectl logs -n kserve deployment/kserve-controller-manager -c manager
```

A node group does not create a node object for nodes that do not match its selector. Tolerations affect the node agent and controller-managed workloads; they do not change selector membership.

If matching `KernelCacheNode` objects do not report state, inspect the Kernel Cache node agent DaemonSet and its scheduling events in addition to the controller logs.

## Unsupported configuration

The current API supports OCI delivery only. Use a digest-pinned OCI image reference for `KernelCache.spec.artifact`; `spec.mountType` can be omitted because it defaults to `oci`.

The current `KernelCacheCapture` CRD accepts `InferenceService` as `sourceRef.kind`. Do not use `LLMInferenceService` there unless the installed CRD has been extended and its documentation explicitly supports it.

## Information to collect

When opening an issue, include:

- KServe version and installation mode.
- The `inferenceservice-config` `kernelcache` JSON with credentials and private endpoints redacted.
- The relevant `KernelCacheCapture`, `KernelCache`, `KernelCacheNodeGroup`, and `KernelCacheNode` YAML.
- Producer and consumer Pod YAML.
- Recent controller, webhook, capture, and preparation Job logs.
- The event list from the affected namespaces.
