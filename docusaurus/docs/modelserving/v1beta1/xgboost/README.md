# XGBoost Runtime

KServe's XGBoost serving runtime provides optimized deployment for XGBoost models with support for various model formats and high-performance inference.

## Overview

The XGBoost runtime supports:
- **Multiple Formats**: XGBoost native, JSON, UBOJ formats
- **High Performance**: Optimized C++ inference engine
- **Feature Engineering**: Built-in data preprocessing
- **GPU Support**: CUDA acceleration for inference
- **Batch Processing**: Efficient batch prediction

## Quick Start

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "xgboost-mushroom"
spec:
  predictor:
    xgboost:
      storageUri: "gs://kfserving-examples/models/xgboost/mushroom"
```

## Supported Formats

| Format  | Extension        | Description           |
|---------|------------------|-----------------------|
| XGBoost | `.model`, `.bst` | Native XGBoost format |
| JSON    | `.json`          | Human-readable format |
| UBOJ    | `.ubj`           | Universal Binary JSON |

## Configuration Examples

### Basic Deployment
```yaml
spec:
  predictor:
    xgboost:
      storageUri: "s3://my-bucket/xgboost-model"
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
```

### GPU Accelerated
```yaml
spec:
  predictor:
    xgboost:
      storageUri: "s3://my-bucket/model"
      resources:
        limits:
          nvidia.com/gpu: 1
```

## Request Examples

### Classification
```json
{
  "instances": [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10]
  ]
}
```

### Named Features
```json
{
  "instances": [
    {
      "feature1": 1.5,
      "feature2": 2.3,
      "feature3": 0.8
    }
  ]
}
```

## Best Practices

1. **Use Native Format**: XGBoost .model format for best performance
2. **Feature Engineering**: Include preprocessing in pipelines
3. **Batch Requests**: Send multiple instances for better throughput
4. **Resource Tuning**: Optimize CPU allocation for your workload

## Next Steps

- Learn about [ONNX Runtime](../onnx/README.md)
- Explore [LightGBM Runtime](../lightgbm/README.md)
