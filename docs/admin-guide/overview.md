---
title: "Administrator Guide"
description: "Install, configure, and operate KServe in production environments."
---

# KServe Administrator Guide

Install, configure, and operate KServe for both generative and predictive inference workloads.

## Which Deployment Mode Do I Need?

| Mode | Best For | Inference Types |
|---|---|---|
| [Standard Kubernetes](./kubernetes-deployment.md) | Full resource control, GPU workloads, production | Generative + Predictive |
| [Knative (Serverless)](./serverless/serverless.md) | Scale-to-zero, burst/unpredictable traffic | Predictive |
| [ModelMesh](./modelmesh.md) | High-density, many models on shared infrastructure | Predictive |
| [LLMInferenceService](./kubernetes-deployment-llmisvc.md) | Advanced LLM features (prefix routing, disaggregated serving) | Generative (LLM) |

:::tip Not sure which to pick?
Start with **Standard Kubernetes Deployment** — it works for all workloads. Switch to Knative for scale-to-zero, ModelMesh for multi-model density, or LLMInferenceService for advanced LLM features.
:::

---

## Workload Characteristics

### 🤖 Generative Inference

Models that generate content (text, images, audio) from input prompts.

- Requires GPU acceleration and high memory
- Long inference times with streaming responses
- Use **Standard Kubernetes** or **LLMInferenceService**
- Gateway API strongly recommended for streaming support

### 📊 Predictive Inference

Models that classify or predict values from input data.

- Often CPU-runnable with predictable, low-latency responses
- Fixed-size outputs, shorter inference windows
- Use **Standard Kubernetes**, **Knative**, or **ModelMesh**

---

## Installation Guides

- **[Standard Kubernetes Deployment](./kubernetes-deployment.md)** — direct resource control for any workload
- **[LLMInferenceService Deployment](./kubernetes-deployment-llmisvc.md)** — advanced LLM serving with prefix-aware routing and disaggregated serving
- **[Knative Deployment](./serverless/serverless.md)** — scale-to-zero for cost optimization
- **[ModelMesh Deployment](./modelmesh.md)** — high-density multi-model serving

---

## Networking

KServe recommends **Gateway API** over traditional Ingress resources for more flexible traffic management.

:::tip
Gateway API is required for generative inference — it handles streaming responses and long-lived connections that Ingress cannot.
:::

See the [Gateway API Migration Guide](./gatewayapi-migration.md) for step-by-step instructions.

---

## Best Practices

### Generative Inference
- **GPU Resources**: Size node pools with sufficient GPU memory for your model
- **Timeouts**: Increase inference timeouts to accommodate generation latency
- **Networking**: Use Gateway API for streaming and connection management
- **Caching**: Enable model caching to reduce cold-start times

### Predictive Inference
- **Autoscaling**: Tune scaling thresholds to match model latency SLOs
- **Cost**: Use Knative for bursty workloads to scale to zero when idle
- **Density**: Use ModelMesh when running many small models on shared GPU/CPU pools
- **Batching**: Enable request batching to improve throughput for high-volume workloads

### All Workloads
- **Security**: Apply network policies and authentication to inference endpoints
- **Monitoring**: Deploy Prometheus + Grafana dashboards for model and infrastructure metrics
- **Configurations**: Review [KServe configurations](./configurations.md) to tune defaults for your environment
