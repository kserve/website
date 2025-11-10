---
title: "Kubernetes Deployment Installation Guide - LLMIsvc"
description: "Install LLMInferenceService for generative AI inference workloads"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kubernetes Deployment Installation Guide - LLMIsvc

LLMInferenceService is KServe's dedicated solution for **Generative AI inference workloads**, providing advanced features like:

- **Intelligent Routing**: KV cache-aware scheduling, prefill-decode separation
- **Multi-Node Orchestration**: Data parallelism, expert parallelism via LeaderWorkerSet
- **Gateway API Native**: Built on Kubernetes Gateway API with Inference Extension
- **Autoscaling**: Integration with KEDA for custom metrics-based scaling

:::note
LLMInferenceService is designed specifically for **Generative AI** workloads (LLMs). For **Predictive AI** workloads, use [InferenceService](kubernetes-deployment.md).
:::

## Installation Requirements

### Minimum Requirements

- **Kubernetes**: Version 1.30+
- **Cert Manager**: Version 1.16.0+
- **Gateway API**: Version 1.2.1
- **Gateway API Inference Extension (GIE)**: Version 0.3.0
- **Gateway Provider**: Envoy Gateway v1.5.0+ 
- **LeaderWorkerSet**: Version 0.6.2+ (for multi-node deployments)

:::tip
For detailed dependency information and step-by-step installation, see [LLMInferenceService Dependencies](../model-serving/generative-inference/llmisvc/llmisvc-dependencies.md).
:::

## Prerequisites

- `kubectl` configured to access your cluster
- Cluster admin permissions
- `helm` v3+ installed

---

The fastest way to get started with LLMInferenceService is using the quick install script. Please refer to the [Quickstart Guide](../getting-started/quickstart-guide.md).


## Installation

KServe provides installation scripts for infrastructure-related dependencies and CLI tools, with versions managed via [a central place](https://github.com/kserve/kserve/blob/master/kserve-deps.env). Here, we will demonstrate how to use these scripts to install the components required for LLMInferenceService. Each component mentioned here can be installed according to your own environment. For example, you can use the GatewayClass you are already using, and you can choose the Gateway API provider that fits your environment


### 1. Clone KServe Repository

```bash
git clone https://github.com/kserve/kserve.git
cd kserve/hack/setup
```

### 2. Install Infrastructure Components

Install each component in the following order. Each script supports `--install` (default), `--uninstall`, and `--reinstall` options.

#### External Load Balancer (Local Clusters Only)

For local development on Kind or Minikube:

```bash
infra/external-lb/manage.external-lb.sh
```

:::note
Skip this step if you're using a cloud provider (AWS, GCP, Azure) that provides native LoadBalancer support.
:::

#### Cert Manager

```bash
infra/manage.cert-manager.sh
```
:::note
Cert Manager is required for webhook certificates and LeaderWorkerSet operator. It's essential for production-grade installation.
:::


#### Gateway API & Inference Extension CRDs 

Installs both Gateway API CRDs and the Inference Extension (GIE):

```bash
infra/gateway-api/manage.gateway-api-crd.sh
```


#### Envoy Gateway

The Gateway API provider for routing

```bash
infra/manage.envoy-gateway.sh
```

#### Envoy AI Gateway

The Gateway API Extension provider(GIE) for routing

```bash
infra/manage.envoy-ai-gateway.sh
```

#### LeaderWorkerSet Operator

Required for multi-node deployments (Data/Expert Parallelism):

```bash
infra/manage.lws-operator.sh
```

#### GatewayClass

```bash
infra/gateway-api/managed.gateway-api-gwclass.sh
```

#### Gateway Instance

```bash
infra/gateway-api/managed.gateway-api-gw.sh
```

#### Install KServe Components

Choose your installation method based on your needs:

<Tabs groupId="kserve-install">
<TabItem value="llmisvc-helm" label="LLMIsvc Only (Helm)" default>

Install only LLMInferenceService CRDs and controller using helm:

```bash
LLMISVC=true infra/manage.kserve-helm.sh
```

:::success
This installs only the LLMInferenceService components. InferenceService is not included.
:::

</TabItem>

<TabItem value="llmisvc-kustomize" label="LLMIsvc Only (Kustomize)">

Install only LLMInferenceService CRDs and controller using kustomize:

```bash
LLMISVC=true infra/manage.kserve-kustomize.sh
```

:::note
This provides more granular control over the installation compared to Helm.
:::

</TabItem>

<TabItem value="full-helm" label="Full KServe (Helm)">

Install both InferenceService and LLMInferenceService:

```bash
infra/manage.kserve-helm.sh
```

:::info
This installs the complete KServe stack including both InferenceService (for Predictive AI) and LLMInferenceService (for Generative AI).
:::

</TabItem>

<TabItem value="full-kustomize" label="Full KServe (Kustomize)">

Install both InferenceService and LLMInferenceService using kustomize:

```bash
infra/manage.kserve-kustomize.sh
```

:::info
This installs the complete KServe stack with kustomize for greater customization flexibility.
:::

</TabItem>
</Tabs>


## Next Steps

Now that LLMInferenceService is installed, you can:

1. **Deploy Your First LLM**: Follow the [Quick Start Guide](../getting-started/genai-first-isvc.md)
2. **Understand the Architecture**: Read [LLMInferenceService Overview](../model-serving/generative-inference/llmisvc/llmisvc-overview.md)
3. **Explore Configuration Options**: Check [LLMInferenceService Configuration](../model-serving/generative-inference/llmisvc/llmisvc-configuration.md)
4. **Learn Advanced Features**:
   - [Multi-Node Deployments](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/dp-ep) - Data/Expert parallelism
   - [Prefill-Decode Separation](../concepts/architecture/control-plane-llmisvc.md#prefill-decode-separation) - Performance optimization
---
