# Serving Runtime Overview

KServe provides built-in serving runtimes for popular machine learning frameworks, allowing you to deploy models without writing custom serving code. Each runtime is optimized for specific model formats and provides framework-specific features.

## Available Runtimes

### Predictive Inference Runtimes

| Runtime          | Supported Formats           | Protocol Support | GPU Support |
|------------------|-----------------------------|------------------|-------------|
| **TensorFlow**   | SavedModel, TensorFlow Lite | V1, V2           | ✅           |
| **PyTorch**      | TorchScript, PyTorch        | V1, V2           | ✅           |
| **Scikit-learn** | Pickle, Joblib              | V1, V2           | ❌           |
| **XGBoost**      | XGBoost, JSON, UBOJ         | V1, V2           | ❌           |
| **LightGBM**     | LightGBM                    | V1, V2           | ❌           |
| **ONNX**         | ONNX                        | V1, V2           | ✅           |
| **MLflow**       | MLflow Models               | V1, V2           | ✅           |
| **PMML**         | PMML                        | V1, V2           | ❌           |
| **Paddle**       | PaddlePaddle                | V1, V2           | ✅           |

### Generative Inference Runtimes

| Runtime                             | Model Types        | Features                   |
|-------------------------------------|--------------------|----------------------------|
| **Hugging Face**                    | Transformers, LLMs | Text Generation, Streaming |
| **vLLM**                            | LLMs               | High-throughput inference  |
| **Text Generation Inference (TGI)** | LLMs               | Optimized text generation  |

### Multi-Framework Runtimes

| Runtime                | Supported Formats                 | Special Features                  |
|------------------------|-----------------------------------|-----------------------------------|
| **Triton**             | TensorFlow, PyTorch, ONNX, Python | Model ensembles, dynamic batching |
| **Multi-Model Server** | Multiple formats                  | Multi-model serving               |

## Runtime Selection Guide

### Choose Based on Model Framework

**For TensorFlow models:**
- Use **TensorFlow Runtime** for SavedModel format
- Use **Triton** for advanced features like ensembles
- Use **MLflow** if model is packaged with MLflow

**For PyTorch models:**
- Use **TorchServe** for general PyTorch models
- Use **Hugging Face** for transformer models
- Use **Triton** for TensorRT optimization

**For Scikit-learn models:**
- Use **Scikit-learn Runtime** for simple deployment
- Use **MLflow** for complex pipelines

### Choose Based on Requirements

**High Throughput:**
- Triton with dynamic batching
- vLLM for language models
- TensorRT optimization

**Multi-Model Serving:**
- ModelMesh
- Triton with model repository

**Custom Processing:**
- Custom predictor
- Transformer components

## Runtime Configuration

### Basic InferenceService

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    sklearn:
      storageUri: "gs://my-bucket/sklearn-model"
```

### Advanced Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-model"
spec:
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/pytorch-model"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 4Gi
        requests:
          memory: 2Gi
      env:
      - name: STORAGE_URI
        value: "s3://my-bucket/pytorch-model"
```

### Custom Runtime

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"  
metadata:
  name: "custom-model"
spec:
  predictor:
    containers:
    - name: kserve-container
      image: "my-registry/custom-model:latest"
      env:
      - name: STORAGE_URI
        value: "gs://my-bucket/model"
```

## Runtime Features

### Automatic Model Loading
- Download models from various storage backends
- Validate model format and structure
- Handle model versioning

### Protocol Support
- REST API endpoints (V1/V2)
- gRPC support (where available)
- Standardized request/response formats

### Scaling and Performance
- Horizontal pod autoscaling
- Request batching
- GPU acceleration
- Multi-model serving

### Monitoring and Observability
- Health checks and readiness probes
- Prometheus metrics
- Request logging
- Distributed tracing

## Model Format Requirements

### TensorFlow
```
model/
├── saved_model.pb
├── variables/
│   ├── variables.data-00000-of-00001
│   └── variables.index
└── assets/ (optional)
```

### PyTorch
```
# TorchScript model
model.pt

# Or PyTorch state dict
model/
├── model.py
├── model.pth
└── config.json
```

### Scikit-learn
```
# Pickle format
model.pkl

# Or joblib format  
model.joblib
```

### ONNX
```
model.onnx
```

## Environment Variables

Common environment variables across runtimes:

| Variable       | Description            | Default   |
|----------------|------------------------|-----------|
| `STORAGE_URI`  | Model storage location | Required  |
| `MODEL_NAME`   | Model name             | Inferred  |
| `SERVICE_TYPE` | Service type           | `predict` |
| `WORKERS`      | Number of workers      | 1         |
| `HTTP_PORT`    | HTTP server port       | 8080      |

## Best Practices

### Model Packaging
1. **Version your models** consistently
2. **Include metadata** about model requirements
3. **Test models locally** before deployment
4. **Use appropriate storage** backends

### Resource Management
1. **Set resource limits** to prevent OOM issues
2. **Configure GPU allocation** appropriately
3. **Use node selectors** for specialized hardware
4. **Monitor resource usage**

### Security
1. **Use secure storage** with proper authentication
2. **Apply network policies** to restrict access
3. **Scan container images** for vulnerabilities
4. **Use least-privilege principles**

## Troubleshooting

### Common Issues

**Model Loading Failures:**
```bash
# Check model format
kubectl describe inferenceservice my-model

# View container logs
kubectl logs -l serving.kserve.io/inferenceservice=my-model
```

**Performance Issues:**
```bash
# Check resource utilization
kubectl top pods -l serving.kserve.io/inferenceservice=my-model

# Monitor metrics
curl http://model-endpoint/metrics
```

### Debug Mode
Enable debug logging:
```yaml
spec:
  predictor:
    sklearn:
      env:
      - name: LOG_LEVEL
        value: "DEBUG"
```

## Next Steps

- Choose a [specific runtime guide](./serving_runtime) for your framework
- Learn about [custom predictors](/docs/modelserving/v1beta1/custom/custom_model/)
- Explore [multi-model serving](../mms/multi-model-serving) options
- Configure [autoscaling](/docs/modelserving/autoscaling/autoscaling.md) for your workload
