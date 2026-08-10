# Installation Concepts

## Which Installation Do I Need?

Choose the right setup based on your use case:

| I want to... | Install | Guide |
|---|---|---|
| Serve **predictive models** (sklearn, XGBoost, PyTorch, etc.) | KServe only | [Install KServe](./kserve-install.md) |
| Serve **LLMs / generative AI** (most users) | KServe + LLMInferenceService | [Install LLMInferenceService](./llmisvc-install.md) |
| Serve LLMs **with local model caching** for faster cold starts | KServe + LLMInferenceService + LocalModel | [Install Local Model Cache](./localmodel-install.md) |

:::tip Not sure which to pick?
If you're serving LLMs or generative AI models, install **KServe + LLMInferenceService**. If you're only doing traditional ML inference (classification, regression, etc.), the standard KServe installation is sufficient.
:::

---

## KServe Components Architecture

KServe consists of three main components that can be deployed independently or in combination:

### Component Overview

#### kserve
The core KServe controller that manages:
- **InferenceService CRD**: Defines ML model serving workloads
- **ServingRuntime CRD**: Configures model serving runtimes (TensorFlow, PyTorch, Triton, etc.)
- **ClusterServingRuntime CRD**: Cluster-wide runtime configurations
- **InferenceGraph CRD**: Multi-model inference pipelines
- **TrainedModel CRD**: Model versioning and management

**Controller**: `kserve-controller-manager` handles reconciliation of InferenceService resources, webhook validation, and integration with Knative or raw Kubernetes deployments.

#### llmisvc
The LLM Inference Service controller for generative AI workloads:
- **LLMInferenceService CRD**: Specialized resource for LLM serving
- **LLMInferenceServiceConfig CRD**: Configuration templates for LLM deployments

**Controller**: `llmisvc-controller-manager` optimizes LLM deployments with features like KV-cache management, multi-node serving, and AI gateway integration.

#### localmodel (Optional)
The LocalModel controller for efficient model caching:
- **LocalModelCache CRD**: Defines model caching policies
- **LocalModelNode CRD**: Node-level model cache status
- **LocalModelNodeGroup CRD**: Logical grouping of cache nodes

**Components**:
- **Controller**: `kserve-localmodel-controller` manages cache lifecycle
- **Agent**: `kserve-localmodelnode-agent` runs as DaemonSet to handle local model caching

:::note
LocalModel requires the **kserve** component to be installed and currently only supports **InferenceService** workloads. Support for **LLMInferenceService** is planned for future releases.
:::



### Deployment Combinations

| Combination | Use Case | Components |
|-------------|----------|------------|
| **KServe Only** | Predictive AI | kserve |
| **KServe + LLMIsvc** | Predictive AI + Generative AI | kserve + llmisvc |
| **Full Stack** | Predictive AI + Generative AI + Model caching | kserve + llmisvc + localmodel |

### Shared Resources

When deploying multiple components, certain resources are shared to avoid duplication:

- **Certificates**: Webhook certificates managed by cert-manager
- **ConfigMaps**: `inferenceservice-config` shared configuration
- **ClusterStorageContainers**: Storage provider configurations

The installation scripts automatically coordinate shared resource creation based on which components are being installed.

## Kustomize Component-Based Architecture

