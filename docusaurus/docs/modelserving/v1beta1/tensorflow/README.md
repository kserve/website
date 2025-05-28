# TensorFlow Serving Runtime

KServe's TensorFlow serving runtime provides production-ready deployment for TensorFlow SavedModel format with optimized performance and scalability.

## Overview

The TensorFlow runtime is built on [TensorFlow Serving](https://www.tensorflow.org/tfx/guide/serving) and provides:
- **High Performance**: Optimized C++ serving engine
- **Model Versioning**: Support for multiple model versions
- **Batching**: Automatic request batching for throughput
- **GPU Support**: CUDA and TensorRT acceleration
- **Multi-Model**: Serve multiple models in single container

## Supported Formats

| Format          | Extension            | Description                  |
|-----------------|----------------------|------------------------------|
| SavedModel      | `.pb` + `variables/` | TensorFlow's standard format |
| TensorFlow Lite | `.tflite`            | Mobile/edge optimized models |

## Quick Start

### Simple Deployment

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-flowers"
spec:
  predictor:
    tensorflow:
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"
```

### Test the Deployment

```bash
# Wait for ready status
kubectl wait --for=condition=Ready inferenceservice tensorflow-flowers

# Get the endpoint
SERVICE_HOSTNAME=$(kubectl get inferenceservice tensorflow-flowers -o jsonpath='{.status.url}' | cut -d "/" -f 3)

# Make a prediction
curl -X POST https://$SERVICE_HOSTNAME/v1/models/tensorflow-flowers:predict \
  -H "Content-Type: application/json" \
  -d @./flower-input.json
```

## Model Format Requirements

### SavedModel Structure
```
model/
├── saved_model.pb              # Model graph definition
├── variables/
│   ├── variables.data-00000-of-00001  # Model weights
│   └── variables.index         # Variable index
└── assets/ (optional)          # Additional files
    └── vocab.txt
```

### Creating a SavedModel

```python
import tensorflow as tf

# Create and train your model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])

# Compile and train
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')
model.fit(x_train, y_train, epochs=5)

# Save as SavedModel
model.save('/path/to/saved_model/1/')  # Version 1
```

### Model Signatures

Ensure your model has proper signatures:

```python
# Define input signature
@tf.function
def serve_fn(x):
    return model(x)

# Create signature
signatures = {
    'serving_default': serve_fn.get_concrete_function(
        x=tf.TensorSpec(shape=[None, 784], dtype=tf.float32, name='input')
    )
}

# Save with signature
tf.saved_model.save(model, '/path/to/saved_model/1/', signatures=signatures)
```

## Configuration Options

### Basic Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-model"
spec:
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/tensorflow-model"
      resources:
        limits:
          cpu: 1000m
          memory: 2Gi
        requests:
          cpu: 500m
          memory: 1Gi
```

### GPU Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-gpu"
spec:
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/tensorflow-model"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 4Gi
        requests:
          memory: 2Gi
```

### Advanced Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-advanced"
spec:
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/tensorflow-model"
      env:
      - name: TF_CPP_MIN_LOG_LEVEL
        value: "2"
      - name: TENSORFLOW_SERVING_GRPC_PORT
        value: "9000"
      - name: TENSORFLOW_SERVING_REST_PORT  
        value: "8501"
      resources:
        limits:
          cpu: 4000m
          memory: 8Gi
```

## Environment Variables

| Variable                       | Description              | Default       |
|--------------------------------|--------------------------|---------------|
| `STORAGE_URI`                  | Model storage location   | Required      |
| `TF_CPP_MIN_LOG_LEVEL`         | TensorFlow logging level | `0`           |
| `TENSORFLOW_SERVING_GRPC_PORT` | gRPC server port         | `9000`        |
| `TENSORFLOW_SERVING_REST_PORT` | REST server port         | `8501`        |
| `MODEL_NAME`                   | Model name for serving   | Inferred      |
| `MODEL_BASE_PATH`              | Base path for models     | `/mnt/models` |

## Request/Response Examples

### Image Classification

**Input:**
```json
{
  "instances": [
    {
      "image_bytes": {
        "b64": "iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAA+s9J6..."
      }
    }
  ]
}
```

**Response:**
```json
{
  "predictions": [
    [0.1, 0.2, 0.7, 0.0, 0.0]
  ]
}
```

### Text Classification

**Input:**
```json
{
  "instances": [
    "This movie was fantastic!",
    "I didn't like this film at all."
  ]
}
```

**Response:**
```json
{
  "predictions": [
    [0.9, 0.1],
    [0.2, 0.8]
  ]
}
```

### Structured Data

**Input:**
```json
{
  "instances": [
    {
      "feature1": 1.5,
      "feature2": 2.3,
      "feature3": "category_a"
    }
  ]
}
```

## Performance Optimization

### Batching Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-batched"
spec:
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/model"
      env:
      - name: ENABLE_BATCHING
        value: "true"
      - name: MAX_BATCH_SIZE
        value: "32"
      - name: BATCH_TIMEOUT_MICROS
        value: "1000"
```

### TensorRT Optimization

For GPU models, enable TensorRT:

```yaml
env:
- name: USE_TENSORRT
  value: "true"
- name: TENSORRT_PRECISION_MODE
  value: "FP16"  # Options: FP32, FP16, INT8
```

### Memory Optimization

```yaml
env:
- name: TF_GPU_MEMORY_GROWTH
  value: "true"
- name: TF_FORCE_GPU_ALLOW_GROWTH
  value: "true"
```

## Model Versioning

### Multiple Versions

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-versions"
spec:
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/tensorflow-model"
      env:
      - name: MODEL_VERSION_POLICY
        value: '{"all": {}}'  # Serve all versions
```

### Version-Specific Requests

```bash
# Default version
curl -X POST https://$SERVICE_HOSTNAME/v1/models/my-model:predict

# Specific version
curl -X POST https://$SERVICE_HOSTNAME/v1/models/my-model/versions/2:predict
```

## Monitoring and Debugging

### Health Checks

```bash
# Model status
curl https://$SERVICE_HOSTNAME/v1/models/my-model

# Server status
curl https://$SERVICE_HOSTNAME/v1/models
```

### Metrics

TensorFlow Serving exposes metrics at `/monitoring/prometheus/metrics`:

```bash
curl https://$SERVICE_HOSTNAME/monitoring/prometheus/metrics
```

Key metrics include:
- `tensorflow_serving_request_count`
- `tensorflow_serving_request_latency`
- `tensorflow_serving_model_warmup_latency`

### Debug Mode

Enable verbose logging:

```yaml
env:
- name: TF_CPP_MIN_LOG_LEVEL
  value: "0"
- name: TENSORFLOW_SERVING_ENABLE_PROFILER
  value: "true"
```

## Troubleshooting

### Common Issues

**Model Loading Errors:**
```bash
# Check model format
saved_model_cli show --dir /path/to/model --all

# Validate signatures
saved_model_cli show --dir /path/to/model --tag_set serve --signature_def serving_default
```

**Memory Issues:**
```yaml
# Increase memory limits
resources:
  limits:
    memory: 8Gi
env:
- name: TF_GPU_MEMORY_GROWTH
  value: "true"
```

**Performance Issues:**
```yaml
# Enable batching
env:
- name: ENABLE_BATCHING
  value: "true"
- name: MAX_BATCH_SIZE
  value: "64"
```

## Best Practices

1. **Model Optimization**: Use TensorFlow Lite for mobile/edge deployment
2. **Signature Definition**: Always define clear input/output signatures
3. **Resource Limits**: Set appropriate CPU/GPU/memory limits
4. **Batching**: Enable batching for high-throughput scenarios
5. **Monitoring**: Monitor key metrics for performance insights
6. **Versioning**: Use semantic versioning for model updates

## Integration Examples

### With Transformers

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "tensorflow-pipeline"
spec:
  transformer:
    containers:
    - image: my-registry/image-preprocessor:latest
      name: kserve-container
  predictor:
    tensorflow:
      storageUri: "s3://my-bucket/tensorflow-model"
```

### Custom Container

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "custom-tensorflow"
spec:
  predictor:
    containers:
    - name: kserve-container
      image: tensorflow/serving:2.8.0-gpu
      env:
      - name: MODEL_NAME
        value: my-model
      - name: MODEL_BASE_PATH
        value: s3://my-bucket/model
```

## Next Steps

- Learn about [PyTorch Runtime](./torchserve/README.md)
- Explore [Multi-Framework Triton](./triton/torchscript/README.md)
- Configure [Request Batching](../batcher/batcher.md)
- Set up [Model Monitoring](../observability/prometheus_metrics.md)
