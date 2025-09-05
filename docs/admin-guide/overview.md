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

If you are familiar with KServe, you can skip the introductory sections and jump directly to the relevant [deployment guides](#installation).

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

## Installation

KServe can be installed using one of three supported deployment modes. This Installation sections describe what each mode is best for, the common prerequisites, and how to choose the correct guide for your workload.

- **[Install with Raw Kubernetes Deployment](./kubernetes-deployment.md)** - suitable for both generative and predictive inference workloads
- **[Install with Serverless Deployment](./serverless/serverless.md)** - suitable for burst and unpredictable traffic workloads with scale to zero features for cost optimization.
- **[Install with ModelMesh Deployment](./modelmesh.md)** - suitable for high-density, multi-model scenarios

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
