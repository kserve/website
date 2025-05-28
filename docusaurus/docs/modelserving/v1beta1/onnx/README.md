# ONNX Runtime

KServe's ONNX Runtime provides high-performance inference for ONNX (Open Neural Network Exchange) models with cross-platform optimization.

## Overview

ONNX Runtime supports:
- **Cross-Framework**: Models from TensorFlow, PyTorch, scikit-learn
- **High Performance**: Optimized inference engine
- **Hardware Acceleration**: CPU, GPU, and specialized hardware
- **Model Optimization**: Graph optimization and quantization
- **Execution Providers**: Multiple backend options

## Quick Start

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "onnx-resnet"
spec:
  predictor:
    onnx:
      storageUri: "gs://kfserving-examples/models/onnx/resnet"
```

## Model Conversion

### From PyTorch
```python
import torch
import torch.onnx

# Convert PyTorch model to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['output']
)
```

### From TensorFlow
```python
import tf2onnx

# Convert TensorFlow SavedModel to ONNX
python -m tf2onnx.convert \
    --saved-model /path/to/saved_model \
    --output model.onnx \
    --opset 11
```

## Configuration Examples

### CPU Optimized
```yaml
spec:
  predictor:
    onnx:
      storageUri: "s3://my-bucket/onnx-model"
      env:
      - name: OMP_NUM_THREADS
        value: "4"
```

### GPU Accelerated
```yaml
spec:
  predictor:
    onnx:
      storageUri: "s3://my-bucket/model"
      resources:
        limits:
          nvidia.com/gpu: 1
      env:
      - name: CUDA_VISIBLE_DEVICES
        value: "0"
```

## Performance Optimization

### Execution Providers
- **CPUExecutionProvider**: CPU inference
- **CUDAExecutionProvider**: NVIDIA GPU
- **TensorrtExecutionProvider**: TensorRT optimization
- **OpenVINOExecutionProvider**: Intel hardware

### Graph Optimization
```python
# Optimize ONNX model
import onnxruntime as ort

session_options = ort.SessionOptions()
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
```

## Best Practices

1. **Model Validation**: Verify ONNX model before deployment
2. **Optimization**: Use appropriate execution providers
3. **Batch Size**: Optimize for your workload
4. **Memory Management**: Set appropriate resource limits

## Next Steps

- Learn about [Hugging Face Runtime](../huggingface/README.md)
- Explore [Triton Multi-Framework](../triton/torchscript/README.md)
