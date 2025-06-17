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

- **[InferenceService](inference_service.md)**: The main abstraction for deploying models with automatic scaling, versioning, and traffic management
- **[InferenceService Spec](inference_service_spec.md)**: Detailed specification reference for InferenceService configurations
- **[Traffic Management](traffic_management.md)**: Advanced traffic splitting and canary deployment features

### InferenceGraph
Orchestrates complex multi-model inference workflows:

- **[InferenceGraph](inference_graph.md)**: Defines and manages inference pipelines and model chains
- **[Graph Routing](graph_routing.md)**: Request routing and data flow within inference graphs
- **[Pipeline Transformations](pipeline_transformations.md)**: Data transformation between graph nodes

## Runtime Resources

### ClusterServingRuntime & ServingRuntime
Define the runtime environments for serving models:

- **[ClusterServingRuntime](cluster_serving_runtime.md)**: Cluster-wide runtime definitions available to all namespaces
- **[ServingRuntime](serving_runtime.md)**: Namespace-scoped runtime definitions for specific workloads
- **[Custom Runtimes](custom_runtimes.md)**: Creating and configuring custom model serving runtimes

## Storage Resources

### ClusterStorageContainer & StorageContainer
Manage model storage and access patterns:

- **[ClusterStorageContainer](cluster_storage_container.md)**: Cluster-wide storage configuration for model repositories
- **[StorageContainer](storage_container.md)**: Namespace-scoped storage configuration
- **[Storage Backends](storage_backends.md)**: Supported storage systems and configuration options

## Local Model Resources

### LocalModel & LocalModelNode
Enable local model caching and management:

- **[LocalModel](local_model.md)**: Defines local model caching requirements and policies
- **[LocalModelNode](local_model_node.md)**: Node-level model storage and caching management
- **[Model Caching](model_caching.md)**: Strategies and configuration for efficient model caching

## Configuration Resources

### ConfigMaps and Secrets
Standard Kubernetes resources used for KServe configuration:

- **[InferenceService ConfigMap](inference_service_config.md)**: Global configuration for InferenceService behavior
- **[Logger ConfigMap](logger_config.md)**: Logging and observability configuration
- **[Ingress Configuration](ingress_config.md)**: Gateway and routing configuration

## Advanced Resources

### TrafficPolicy
Advanced traffic management and routing policies:

- **[TrafficPolicy](traffic_policy.md)**: Define sophisticated traffic routing rules and policies
- **[Load Balancing](load_balancing.md)**: Configure load balancing strategies
- **[Circuit Breakers](circuit_breakers.md)**: Implement fault tolerance patterns

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

## Resource Lifecycle

### Creation and Management
- Resource validation and admission control
- Default value injection and mutation
- Dependency resolution and ordering
- Status reporting and condition management

### Updates and Rollouts
- Rolling updates and canary deployments
- Blue-green deployment strategies
- Rollback capabilities and version management
- Traffic shifting and gradual rollouts

### Cleanup and Deletion
- Cascading deletion policies
- Resource finalizers and cleanup hooks
- Dependency cleanup ordering
- Storage and cache cleanup

## Best Practices

### Resource Organization
- Use namespaces to organize related resources
- Apply consistent labeling strategies
- Implement proper RBAC policies
- Document resource relationships

### Configuration Management
- Use GitOps for resource management
- Implement configuration validation
- Use secrets for sensitive data
- Version your resource configurations

### Monitoring and Observability
- Monitor resource status and conditions
- Implement alerting for resource failures
- Track resource utilization and performance
- Maintain audit trails for changes

## Troubleshooting

Common resource management issues:
- Resource validation failures
- Dependency resolution problems
- Status condition interpretation
- Resource cleanup issues

## API Reference

For complete API specifications, see:
- [KServe API Reference](../api/)
- [OpenAPI Specifications](../api/openapi/)
- [Custom Resource Schemas](../api/schemas/)

## Next Steps

- Start with [InferenceService](inference_service.md) to understand the core serving resource
- Explore [ServingRuntime](serving_runtime.md) to understand runtime configuration
- Learn about [InferenceGraph](inference_graph.md) for advanced inference workflows
