---
title: KServe Concepts
---
# KServe Concepts

Welcome to the KServe Concepts section! This section provides a comprehensive overview of the key concepts, components, and architecture that make up the KServe model serving platform.

## Architecture

KServe follows a clean separation between control plane and data plane components:

- **[System Architecture Overview](architecture/)**: High-level architectural overview including deployment modes and component interactions
- **[Control Plane](architecture/control_plane.md)**: Manages the lifecycle of inference services, inference graphs, handles resource creation, and coordinates with Kubernetes
- **[Data Plane](architecture/data_plane.md)**: Handles actual inference requests, including generation, prediction, transformation, and explanation workflows

## Resources

KServe extends Kubernetes with custom resources for declarative model serving:

- **[Resources Overview](resources/)**: Complete guide to KServe custom resources and their relationships
- **[InferenceService](resources/inference_service.md)**: The primary resource for deploying and managing model serving workloads
- **[InferenceGraph](resources/inference_graph.md)**: Orchestrates complex multi-model inference workflows
- **[ServingRuntime](resources/serving_runtime.md)**: Defines runtime environments for serving models
- **[StorageContainer](resources/storage_container.md)**: Manages model storage and access patterns

## Next Steps

Ready to dive deeper? Start with the [Architecture](architecture/) section to understand how KServe works under the hood, or jump to [Resources](resources/) to learn about the specific Kubernetes resources that power KServe.

