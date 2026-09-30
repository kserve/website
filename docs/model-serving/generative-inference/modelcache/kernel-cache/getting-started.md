---
title: Kernel Cache Getting Started
description: Configure and use Kernel Cache with a serving workload
---

# Getting started

This guide shows the basic OCI workflow:

1. Enable Kernel Cache in the `inferenceservice-config` ConfigMap.
2. Create a node group.
3. Run a supported serving workload with a runtime image and model source.
4. Wait for the first capture and node preparation to complete.
5. Restart or scale the workload and verify cache selection.

## Create a test namespace

Create a namespace for the workload and set it as the namespace for the current Kubernetes context. All namespaced examples in this guide use `kernel-cache-test`.

```bash
kubectl create namespace kernel-cache-test
kubectl config set-context --current --namespace=kernel-cache-test
```

If the namespace already exists, skip the first command.

## Prerequisites

- A Kubernetes cluster with [KServe and LocalModel installed](../../../../getting-started/quickstart-guide.md).
  - Select `KServe + LocalModel` and `Standard mode` in the quickstart.
  - Kernel Cache supports `Standard mode` only. `Knative mode` is not supported.
- Administrator access to the KServe namespace and cluster-scoped Kernel Cache resources.
- At least one node with the labels required by the node group.
- An OCI registry reachable by capture and preparation workloads.
- A runtime configuration that creates the kernel data to be captured.

The example uses a registry without credential provisioning. Configure registry authentication before using a private registry. See [Artifact security](./artifact-security.md) for artifact signing and verification; registry authentication and artifact signing solve different problems.

## Enable Kernel Cache

Kernel Cache configuration is stored as JSON under the `kernelcache` key in the `inferenceservice-config` ConfigMap.

```bash
kubectl edit configmap inferenceservice-config -n kserve
```

Add or update the following section:

```yaml title="inferenceservice-config.yaml"
data:
  kernelcache: |-
    {
      "enabled": true,
      "defaultSidecarInjection": true,
      "defaultMountType": "oci",
      "defaultNodeGroup": "gpu-workers",
      "jobNamespace": "kserve-kernelcache-jobs",
      "mcvImage": "kserve/kserve-mcv:latest-minimal",
      "prefetchImage": "registry.access.redhat.com/ubi9/ubi-minimal:latest",
      "registry": {
        "endpoint": "registry.example.com",
        "auth": {
          "type": "none"
        }
      },
      "artifactSecurity": {
        "mode": "cert",
        "failurePolicy": "reject",
        "cert": {
          "signingProfileRef": "kernelcache-signer",
          "trustBundle": "kserve/kernelcache-root-ca",
          "subjectRegexp": "spiffe://kserve/kernelcache-signer"
        }
      },
      "abandonedCapturePolicy": "retain",
      "jobTTLSecondsAfterFinished": 600,
      "mcvCaptureReadinessTimeoutSeconds": 600,
      "reconcileIntervalSeconds": 300
    }
```

Replace `registry.example.com` with the registry host used for Kernel Cache artifacts. `registry.endpoint` has no default and is required for automatically generated capture targets. Specify only the host and optional port, such as `registry.example.com:5000`; do not include `http://`, `https://`, or a repository path.

For a plain HTTP registry, also set `registry.insecure` to `true`. See [Use an insecure registry](./registry-authentication.md#use-an-insecure-registry).

The default artifact security configuration uses `cert` mode with the `kernelcache-signer` signing profile and the `kserve/kernelcache-root-ca` trust bundle. The signer certificate subject must match `spiffe://kserve/kernelcache-signer`. See [Artifact security](./artifact-security.md) for signing and verification details.

The default mount type is `oci`, and it is the only supported mount type. The example sets `defaultNodeGroup` to `gpu-workers`, matching the node group created below. This is a ConfigMap setting, not a built-in default, and it must match an existing cluster-scoped `KernelCacheNodeGroup`.

`defaultSidecarInjection` controls whether the MCV capture sidecar is added when a workload does not provide an override. It does not disable cache selection and artifact injection for a compatible prepared cache.

After changing the ConfigMap, verify that the KServe controller and webhook deployments observe the new configuration according to your installation's rollout procedure.

## Create a node group

`KernelCacheNodeGroup` is cluster-scoped. Its `nodeSelector` must contain at least one label. Every listed label must match for a node to belong to the group.

```yaml title="kernel-cache-node-group.yaml"
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheNodeGroup
metadata:
  name: gpu-workers
spec:
  nodeSelector:
    accelerator: nvidia
```

```bash
kubectl apply -f kernel-cache-node-group.yaml
kubectl get kernelcachenodegroups
kubectl get kernelcachenodes -o wide
```

The controller creates or updates one `KernelCacheNode` for each matching node. The node group selects nodes and configures tolerations for Kernel Cache components; OCI artifacts provide the cache contents.

## Run a serving workload

The following `InferenceService` example shows the currently supported workload shape. Use a model and runtime image appropriate for your cluster and GPU configuration.

```yaml title="inference-service.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: qwen-vllm
  namespace: kernel-cache-test
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      storageUri: hf://Qwen/Qwen3-0.6B
      runtime: kserve-vllmserver
      resources:
        limits:
          nvidia.com/gpu: "1"
```

An automatic MCV capture requires an HTTP readiness probe so the capture sidecar can wait for the runtime to become ready. The `kserve-vllmserver` `ClusterServingRuntime` already defines the `/v1/models` probe on port `8080`, so the `InferenceService` manifest does not need to repeat it. KServe uses this probe before capture; the `mcvCaptureReadinessTimeoutSeconds` setting controls the wait timeout.

```bash
kubectl apply -f inference-service.yaml
kubectl get pods -n kernel-cache-test -w
```

The capture integration needs the workload Pod to be scheduled and the model source to be available. The runtime image should be pinned to a digest when deterministic cache identity is required.

## Observe capture and preparation

List captures and generated caches in the workload namespace:

```bash
kubectl get kernelcachecaptures -n kernel-cache-test
kubectl get kernelcaches -n kernel-cache-test
kubectl get kernelcachenodes
```

Capture phases are `Pending`, `WaitingForWorkload`, `Capturing`, `Pushing`, `Complete`, `Unchanged`, and `Failed`. A completed capture reports the immutable artifact and may reference a generated `KernelCache`.

Inspect the detailed state:

```bash
kubectl get kernelcachecapture <capture-name> -n kernel-cache-test -o yaml
kubectl get kernelcache <cache-name> -n kernel-cache-test -o yaml
kubectl describe kernelcachenode <node-name>
```

The cache is usable only after the relevant `KernelCacheNode` reports the cache as ready. `KernelCache.status.state` summarizes preparation as `Pending`, `Preparing`, `Ready`, or `Error`.

## Verify reuse

Once the first capture and node preparation are ready, restart the serving workload Pod or create another compatible replica:

```bash
kubectl rollout restart deployment -n kernel-cache-test <deployment-name>
kubectl get pods -n kernel-cache-test -w
```

Inspect the new Pod spec and webhook/controller logs to confirm that a cache was selected. A new Pod must still satisfy the identity and path compatibility checks. A different model source, runtime image, runtime argument, or runtime option can produce a different identity.

## Registry authentication

This guide uses `registry.auth.type: none`, so Kernel Cache does not provision registry credentials. To use `serviceAccountToken`, including push and pull role references, controller `bind` permission, and an OpenShift integrated registry example, see [Registry authentication](./registry-authentication.md).

The preparation Job namespace must exist before a cache is used. The default is `kserve-kernelcache-jobs`; set `jobNamespace` to a pre-created namespace if the installation uses a different one.
