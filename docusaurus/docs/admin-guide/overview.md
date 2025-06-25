---
title: "Overview"
description: "A comprehensive guide to KServe administration for predictive and generative inference"
---

# KServe Administrator Guide

This guide provides a comprehensive overview of KServe administration tasks and responsibilities. It covers installation options, configuration settings, and best practices for managing KServe in production environments, with specific guidance for both predictive and generative inference workloads.

## Introduction

KServe is a standard model inference platform on Kubernetes, providing high-performance, high-scale model serving solutions. As an administrator, you'll be responsible for installing, configuring, and maintaining KServe in your cluster environment.

The administrator guide helps you understand:

- Different deployment options for KServe
- Configuration best practices for different inference types
- Maintenance and operational tasks
- Integration with Kubernetes networking components

## Inference Types

KServe supports two primary model inference types, each with specific deployment considerations:

### Generative Inference

Generative inference workloads involve models that generate new content (text, images, audio, etc.) based on input prompts. These models typically:

- Require significantly more computational resources
- Have longer inference times
- Need GPU acceleration
- Process streaming responses
- Have higher memory requirements

**Recommended deployment option**: For generative inference workloads, the **Raw Kubernetes Deployment** approach is recommended as it provides the most control over resource allocation and scaling. Gateway API is particularly recommended for generative inference to handle streaming responses effectively.

### Predictive Inference

Predictive inference workloads involve models that predict specific values or classifications based on input data. These models typically:

- Have shorter inference times
- Can often run on CPU
- Require less memory
- Have more predictable resource usage patterns
- Return fixed-size responses

**Available deployment options**: For predictive inference workloads, KServe offers multiple deployment options:
- **Raw Kubernetes Deployment**: For direct control over resources
- **Serverless Deployment**: For scale to zero capabilities and cost optimization
- **ModelMesh Deployment**: For high-density, multi-model scenarios

## Deployment Options

### Raw Kubernetes Deployment

:::info

Raw Deployment is applicable for both predictive and generative inference workloads with minimal dependencies.

:::

KServe's Raw Deployment mode enables `InferenceService` deployment with minimal dependencies on Kubernetes resources. This approach uses standard Kubernetes resources:

- `Deployment` for managing container instances
- `Service` for internal communication
- `Ingress` / `Gateway API` for external access
- `Horizontal Pod Autoscaler` for scaling

The Raw Deployment mode offers several advantages:

- Minimal dependencies on external components
- Direct use of native Kubernetes resources
- Flexibility for various deployment scenarios
- Support for both HTTP and gRPC protocols

Unlike Serverless mode which depends on Knative for request-driven autoscaling, Raw Deployment mode can optionally use [KEDA](https://keda.sh) to enable autoscaling based on custom metrics. However, note that "Scale from Zero" is currently not supported in Raw Deployment mode for HTTP requests.

[Learn more about Raw Kubernetes Deployment](./kubernetes-deployment.md)

### Serverless Deployment

:::info

Serverless Deployment is recommended primarily for predictive inference workloads.

:::

KServe's Serverless deployment mode leverages Knative to provide request-based autoscaling, including the ability to scale down to zero when there's no traffic. This mode is particularly useful for:

- Cost optimization by automatically scaling resources based on demand
- Environments with varying or unpredictable traffic patterns
- Scenarios where resources should be freed when not in use
- Managing multiple model revisions and canary deployments

The Serverless deployment requires:
- Knative Serving installed in the cluster
- A compatible networking layer (Istio is recommended, but Kourier is also supported)
- Cert Manager for webhook certificates

[Learn more about Serverless Deployment](./serverless/serverless.md)

### ModelMesh Deployment

:::info

ModelMesh is optimized for predictive inference workloads with high model density requirements.

:::

ModelMesh installation enables high-scale, high-density, and frequently-changing model serving use cases. It uses a distributed architecture designed for:

- High-scale model serving
- Multi-model management
- Efficient resource utilization
- Frequent model updates

ModelMesh is namespace-scoped, meaning all its components must exist within a single namespace, and only one instance of ModelMesh Serving can be installed per namespace.

[Learn more about ModelMesh Deployment](./modelmesh.md)

## Networking Configuration

### Gateway API Migration

:::tip

Gateway API is particularly recommended for generative inference workloads to better handle streaming responses and long-lived connections.

:::

KServe recommends using the Gateway API for network configuration. The Gateway API provides a more flexible and standardized way to manage traffic ingress and egress in Kubernetes clusters compared to traditional Ingress resources.

The migration process involves:
1. Installing Gateway API CRDs
2. Creating appropriate GatewayClass resources
3. Configuring Gateway and HTTPRoute resources
4. Updating KServe to use the Gateway API

[Learn more about Gateway API Migration](./gatewayapi-migration.md)

## Best Practices

When administering KServe, consider these best practices:

### For All Inference Types
- **Security Configuration**: Use proper authentication and network policies
- **Monitoring**: Set up monitoring for KServe components and model performance
- **Networking**: Configure appropriate timeouts and retry strategies for model inference

### For Generative Inference
- **Resource Planning**: Ensure adequate GPU resources are available
- **Memory Configuration**: Set higher memory limits and requests
- **Network Configuration**: Use Gateway API for improved streaming capabilities
- **Timeout Settings**: Configure longer timeouts to accommodate generation time

### For Predictive Inference
- **Autoscaling**: Configure appropriate scaling thresholds based on model performance
- **Resource Efficiency**: Consider Serverless or ModelMesh for cost optimization
- **Batch Processing**: Configure batch settings for improved throughput when applicable

## Next Steps

Choose one of the detailed guides to proceed with KServe administration based on your inference workload:

### For Generative Inference
- [Raw Kubernetes Deployment Guide](./kubernetes-deployment.md)
- [Gateway API Migration Guide](./gatewayapi-migration.md)

### For Predictive Inference
- [Raw Kubernetes Deployment Guide](./kubernetes-deployment.md)
- [Serverless Deployment Guide](./serverless/serverless.md)
- [ModelMesh Deployment Guide](./modelmesh.md)
- [Gateway API Migration Guide](./gatewayapi-migration.md)
