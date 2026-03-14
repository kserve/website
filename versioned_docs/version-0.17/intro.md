---
description: "KServe is a cloud-native platform for serving AI models at scale. Learn how KServe simplifies deploying and managing AI workloads across clouds and on-premises."
---

# Welcome to KServe

**Deploy and scale AI models effortlessly** - from cutting-edge Large Language Models to traditional ML models - with enterprise-grade reliability across any cloud or on-premises environment.

## Why KServe?

KServe eliminates the complexity of productionizing AI models. Whether you're a data scientist wanting to deploy your latest LLM experiment, a DevOps engineer building scalable ML infrastructure, or a decision maker evaluating AI platforms, KServe provides a unified solution that works across clouds and scales with your needs.

**🚀 From Experiment to Production in Minutes** - Deploy GenAI services and ML models with simple YAML configurations, no complex infrastructure setup required.

**☁️ Cloud-Agnostic by Design** - Run anywhere: AWS, Azure, GCP, on-premises, or hybrid environments with consistent behavior.

**📈 Enterprise-Scale Ready** - Automatically handle traffic spikes, scale to zero when idle, and manage hundreds of models efficiently.

## What Makes KServe Different?

### **GenAI-First Platform** 
Deploy Large Language Models with **OpenAI-compatible APIs** out of the box. Chat completions, streaming responses, embeddings - all just work with your existing tools and SDKs.

### **Universal ML Support**
Beyond GenAI, serve any ML framework: TensorFlow, PyTorch, Scikit-Learn, XGBoost, and more. One platform for all your AI workloads.

### **Zero Infrastructure Overhead**
Focus on your models, not infrastructure. KServe handles load balancing, autoscaling, canary deployments, and monitoring automatically.

### **Production-Ready Security**
Enterprise authentication, network policies, and compliance features built-in. Deploy with confidence in regulated environments.

### Key Benefits

#### Generative Inference Benefits
✅ **LLM Multi-framework Support** - Deploy LLMs from Hugging Face, vLLM, and custom generative models  
✅ **OpenAI-Compatible APIs** - Chat completion, completion, streaming, and embedding endpoints  
✅ **LocalModelCache for LLMs** - Cache large models locally to reduce startup time from 15-20 minutes to ~1 minute  
✅ **KV Cache Offloading** - Optimized memory management for long conversations and large contexts  
✅ **Multi-node Inference** - Distributed LLM serving  
✅ **Envoy AI Gateway Integration** - Enterprise-grade API management and routing for AI workloads  
✅ **Metric-based Autoscaling** - Scale based on token throughput, queue depth, and GPU utilization  
✅ **Advanced Generative Deployments** - Canary rollouts and A/B testing for LLM experiments

#### Predictive Inference Benefits  
✅ **Multi-framework Model Serving** - Deploy models from TensorFlow, PyTorch, Scikit-Learn, XGBoost, and more  
✅ **InferenceGraph for Model Ensembles** - Chain and ensemble multiple models together for complex workflows  
✅ **Batch Prediction Support** - Efficient processing of large datasets with batch inference capabilities  
✅ **Preprocessing & Postprocessing** - Built-in data transformation pipelines and feature engineering  
✅ **Real-time Scoring** - Low-latency prediction serving for real-time applications  
✅ **Production ML Monitoring** - Comprehensive observability, drift detection, and explainability  
✅ **Standard Inference Protocols** - Support for Open Inference Protocol (V1/V2) across frameworks

#### Universal Benefits (Both Inference Types)
✅ **Serverless Inference Workloads** - Automatic scaling including scale-to-zero on both CPU and GPU  
✅ **High Scalability & Density** - Intelligent routing and density packing using ModelMesh  
✅ **Enterprise-Ready Operations** - Production monitoring, logging, and observability out of the box

## How It Works

**Simple Deployment Model**: Describe your model requirements in a simple configuration file, and KServe handles the rest - from container orchestration to load balancing.

**Built on Kubernetes**: KServe extends Kubernetes with custom resources specifically designed for AI/ML workloads, providing cloud-native scalability and reliability while abstracting away the complexity.

