# Open Inference Protocol (V2)

The Open Inference Protocol (V2) is KServe's enhanced inference API that provides advanced features for high-performance model serving. It's based on the KServe/Triton inference protocol standard.

## Overview

The V2 protocol offers several advantages over V1:
- **Enhanced Metadata**: Rich model and tensor metadata
- **Binary Support**: Efficient binary tensor encoding
- **Batch Optimization**: Better support for batch inference
- **Error Handling**: Detailed error reporting
- **Protocol Extensions**: Support for custom extensions

## API Endpoints

### Server Metadata
```
GET /v2
GET /v2/health/live
GET /v2/health/ready
```

Returns server-level information and health status.

### Model Operations
```
GET /v2/models
GET /v2/models/<model_name>
GET /v2/models/<model_name>/versions/<version>
GET /v2/models/<model_name>/ready
POST /v2/models/<model_name>/infer
POST /v2/models/<model_name>/versions/<version>/infer
```

### Model Management (if supported)
```
POST /v2/repository/models/<model_name>/load
POST /v2/repository/models/<model_name>/unload
```

## Request/Response Format

### Inference Request
```json
{
  "id": "optional-request-id",
  "parameters": {
    "batch_size": 2,
    "max_tokens": 100
  },
  "inputs": [
    {
      "name": "input_tensor",
      "shape": [2, 3],
      "datatype": "FP32",
      "parameters": {
        "binary_data_size": 24
      },
      "data": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
    }
  ],
  "outputs": [
    {
      "name": "output_tensor",
      "parameters": {
        "classification_count": 5
      }
    }
  ]
}
```

### Inference Response
```json
{
  "id": "optional-request-id",
  "model_name": "my_model",
  "model_version": "1",
  "parameters": {
    "sequence_id": 12345,
    "sequence_start": false,
    "sequence_end": true
  },
  "outputs": [
    {
      "name": "output_tensor",
      "shape": [2, 5],
      "datatype": "FP32",
      "parameters": {
        "binary_data_size": 40
      },
      "data": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    }
  ]
}
```

## Data Types

### Supported Data Types
- `BOOL` - Boolean
- `UINT8`, `UINT16`, `UINT32`, `UINT64` - Unsigned integers
- `INT8`, `INT16`, `INT32`, `INT64` - Signed integers
- `FP16`, `FP32`, `FP64` - Floating point
- `BYTES` - Variable-length byte arrays

### Shape Specification
- Fixed dimensions: `[3, 224, 224]`
- Variable dimensions: `[-1, 784]` (batch dimension)
- Scalar: `[]`

## Binary Tensor Extension

For large tensors, binary encoding provides better performance:

### Request with Binary Data
```json
{
  "inputs": [
    {
      "name": "image_tensor",
      "shape": [1, 3, 224, 224],
      "datatype": "FP32",
      "parameters": {
        "binary_data_size": 602112
      }
    }
  ]
}
```

The binary data follows the JSON payload in the HTTP body.

### Python Example
```python
import requests
import numpy as np

# Create tensor data
tensor = np.random.rand(1, 3, 224, 224).astype(np.float32)
binary_data = tensor.tobytes()

# Create JSON payload
json_data = {
    "inputs": [{
        "name": "image_tensor",
        "shape": list(tensor.shape),
        "datatype": "FP32",
        "parameters": {
            "binary_data_size": len(binary_data)
        }
    }]
}

# Send request
response = requests.post(
    url + "/v2/models/resnet/infer",
    json=json_data,
    data=binary_data,
    headers={"Content-Type": "application/json"}
)
```

## Model Metadata

### Model Information
```bash
curl https://model.example.com/v2/models/bert
```

**Response:**
```json
{
  "name": "bert",
  "versions": ["1", "2"],
  "platform": "pytorch",
  "inputs": [
    {
      "name": "input_ids",
      "datatype": "INT64",
      "shape": [-1, -1]
    },
    {
      "name": "attention_mask", 
      "datatype": "INT64",
      "shape": [-1, -1]
    }
  ],
  "outputs": [
    {
      "name": "last_hidden_state",
      "datatype": "FP32",
      "shape": [-1, -1, 768]
    }
  ]
}
```

## Examples

### Text Classification
```python
import requests

url = "https://bert-classifier.example.com/v2/models/bert/infer"
data = {
    "inputs": [
        {
            "name": "input_ids",
            "shape": [1, 12],
            "datatype": "INT64",
            "data": [101, 2023, 2003, 1037, 3231, 6251, 102, 0, 0, 0, 0, 0]
        },
        {
            "name": "attention_mask",
            "shape": [1, 12], 
            "datatype": "INT64",
            "data": [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
        }
    ]
}

response = requests.post(url, json=data)
result = response.json()
```

### Image Classification with Binary Data
```python
import requests
import numpy as np
from PIL import Image

# Load and preprocess image
image = Image.open("sample.jpg").resize((224, 224))
tensor = np.array(image).astype(np.float32) / 255.0
tensor = np.transpose(tensor, (2, 0, 1))  # CHW format
tensor = np.expand_dims(tensor, 0)  # Add batch dimension
binary_data = tensor.tobytes()

# Create request
json_data = {
    "inputs": [{
        "name": "images",
        "shape": list(tensor.shape),
        "datatype": "FP32",
        "parameters": {
            "binary_data_size": len(binary_data)
        }
    }]
}

response = requests.post(
    "https://resnet.example.com/v2/models/resnet/infer",
    json=json_data,
    data=binary_data
)
```

## Protocol Extensions

### Streaming Responses
For large language models that support streaming:
```json
{
  "parameters": {
    "stream": true,
    "max_tokens": 100
  },
  "inputs": [{
    "name": "text_input",
    "datatype": "BYTES",
    "shape": [1],
    "data": ["What is machine learning?"]
  }]
}
```

### Custom Parameters
Model-specific parameters can be passed:
```json
{
  "parameters": {
    "temperature": 0.7,
    "top_p": 0.9,
    "do_sample": true
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Input tensor 'input_ids' has invalid shape. Expected [-1, -1], got [1, 2, 512]"
}
```

### Common Error Codes
- `400` - Invalid request format or parameters
- `404` - Model or model version not found
- `409` - Model not ready
- `413` - Request entity too large
- `500` - Internal inference error

## Performance Considerations

1. **Binary Encoding**: Use binary tensor encoding for large arrays
2. **Batch Requests**: Include multiple samples in a single request
3. **Output Selection**: Specify only needed outputs to reduce response size
4. **Parameter Tuning**: Use model-specific parameters for optimization

## Client Libraries

### KServe Python Client
```python
from kserve import KServeClient

client = KServeClient()
result = client.infer(
    model_name="bert",
    inputs=inputs,
    model_version="1"
)
```

## Next Steps

- Learn about [Binary Tensor Data Extension](./binary_tensor_data_extension.md)
- Explore [Inference Graph](../inference_graph/README.md) for complex workflows
- Configure [Request Batching](../batcher/batcher.md) for better performance
