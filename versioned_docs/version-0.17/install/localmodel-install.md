# LocalModel Installation

This guide covers installation of the LocalModel controller for efficient model caching.

## Prerequisites

**Required**: LocalModel MUST be installed after KServe controller is already installed.

- **KServe Installation (Required)**: See [KServe Installation](./kserve-install)
- **Dependencies**: See [Standard Mode Dependencies](./dependencies.md#standard-mode-dependencies) or [Knative Mode Dependencies](./dependencies.md#knative-mode-dependencies)

:::note
LocalModel is an optional add-on component that requires **KServe controller** to be installed first. It currently only supports **InferenceService** workloads. Support for **LLMInferenceService** is planned for future releases.
:::

## Overview

LocalModel provides efficient model caching capabilities:
- **Controller**: Manages model cache lifecycle and policies
- **Agent**: DaemonSet deployed on worker nodes for local caching
- **Node Selection**: Target specific nodes for model caching
- **Cache Policies**: Configurable cache size, eviction, and preloading

## Installation Methods

### Method 1: Kustomize

:::info Clone Repository First
If you haven't cloned the KServe repository yet, see [Cloning the Repository](./dependencies#clone-repository).
:::

```bash
# Install LocalModel (requires KServe to be already installed)
kubectl apply -k config/overlays/addons/localmodel
```

### Method 2: Helm

#### Install CRDs

```bash
# Using OCI registry (recommended)
helm install kserve-localmodel-crd oci://ghcr.io/kserve/charts/kserve-localmodel-crd \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace

# Or using local charts
helm install kserve-localmodel-crd ./charts/kserve-localmodel-crd \
  --namespace kserve \
  --create-namespace
```

#### Install LocalModel Resources

```bash
# Using OCI registry (recommended)
helm install kserve-localmodel-resources oci://ghcr.io/kserve/charts/kserve-localmodel-resources \
  --version v0.17.0 \
  --create-namespace \
  --namespace kserve \
  --wait

# Or using local charts
helm install kserve-localmodel-resources ./charts/kserve-localmodel-resources \
  --create-namespace \
  --namespace kserve \
  --wait
```


## Configuration Options

For detailed configuration options including node selector, resource limits, and storage configurations, see the [kserve-localmodel-resources Helm Chart README](https://github.com/kserve/kserve/blob/release-0.17/charts/kserve-localmodel-resources/README.md).

## Uninstallation

### Helm

```bash
# Remove resources
helm uninstall kserve-localmodel-resources -n kserve
helm uninstall kserve-localmodel-crd -n kserve
```

### Kustomize

```bash
# Remove LocalModel
kubectl delete -k config/overlays/addons/localmodel
```

### Cleanup

```bash
# Remove node labels
kubectl label nodes -l kserve/localmodel=worker kserve/localmodel-

# Clean up cached models (optional)
kubectl delete localmodelcache --all
kubectl delete localmodelnodegroup --all
```

## Next Steps

- [Getting Started Guide](../getting-started/quickstart-guide) - Deploy models with caching
- [LocalModel Configuration](../model-serving/generative-inference/modelcache/localmodel) - Advanced caching strategies
