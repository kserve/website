# Open Inference Protocol API Specification

KServe supports the Open Inference Protocol (v1 and v2) for standardized model serving APIs. This page provides interactive API documentation using Swagger UI.

## API Versions

### V1 Inference Protocol

The V1 protocol is based on TensorFlow Serving API and provides simple prediction endpoints.

**Base URL**: `http://{model-url}/v1/models/{model-name}`

#### Endpoints

- `GET /` - Server health check
- `GET /v1/models/{model_name}` - Get model metadata
- `POST /v1/models/{model_name}:predict` - Make predictions

### V2 Inference Protocol (Open Inference Protocol)

The V2 protocol provides enhanced metadata and supports more advanced features.

**Base URL**: `http://{model-url}/v2/models/{model-name}`

#### Endpoints

- `GET /v2/health/live` - Server liveness check
- `GET /v2/health/ready` - Server readiness check
- `GET /v2/models/{model_name}` - Get model metadata
- `POST /v2/models/{model_name}/infer` - Run inference

## Interactive API Documentation

### Swagger UI

Access the interactive Swagger UI for your deployed models:

```
http://your-inference-service-url/docs
```

### Example URLs

For a model deployed as `sklearn-iris` in the `default` namespace:

- **V1 API**: `http://sklearn-iris.default.example.com/v1/models/sklearn-iris`
- **V2 API**: `http://sklearn-iris.default.example.com/v2/models/sklearn-iris`
- **Swagger UI**: `http://sklearn-iris.default.example.com/docs`

## Request/Response Examples

### V1 Protocol

#### Prediction Request

```json
{
  "instances": [
    [6.8, 2.8, 4.8, 1.4],
    [6.0, 3.4, 4.5, 1.6]
  ]
}
```

#### Prediction Response

```json
{
  "predictions": [1, 1]
}
```

### V2 Protocol

#### Inference Request

```json
{
  "inputs": [
    {
      "name": "input_1",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [
        [6.8, 2.8, 4.8, 1.4],
        [6.0, 3.4, 4.5, 1.6]
      ]
    }
  ]
}
```

#### Inference Response

```json
{
  "outputs": [
    {
      "name": "predictions",
      "shape": [2],
      "datatype": "INT64",
      "data": [1, 1]
    }
  ]
}
```

## Protocol Specification

### Supported Data Types

- **BOOL**: Boolean values
- **UINT8**, **UINT16**, **UINT32**, **UINT64**: Unsigned integers
- **INT8**, **INT16**, **INT32**, **INT64**: Signed integers
- **FP16**, **FP32**, **FP64**: Floating point numbers
- **BYTES**: Byte arrays

### Tensor Representation

Tensors can be represented in multiple formats:

- **Row-major order**: Default tensor layout
- **Binary format**: For efficient large tensor transfer
- **Compressed format**: For bandwidth optimization

## Authentication

### Bearer Token

```bash
curl -H "Authorization: Bearer <token>" \
  http://model-url/v1/models/model-name:predict \
  -d '{"instances": [[1,2,3,4]]}'
```

### API Key

```bash
curl -H "X-API-Key: <api-key>" \
  http://model-url/v1/models/model-name:predict \
  -d '{"instances": [[1,2,3,4]]}'
```

## Error Handling

### Common Error Codes

- **400 Bad Request**: Invalid request format
- **404 Not Found**: Model not found
- **500 Internal Server Error**: Model serving error
- **503 Service Unavailable**: Model not ready

### Error Response Format

```json
{
  "error": {
    "code": 400,
    "message": "Invalid input format",
    "details": "Expected array of instances"
  }
}
```

## Client Libraries

### Python

```python
import requests

# V1 Protocol
response = requests.post(
    "http://model-url/v1/models/model-name:predict",
    json={"instances": [[1, 2, 3, 4]]}
)

# V2 Protocol
response = requests.post(
    "http://model-url/v2/models/model-name/infer",
    json={
        "inputs": [{
            "name": "input",
            "shape": [1, 4],
            "datatype": "FP32",
            "data": [[1, 2, 3, 4]]
        }]
    }
)
```

### JavaScript

```javascript
// V1 Protocol
fetch('http://model-url/v1/models/model-name:predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ instances: [[1, 2, 3, 4]] })
})

// V2 Protocol  
fetch('http://model-url/v2/models/model-name/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inputs: [{
      name: 'input',
      shape: [1, 4],
      datatype: 'FP32',
      data: [[1, 2, 3, 4]]
    }]
  })
})
```

### Go

```go
import (
    "bytes"
    "encoding/json"
    "net/http"
)

// V1 Protocol
payload := map[string]interface{}{
    "instances": [][]float64{{1, 2, 3, 4}},
}
jsonData, _ := json.Marshal(payload)
resp, _ := http.Post(
    "http://model-url/v1/models/model-name:predict",
    "application/json",
    bytes.NewBuffer(jsonData),
)
```

## OpenAPI Specification

### Download Specifications

- **V1 Protocol**: [Download OpenAPI 3.0 spec](https://example.com/v1-openapi.yaml)
- **V2 Protocol**: [Download OpenAPI 3.0 spec](https://example.com/v2-openapi.yaml)

### Generate Client Code

Use the OpenAPI specifications to generate client libraries:

```bash
# Generate Python client
openapi-generator generate -i v2-openapi.yaml -g python -o ./python-client

# Generate JavaScript client  
openapi-generator generate -i v2-openapi.yaml -g typescript-axios -o ./js-client
```

## Testing

### Using curl

```bash
# Health check
curl http://model-url/v2/health/ready

# Model metadata
curl http://model-url/v2/models/model-name

# Inference
curl -X POST http://model-url/v2/models/model-name/infer \
  -H "Content-Type: application/json" \
  -d '{"inputs": [{"name": "input", "shape": [1,4], "datatype": "FP32", "data": [[1,2,3,4]]}]}'
```

### Using HTTPie

```bash
# Inference with HTTPie
http POST http://model-url/v1/models/model-name:predict \
  instances:='[[1,2,3,4]]'
```

## Best Practices

### Request Optimization

- **Batch requests** when possible for better throughput
- **Use appropriate data types** to minimize payload size
- **Compress large payloads** when bandwidth is limited

### Error Handling

- **Implement retry logic** for transient failures
- **Validate input data** before sending requests
- **Handle timeouts** appropriately for your use case

### Security

- **Use HTTPS** in production environments
- **Implement authentication** for sensitive models
- **Validate and sanitize** all input data

## Next Steps

- [Learn about KServe's inference protocols](../modelserving/data_plane/v1_protocol)
- [Explore model serving examples](../get_started/first_isvc)
- [Set up monitoring and observability](../modelserving/observability/prometheus_metrics)
