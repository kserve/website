# Required Dependencies

This document outlines the infrastructure dependencies required for KServe installation based on your deployment mode.

## Knative Mode Dependencies

Knative mode provides serverless deployment with automatic scaling and traffic management.

### Required Components

| Component | Version | Purpose |
|-----------|---------|---------|
| **cert-manager** | v1.17.0 | TLS certificate management for webhooks |
| **Istio** | 1.27.1 | Service mesh and ingress gateway |
| **istio-ingress-class** | - | Istio IngressClass configuration |
| **Knative Operator** | v1.21.1 | Serverless platform operator |
| **Knative Serving** | 1.21.1 | Serverless serving runtime |

### Required CLI Tools

- **helm** - Kubernetes package manager
- **kustomize** - Kubernetes configuration management
- **yq** - YAML processor
- **kubectl** - Kubernetes CLI

### Installation

Use the pre-generated dependency installation script:

```bash
cd /path/to/kserve

# Install dependencies for Knative mode
./hack/setup/quick-install/kserve-knative-mode-dependency-install.sh
```

Or install components individually:

```bash
# cert-manager
./hack/setup/infra/manage.cert-manager-helm.sh

# Istio (3 components)
./hack/setup/infra/manage.istio-helm.sh

# Istio IngressClass
./hack/setup/infra/manage.istio-ingress-class.sh

# Knative Operator
./hack/setup/infra/knative/manage.knative-operator-helm.sh
```

## Standard Mode Dependencies

Standard mode uses raw Kubernetes deployments without serverless features.

### Required Components

| Component | Version | Purpose |
|-----------|---------|---------|
| **cert-manager** | v1.17.0+ | TLS certificate management for webhooks |

### Required CLI Tools

- **helm** - Kubernetes package manager
- **yq** - YAML processor
- **kubectl** - Kubernetes CLI

### Installation

```bash
cd /path/to/kserve

# Install dependencies for Standard mode
./hack/setup/quick-install/kserve-standard-mode-dependency-install.sh
```

Or install cert-manager directly:

```bash
./hack/setup/infra/manage.cert-manager-helm.sh
```

## LLMIsvc Dependencies

LLMIsvc mode is optimized for large language model serving with Gateway API integration.

### Required Components

| Component | Purpose |
|-----------|---------|
| **External LB** | Load balancer for Kind/Minikube |
| **cert-manager** | TLS certificate management |
| **Gateway API Extension CRDs** | Inference-specific Gateway API extensions |
| **Gateway API CRDs** | Core Gateway API resources |
| **Envoy Gateway** | Gateway API implementation |
| **Envoy AI Gateway** | AI-specific gateway extensions |
| **Gateway API GatewayClass** | Gateway class configuration |
| **Gateway API Gateway** | Gateway resource instances |
| **LWS Operator** | LeaderWorkerSet for multi-node serving |

### Required CLI Tools

- **helm** - Kubernetes package manager
- **yq** - YAML processor
- **kubectl** - Kubernetes CLI

### Installation

```bash
cd /path/to/kserve

# Install dependencies for LLMIsvc mode
./hack/setup/quick-install/llmisvc-dependency-install.sh
```

Or install components individually:

```bash
# External load balancer (platform-specific)
./hack/setup/infra/external-lb/manage.external-lb.sh

# cert-manager
./hack/setup/infra/manage.cert-manager-helm.sh

# Gateway API Extension CRDs
./hack/setup/infra/gateway-api/manage.gateway-api-extension-crd.sh

# Gateway API CRDs
./hack/setup/infra/gateway-api/manage.gateway-api-crd.sh

# Envoy Gateway
./hack/setup/infra/manage.envoy-gateway-helm.sh

# Envoy AI Gateway
./hack/setup/infra/manage.envoy-ai-gateway-helm.sh

# Gateway API GatewayClass
./hack/setup/infra/gateway-api/manage.gateway-api-gwclass.sh

# Gateway API Gateway
./hack/setup/infra/gateway-api/manage.gateway-api-gw.sh

# LWS Operator
./hack/setup/infra/manage.lws-operator.sh
```

## Optional Dependencies

### KEDA (Event-Driven Autoscaling)

KEDA enables event-driven autoscaling based on custom metrics and external triggers.

**When to use**:
- Need autoscaling based on custom metrics
- Want event-driven workload triggers
- Require integration with external event sources