**Pluggable Architecture**: Support for multiple serving runtimes means you can use the best inference engine for your specific model type - whether that's vLLM for LLMs, TorchServe for PyTorch models, or custom containers for specialized needs.

## Architecture Overview

KServe consists of two main components:

### Control Plane
- **InferenceService CRD** - Manages model serving lifecycle
- **InferenceGraph CRD** - Orchestrates model ensembles and chaining workflows
- **Serving Runtime** - Pluggable model runtime implementations
- **ClusterServingRuntime**: Define cluster-wide model runtimes
- **LocalModelCache CRD** - Cache large models locally on nodes for faster startup and scaling
- **Model Storage** - Support for various storage systems (Huggingface, S3, GCS, Azure, PVC, etc.)

### Data Plane  
- **Predictor** - Serves model predictions
- **Transformer** - Pre/post processing logic
- **Explainer** - Model explanations and interpretability

## Quick Start

Ready to deploy your first model? Choose your path:

### 🚀 [Get Started with KServe](./getting-started/genai-first-isvc.md)
Deploy your first GenAI service with Qwen LLM in minutes

### 🏗️ [Installation Guide](./admin-guide/overview.md)  
Set up KServe on your Kubernetes cluster

### 📚 [Model Serving Guide](./concepts/architecture/control-plane.md)
Learn about different serving patterns and frameworks

## Supported Model Frameworks

### Predictive Inference
- **Scikit-Learn** - Python-based ML models
- **XGBoost** - Gradient boosting framework  
- **TensorFlow** - Deep learning models
- **PyTorch** - PyTorch models via Triton
- **ONNX** - Open Neural Network Exchange models
- **TRT** - TensorRT optimized models
- **Hugging Face** - Transformers and NLP models
- **MLflow** - MLflow packaged models
- **Custom Runtimes** - Bring your own serving logic

### Generative Inference  
- **Large Language Models (LLMs)** - Text generation via vLLM
- **Hugging Face Transformers** - Text2Text generation
- **OpenAI-Compatible APIs** - Chat completions, embeddings, and more

### Multi-Framework Support
- **NVIDIA Triton** - High-performance inference server
- **AMD** - Optimized inference on AMD hardware

## What's Next?

- 📖 **[First GenAI InferenceService](./getting-started/genai-first-isvc.md)** - Deploy your first GenAI model
- 📖 **[First Predictive InferenceService](./getting-started/predictive-first-isvc.md)** - Deploy your first predictive model
- 📖 **[KServe Concepts](./concepts/index.md)** - Understand the core concepts of KServe
- 🔧 **[Administration Guide](./admin-guide/overview.md)** - Install and configure KServe
- 🎯 **[Model Serving](./concepts/architecture/control-plane.md)** - Learn serving patterns
- 🌐 **[API Reference](./reference/crd-api.mdx)** - Explore the complete API
- 👥 **[Community](./community/adopters.md)** - Join the KServe community

## Community & Support

- **GitHub**: [github.com/kserve/kserve](https://github.com/kserve/kserve)
- **Slack**: [CNCF Slack #kserve](https://cloud-native.slack.com/archives/C06AH2C3K8B)  
- **Community Meetings**: [Monthly meetings calendar](https://github.com/kserve/community)

## Learning Path

1. **Start Here**: [Deploy your first GenAI model](./getting-started/genai-first-isvc.md) or [Deploy your first predictive model](./getting-started/predictive-first-isvc.md) 
1. **Learn the Basics**: [Model Serving Guide](./concepts/architecture/control-plane.md)
1. **API Reference**: [Complete API documentation](./reference/crd-api.mdx)
1. **Join the Community**: [See who's using KServe](./community/get-involved.md)

## Need Help?

- 💬 Join our [Slack community](https://slack.cncf.io/)
- 🐛 Report issues on [GitHub](https://github.com/kserve/kserve/issues)
- 📖 Browse the [API reference](./reference/crd-api.mdx)
---

*KServe is a [CNCF](https://cncf.io) incubating project and part of the [Kubeflow](https://kubeflow.org) ecosystem.*
