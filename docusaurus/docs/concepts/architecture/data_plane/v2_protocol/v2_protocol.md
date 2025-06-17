---
title: Overview
---

# Open Inference Protocol (V2 Inference Protocol)

The Open Inference Protocol, also known as KServe V2 Protocol, provides a standardized interface for model inference across different machine learning frameworks and serving systems. For an inference server to be compliant with this protocol, the server must implement the health, metadata, and inference V2 APIs.

Optional features are explicitly noted and are not required for compliance. A compliant inference server may choose to implement the HTTP/REST API and/or the gRPC API.

## Overview

KServe's V2 protocol addresses several limitations found in the V1 protocol, including better performance and improved compatibility across different model frameworks and servers. The protocol supports both HTTP/REST and gRPC interfaces, offering flexibility in implementation.

### Important Notes

- V2 protocol does not currently support the explain endpoint that is available in V1 protocol
- V2 adds standardized server readiness, liveness, and metadata endpoints
- V2 supports version-specific model endpoints
- All strings in all contexts are case-sensitive
- The V2 protocol supports an extension mechanism as a required part of the API

## API Endpoints

### HTTP/REST API

| API              | Verb | Path                                                        | Request Payload                                                   | Response Payload                                                     |
|------------------|------|-------------------------------------------------------------|------------------------------------------------------------------|----------------------------------------------------------------------|
| Inference        | POST | v2/models/\<model_name\>[/versions/\<model_version\>]/infer | [Inference Request JSON Object](#inference-request-json-object)   | [Inference Response JSON Object](#inference-response-json-object)     |
| Model Metadata   | GET  | v2/models/\<model_name\>[/versions/\<model_version\>]       |                                                                  | [Model Metadata Response JSON Object](#model-metadata-response-json-object) |
| Server Readiness | GET  | v2/health/ready                                             |                                                                  | [Server Ready Response JSON Object](#server-ready-response-json-object) |
| Server Liveness  | GET  | v2/health/live                                              |                                                                  | [Server Live Response JSON Object](#server-live-response-json-object)  |
| Server Metadata  | GET  | v2                                                          |                                                                  | [Server Metadata Response JSON Object](#server-metadata-response-json-object) |
| Model Readiness  | GET  | v2/models/\<model_name\>[/versions/\<model_version\>]/ready |                                                                  | [Model Ready Response JSON Object](#model-ready-response-json-object)  |

**Note**: Path contents in `[]` are optional.

### gRPC API

| API             | rpc Endpoint   | Request Message                                          | Response Message                                           |
|-----------------|-----------------|---------------------------------------------------------|------------------------------------------------------------|
| Inference       | ModelInfer     | [ModelInferRequest](#grpc-inference-payload-example)     | [ModelInferResponse](#grpc-inference-payload-example)      |
| Model Ready     | ModelReady     | ModelReadyRequest                                        | [ModelReadyResponse](#model-ready-response-json-object)     |
| Model Metadata  | ModelMetadata  | ModelMetadataRequest                                     | [ModelMetadataResponse](#model-metadata-response-json-object) |
| Server Ready    | ServerReady    | ServerReadyRequest                                       | [ServerReadyResponse](#server-ready-response-json-object)   |
| Server Live     | ServerLive     | ServerLiveRequest                                        | [ServerLiveResponse](#server-live-response-json-object)    |
| Server Metadata | ServerMetadata | ServerMetadataRequest                                    | [ServerMetadataResponse](#server-metadata-response-json-object) |

## API Definitions

### Health/Readiness/Liveness Probes

The Model Readiness probe answers the question "Did the model download and is it able to serve requests?" and responds with the available model name(s). 

The Server Readiness/Liveness probes answer the question "Is my service and its infrastructure running, healthy, and able to receive and process requests?"

| API             | Definition                                                                                                                                                                                                              |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Inference       | The `/infer` endpoint performs inference on a model. The response is the prediction result.                                                                                                                             |
| Model Metadata  | The "model metadata" API is a per-model endpoint that returns details about the model passed in the path.                                                                                                               |
| Server Ready    | The "server ready" health API indicates if all the models are ready for inferencing. The "server ready" health API can be used directly to implement the Kubernetes readinessProbe                                      |
| Server Live     | The "server live" health API indicates if the inference server is able to receive and respond to metadata and inference requests. The "server live" API can be used directly to implement the Kubernetes livenessProbe. |
| Server Metadata | The "server metadata" API returns details describing the server.                                                                                                                                                        |
| Model Ready     | The "model ready" health API indicates if a specific model is ready for inferencing. The model name and (optionally) version must be available in the URL.                                                              |

## Payload Contents

### HTTP/REST API Payloads

The HTTP/REST API uses JSON for requests and responses. All JSON schemas contain standard JSON types including `$number`, `$string`, `$boolean`, `$object` and `$array`. Fields marked `#optional` indicate optional JSON fields.

### Model Ready Response JSON Object {#model-ready-response-json-object}

A successful model ready request is indicated by a 200 HTTP status code. The model ready response object is returned in the HTTP body.

```json
{
  "name": "model_name",
  "ready": true
}
```

* `name`: The name of the model.
* `ready`: Boolean indicating whether the model is ready for inferencing.

### Server Ready Response JSON Object {#server-ready-response-json-object}

A successful server ready request is indicated by a 200 HTTP status code. The server ready response object is returned in the HTTP body.

```json
{
  "ready": true
}
```

* `ready`: Boolean indicating whether the server is ready for inferencing.

### Server Live Response JSON Object {#server-live-response-json-object}

A successful server live request is indicated by a 200 HTTP status code. The server live response object is returned in the HTTP body.

```json
{
  "live": true
}
```

* `live`: Boolean indicating whether the server is live for inferencing.

### Server Metadata Response JSON Object {#server-metadata-response-json-object}

A successful server metadata request is indicated by a 200 HTTP status code. The server metadata response object is returned in the HTTP body.

```json
{
  "name": "inference_server_name",
  "version": "inference_server_version",
  "extensions": ["extension_name", "..."]
}
```

* `name`: A descriptive name for the server.
* `version`: The server version.
* `extensions`: The extensions supported by the server. Currently, no standard extensions are defined. Individual inference servers may define and document their own extensions.

#### Server Metadata Response JSON Error Object

A failed server metadata request must be indicated by an HTTP error status (typically 400). The HTTP body must contain the server metadata error response object.

```json
{
  "error": "error message"
}
```

* `error`: The descriptive message for the error.

#### Inference Request JSON Object {#inference-request-json-object}

An inference request is made with an HTTP POST to an inference endpoint. In the request, the HTTP body contains the Inference Request JSON Object.

```json
{
  "id": "string", // optional
  "parameters": {}, // optional
  "inputs": [
    {
      "name": "string",
      "shape": [1, 2, 3],
      "datatype": "FP32",
      "parameters": {}, // optional
      "data": [1.0, 2.0, 3.0]
    }
  ],
  "outputs": [ // optional
    {
      "name": "string",
      "parameters": {} // optional
    }
  ]
}
```

* `id`: An optional identifier for this request. If specified, this identifier must be returned in the response.
* `parameters`: Optional parameters for the inference request expressed as key/value pairs.
* `inputs`: The input tensors. Each input is described using the Request Input schema.
* `outputs`: Optional specifications of the required output tensors. If not specified, all outputs produced by the model will be returned using default settings.

##### Request Input

Each input in the `inputs` array is described using the following schema:

```json
{
  "name": "string",
  "shape": [1, 2, 3],
  "datatype": "FP32",
  "parameters": {}, // optional
  "data": [1.0, 2.0, 3.0]
}
```

* `name`: The name of the input tensor.
* `shape`: The shape of the input tensor, as an array of integers.
* `datatype`: The data type of the input tensor elements, as defined in [Tensor Data Types](#tensor-data-types).
* `parameters`: Optional parameters for this input tensor, expressed as key/value pairs.
* `data`: The input tensor data as a JSON array. The array must contain the tensor elements in row-major order.

##### Request Output

Each output in the `outputs` array is described using the following schema:

```json
{
  "name": "string",
  "parameters": {} // optional
}
```

* `name`: The name of the output tensor.
* `parameters`: Optional parameters for this output tensor, expressed as key/value pairs.

#### Inference Response JSON Object {#inference-response-json-object}

In the corresponding response to an inference request, the HTTP body contains the Inference Response JSON Object or an Inference Response JSON Error Object.

```json
{
  "model_name": "string",
  "model_version": "string", // optional
  "id": "string",
  "parameters": {}, // optional
  "outputs": [
    {
      "name": "string",
      "shape": [1, 2, 3],
      "datatype": "FP32",
      "parameters": {}, // optional
      "data": [4.0, 5.0, 6.0]
    }
  ]
}
```

* `model_name`: The name of the model that produced this response.
* `model_version`: Optional. The version of the model that produced this response.
* `id`: The identifier from the request, if specified.
* `parameters`: Optional response parameters expressed as key/value pairs.
* `outputs`: The output tensors, each described using the format specified in the response output schema.

#### Inference Response JSON Error Object

A failed inference request must be indicated by an HTTP error status (typically 400). The HTTP body must contain the Inference Response JSON Error Object:

```json
{
  "error": "error message"
}
```

* `error`: A descriptive message for the error.

#### Model Metadata Response JSON Object {#model-metadata-response-json-object}

A model metadata request is made with an HTTP GET to a model metadata endpoint. In the corresponding response, the HTTP body contains the Model Metadata Response JSON Object or the Model Metadata Response JSON Error Object.

A successful model metadata request is indicated by a 200 HTTP status code. The metadata response object is returned in the HTTP body for every successful model metadata request.

```json
{
  "name": "string",
  "versions": ["v1", "v2"], // optional
  "platform": "string",
  "inputs": [
    {
      "name": "string",
      "datatype": "FP32",
      "shape": [1, -1, 3]
    }
  ],
  "outputs": [
    {
      "name": "string",
      "datatype": "FP32",
      "shape": [1, 3]
    }
  ]
}
```

* `name`: The name of the model.
* `versions`: Optional. The model versions that may be explicitly requested via the appropriate endpoint. Optional for servers that don't support explicitly requested versions.
* `platform`: The framework/backend for the model. See [Platforms](#platforms).
* `inputs`: The inputs required by the model, each described by a tensor metadata object.
* `outputs`: The outputs produced by the model, each described by a tensor metadata object.

Each model input and output tensor's metadata is described with a tensor metadata object:

```json
{
  "name": "string",
  "datatype": "FP32",
  "shape": [1, -1, 3]
}
```

* `name`: The name of the tensor.
* `datatype`: The data type of the tensor elements as defined in [Tensor Data Types](#tensor-data-types).
* `shape`: The shape of the tensor. Variable-size dimensions are specified as -1.

#### Model Metadata Response JSON Error Object

A failed model metadata request must be indicated by an HTTP error status (typically 400). The HTTP body must contain the Model Metadata Response JSON Error Object:

```json
{
  "error": "error message"
}
```

* `error`: The descriptive message for the error.

#### Parameters

In the V2 protocol, `parameters` is an optional object containing zero or more parameters expressed as key/value pairs. These parameters can be provided in requests or returned in responses to control various aspects of inference and server behavior.

The protocol itself doesn't define any specific parameters, but individual inference servers may define and document the parameters they support. For example, a server might define parameters to control timeout, batching behavior, or other server-specific configurations.

### gRPC API

The gRPC API provides the same functionality as the HTTP/REST API but uses Protocol Buffers for more efficient serialization and communication. A compliant inference server may choose to implement the gRPC API in addition to or instead of the HTTP/REST API.

The V2 protocol's gRPC API is defined in the [open_inference_grpc.proto](https://github.com/kserve/open-inference-protocol/blob/main/specification/protocol/open_inference_grpc.proto) file. This file defines the service and message formats for all API endpoints.

#### gRPC Service Definition

The gRPC API defines a GRPCInferenceService service with the following RPCs:

```protobuf
service GRPCInferenceService
{
  // Health
  rpc ServerLive(ServerLiveRequest) returns (ServerLiveResponse) {}
  rpc ServerReady(ServerReadyRequest) returns (ServerReadyResponse) {}
  rpc ModelReady(ModelReadyRequest) returns (ModelReadyResponse) {}

  // Metadata
  rpc ServerMetadata(ServerMetadataRequest) returns (ServerMetadataResponse) {}
  rpc ModelMetadata(ModelMetadataRequest) returns (ModelMetadataResponse) {}

  // Inference
  rpc ModelInfer(ModelInferRequest) returns (ModelInferResponse) {}
}
```

#### gRPC Inference Payload Example {#grpc-inference-payload-example}

For the ModelInfer RPC, the request and response messages are defined as follows (simplified view):

```protobuf
message ModelInferRequest {
  string model_name = 1;
  string model_version = 2;  // Optional
  string id = 3;             // Optional
  map<string, InferParameter> parameters = 4;  // Optional
  repeated ModelInferRequest.InferInputTensor inputs = 5;
  repeated ModelInferRequest.InferRequestedOutputTensor outputs = 6;  // Optional
}

message ModelInferResponse {
  string model_name = 1;
  string model_version = 2;  // Optional
  string id = 3;             // Optional
  map<string, InferParameter> parameters = 4;  // Optional
  repeated ModelInferResponse.InferOutputTensor outputs = 5;
}
```

The gRPC API provides the same functionality as the HTTP/REST API but with the performance advantages of gRPC's binary serialization and streaming capabilities.

## Tensor Data Types

The protocol supports various tensor data types for both input and output:

| Data Type | Size (bytes)                  |
|-----------|-------------------------------|
| BOOL      | 1                             |
| UINT8     | 1                             |
| UINT16    | 2                             |
| UINT32    | 4                             |
| UINT64    | 8                             |
| INT8      | 1                             |
| INT16     | 2                             |
| INT32     | 4                             |
| INT64     | 8                             |
| FP16      | 2                             |
| FP32      | 4                             |
| FP64      | 8                             |
| BYTES     | Variable (max 2<sup>32</sup>) |

## Tensor Data Representation

Tensor data in all representations must be:
- Flattened to a one-dimensional, row-major order of the tensor elements
- Without any stride or padding between elements
- In "linear" order

For JSON formats, data can be provided in a nested array matching the tensor shape or as a flattened array.

## Platforms

The protocol supports various ML platforms, identified using the format `<project>_<format>`:

- `tensorrt_plan`: A TensorRT model encoded as a serialized engine or "plan"
- `tensorflow_graphdef`: A TensorFlow model encoded as a GraphDef
- `tensorflow_savedmodel`: A TensorFlow model encoded as a SavedModel
- `onnx_onnxv1`: An ONNX model encoded for ONNX Runtime
- `pytorch_torchscript`: A PyTorch model encoded as TorchScript
- `mxnet_mxnet`: An MXNet model
- `caffe2_netdef`: A Caffe2 model encoded as a NetDef

## Examples

Here are examples of the various API calls in the V2 protocol.

### HTTP/REST Examples

#### Inference Example

**Request**:

```http
POST /v2/models/mymodel/infer HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Content-Length: <xx>
{
  "id": "42",
  "inputs": [
    {
      "name": "input0",
      "shape": [2, 2],
      "datatype": "UINT32",
      "data": [1, 2, 3, 4]
    },
    {
      "name": "input1",
      "shape": [3],
      "datatype": "BOOL",
      "data": [true, false, true]
    }
  ],
  "outputs": [
    {
      "name": "output0"
    }
  ]
}
```

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: <yy>
{
  "id": "42",
  "outputs": [
    {
      "name": "output0",
      "shape": [3, 2],
      "datatype": "FP32",
      "data": [1.0, 1.1, 2.0, 2.1, 3.0, 3.1]
    }
  ]
}
```

#### Model Metadata Example

**Request**:

```http
GET /v2/models/mymodel HTTP/1.1
Host: localhost:8000
```

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: <zz>
{
  "name": "mymodel",
  "versions": ["1", "2"],
  "platform": "pytorch_torchscript",
  "inputs": [
    {
      "name": "input0",
      "datatype": "UINT32",
      "shape": [2, 2]
    },
    {
      "name": "input1",
      "datatype": "BOOL",
      "shape": [3]
    }
  ],
  "outputs": [
    {
      "name": "output0",
      "datatype": "FP32",
      "shape": [3, 2]
    }
  ]
}
```

#### Server Ready Example

**Request**:

```http
GET /v2/health/ready HTTP/1.1
Host: localhost:8000
```

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: <aa>
{
  "ready": true
}
```

## Benefits of V2 Protocol

- **Standardized Interfaces**: Consistent API across different ML frameworks
- **Health and Readiness**: Built-in health checking and readiness probes
- **Metadata Support**: Rich model and server metadata
- **Performance**: Optimized for high-throughput inference
- **Dual Interface**: Support for both RESTful and gRPC APIs
- **Binary Data**: Optional binary data representation for better performance
- **Version Support**: Explicit model version management

## Extensions

The V2 Protocol supports extensions for additional functionality:

- [Binary Tensor Data Extension](./binary_tensor_data_extension.md) - For high-performance data transfer
- Other extensions may be proposed separately

## Next Steps

- Learn about the [Binary Tensor Data Extension](./binary_tensor_data_extension.md)
- Explore the [V1 Protocol](../v1_protocol.md) if you need the explain functionality
- Check the [KServe website](https://kserve.github.io/website/) for more information about compatible serving runtimes
