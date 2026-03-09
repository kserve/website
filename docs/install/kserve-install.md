# KServe Installation

This guide covers installation of the KServe controller for predictive AI model serving.

## Prerequisites

Before installing KServe, ensure dependencies are installed based on your deployment mode:

- **Knative Mode**: See [Knative Mode Dependencies](./dependencies.md#knative-mode-dependencies)
- **Standard Mode**: See [Standard Mode Dependencies](./dependencies.md#standard-mode-dependencies)

## Deployment Modes

KServe supports two deployment modes:

| Mode | Description |
|------|-------------|
| **Knative** | Serverless deployment with Knative|
| **Standard** | Raw Kubernetes deployments using base Kubernetes features|

## Installation Methods

### Method 1: Kustomize

#### Knative Mode

```bash
# Clone KServe repository
git clone https://github.com/kserve/kserve.git
cd kserve

# Install KServe with all components
kubectl apply -k config/overlays/standalone/kserve
```

For addon installation (when LLMIsvc is already installed):

```bash
# Install only KServe component (no base resources, reuses existing namespace)
kubectl apply -k config/overlays/addons/kserve
```

#### Standard Mode

```bash
# Set deployment mode to Standard
# Edit the inferenceservice ConfigMap
vi config/default/configmap/inferenceservice.yaml

# Change the deploy section to:
# deploy: |
#   {
#     "defaultDeploymentMode": "Standard"
#   }

# Apply
kubectl apply -k config/overlays/standalone/kserve
```

#### Install ClusterServingRuntimes

```bash
# Install all runtimes
kubectl apply -k config/runtimes
```

### Method 2: Helm

#### Install CRDs

First, install the KServe CRDs:

```bash
# Using OCI registry (recommended)
helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --create-namespace

# Or using local charts
helm install kserve-crd ./charts/kserve-crd \
  --namespace kserve \
  --create-namespace
```

#### Install KServe Resources

**Knative Mode**:

```bash
helm install kserve-resources oci://ghcr.io/kserve/charts/kserve-resources \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --set kserve.controller.deploymentMode=Knative
```

**Standard Mode**:

```bash
helm install kserve-resources oci://ghcr.io/kserve/charts/kserve-resources \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --set kserve.controller.deploymentMode=Standard
```

**Addon Installation (when LLMIsvc is already installed)**:

```bash
helm install kserve-resources oci://ghcr.io/kserve/charts/kserve-resources \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --set kserve.createSharedResources=false
```

### Method 3: Installation Scripts

#### Quick Install (All-in-One)

**Knative Mode**:

```bash
cd kserve

# Install dependencies + KServe
./hack/setup/quick-install/kserve-knative-mode-full-install-helm.sh

# Or use with-manifest version (no clone needed, includes embedded manifests)
./hack/setup/quick-install/kserve-knative-mode-full-install-helm-with-manifest.sh
```

**Standard Mode**:

```bash
cd kserve

# Install dependencies + KServe
./hack/setup/quick-install/kserve-standard-mode-full-install-helm.sh

# Or use with-manifest version (no clone needed, includes embedded manifests)
./hack/setup/quick-install/kserve-standard-mode-full-install-helm-with-manifest.sh
```

## Configuration Helm Options

For detailed configuration options including deployment mode, gateway settings, resource limits, and runtime configurations, see the [kserve-resources Helm Chart README](https://github.com/kserve/kserve/blob/release-0.17/charts/kserve-resources/README.md).


## Uninstallation

### Helm

```bash
# Remove resources
helm uninstall kserve-runtime-configs -n kserve
helm uninstall kserve-resources -n kserve
helm uninstall kserve-crd -n kserve

# Remove namespace
kubectl delete namespace kserve
```

### Kustomize

```bash
# Remove KServe
kubectl delete -k config/overlays/standalone/kserve
```

### Scripts

```bash
# Uninstall using script
./hack/setup/quick-install/kserve-knative-mode-full-install-helm.sh --uninstall

# Or individual script
UNINSTALL=true ./hack/setup/infra/manage.kserve-helm.sh
```

## Next Steps

- [Install LLMIsvc Controller](./llmisvc-install) - For generative AI workloads
- [Install LocalModel Controller](./localmodel-install) - For model caching
- [Getting Started Guide](../getting-started/quickstart-guide) - Deploy your first model
