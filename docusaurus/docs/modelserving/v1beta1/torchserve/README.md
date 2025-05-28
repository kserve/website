# PyTorch TorchServe Runtime

KServe's PyTorch serving runtime is built on [TorchServe](https://pytorch.org/serve/) and provides scalable deployment for PyTorch models with advanced features like multi-model serving and custom handlers.

## Overview

TorchServe runtime provides:
- **Multi-Model Serving**: Serve multiple models in a single container
- **Dynamic Batching**: Automatic request batching for improved throughput
- **A/B Testing**: Support for model versioning and traffic splitting
- **Custom Handlers**: Extensible preprocessing and postprocessing
- **GPU Support**: CUDA acceleration and multi-GPU serving
- **Metrics**: Built-in monitoring and observability

## Supported Formats

| Format      | Extension      | Description                     |
|-------------|----------------|---------------------------------|
| TorchScript | `.pt`, `.pth`  | Serialized PyTorch models       |
| Eager Mode  | `.py` + `.pth` | Python models with state dict   |
| MAR Files   | `.mar`         | TorchServe Model Archive format |

## Quick Start

### Simple Deployment

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-cifar10"
spec:
  predictor:
    pytorch:
      storageUri: "gs://kfserving-examples/models/pytorch/cifar10"
```

### Test the Deployment

```bash
# Wait for ready status
kubectl wait --for=condition=Ready inferenceservice pytorch-cifar10

# Get the endpoint
SERVICE_HOSTNAME=$(kubectl get inferenceservice pytorch-cifar10 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

# Make a prediction
curl -X POST https://$SERVICE_HOSTNAME/v1/models/pytorch-cifar10:predict \
  -H "Content-Type: application/json" \
  -d @./cifar10-input.json
```

## Model Formats

### TorchScript Models

Create a TorchScript model:

```python
import torch
import torchvision.models as models

# Load pretrained model
model = models.resnet18(pretrained=True)
model.eval()

# Create example input
example_input = torch.rand(1, 3, 224, 224)

# Convert to TorchScript
traced_model = torch.jit.trace(model, example_input)

# Save the model
traced_model.save("model.pt")
```

### Eager Mode Models

For complex models requiring custom logic:

```python
# model.py
import torch
import torch.nn as nn

class MyModel(nn.Module):
    def __init__(self):
        super(MyModel, self).__init__()
        self.linear = nn.Linear(784, 10)
    
    def forward(self, x):
        return self.linear(x.view(x.size(0), -1))

# Save model
model = MyModel()
torch.save(model.state_dict(), "model.pth")
```

### Model Archive (MAR) Format

Create a MAR file for advanced serving:

```bash
# Install torch-model-archiver
pip install torch-model-archiver

# Create MAR file
torch-model-archiver \
  --model-name resnet18 \
  --version 1.0 \
  --model-file model.py \
  --serialized-file model.pth \
  --handler image_classifier \
  --export-path model-store/
```

## Configuration Options

### Basic Configuration

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
  name: "pytorch-gpu"
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
```

### Advanced Configuration

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-advanced"
spec:
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/pytorch-model"
      env:
      - name: TS_NUMBER_OF_GPU
        value: "1"
      - name: TS_MAX_REQUEST_SIZE
        value: "6553600"  # 6MB
      - name: TS_MAX_RESPONSE_SIZE
        value: "6553600"  # 6MB
      - name: TS_DEFAULT_WORKERS_PER_MODEL
        value: "2"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 8Gi
```

## Environment Variables

| Variable                       | Description                | Default   |
|--------------------------------|----------------------------|-----------|
| `STORAGE_URI`                  | Model storage location     | Required  |
| `TS_NUMBER_OF_GPU`             | Number of GPUs to use      | `0`       |
| `TS_MAX_REQUEST_SIZE`          | Max request size in bytes  | `6553600` |
| `TS_MAX_RESPONSE_SIZE`         | Max response size in bytes | `6553600` |
| `TS_DEFAULT_WORKERS_PER_MODEL` | Workers per model          | `1`       |
| `TS_BATCH_SIZE`                | Default batch size         | `1`       |
| `TS_MAX_BATCH_DELAY`           | Max batch delay in ms      | `100`     |

## Request/Response Examples

### Image Classification

**Input:**
```json
{
  "instances": [
    {
      "data": "iVBORw0KGgoAAAANSUhEUgAAA..."
    }
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "class": "tabby cat",
      "confidence": 0.9823
    }
  ]
}
```

### Text Classification

**Input:**
```json
{
  "instances": [
    "This movie was absolutely fantastic! Great acting and plot.",
    "Terrible movie, waste of time."
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {"label": "POSITIVE", "score": 0.95},
    {"label": "NEGATIVE", "score": 0.88}
  ]
}
```

### Custom Input Format

```json
{
  "instances": [
    {
      "input_ids": [101, 2023, 2003, 102],
      "attention_mask": [1, 1, 1, 1]
    }
  ]
}
```

## Custom Handlers

### Creating Custom Handler

```python
# handler.py
import torch
from torchvision import transforms
from ts.torch_handler.image_classifier import ImageClassifier

