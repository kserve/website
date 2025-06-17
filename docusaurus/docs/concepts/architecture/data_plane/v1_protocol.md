---
title: V1 Protocol
---

# V1 Protocol

KServe's V1 protocol offers a standardized prediction workflow across all model frameworks. This protocol version is still supported, but it is recommended that users migrate to the [V2 protocol](./v2_protocol.md) for better performance and standardization among serving runtimes. However, if a use case requires a more flexible schema than protocol V2 provides, the V1 protocol is still an option.

## Overview

The V1 protocol is based on the [TensorFlow Serving REST API](https://www.tensorflow.org/tfx/serving/api_rest) and provides a consistent interface for making inference requests across different model frameworks. It supports both prediction and explanation endpoints and includes basic health checking features.

## API Endpoints

| API         | Verb | Path                              | Request Payload               | Response Payload                        |
|-------------|------|-----------------------------------|-------------------------------|-----------------------------------------|
| List Models | GET  | /v1/models                        |                               | `{"models": [<model_name>]}`        |
| Model Ready | GET  | /v1/models/&lt;model_name&gt;         |                               | `{"name": <model_name>, "ready": bool}` |
| Predict     | POST | /v1/models/&lt;model_name&gt;:predict | `{"instances": []}*` or `{"inputs": []}*`    | `{"predictions": []}`                     |
| Explain     | POST | /v1/models/&lt;model_name&gt;:explain | `{"instances": []}*` or `{"inputs": []}*`  | `{"predictions": [], "explanations": []}` |


*Note: Payload is optional


## API Definitions

| API         | Definition                                                                                                                                                                                                                       |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Predict     | The "predict" API performs inference on a model. The response is the prediction result. All InferenceServices speak the [Tensorflow V1 HTTP API](https://www.tensorflow.org/tfx/serving/api_rest#predict_api).                   |
| Explain     | The "explain" API is an optional component that provides model explanations in addition to predictions. The standardized explainer interface is identical to the Tensorflow V1 HTTP API with the addition of an ":explain" verb. |
| Model Ready | The "model ready" health API indicates if a specific model is ready for inferencing. If the model(s) is downloaded and ready to serve requests, the model ready endpoint returns the list of accessible &lt;model_name&gt;(s).   |
| List Models | The "models" API exposes a list of models in the model registry.                                                                                                                                                                 |

## Payload Format

The V1 protocol uses a flexible JSON format for both requests and responses:

:::note

The response payload in V1 protocol is not strictly enforced. A custom server can define and return its own response payload. We encourage using the KServe defined response payload for consistency.

:::

### Request Format

KServe V1 protocol accepts both `instances` and `inputs` as the root key in the request payload. Both formats are equivalent and supported.

With `instances`:

```json
{
  "instances": [
    {
      "feature_0": [value_1, value_2, ...],
      "feature_1": [value_1, value_2, ...],
      ...
    },
    ...
  ]
}
```

With `inputs`:

```json
{
  "inputs": [
    {
      "feature_0": [value_1, value_2, ...],
      "feature_1": [value_1, value_2, ...],
      ...
    },
    ...
  ]
}
```

Or for simpler payloads with `instances`:

```json
{
  "instances": [[value_1, value_2, ...], [value_1, value_2, ...], ...]
}
```

Or for simpler payloads with `inputs`:

```json
{
  "inputs": [[value_1, value_2, ...], [value_1, value_2, ...], ...]
}
```

### Response Format

```json
{
  "predictions": [
    [value_1, value_2, ...],
    [value_1, value_2, ...],
    ...
  ]
}
```


## Examples

### Predict API

**Request with `instances`**:

```bash
curl -X POST http://localhost:8000/v1/models/mymodel:predict \
  -d '{"instances": [[1.0, 2.0, 5.0], [5.0, 6.0, 5.0]]}'
```

**Request with `inputs`**:

```bash
curl -X POST http://localhost:8000/v1/models/mymodel:predict \
  -d '{"inputs": [[1.0, 2.0, 5.0], [5.0, 6.0, 5.0]]}'
```

**Response**:

```json
{
  "predictions": [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
}
```

### Explain API

**Request with `instances`**:

```bash
curl -X POST http://localhost:8000/v1/models/mymodel:explain \
  -d '{"instances": [[1.0, 2.0, 5.0], [5.0, 6.0, 5.0]]}'
```

**Request with `inputs`**:

```bash
curl -X POST http://localhost:8000/v1/models/mymodel:explain \
  -d '{"inputs": [[1.0, 2.0, 5.0], [5.0, 6.0, 5.0]]}'
```

**Response**:

```json
{
  "predictions": [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]],
  "explanations": [
    {"importance_scores": [0.1, 0.2, 0.7]},
    {"importance_scores": [0.3, 0.4, 0.3]}
  ]
}
```

## Benefits and Limitations

### Benefits

- Simple API interface that's easy to understand and implement
- Based on established TensorFlow Serving API
- Support for both prediction and explanation endpoints
- Flexible JSON schema for various payload formats

### Limitations

- Limited standardization for response format
- Less efficient for large data payloads compared to V2
- No built-in health checking or readiness probes
- No support for binary data formats
- Limited metadata capabilities

## When to Use V1 Protocol

- When you need the explain functionality that isn't available in V2
- For compatibility with existing systems built against TensorFlow Serving API
- When a more flexible schema is required for your specific use case
- For simpler deployments where advanced features of V2 aren't needed

## Next Steps

- Explore the [V2 Protocol](./v2_protocol/v2_protocol.md) for improved performance and standardization