KServe uses [Kustomize components](https://kubectl.docs.kubernetes.io/guides/config_management/components/) for modular, composable deployments.

### Directory Structure

```
config/
├── base/                    # Shared resources (namespace, configmap, certificates)
├── components/              # Modular components
│   ├── kserve/              # KServe controller component
│   ├── llmisvc/             # LLMIsvc controller component
│   └── localmodel/          # LocalModel controller component
├── crd/                     # CustomResourceDefinitions
│   ├── full/                # CRDs with full validation
│   └── minimal/             # Lightweight CRDs without validation
├── overlays/                # Composition strategies
│   ├── standalone/          # Base + single component
│   ├── addons/              # Component only (no base)
│   └── all/                 # Base + all components
├── default/                 # KServe deployment
├── llmisvc/                 # LLMIsvc deployment
└── localmodels/             # LocalModel deployment
```

### Composition Strategies

**Standalone Overlays** (`overlays/standalone/`):
- Include `base` resources (namespace, shared configs)
- Include a single component
- Use for fresh installations

```yaml
# overlays/standalone/kserve/kustomization.yaml
namespace: kserve
resources:
- ../../../base
components:
- ../../../components/kserve
```

**Addon Overlays** (`overlays/addons/`):
- **Only** include the component (no base)
- Use for adding to existing installations

```yaml
# overlays/addons/llmisvc/kustomization.yaml
namespace: kserve
components:
- ../../../components/llmisvc
```

**All-in-One Overlay** (`overlays/all/`):
- Include base + all three components
- Full-featured deployment

```yaml
# overlays/all/kustomization.yaml
namespace: kserve
resources:
- ../../base
components:
- ../../components/kserve
- ../../components/llmisvc
- ../../components/localmodel
```

## Helm Chart Structure

KServe provides 10 independent Helm charts organized by function:

### Chart Organization

#### CRD Charts (6 charts)
Install CustomResourceDefinitions with two variants per component:

| Chart | Description |
|-------|-------------|
| `kserve-crd` | KServe CRDs with full validation |
| `kserve-crd-minimal` | KServe CRDs without validation |
| `kserve-llmisvc-crd` | LLMIsvc CRDs with full validation |
| `kserve-llmisvc-crd-minimal` | LLMIsvc CRDs minimal |
| `kserve-localmodel-crd` | LocalModel CRDs with validation |
| `kserve-localmodel-crd-minimal` | LocalModel CRDs minimal |

**Why two variants?**
- **Full**: Complete OpenAPI validation, better error messages, larger size
- **Minimal**: Faster installation, smaller memory footprint, less validation

#### Resources Charts (4 charts)
Install controllers, RBAC, webhooks, and shared resources:

| Chart | Description | Dependencies |
|-------|-------------|--------------|
| `kserve-resources` | KServe controller, webhooks, ConfigMap | Requires `kserve-crd` |
| `kserve-llmisvc-resources` | LLMIsvc controller, webhooks, ConfigMap | Requires `kserve-llmisvc-crd` |
| `kserve-localmodel-resources` | LocalModel controller + agent DaemonSet | Requires `kserve-localmodel-crd` |
| `kserve-runtime-configs` | ClusterServingRuntimes, LLMIsvcConfigs | Requires `kserve-crd` |


### Values Hierarchy

Helm values are composed from shared and component-specific sections:

```yaml
# charts/_common/common-sections.yaml
# Shared by all resource charts
kserve:
  version: v0.17.0
  createSharedResources: true
  agent: {...}
  storage: {...}
  servingruntime: {...}
  # ... 16 shared sections
```

```yaml
# charts/_common/kserve-resources-specific.yaml
# KServe-specific values
kserve:
  controller:
    image: kserve/kserve-controller
    deploymentMode: Knative
    gateway: {...}
```

```bash
# Auto-generated values.yaml = common + specific
yq eval-all '. as $item ireduce ({}; . * $item)' \
  common-sections.yaml \
  kserve-resources-specific.yaml \
  > kserve-resources/values.yaml
```

**Benefits of this approach:**
- **DRY**: Shared sections defined once
- **Consistency**: All charts use same values structure
- **Maintainability**: Update shared config in one place

### Base + Patch System

Helm charts use a sophisticated base + patch approach:

1. **Generate Base**: Run `kustomize build` to create base manifests
   ```bash
   kustomize build config/components/kserve > \
     charts/kserve-resources/files/kserve/resources.yaml
   ```

2. **Create Patches**: Define Helm-specific overrides
   ```yaml
   # files/kserve/deployment-patch.yaml
   kind: Deployment
   metadata:
     name: kserve-controller-manager
   spec:
     template:
       spec:
         containers:
         - name: manager
           image: "{{ .Values.kserve.controller.image }}:{{ .Values.kserve.controller.tag }}"
           resources: {{ toYaml .Values.kserve.controller.resources | nindent 12 }}
   ```

3. **Render with Deep Merge**: Template helper merges base + patches
   ```go-template
   {{- include "kserve-common.renderMultiResourceWithPatches" (dict
     "baseFile" "files/kserve/resources.yaml"
     "patchGlob" "files/kserve/*-patch.yaml"
     "certName" "serving-cert"
     "context" .) -}}
   ```

**Deep Merge Logic**:
- Recursively merges dictionaries
- Smart array merging by `name` field (containers, env vars)
- Preserves Kustomize structure while enabling Helm parameterization

## Installation Script Architecture

The `hack/setup` directory provides a comprehensive installation framework:

### Directory Organization

```
hack/setup/
├── common.sh                  # Shared utilities
├── global-vars.env            # Environment variables
├── SCRIPT_GUIDELINES.md       # Script standards
├── cli/                       # CLI tool installers
│   ├── install-helm.sh
│   ├── install-kustomize.sh
│   ├── install-kind.sh
│   ├── install-yq.sh
│   └── install-uv.sh
├── infra/                     # Infrastructure components
│   ├── manage.cert-manager-helm.sh
│   ├── manage.istio-helm.sh
│   ├── manage.keda-helm.sh
│   ├── manage.kserve-helm.sh
│   ├── manage.kserve-kustomize.sh
│   ├── knative/
│   ├── gateway-api/
│   └── ...
├── quick-install/             # Generated installation scripts
│   ├── definitions/           # YAML definitions
│   └── *.sh                   # Generated scripts
└── scripts/                   # Automation tools
    ├── validate-install-scripts.py
    └── install-script-generator/
```

### Common Utility Library (common.sh)

All scripts source `common.sh` for shared functionality:

**System Detection**:
- `detect_os()` - Identifies Linux/Darwin
- `detect_arch()` - Maps architecture (x86_64, aarch64)
- `detect_platform()` - Detects Kind, Minikube, OpenShift, or Kubernetes

**Kubernetes Utilities**:
- `wait_for_pods()` - Wait for pods to be created and ready
- `wait_for_deployment()` - Wait for deployment availability
- `wait_for_crd()` - Wait for CRD establishment
- `update_isvc_config()` - Update InferenceService ConfigMap with jq

**Logging**:
- `log_info()`, `log_success()`, `log_error()`, `log_warning()` - Color-coded output

**Example Script Structure**:
```bash
#!/bin/bash
# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../common.sh"

install() {
  log_info "Installing cert-manager..."
  helm repo add jetstack https://charts.jetstack.io
  helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --set crds.enabled=true

  wait_for_pods "cert-manager" "app.kubernetes.io/instance=cert-manager" 300
  log_success "cert-manager installed successfully"
}

uninstall() {
  log_info "Uninstalling cert-manager..."
  helm uninstall cert-manager -n cert-manager
  kubectl delete namespace cert-manager --wait=true
}

# Main execution
if [ "$UNINSTALL" = true ]; then uninstall; exit 0; fi
install
```

### CLI Tool Installation

Scripts in `cli/` handle prerequisite tool installation:

**Pattern**:
1. Check if already installed and at correct version
2. Detect OS and architecture
3. Download from official source
4. Verify and install to `$BIN_DIR`
5. Add to `$PATH`

**Example**:
```bash
# Install Helm
./hack/setup/cli/install-helm.sh

# Install with specific version
HELM_VERSION=v3.13.0 ./hack/setup/cli/install-helm.sh
```

### Infrastructure Management

Scripts in `infra/` manage Kubernetes components:

**Capabilities**:
- Install, reinstall, uninstall modes
- Version management from `kserve-deps.env`
- Platform-specific adaptations
- Custom Helm/Kustomize arguments via env vars

**Examples**:
```bash
# Install Istio
./hack/setup/infra/manage.istio-helm.sh

# Reinstall with custom args
REINSTALL=true \
ISTIOD_EXTRA_ARGS="--set resources.limits.cpu=500m" \
./hack/setup/infra/manage.istio-helm.sh

# Uninstall
UNINSTALL=true ./hack/setup/infra/manage.istio-helm.sh
```

**Generation Steps**:
1. **Parse Definition**: Load YAML with tools, components, and config
2. **Process Components**: Find and extract functions from scripts
3. **Embed Content**: Optionally embed manifests and templates
4. **Build Script**: Combine functions, variables, and logic
5. **Output**: Write standalone executable script

**Example Definition**:
```yaml
# quick-install/definitions/kserve-standard-mode-full-install.definition
DESCRIPTION: Install KServe Standard Mode using Helm
RELEASE: true

TOOLS:
  - helm
  - kustomize
  - yq

COMPONENTS:
  - name: cert-manager-helm
  - name: istio-helm
  - name: kserve-helm
    env:
      DEPLOYMENT_MODE: Standard
      ENABLE_KSERVE: true
      ENABLE_LLMISVC: false
```

## Summary

KServe's installation system provides multiple deployment methods with different trade-offs:

**Key Takeaways**:
- **3 Components**: kserve (mandatory), llmisvc (mandatory), localmodel (optional)
- **Flexible Deployment**: Kustomize components or Helm charts
- **Automated Scripts**: Generated from definitions or individual scripts
- **Shared Foundation**: common.sh library and global configuration
- **Production Ready**: Multiple deployment modes, customization options, lifecycle management

For detailed installation instructions, see the [Quick Start Guide](../getting-started/quickstart-guide.md).
