# Serving Runtimes

KServe provides a flexible runtime system that supports multiple ML frameworks and custom model servers. Serving runtimes define how models are loaded, executed, and served.

## Overview

A ServingRuntime defines the container image, environment, and configuration needed to serve models of specific formats. KServe includes built-in runtimes for popular frameworks and supports custom runtimes.

## Built-in Runtimes

### Predictive Inference Runtimes

#### Scikit-Learn Runtime
- **Supported Formats**: sklearn, pickle
- **Features**: CPU-optimized, lightweight
- **Use Cases**: Traditional ML models, ensemble methods

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-model
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://bucket/sklearn/model"
```

#### TensorFlow Runtime
- **Supported Formats**: tensorflow, savedmodel
- **Features**: GPU support, TensorFlow Serving backend
- **Use Cases**: Deep learning models, computer vision

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: tensorflow-model
spec:
  predictor:
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://bucket/tensorflow/model"
```

#### PyTorch Runtime (TorchServe)
- **Supported Formats**: pytorch
- **Features**: Multi-model serving, custom handlers
- **Use Cases**: PyTorch models, research to production

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: pytorch-model
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: "gs://bucket/pytorch/model.mar"
```

#### XGBoost Runtime
- **Supported Formats**: xgboost
- **Features**: Optimized for gradient boosting
- **Use Cases**: Tabular data, feature engineering

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: xgboost-model
spec:
  predictor:
    model:
      modelFormat:
        name: xgboost
      storageUri: "gs://bucket/xgboost/model.json"
```

#### ONNX Runtime
- **Supported Formats**: onnx
- **Features**: Cross-platform, hardware acceleration
- **Use Cases**: Optimized inference, model portability

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: onnx-model
spec:
  predictor:
    model:
      modelFormat:
        name: onnx
      storageUri: "gs://bucket/onnx/model.onnx"
```

#### Hugging Face Runtime
- **Supported Formats**: huggingface
- **Features**: Transformer models, tokenization
- **Use Cases**: NLP tasks, text classification

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-model
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: "hf://huggingface.co/distilbert-base-uncased"
```

### Generative Inference Runtimes

#### vLLM Runtime
- **Supported Formats**: Large Language Models
- **Features**: PagedAttention, continuous batching
- **Use Cases**: Text generation, chat applications

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama-model
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: "hf://meta-llama/Llama-2-7b-chat-hf"
      runtime: vllm
```

### Multi-Framework Runtimes

#### NVIDIA Triton
- **Supported Formats**: tensorflow, pytorch, onnx, tensorrt
- **Features**: High performance, dynamic batching
- **Use Cases**: Production inference, GPU optimization

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: triton-model
spec:
  predictor:
    model:
      modelFormat:
        name: triton
      storageUri: "gs://bucket/triton/model_repository"
```

## Custom Serving Runtimes

### Creating a Custom Runtime

Define a custom ServingRuntime resource:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: my-custom-runtime
spec:
  supportedModelFormats:
    - name: custom-format
      version: "1"
      autoSelect: true
  containers:
    - name: kserve-container
      image: my-registry/custom-runtime:latest
      ports:
        - containerPort: 8080
          protocol: TCP
      env:
        - name: MODEL_NAME
          value: "{{.Name}}"
        - name: MODEL_PATH
          value: "/opt/model"
      resources:
        requests:
          cpu: 1
          memory: 2Gi
        limits:
          cpu: 2
          memory: 4Gi
```

### Runtime Specification

#### Required Fields

- **supportedModelFormats**: List of supported model formats
- **containers**: Container specification for the runtime
- **ports**: Network ports exposed by the runtime

#### Optional Fields

- **multiModel**: Enable multi-model serving
- **grpcDataEndpoint**: gRPC endpoint configuration
- **grpcMultiModelManagementEndpoint**: Multi-model management endpoint
- **disabled**: Disable the runtime

### Example Custom Python Runtime

```python
# custom_runtime.py
import os
import json
from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Load model on startup
MODEL_PATH = os.environ.get('MODEL_PATH', '/opt/model')
model = joblib.load(f"{MODEL_PATH}/model.pkl")

@app.route('/v1/models/<model_name>:predict', methods=['POST'])
def predict(model_name):
    data = request.get_json()
    instances = data['instances']
    predictions = model.predict(instances).tolist()
    return jsonify({'predictions': predictions})

