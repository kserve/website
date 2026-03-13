# LLMInferenceService Installation

This guide covers installation of the LLMInferenceService controller for generative AI model serving.

## Prerequisites

Before installing LLMInferenceService, ensure dependencies are installed:

- **LLMIsvc Dependencies**: See [LLMIsvc Mode Dependencies](./dependencies.md#llmisvc-dependencies)

Required infrastructure:
- cert-manager
- Gateway API CRDs and Extension CRDs
- Envoy Gateway
- Envoy AI Gateway
- Gateway API resources (GatewayClass, Gateway)
- LWS Operator (LeaderWorkerSet)
- External Load Balancer (for local clusters)

## Overview

LLMInferenceService provides optimized serving for generative AI models with features

## Installation Methods

### Method 1: Kustomize

```bash
# Clone KServe repository
git clone https://github.com/kserve/kserve.git
cd kserve

# Install LLMInferenceService standalone
kubectl apply -k config/overlays/standalone/llmisvc
```

For addon installation (when KServe is already installed):

```bash
# Install only LLMInferenceService component (no base resources, reuses existing namespace)
kubectl apply -k config/overlays/addons/llmisvc
```

For LLMInferenceServiceConfigs installation
```bash
kubectl apply -k config/llmisvcconfig
```

### Method 2: Helm

#### Install CRDs

```bash
# Using OCI registry (recommended)
helm install llmisvc-crd oci://ghcr.io/kserve/charts/kserve-llmisvc-crd \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --create-namespace

# Or using local charts
helm install llmisvc-crd ./charts/kserve-llmisvc-crd \
  --namespace kserve \
  --create-namespace
```

#### Install LLMInferenceService Resources

```bash
# Using OCI registry (recommended)
helm install llmisvc-resources oci://ghcr.io/kserve/charts/kserve-llmisvc-resources \
  --version v0.17.0-rc1 \
  --namespace kserve

# Or using local charts
helm install llmisvc-resources ./charts/kserve-llmisvc-resources \
  --namespace kserve
```

**Addon Installation (when KServe is already installed)**:

```bash
helm install llmisvc-resources oci://ghcr.io/kserve/charts/kserve-llmisvc-resources \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --set kserve.createSharedResources=false
```

#### Install LLMInferenceServiceConfigs

Install pre-configured templates for common LLM frameworks:

```bash
helm install kserve-runtime-configs oci://ghcr.io/kserve/charts/kserve-runtime-configs \
  --version v0.17.0-rc1 \
  --namespace kserve \
  --set kserve.llmisvcConfigs.enabled=true
```

### Method 3: Installation Scripts

#### Quick Install (All-in-One)

```bash
cd kserve

# Install dependencies + LLMInferenceService
./hack/setup/quick-install/llmisvc-full-install-helm.sh

# Or use with-manifest version (no clone needed, includes embedded manifests)
./hack/setup/quick-install/llmisvc-full-install-helm-with-manifest.sh
```

## Configuration Options

For detailed configuration options including gateway settings, resource limits, config templates, and multi-node configurations, see the [kserve-llmisvc-resources Helm Chart README](https://github.com/kserve/kserve/blob/release-0.17/charts/kserve-llmisvc-resources/README.md).

### Test Installation

To test your LLMInferenceService installation with a sample, see the [Getting Started with LLMInferenceService](../getting-started/genai-first-llmisvc).

## Uninstallation

### Helm

```bash
# Remove resources
helm uninstall kserve-runtime-configs -n kserve
helm uninstall llmisvc-resources -n kserve
helm uninstall llmisvc-crd -n kserve

# Remove namespace (if not shared)
kubectl delete namespace kserve
```

### Kustomize

```bash
# Remove LLMInferenceService
kubectl delete -k config/overlays/standalone/llmisvc
```

### Scripts

```bash
# Uninstall using script
./hack/setup/quick-install/llmisvc-full-install-helm.sh --uninstall
```

## Next Steps

- [Install LocalModel Controller](./localmodel-install) - For model caching
- [Getting Started with LLMInferenceService](../getting-started/genai-first-llmisvc) - Deploy your first generative AI model
- [LLMInferenceService Configuration Guide](../model-serving/generative-inference/llmisvc/llmisvc-configuration) - Advanced configuration
