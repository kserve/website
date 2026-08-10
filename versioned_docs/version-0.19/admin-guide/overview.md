---
title: "Administrator Guide"
description: "Install, configure, and operate KServe in production environments."
---

# KServe Administrator Guide

KServe is a standard model inference platform on Kubernetes, providing high-performance, high-scale model serving solutions. This guide covers installation options, configuration settings, and best practices for managing KServe in production environments, with specific guidance for both predictive and generative inference workloads.

As an administrator, you'll be responsible for:

- Choosing and installing the right deployment mode
- Configuring networking and resource settings
- Maintaining and scaling KServe in your cluster environment
- Integrating with Kubernetes networking components

If you are familiar with KServe, you can skip the introductory sections and jump directly to the [deployment guides](#installation).

---

## Which Deployment Mode Do I Need?

| Resource | Best For | Inference Types |
|---|---|---|
| **[InferenceService](./kubernetes-deployment.md)** (Standard) | Full resource control, GPU workloads, production | Generative + Predictive |
| **[InferenceService](./serverless/serverless.md)** (Knative/Serverless) | Scale-to-zero, burst/unpredictable traffic | Predictive |
| **[LLMInferenceService](./kubernetes-deployment-llmisvc.md)** | Advanced LLM features (prefix routing, disaggregated serving) | Generative (LLM) |

:::tip Not sure which to pick?
Start with **InferenceService** — it works for all workloads, both ML and standard LLM. Switch to LLMInferenceService for advanced LLM features.
:::

---

## Inference Types

KServe supports two primary model inference types, each with specific deployment considerations:

### 🤖 Generative Inference

Generative inference workloads involve models that generate new content (text, images, audio, etc.) based on input prompts. These models typically:

- Require significantly more computational resources
- Have longer inference times
- Need GPU acceleration
- Process streaming responses
- Have higher memory requirements

**Recommended deployment**: **Standard** Kubernetes Deployment provides the most control over resource allocation and scaling. Gateway API is particularly recommended for generative inference to handle streaming responses effectively.

### 📊 Predictive Inference

Predictive inference workloads involve models that predict specific values or classifications based on input data. These models typically:

- Have shorter inference times
- Can often run on CPU
- Require less memory
- Have more predictable resource usage patterns
- Return fixed-size responses

**Available deployment options**:
- **InferenceService (Standard)**: For direct control over resources
- **InferenceService (Knative/Serverless)**: For scale to zero capabilities and cost optimization

---

## Installation

KServe supports multiple deployment modes. Choose the guide that matches your workload:

- **[InferenceService (Standard)](./kubernetes-deployment.md)** — suitable for both generative and predictive inference workloads
- **[InferenceService (Knative/Serverless)](./serverless/serverless.md)** — scale-to-zero for burst and unpredictable traffic workloads
- **[LLMInferenceService](./kubernetes-deployment-llmisvc.md)** — advanced LLM serving with prefix-aware routing and disaggregated serving

---

## Networking Configuration

KServe recommends using the **Gateway API** for network configuration. It provides a more flexible and standardized way to manage traffic ingress and egress compared to traditional Ingress resources.

:::tip
Gateway API is particularly recommended for generative inference workloads to better handle streaming responses and long-lived connections.
:::

The migration process involves:
1. Installing Gateway API CRDs
2. Creating appropriate GatewayClass resources
3. Configuring Gateway and HTTPRoute resources
4. Updating KServe to use the Gateway API

[Learn more about Gateway API Migration](./gatewayapi-migration.md)

---

## Best Practices

### For Generative Inference
- **Resource Planning**: Ensure adequate GPU resources are available
- **Memory Configuration**: Set higher memory limits and requests
- **Network Configuration**: Use Gateway API for improved streaming capabilities
- **Timeout Settings**: Configure longer timeouts to accommodate generation time

### For Predictive Inference
- **Autoscaling**: Configure appropriate scaling thresholds based on model performance
- **Resource Efficiency**: Consider Knative for cost optimization
- **Batch Processing**: Configure batch settings for improved throughput when applicable

### For All Workloads
- **Security**: Use proper authentication and network policies
- **Monitoring**: Set up monitoring for KServe components and model performance
- **Networking**: Configure appropriate timeouts and retry strategies for model inference
- **Configurations**: Review [KServe configurations](./configurations.md) to tune defaults for your environment

---

## Next Steps

### For Generative Inference
- [InferenceService Deployment Guide](./kubernetes-deployment.md)
- [LLMInferenceService Deployment Guide](./kubernetes-deployment-llmisvc.md)
- [Gateway API Migration Guide](./gatewayapi-migration.md)

### For Predictive Inference
- [InferenceService (Standard) Deployment Guide](./kubernetes-deployment.md)
- [InferenceService (Knative/Serverless) Deployment Guide](./serverless/serverless.md)
- [Gateway API Migration Guide](./gatewayapi-migration.md)
