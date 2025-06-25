# System Architecture Overview

KServe is a cloud-native, Kubernetes-based model serving platform designed for flexibility, scalability, and production-grade reliability. Its architecture separates management (control plane) from high-performance inference (data plane), supporting a wide range of ML frameworks and deployment patterns.

## Key Concepts

- **Control Plane**: Manages the lifecycle of inference services, inference graphs, resource orchestration, autoscaling, and integration with Kubernetes APIs.
- **Data Plane**: Executes inference requests, model transformations, and explanations with high throughput and low latency.

## Deployment Modes

KServe offers two powerful deployment modes to fit diverse operational needs:

- **RawDeployment Mode (Highly Recommended for LLM Serving)**: Deploys KServe components as standard Kubernetes Deployments, providing maximum control, reliability, and compatibility with enterprise Kubernetes environments. RawDeployment mode is ideal for users who require predictable scaling, advanced networking, and direct integration with Kubernetes-native tools. This mode is now the preferred choice for most production scenarios, and is especially recommended for serving Large Language Models (LLMs) due to its flexibility and advanced features.

- **Serverless Mode**: Leverages Knative for automatic scaling, including scale-to-zero. This mode is well-suited for dynamic workloads and environments where resource efficiency is critical, but may introduce additional complexity and dependencies.

## In This Section

- **[Control Plane](control-plane.md)**: Learn how KServe manages model lifecycles, autoscaling, and orchestration
- **[Data Plane](./data-plane/data-plane.md)**: Explore how inference requests are processed, including protocol support and performance optimizations

## What's Next?

Continue to the [Control Plane](control-plane.md) or [Data Plane](./data-plane/data-plane.md) documentation for a deeper technical dive, or explore the [Resources](../resources/) section to understand KServe's custom Kubernetes resources.
