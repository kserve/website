---
sidebar_position: 1
---

# Welcome to KServe

**KServe** is a standard Model Inference Platform on Kubernetes, built for highly scalable predictive and generative inference workloads.

## What is KServe?

KServe provides a Kubernetes [Custom Resource Definition](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) for serving machine learning (ML) models on arbitrary frameworks. It aims to solve production model serving use cases by providing performant, standardized inference protocol across ML frameworks.

### Key Benefits

✅ **Multi-framework Model Serving** - Deploy models from TensorFlow, PyTorch, Scikit-Learn, XGBoost, Hugging Face, and more  
✅ **Serverless Inference Workloads** - Automatic scaling including scale-to-zero on both CPU and GPU  
✅ **High Scalability & Density** - Intelligent routing and density packing using ModelMesh  
✅ **Advanced Deployments** - Canary rollouts, experiments, ensembles, and transformers  
✅ **Production ML Serving** - Prediction, pre/post processing, monitoring, and explainability  
✅ **Standard Inference Protocol** - Support for Open Inference Protocol (V1/V2) across frameworks

## Architecture Overview

KServe consists of two main components:

### Control Plane
- **InferenceService CRD** - Manages model serving lifecycle
- **Serving Runtime** - Pluggable model runtime implementations  
- **Model Storage** - Support for various storage systems (S3, GCS, PVC, etc.)

### Data Plane  
- **Predictor** - Serves model predictions
- **Transformer** - Pre/post processing logic
- **Explainer** - Model explanations and interpretability

## Quick Start

Ready to deploy your first model? Choose your path:

### 🚀 [Get Started with KServe](./getting-started/first-isvc.md)
Deploy your first scikit-learn model in minutes

### 🏗️ [Installation Guide](./admin/serverless/serverless.md)  
Set up KServe on your Kubernetes cluster

### 📚 [Model Serving Guide](./modelserving/control_plane.md)
Learn about different serving patterns and frameworks

## Supported Model Frameworks

### Predictive Inference
- **Scikit-Learn** - Python-based ML models
- **XGBoost** - Gradient boosting framework  
- **TensorFlow** - Deep learning models
- **PyTorch** - PyTorch models via TorchServe
- **ONNX** - Open Neural Network Exchange models
- **Hugging Face** - Transformers and NLP models
- **MLflow** - MLflow packaged models
- **Custom Runtimes** - Bring your own serving logic

### Generative Inference  
- **Large Language Models (LLMs)** - Text generation via vLLM
- **Hugging Face Transformers** - Text2Text generation
- **Multi-node Inference** - Distributed LLM serving

### Multi-Framework Support
- **NVIDIA Triton** - High-performance inference server
- **AMD** - Optimized inference on AMD hardware

## Use Cases

### Real-time Inference
Serve models with low latency for real-time applications like recommendation systems, fraud detection, and image recognition.

### Batch Processing  
Process large volumes of data efficiently with batch inference capabilities.

### A/B Testing
Compare model performance with traffic splitting and canary deployments.

### Multi-Model Serving
Deploy multiple models efficiently with ModelMesh for high-density scenarios.

## What's Next?

- 📖 **[First InferenceService](./getting-started/first-isvc.md)** - Deploy your first model
- 🔧 **[Administration Guide](./admin/serverless/serverless.md)** - Install and configure KServe  
- 🎯 **[Model Serving](./modelserving/control_plane.md)** - Learn serving patterns
- 🌐 **[API Reference](./reference/api.md)** - Explore the complete API
- 👥 **[Community](./community/adopters.md)** - Join the KServe community

## Community & Support

- **GitHub**: [github.com/kserve/kserve](https://github.com/kserve/kserve)
- **Slack**: [Kubeflow Slack #kserve](https://kubeflow.slack.com/archives/C06982X42KC)  
- **Mailing List**: [kserve-dev@lists.lfaidata.foundation](mailto:kserve-dev@lists.lfaidata.foundation)
- **Community Meetings**: [Monthly meetings calendar](https://github.com/kserve/community)

- **InferenceService**: The main resource for deploying ML models
- **ClusterServingRuntime**: Define cluster-wide model runtimes
- **ServingRuntime**: Namespace-scoped runtime definitions

## Learning Path

1. **Start Here**: [Deploy your first model](/docs/getting-started/first-isvc)
2. **Learn the Basics**: [Model Serving Guide](/docs/modelserving/control_plane)
3. **API Reference**: [Complete API documentation](/docs/reference/api)
4. **Join the Community**: [See who's using KServe](/docs/community/adopters)

## Need Help?

- 💬 Join our [Slack community](https://kubeflow.slack.com/)
- 🐛 Report issues on [GitHub](https://github.com/kserve/kserve/issues)
- 📖 Browse the [API reference](/docs/reference/api)
- 🎯 Check out [real-world examples](https://github.com/kserve/kserve/tree/master/docs/samples)

---

*KServe is a [CNCF](https://cncf.io) incubating project and part of the [Kubeflow](https://kubeflow.org) ecosystem.*