class CustomImageHandler(ImageClassifier):
    def __init__(self):
        super(CustomImageHandler, self).__init__()
        
    def preprocess(self, data):
        """Custom preprocessing logic"""
        transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], 
                               [0.229, 0.224, 0.225])
        ])
        
        images = []
        for row in data:
            # Custom image processing
            image = self.image_processing(row)
            images.append(transform(image))
            
        return torch.stack(images)
    
    def postprocess(self, output):
        """Custom postprocessing logic"""
        probabilities = torch.nn.functional.softmax(output, dim=1)
        top5_prob, top5_indices = torch.topk(probabilities, 5)
        
        results = []
        for i in range(len(output)):
            result = []
            for j in range(5):
                result.append({
                    "class": self.mapping[str(top5_indices[i][j].item())],
                    "probability": top5_prob[i][j].item()
                })
            results.append(result)
        return results
```

### Using Custom Handler

```bash
# Create MAR with custom handler
torch-model-archiver \
  --model-name custom-resnet \
  --version 1.0 \
  --model-file model.py \
  --serialized-file model.pth \
  --handler handler.py \
  --extra-files class_mapping.json \
  --export-path model-store/
```

## Batching Configuration

### Dynamic Batching

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-batched"
spec:
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/model"
      env:
      - name: TS_BATCH_SIZE
        value: "8"
      - name: TS_MAX_BATCH_DELAY
        value: "50"  # milliseconds
```

### Model-Specific Batching

In your model archive config:

```json
{
  "batchSize": 8,
  "maxBatchDelay": 50,
  "responseTimeout": 120
}
```

## Multi-Model Serving

### Serve Multiple Models

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-multi-model"
spec:
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/model-store"
      env:
      - name: TS_LOAD_MODELS
        value: "resnet=resnet18.mar,densenet=densenet121.mar"
```

### Model Management API

```bash
# List models
curl https://$SERVICE_HOSTNAME/models

# Register new model
curl -X POST https://$SERVICE_HOSTNAME/models \
  -F "model_name=new-model" \
  -F "url=s3://bucket/new-model.mar"

# Unregister model
curl -X DELETE https://$SERVICE_HOSTNAME/models/model-name
```

## Performance Optimization

### GPU Optimization

```yaml
env:
- name: TS_NUMBER_OF_GPU
  value: "1"
- name: CUDA_VISIBLE_DEVICES
  value: "0"
```

### Memory Optimization

```yaml
env:
- name: TS_INITIAL_WORKERS_COUNT
  value: "2"
- name: TS_MAX_WORKERS_COUNT
  value: "4"
- name: TORCH_CUDA_ARCH_LIST
  value: "7.0;7.5;8.0"
```

### JIT Compilation

```python
# Enable JIT in model
model = torch.jit.script(model)
# or
model = torch.jit.trace(model, example_input)
```

## Monitoring and Metrics

### Built-in Metrics

TorchServe exposes metrics at `/metrics`:

```bash
curl https://$SERVICE_HOSTNAME/metrics
```

Key metrics:
- `Requests2XX`: Successful requests
- `Requests4XX`: Client errors
- `Requests5XX`: Server errors
- `PredictionTime`: Inference latency
- `HandlerTime`: Handler execution time

### Custom Metrics

```python
# In custom handler
from ts.metrics.metrics_store import MetricsStore

metrics = MetricsStore()
metrics.add_counter("custom_counter", "My custom counter")
metrics.add_time("custom_timer", "My custom timer")

# Use in handler
def handle(self, data, context):
    metrics.add_counter("custom_counter").increment()
    with metrics.add_time("custom_timer"):
        result = self.inference(data)
    return result
```

## Troubleshooting

### Common Issues

**Model Loading Errors:**
```bash
# Check model structure
unzip -l model.mar

# Validate handler
python handler.py
```

**Memory Issues:**
```yaml
# Reduce workers or increase memory
env:
- name: TS_DEFAULT_WORKERS_PER_MODEL
  value: "1"
resources:
  limits:
    memory: 8Gi
```

**GPU Issues:**
```bash
# Check GPU availability
nvidia-smi

# Verify CUDA version compatibility
python -c "import torch; print(torch.cuda.is_available())"
```

### Debug Mode

Enable debug logging:

```yaml
env:
- name: TS_LOG_LEVEL
  value: "DEBUG"
- name: PYTHONPATH
  value: "/opt/conda/lib/python3.8/site-packages"
```

## Best Practices

1. **Model Optimization**: Use TorchScript for production deployment
2. **Batching**: Configure appropriate batch sizes for your workload
3. **Custom Handlers**: Implement custom preprocessing/postprocessing logic
4. **Resource Management**: Set CPU/GPU limits appropriately
5. **Monitoring**: Monitor key metrics and set up alerts
6. **Security**: Use secure storage and container scanning

## Integration Examples

### With Transformers

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-pipeline"
spec:
  transformer:
    containers:
    - image: my-registry/text-preprocessor:latest
      name: kserve-container
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/pytorch-model"
```

### A/B Testing

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pytorch-ab-test"
spec:
  predictor:
    pytorch:
      storageUri: "s3://my-bucket/model-v1"
  canaryTrafficPercent: 20
  canary:
    predictor:
      pytorch:
        storageUri: "s3://my-bucket/model-v2"
```

## Next Steps

- Learn about [Hugging Face Runtime](../huggingface/README.md) for transformer models
- Explore [Custom Predictors](../custom/custom_model/README.md)
- Configure [Autoscaling](../../autoscaling/autoscaling.md)
- Set up [Model Monitoring](../../observability/prometheus_metrics.md)