@app.route('/v1/models/<model_name>', methods=['GET'])
def metadata(model_name):
    return jsonify({
        'name': model_name,
        'versions': ['1'],
        'platform': 'custom-runtime',
        'inputs': [...],  # Define input schema
        'outputs': [...]  # Define output schema
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Dockerfile for Custom Runtime

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY custom_runtime.py .

EXPOSE 8080

CMD ["python", "custom_runtime.py"]
```

## Runtime Selection

### Automatic Selection

KServe automatically selects runtimes based on model format:

```yaml
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn  # Automatically selects sklearn runtime
      storageUri: "gs://bucket/model"
```

### Explicit Runtime Selection

Override automatic selection:

```yaml
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      runtime: my-custom-runtime  # Use specific runtime
      storageUri: "gs://bucket/model"
```

## Runtime Configuration

### Environment Variables

Configure runtime behavior with environment variables:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: configured-runtime
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      env:
        - name: BATCH_SIZE
          value: "32"
        - name: TIMEOUT
          value: "60"
        - name: WORKERS
          value: "4"
```

### Resource Requirements

Set CPU and memory requirements:

```yaml
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      resources:
        requests:
          cpu: 2
          memory: 4Gi
          nvidia.com/gpu: 1
        limits:
          cpu: 4
          memory: 8Gi
          nvidia.com/gpu: 1
```

### Volume Mounts

Mount additional volumes:

```yaml
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      volumeMounts:
        - name: model-cache
          mountPath: /cache
  volumes:
    - name: model-cache
      emptyDir: {}
```

## Multi-Model Serving

### Enable Multi-Model Support

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: multi-model-runtime
spec:
  multiModel: true
  supportedModelFormats:
    - name: sklearn
      version: "1"
  containers:
    - name: kserve-container
      image: multi-model-runtime:latest
      ports:
        - containerPort: 8080
          name: http1
          protocol: TCP
        - containerPort: 8081
          name: grpc
          protocol: TCP
```

### Multi-Model Management API

Multi-model runtimes expose additional endpoints:

- `POST /v2/repository/models/{model_name}/load` - Load a model
- `POST /v2/repository/models/{model_name}/unload` - Unload a model
- `GET /v2/repository/models` - List loaded models

## Performance Optimization

### Batching Configuration

Configure request batching:

```yaml
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      env:
        - name: MAX_BATCH_SIZE
          value: "32"
        - name: BATCH_TIMEOUT
          value: "100ms"
```

### GPU Optimization

Optimize for GPU inference:

```yaml
spec:
  containers:
    - name: kserve-container
      image: gpu-runtime:latest
      env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        - name: TENSORRT_OPTIMIZATION
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
```

## Monitoring and Observability

### Metrics Endpoints

Expose metrics for monitoring:

```yaml
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: metrics
```

### Health Checks

Configure health check endpoints:

```yaml
spec:
  containers:
    - name: kserve-container
      image: runtime:latest
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 30
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 10
```

## Runtime Examples

### Complete Runtime Examples

Browse complete runtime implementations:

- **[Custom Python Runtime](https://github.com/kserve/kserve/tree/main/python/custom_runtime)**
- **[TensorFlow Runtime](https://github.com/kserve/kserve/tree/main/python/tensorflow_runtime)**
- **[MLflow Runtime](https://github.com/kserve/kserve/tree/main/python/mlflow_runtime)**

## Best Practices

### Runtime Development

1. **Follow API Standards**: Implement standard inference protocols
2. **Handle Errors Gracefully**: Provide meaningful error messages
3. **Optimize Performance**: Use appropriate batching and caching
4. **Resource Management**: Set proper resource limits
5. **Security**: Implement proper authentication and validation

### Deployment

1. **Version Management**: Tag runtime images appropriately
2. **Testing**: Test runtimes thoroughly before production
3. **Monitoring**: Include comprehensive monitoring and logging
4. **Documentation**: Document runtime capabilities and usage

## Next Steps

- [Explore specific framework examples](../modelserving/v1beta1/serving_runtime.md)
- [Learn about multi-model serving](../modelserving/mms/multi-model-serving.md)
- [Set up runtime monitoring](../modelserving/observability/prometheus_metrics.md)
