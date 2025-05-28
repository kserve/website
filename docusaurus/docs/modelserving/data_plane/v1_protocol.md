# V1 Inference Protocol

The V1 inference protocol provides a simple REST API for model inference, designed for ease of use and compatibility with existing ML serving frameworks.

## Overview

The V1 protocol is KServe's original inference API that provides:
- Simple JSON-based request/response format
- Easy integration with existing applications
- Support for most common inference scenarios
- Backward compatibility with TensorFlow Serving API

## API Endpoints

### Model Metadata
```
GET /v1/models/<model_name>
GET /v1/models/<model_name>/versions/<version>
```

Returns information about the model including:
- Model name and version
- Input/output specifications
- Model status

**Example Response:**
```json
{
  "name": "sklearn-iris",
  "versions": ["v1"],
  "platform": "sklearn",
  "inputs": [
    {
      "name": "input",
      "datatype": "FP32",
      "shape": [-1, 4]
    }
  ],
  "outputs": [
    {
      "name": "output",
      "datatype": "FP32", 
      "shape": [-1, 3]
    }
  ]
}
```

### Model Inference
```
POST /v1/models/<model_name>:predict
POST /v1/models/<model_name>/versions/<version>:predict
```

Performs inference on the provided input data.

**Request Format:**
```json
{
  "instances": [
    <input_data_1>,
    <input_data_2>,
    ...
  ]
}
```

**Response Format:**
```json
{
  "predictions": [
    <prediction_1>,
    <prediction_2>,
    ...
  ]
}
```

## Input Data Formats

### Tensor Format
For models expecting tensor inputs:
```json
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2],
    [4.9, 3.0, 1.4, 0.2]
  ]
}
```

### Named Inputs
For models with named input features:
```json
{
  "instances": [
    {
      "sepal_length": 5.1,
      "sepal_width": 3.5,
      "petal_length": 1.4,
      "petal_width": 0.2
    }
  ]
}
```

### Image Data
For image classification models:
```json
{
  "instances": [
    {
      "image_bytes": {
        "b64": "<base64_encoded_image>"
      }
    }
  ]
}
```

## Examples

### Scikit-learn Model
```bash
curl -X POST https://sklearn-iris.example.com/v1/models/sklearn-iris:predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "instances": [
      [5.1, 3.5, 1.4, 0.2]
    ]
  }'
```

**Response:**
```json
{
  "predictions": [[0.0, 0.0, 1.0]]
}
```

### TensorFlow Model
```bash
curl -X POST https://tensorflow-flowers.example.com/v1/models/flowers:predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "instances": [
      {
        "image_bytes": {
          "b64": "iVBORw0KGgoAAAANSUhEUgAA..."
        }
      }
    ]
  }'
```

### PyTorch Model
```bash
curl -X POST https://pytorch-cifar.example.com/v1/models/cifar:predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "instances": [
      [[[0.1, 0.2], [0.3, 0.4]], [[0.5, 0.6], [0.7, 0.8]]]
    ]
  }'
```

## Error Handling

The V1 protocol returns standard HTTP status codes:

- `200` - Successful inference
- `400` - Bad request (invalid input format)
- `404` - Model not found
- `500` - Internal server error

**Error Response Format:**
```json
{
  "error": "Model not found: invalid-model"
}
```

## Client Libraries

### Python
```python
import requests
import json

url = "https://sklearn-iris.example.com/v1/models/sklearn-iris:predict"
data = {
    "instances": [[5.1, 3.5, 1.4, 0.2]]
}

response = requests.post(url, json=data)
predictions = response.json()["predictions"]
```

### JavaScript
```javascript
const response = await fetch(
  "https://sklearn-iris.example.com/v1/models/sklearn-iris:predict",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      instances: [[5.1, 3.5, 1.4, 0.2]]
    })
  }
);

const result = await response.json();
console.log(result.predictions);
```

## Best Practices

1. **Batch Requests**: Send multiple instances in a single request for better throughput
2. **Input Validation**: Validate input data format and types before sending requests
3. **Error Handling**: Implement proper error handling for network and model errors
4. **Timeouts**: Set appropriate request timeouts for your use case
5. **Monitoring**: Monitor inference latency and error rates

## Migration to V2

Consider migrating to the [V2 Inference Protocol](./v2_protocol.md) for:
- Better metadata support
- Enhanced error reporting
- Binary tensor support
- More efficient serialization
