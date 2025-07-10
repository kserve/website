---
title: Resources
---

# KServe Resources

KServe extends Kubernetes with custom resources that enable declarative model serving. This section covers all the custom resources provided by KServe and how they work together to create a complete model serving platform.

## Overview

KServe introduces several Custom Resource Definitions (CRDs) that allow you to declaratively define and manage model serving workloads using standard Kubernetes patterns. These resources are managed by the KServe control plane and enable everything from simple single-model serving to complex inference graphs.

## Core Resources

### InferenceService
The primary resource for deploying and managing model serving workloads:

- **[InferenceService](../../reference/api.mdx#inferenceservice)**: The main abstraction for deploying models with automatic scaling, versioning, and traffic management
- **[InferenceService Spec](../../reference/api.mdx#inferenceservice)**: Detailed specification reference for InferenceService configurations

### InferenceGraph
Orchestrates complex multi-model inference workflows:

- **[InferenceGraph](../../model-serving/inferencegraph/overview.md)**: CRD that Defines and manages inference pipelines and model chains
- **[Graph Routing](../../model-serving/inferencegraph/overview.md)**: Request routing and data flow within inference graphs

## Runtime Resources

### ClusterServingRuntime & ServingRuntime
Define the runtime environments for serving models:

- **[ClusterServingRuntime](servingruntime.md)**: CRD for Cluster-wide runtime definitions available to all namespaces
- **[ServingRuntime](servingruntime.md)**: CRD for Namespace-scoped runtime definitions for specific workloads
- **[Custom Runtimes](../../model-serving/predictive-inference/frameworks/custom-predictor/custom-predictor.md)**: Creating and configuring custom model serving runtimes

## Storage Resources

### ClusterStorageContainer & StorageContainer
Manage model storage and access patterns:

- **[ClusterStorageContainer](../../model-serving/storage/storage-containers/storage-containers.md)**: CRD for Cluster-wide storage configuration for model repositories
- **[Storage Backends](../../model-serving/storage/overview.md)**: Supported storage systems and configuration options

## Local Model Cache Resources

### LocalModel & LocalModelNode
Enables local model caching and management:
- **[Concepts](../../model-serving/generative-inference/modelcache/localmodel.md)**: Overview of local model caching in KServe.
- **[LocalModelCache](../../reference/api.mdx)**: CRD that Defines local model caching requirements and policies
- **[LocalModelNode](../../reference/api.mdx)**: CRD that handles Node-level model caching management
- **[LocalModelNodeGroup](../../reference/api.mdx)**: CRD for Grouping of local model nodes for management and orchestration of cached models

## Configuration Resources

### ConfigMaps and Secrets
Standard Kubernetes resources used for KServe configuration:

- **[InferenceService ConfigMap](../../admin-guide/configurations.md)**: Global configuration for InferenceService behavior
- **[Logger ConfigMap](../../admin-guide/configurations.md)**: Logging and observability configuration
- **[Ingress Configuration](../../admin-guide/configurations.md)**: Gateway and routing configuration

## Resource Relationships

Understanding how KServe resources interact with each other:

```
┌─────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ InferenceService│───▶│ ServingRuntime     │───▶│ StorageContainer │
│                 │    │                    │    │                  │
└─────────────────┘    └────────────────────┘    └──────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌────────────────────┐
│ InferenceGraph  │    │ LocalModel         │
│                 │    │                    │
└─────────────────┘    └────────────────────┘
```


## API Reference

For complete API specifications, see:
- [KServe API Reference](../../reference/api.mdx)

## Next Steps

- Start with [InferenceService](../../getting-started/genai-first-isvc.md) to understand the core serving resource
- Explore [ServingRuntime](servingruntime.md) to understand runtime configuration
- Learn about [InferenceGraph](../../model-serving/inferencegraph/overview.md) for advanced inference workflows
