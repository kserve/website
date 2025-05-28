# Model Serving Data Plane

The KServe data plane is responsible for serving machine learning models and handling inference requests. It provides a standardized interface for model serving across different frameworks and deployment environments.

## Overview

The data plane consists of the following components:

- **Predictor**: The core component that hosts the ML model and serves inference requests
- **Transformer** (optional): Pre/post-processing component for data transformation
- **Explainer** (optional): Component that provides model explanations and interpretability

## Inference Protocols

KServe supports multiple inference protocols to accommodate different use cases and client requirements:

### V1 Inference Protocol (REST)
The V1 protocol provides a simple REST API for model inference with the following endpoints:

- `GET /v1/models/<model_name>` - Get model metadata
- `POST /v1/models/<model_name>:predict` - Run inference

### Open Inference Protocol (V2)
The V2 protocol is based on the KServe/Triton inference protocol and provides:

- Enhanced metadata support
- Batch inference capabilities
- Binary tensor support
- Better error handling

Key endpoints include:
- `GET /v2/models/<model_name>` - Get model metadata
- `POST /v2/models/<model_name>/infer` - Run inference
- `GET /v2/models/<model_name>/ready` - Check model readiness

## Request/Response Format

### V1 Protocol Example

**Request:**
```json
{
  "instances": [
    [1, 2, 3, 4],
    [5, 6, 7, 8]
  ]
}
```

**Response:**
```json
{
  "predictions": [
    [0.1, 0.9],
    [0.8, 0.2]
  ]
}
```

### V2 Protocol Example

**Request:**
```json
{
  "inputs": [
    {
      "name": "input",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [1, 2, 3, 4, 5, 6, 7, 8]
    }
  ]
}
```

**Response:**
```json
{
  "outputs": [
    {
      "name": "output",
      "shape": [2, 2],
      "datatype": "FP32",
      "data": [0.1, 0.9, 0.8, 0.2]
    }
  ]
}
```

## Model Serving Components

### Predictor
The predictor is the main component that loads and serves the ML model. It handles:
- Model loading and initialization
- Inference request processing
- Response formatting
- Health checks

### Transformer
Transformers enable data preprocessing and postprocessing:
- **Pre-processing**: Data validation, normalization, feature engineering
- **Post-processing**: Response formatting, data aggregation, filtering

### Explainer
Explainers provide model interpretability:
- Feature importance analysis
- Prediction explanations
- Model behavior analysis

## Performance Considerations

### Batching
- Configure request batching for improved throughput
- Balance batch size with latency requirements
- Consider model-specific batching capabilities

### Caching
- Enable model caching for faster startup times
- Use appropriate storage backends for model artifacts
- Configure cache eviction policies

### Resource Management
- Set appropriate CPU and memory limits
- Configure GPU resources for accelerated inference
- Use node affinity for optimal hardware utilization

## Next Steps

- Learn about [V1 Inference Protocol](./v1_protocol.md) in detail
- Explore [V2 Inference Protocol](./v2_protocol.md) features
- Configure [Binary Tensor Data Extension](./binary_tensor_data_extension.md)
