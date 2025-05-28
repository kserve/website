# V2 Protocol

The V2 protocol implements the Open Inference Protocol which is standardized by MLServer and NVIDIA Triton.

## API Definitions

| API              | Verb | Path                           |
|------------------|------|--------------------------------|
| Inference        | POST | v2/models/\<model_name\>/infer |
| Model Metadata   | GET  | v2/models/\<model_name\>       |
| Server Readiness | GET  | v2/health/ready                |
| Server Liveness  | GET  | v2/health/live                 |
| Server Metadata  | GET  | v2                             |
| Model Readiness  | GET  | v2/models/\<model_name\>/ready |

## Key Features

- **gRPC and HTTP Support**: Both protocols are supported
- **Model Versioning**: Optional versioning in request paths
- **Standardized**: Compatible with Triton Inference Server
- **Binary Data**: Efficient binary tensor data support

## Example Inference Request

```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [1, 4],
      "datatype": "FP32",
      "data": [1.0, 2.0, 3.0, 4.0]
    }
  ]
}
```

## Example Inference Response

```json
{
  "outputs": [
    {
      "name": "output-0", 
      "shape": [1, 2],
      "datatype": "FP32",
      "data": [0.1, 0.9]
    }
  ]
}
```
