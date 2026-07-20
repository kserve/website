---
title: KServe Concepts
---
# KServe Concepts

Welcome to the KServe Concepts section! This section provides a comprehensive overview of the key concepts, components, and architecture that make up the KServe model serving platform.

## Architecture

KServe follows a clean separation between control plane and data plane components:

- **[Architecture Overview](architecture/index.md)**: Understand the high-level architecture of KServe, including its control and data planes
- **[Control Plane](architecture/control-plane.md)**: Manages the lifecycle of inference services, inference graphs, handles resource creation, and coordinates with Kubernetes
- **[Data Plane](architecture/data-plane/data-plane.md)**: Handles actual inference requests, including generation, prediction, transformation, and explanation workflows

## Resources

KServe extends Kubernetes with custom resources for declarative model serving:

- **[InferenceService](./resources/index.md#inferenceservice)**: The primary resource for deploying and managing model serving workloads
- **[InferenceGraph](./resources/index.md#inferencegraph)**: Orchestrates complex multi-model inference workflows
- **[ServingRuntime](./resources/index.md#clusterservingruntime--servingruntime)**: Defines runtime environments for serving models
- **[StorageContainer](./resources/index.md#storage-resources)**: Manages model storage and access patterns
- **[LocalModelCache](./resources/index.md#local-model-cache-resources)**: Enables local model caching and management
- **[Configuration Resources](./resources/index.md#configuration-resources)**: Standard Kubernetes resources used for KServe configuration

## Next Steps

Ready to dive deeper? Start with the [Architecture](./architecture/index.md) section to understand how KServe works under the hood, or jump to [Resources](./resources/index.md) to learn about the specific Kubernetes resources that power KServe.