**Components**:

| Component | Purpose |
|-----------|---------|
| **KEDA** | Kubernetes Event-Driven Autoscaling |
| **KEDA OTEL Addon** | OpenTelemetry metrics integration |
| **OpenTelemetry Operator** | Observability and tracing |

**Installation**:

```bash
# Install KEDA and dependencies
./hack/setup/quick-install/keda-dependency-install.sh
```

Or individually:

```bash
# OpenTelemetry Operator
./hack/setup/infra/manage.opentelemetry-helm.sh

# KEDA
./hack/setup/infra/manage.keda-helm.sh

# KEDA OTEL Addon
./hack/setup/infra/manage.keda-otel-addon-helm.sh
```


## Custom Dependency Scripts

You can create custom installation scripts for specific dependency combinations.

### Using Make Target

The easiest way to regenerate all quick-install scripts:

```bash
cd /path/to/kserve

# Generate all quick-install scripts
make generate-quick-install-scripts
```

This processes all definition files in `hack/setup/quick-install/definitions/` and creates standalone installation scripts.

### Generating from Specific Definition

Generate a script from a specific definition file:

```bash
cd /path/to/kserve

python hack/setup/scripts/install-script-generator/generator.py \
  hack/setup/quick-install/definitions/kserve-knative/kserve-knative-mode-dependency-install.definition
```

### Creating Custom Definitions

Create your own dependency combination by writing a YAML definition file:

```yaml
# my-custom-dependencies.definition
DESCRIPTION: Custom KServe dependencies for my environment
RELEASE: true

# Required CLI tools
TOOLS:
  - helm
  - kustomize
  - yq

# Optional: Include existing definitions
INCLUDE_DEFINITIONS:
  - ./kserve-standard-mode-dependency-install.definition

# Optional: Set global environment variables
GLOBAL_ENV:
  ISTIO_VERSION: "1.27.1"

# Components to install
COMPONENTS:
  - name: cert-manager
  - name: istio
    env:
      ISTIOD_EXTRA_ARGS: "--set resources.limits.cpu=500m"
  - name: keda
```

**Generate the script**:

```bash
mkdir /tmp/test
python hack/setup/scripts/install-script-generator/generator.py \
  my-custom-dependencies.definition \
  /tmp/test/
```

**Run the generated script**:

```bash
# Install
/tmp/test//my-custom-dependencies-helm.sh

# Uninstall
/tmp/test/my-custom-dependencies-helm.sh --uninstall
```

### Definition File Structure

**Required Fields**:
- `DESCRIPTION`: Human-readable description
- `COMPONENTS`: List of components to install

**Optional Fields**:
- `TOOLS`: Required CLI tools to verify
- `INCLUDE_DEFINITIONS`: Import other definition files
- `GLOBAL_ENV`: Environment variables for all components

**Component Structure**:
```yaml
COMPONENTS:
  - name: component-name         # Matches script in hack/setup/infra/
    env:                         # Optional environment variables
      VAR1: value1
      VAR2: value2
```

**Composition with INCLUDE_DEFINITIONS**:
- Include other definition files to build on existing combinations
- Last-wins strategy: Later components override earlier ones
- Circular dependency detection prevents infinite loops

## Dependency Matrix

Quick reference for deployment modes:

| Dependency | Knative Mode | Standard Mode | LLMIsvc Mode |
|------------|--------------|---------------|--------------|
| cert-manager | ✅ Required | ✅ Required | ✅ Required |
| Istio | ✅ Required | ❌ Not needed | ❌ Not needed |
| Knative | ✅ Required | ❌ Not needed | ❌ Not needed |
| Envoy Gateway | ❌ Not needed | ❌ Not needed | ✅ Required |
| Gateway API | ❌ Not needed | ❌ Not needed | ✅ Required |
| LWS Operator | ❌ Not needed | ❌ Not needed | ✅ Required |
| KEDA | ⚙️ Optional | ⚙️ Optional | ⚙️ Optional |
| External LB | ⚙️ Optional | ⚙️ Optional | ✅ Required (local) |


## Next Steps

After installing dependencies, proceed to install KServe components:

- [Install KServe Controller](./kserve-install)
- [Install LLMIsvc Controller](./llmisvc-install)
- [Install LocalModel Controller](./localmodel-install)
