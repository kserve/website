## Open Inference Protocol (V2 Inference Protocol)

**For an inference server to be compliant with this protocol the server must implement the health, metadata, and inference V2 APIs**. Optional features that are explicitly noted are not required. A compliant inference server may choose to implement the [HTTP/REST API](#httprest) and/or the [GRPC API](#grpc).

The V2 protocol supports an extension mechanism as a required part of the API, but this document does not propose any specific extensions. Any specific extensions will be proposed separately.

Note: For all API descriptions on this page, all strings in all contexts are case-sensitive.

### Note on changes between V1 & V2 

V2 protocol does not currently support the explain endpoint like V1 protocol does. If this is a feature you wish to have in the V2 protocol, please submit a [github issue](https://github.com/kserve/kserve/issues). 


## HTTP/REST

The HTTP/REST API uses JSON because it is widely supported and
language independent. In all JSON schemas shown in this document
$number, $string, $boolean, $object and $array refer to the
fundamental JSON types. #optional indicates an optional JSON field.

See also: The HTTP/REST endpoints are defined in [rest_predict_v2.yaml](https://github.com/kserve/kserve/blob/master/docs/predict-api/v2/rest_predict_v2.yaml)

| API  | Verb | Path | Request Payload | Response Payload | 
| ------------- | ------------- | ------------- | ------------- | ------------- |
| Inference | POST | v2/models/<model_name>[/versions/\<model_version\>]/infer | [$inference_request](#inference-request-json-object) | [$inference_response](#inference-response-json-object) |
| Model Metadata | GET | v2/models/\<model_name\>[/versions/\<model_version\>] | | [$metadata_model_response](#model-metadata-response-json-object) | 
| Server Ready | GET | v2/health/ready | | [$ready_server_response](#server-ready-response-json-object) | 
| Server Live | GET | v2/health/live | | [$live_server_response](#server-live-response-json-objet)| 
| Server Metadata | GET | v2 | | [$metadata_server_response](#server-metadata-response-json-object) |
| Model Ready| GET   | v2/models/\<model_name\>[/versions/<model_version>]/ready |  | [$ready_model_response](#model-ready-response-json-object) |

** path contents in `[]` are optional

For more information regarding payload contents, see `Payload Contents`.

The versions portion of the `Path` URLs (in `[]`) is shown as **optional** to allow implementations that don’t support versioning or for cases when the user does not want to specify a specific model version (in which case the server will choose a version based on its own policies).
For example, if a model does not implement a version, the Model Metadata request path could look like `v2/model/my_model`. If the model has been configured to implement a version, the request path could look something like `v2/models/my_model/versions/v10`, where the version of the model is v10.

<!-- // TODO: add example with -d inputs. -->

### **API Definitions**

| API  | Definition | 
| --- | --- |
| Inference | The `/infer` endpoint performs inference on a model. The response is the prediction result.| 
| Model Metadata | The "model metadata" API is a per-model endpoint that returns details about the model passed in the path. | 
| Server Ready | The “server ready” health API indicates if all the models are ready for inferencing. The “server ready” health API can be used directly to implement the Kubernetes readinessProbe |
| Server Live | The “server live” health API indicates if the inference server is able to receive and respond to metadata and inference requests. The “server live” API can be used directly to implement the Kubernetes livenessProbe. |
| Server Metadata | The "server metadata" API returns details describing the server. | 
<!-- TODO: uncomment when implemented | Model Ready | The “model ready” health API indicates if a specific model is ready for inferencing. The model name and (optionally) version must be available in the URL. |  -->

### Health/Readiness/Liveness Probes

The Model Readiness probe the question "Did the model download and is it able to serve requests?" and responds with the available model name(s). The Server Readiness/Liveness probes answer the question "Is my service and its infrastructure running, healthy, and able to receive and process requests?"

To read more about liveness and readiness probe concepts, visit the [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
Kubernetes documentation.

### **Payload Contents**

### **Model Ready**

The model ready endpoint returns the readiness probe response for the server along with the name of the model.

#### Model Ready Response JSON Object


    $ready_model_response =
    {
      "name" : $string,
      "ready": $bool
    }


### Server Ready

The server ready endpoint returns the readiness probe response for the server.

#### Server Ready Response JSON Object

    $ready_server_response =
    {
      "live" : $bool,
    }

---

### Server Live

The server live endpoint returns the liveness probe response for the server.

#### Server Live Response JSON Objet

    $live_server_response =
    {
      "live" : $bool,
    }

---

### Server Metadata

The server metadata endpoint provides information about the server. A
server metadata request is made with an HTTP GET to a server metadata
endpoint. In the corresponding response the HTTP body contains the
[Server Metadata Response JSON Object](#server-metadata-response-json-object)
or the
[Server Metadata Response JSON Error Object](#server-metadata-response-json-error-object).

#### Server Metadata Response JSON Object

A successful server metadata request is indicated by a 200 HTTP status
code. The server metadata response object, identified as
*$metadata_server_response*, is returned in the HTTP body.

    $metadata_server_response =
    {
      "name" : $string,
      "version" : $string,
      "extensions" : [ $string, ... ]
    }

* “name” : A descriptive name for the server.
* "version" : The server version.
* “extensions” : The extensions supported by the server. Currently no standard extensions are defined. Individual inference servers may define and document their own extensions.


#### Server Metadata Response JSON Error Object

A failed server metadata request must be indicated by an HTTP error
status (typically 400). The HTTP body must contain the
*$metadata_server_error_response* object.

    $metadata_server_error_response =
    {
      "error": $string
    }

* “error” : The descriptive message for the error.


The per-model metadata endpoint provides information about a model. A
model metadata request is made with an HTTP GET to a model metadata
endpoint. In the corresponding response the HTTP body contains the
[Model Metadata Response JSON Object](#model-metadata-response-json-object)
or the
[Model Metadata Response JSON Error Object](#model-metadata-response-json-error-object).
The model name and (optionally) version must be available in the
URL. If a version is not provided the server may choose a version
based on its own policies or return an error.

---

### Model Metadata

The per-model metadata endpoint provides information about a model. A
model metadata request is made with an HTTP GET to a model metadata
endpoint. In the corresponding response the HTTP body contains the
[Model Metadata Response JSON Object](#model-metadata-response-json-object)
or the
[Model Metadata Response JSON Error Object](#model-metadata-response-json-error-object).
The model name and (optionally) version must be available in the
URL. If a version is not provided the server may choose a version
based on its own policies or return an error.

#### Model Metadata Response JSON Object

A successful model metadata request is indicated by a 200 HTTP status
code. The metadata response object, identified as
*$metadata_model_response*, is returned in the HTTP body for every
successful model metadata request.

    $metadata_model_response =
    {
      "name" : $string,
      "versions" : [ $string, ... ] #optional,
      "platform" : $string,
      "inputs" : [ $metadata_tensor, ... ],
      "outputs" : [ $metadata_tensor, ... ]
    }

* “name” : The name of the model.
* "versions" : The model versions that may be explicitly requested via
  the appropriate endpoint. Optional for servers that don’t support
  versions. Optional for models that don’t allow a version to be
  explicitly requested.
* “platform” : The framework/backend for the model. See
  [Platforms](#platforms).
* “inputs” : The inputs required by the model.
* “outputs” : The outputs produced by the model.

Each model input and output tensors’ metadata is described with a
*$metadata_tensor object*.

    $metadata_tensor =
    {
      "name" : $string,
      "datatype" : $string,
      "shape" : [ $number, ... ]
    }

* “name” : The name of the tensor.
* "datatype" : The data-type of the tensor elements as defined in
  [Tensor Data Types](#tensor-data-types).
* "shape" : The shape of the tensor. Variable-size dimensions are
  specified as -1.

#### Model Metadata Response JSON Error Object

A failed model metadata request must be indicated by an HTTP error
status (typically 400). The HTTP body must contain the
*$metadata_model_error_response* object.

    $metadata_model_error_response =
    {
      "error": $string
    }

* “error” : The descriptive message for the error.

---

### Inference

An inference request is made with an HTTP POST to an inference
endpoint. In the request the HTTP body contains the
[Inference Request JSON Object](#inference-request-json-object). In
the corresponding response the HTTP body contains the
[Inference Response JSON Object](#inference-response-json-object) or
[Inference Response JSON Error Object](#inference-response-json-error-object). See
[Inference Request Examples](#inference-request-examples) for some
example HTTP/REST requests and responses.

#### Inference Request JSON Object

The inference request object, identified as *$inference_request*, is
required in the HTTP body of the POST request. The model name and
(optionally) version must be available in the URL. If a version is not
provided the server may choose a version based on its own policies or
return an error.

    $inference_request =
    {
      "id" : $string #optional,
      "parameters" : $parameters #optional,
      "inputs" : [ $request_input, ... ],
      "outputs" : [ $request_output, ... ] #optional
    }

* "id" : An identifier for this request. Optional, but if specified
  this identifier must be returned in the response.
* "parameters" : An object containing zero or more parameters for this
  inference request expressed as key/value pairs. See
  [Parameters](#parameters) for more information.
* "inputs" : The input tensors. Each input is described using the
  *$request_input* schema defined in [Request Input](#inference_request-input).
* "outputs" : The output tensors requested for this inference. Each
  requested output is described using the *$request_output* schema
  defined in [Request Output](#inference_request-output). Optional, if not
  specified all outputs produced by the model will be returned using
  default *$request_output* settings.

##### Request Input

The *$inference_request_input* JSON describes an input to the model. If the
input is batched, the shape and data must represent the full shape and
contents of the entire batch.

    $inference_request_input =
    {
      "name" : $string,
      "shape" : [ $number, ... ],
      "datatype"  : $string,
      "parameters" : $parameters #optional,
      "data" : $tensor_data
    }

* "name" : The name of the input tensor.
* "shape" : The shape of the input tensor. Each dimension must be an
  integer representable as an unsigned 64-bit integer value.
* "datatype" : The data-type of the input tensor elements as defined
  in [Tensor Data Types](#tensor-data-types).
* "parameters" : An object containing zero or more parameters for this
  input expressed as key/value pairs. See [Parameters](#parameters)
  for more information.
* “data”: The contents of the tensor. See [Tensor Data](#tensor-data)
  for more information.

##### Request Output

The *$request_output* JSON is used to request which output tensors
should be returned from the model.

    $inference_request_output =
    {
      "name" : $string,
      "parameters" : $parameters #optional,
    }

* "name" : The name of the output tensor.
* "parameters" : An object containing zero or more parameters for this
  output expressed as key/value pairs. See [Parameters](#parameters)
  for more information.

#### Inference Response JSON Object

A successful inference request is indicated by a 200 HTTP status
code. The inference response object, identified as
*$inference_response*, is returned in the HTTP body.

    $inference_response =
    {
      "model_name" : $string,
      "model_version" : $string #optional,
      "id" : $string,
      "parameters" : $parameters #optional,
      "outputs" : [ $response_output, ... ]
    }

* "model_name" : The name of the model used for inference.
* "model_version" : The specific model version used for
  inference. Inference servers that do not implement versioning should
  not provide this field in the response.
* "id" : The "id" identifier given in the request, if any.
* "parameters" : An object containing zero or more parameters for this
  response expressed as key/value pairs. See [Parameters](#parameters)
  for more information.
* "outputs" : The output tensors. Each output is described using the
  $response_output schema defined in
  [Response Output](#response-output).

---


### **Inference Request Examples**

### Inference Request Examples

The following example shows an inference request to a model with two
inputs and one output. The HTTP Content-Length header gives the size
of the JSON object.

    POST /v2/models/mymodel/infer HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json
    Content-Length: <xx>
    {
      "id" : "42",
      "inputs" : [
        {
          "name" : "input0",
          "shape" : [ 2, 2 ],
          "datatype" : "UINT32",
          "data" : [ 1, 2, 3, 4 ]
        },
        {
          "name" : "input1",
          "shape" : [ 3 ],
          "datatype" : "BOOL",
          "data" : [ true ]
        }
      ],
      "outputs" : [
        {
          "name" : "output0"
        }
      ]
    }

For the above request the inference server must return the “output0”
output tensor. Assuming the model returns a [ 3, 2 ] tensor of data
type FP32 the following response would be returned.

    HTTP/1.1 200 OK
    Content-Type: application/json
    Content-Length: <yy>
    {
      "id" : "42"
      "outputs" : [
        {
          "name" : "output0",
          "shape" : [ 3, 2 ],
          "datatype"  : "FP32",
          "data" : [ 1.0, 1.1, 2.0, 2.1, 3.0, 3.1 ]
        }
      ]
    }


## gRPC

The GRPC API closely follows the concepts defined in the
[HTTP/REST](#httprest) API. A compliant server must implement the
health, metadata, and inference APIs described in this section.


| API  | rpc Endpoint | Request Message | Response Message | 
| --- | --- | --- | ---| 
| Inference | [ModelInfer](#inference) | ModelInferRequest | ModelInferResponse | 
| Model Ready | [ModelReady](#model-ready) | [ModelReadyRequest] | ModelReadyResponse |
| Model Metadata | [ModelMetadata](#model-metadata)| ModelMetadataRequest | ModelMetadataResponse | 
| Server Ready | [ServerReady](#server-ready) | ServerReadyRequest | ServerReadyResponse |
| Server Live | [ServerLive](#server-live) | ServerLiveRequest | ServerLiveResponse | 

For more detailed information on each endpoint and its contents, see `API Definitions` and `Message Contents`.

See also: The gRPC endpoints, request/response messages and contents are defined in [grpc_predict_v2.proto](https://github.com/kserve/kserve/blob/master/docs/predict-api/v2/grpc_predict_v2.proto)


### **API Definitions** 


The GRPC definition of the service is:

    //
    // Inference Server GRPC endpoints.
    //
    service GRPCInferenceService
    {
      // Check liveness of the inference server.
      rpc ServerLive(ServerLiveRequest) returns (ServerLiveResponse) {}

      // Check readiness of the inference server.
      rpc ServerReady(ServerReadyRequest) returns (ServerReadyResponse) {}

      // Check readiness of a model in the inference server.
      rpc ModelReady(ModelReadyRequest) returns (ModelReadyResponse) {}

      // Get server metadata.
      rpc ServerMetadata(ServerMetadataRequest) returns (ServerMetadataResponse) {}

      // Get model metadata.
      rpc ModelMetadata(ModelMetadataRequest) returns (ModelMetadataResponse) {}

      // Perform inference using a specific model.
      rpc ModelInfer(ModelInferRequest) returns (ModelInferResponse) {}
    }

### **Message Contents**

### Health

A health request is made using the ServerLive, ServerReady, or
ModelReady endpoint. For each of these endpoints errors are indicated by the google.rpc.Status returned for the request. The OK code indicates success and other codes indicate failure.

#### Server Live

The ServerLive API indicates if the inference server is able to
receive and respond to metadata and inference requests. The request
and response messages for ServerLive are:

    message ServerLiveRequest {}

    message ServerLiveResponse
    {
      // True if the inference server is live, false if not live.
      bool live = 1;
    }

#### Server Ready

The ServerReady API indicates if the server is ready for
inferencing. The request and response messages for ServerReady are:

    message ServerReadyRequest {}

    message ServerReadyResponse
    {
      // True if the inference server is ready, false if not ready.
      bool ready = 1;
    }

#### Model Ready

The ModelReady API indicates if a specific model is ready for
inferencing. The request and response messages for ModelReady are:

    message ModelReadyRequest
    {
      // The name of the model to check for readiness.
      string name = 1;

      // The version of the model to check for readiness. If not given the
      // server will choose a version based on the model and internal policy.
      string version = 2;
    }

    message ModelReadyResponse
    {
      // True if the model is ready, false if not ready.
      bool ready = 1;
    }

---

### Metadata

#### Server Metadata 

The ServerMetadata API provides information about the server. Errors are indicated by the google.rpc.Status returned for the request. The OK code indicates success and other codes indicate failure. The request and response messages for ServerMetadata are:

    message ServerMetadataRequest {}

    message ServerMetadataResponse
    {
      // The server name.
      string name = 1;

      // The server version.
      string version = 2;

      // The extensions supported by the server.
      repeated string extensions = 3;
    }

#### Model Metadata

The per-model metadata API provides information about a model. Errors
are indicated by the google.rpc.Status returned for the request. The
OK code indicates success and other codes indicate failure. The
request and response messages for ModelMetadata are:

    message ModelMetadataRequest
    {
      // The name of the model.
      string name = 1;

      // The version of the model to check for readiness. If not given the
      // server will choose a version based on the model and internal policy.
      string version = 2;
    }

    message ModelMetadataResponse
    {
      // Metadata for a tensor.
      message TensorMetadata
      {
        // The tensor name.
        string name = 1;

        // The tensor data type.
        string datatype = 2;

        // The tensor shape. A variable-size dimension is represented
        // by a -1 value.
        repeated int64 shape = 3;
      }

      // The model name.
      string name = 1;

      // The versions of the model available on the server.
      repeated string versions = 2;

      // The model's platform. See Platforms.
      string platform = 3;

      // The model's inputs.
      repeated TensorMetadata inputs = 4;

      // The model's outputs.
      repeated TensorMetadata outputs = 5;
    }

#### Platforms

A platform is a string indicating a DL/ML framework or
backend. Platform is returned as part of the response to a
[Model Metadata](#model_metadata) request but is information only. The
proposed inference APIs are generic relative to the DL/ML framework
used by a model and so a client does not need to know the platform of
a given model to use the API. Platform names use the format
“<project>_<format>”. The following platform names are allowed:

* tensorrt_plan : A TensorRT model encoded as a serialized engine or “plan”.
* tensorflow_graphdef : A TensorFlow model encoded as a GraphDef.
* tensorflow_savedmodel : A TensorFlow model encoded as a SavedModel.
* onnx_onnxv1 : A ONNX model encoded for ONNX Runtime.
* pytorch_torchscript : A PyTorch model encoded as TorchScript.
* mxnet_mxnet: An MXNet model
* caffe2_netdef : A Caffe2 model encoded as a NetDef.

---

### Inference

The ModelInfer API performs inference using the specified
model. Errors are indicated by the google.rpc.Status returned for the request. The OK code indicates success and other codes indicate
failure. The request and response messages for ModelInfer are:

    message ModelInferRequest
    {
      // An input tensor for an inference request.
      message InferInputTensor
      {
        // The tensor name.
        string name = 1;

        // The tensor data type.
        string datatype = 2;

        // The tensor shape.
        repeated int64 shape = 3;

        // Optional inference input tensor parameters.
        map<string, InferParameter> parameters = 4;

        // The tensor contents using a data-type format. This field must
        // not be specified if "raw" tensor contents are being used for
        // the inference request.
        InferTensorContents contents = 5;
      }

      // An output tensor requested for an inference request.
      message InferRequestedOutputTensor
      {
        // The tensor name.
        string name = 1;

        // Optional requested output tensor parameters.
        map<string, InferParameter> parameters = 2;
      }

      // The name of the model to use for inferencing.
      string model_name = 1;

      // The version of the model to use for inference. If not given the
      // server will choose a version based on the model and internal policy.
      string model_version = 2;

      // Optional identifier for the request. If specified will be
      // returned in the response.
      string id = 3;

      // Optional inference parameters.
      map<string, InferParameter> parameters = 4;

      // The input tensors for the inference.
      repeated InferInputTensor inputs = 5;

      // The requested output tensors for the inference. Optional, if not
      // specified all outputs produced by the model will be returned.
      repeated InferRequestedOutputTensor outputs = 6;

      // The data contained in an input tensor can be represented in "raw"
      // bytes form or in the repeated type that matches the tensor's data
      // type. To use the raw representation 'raw_input_contents' must be
      // initialized with data for each tensor in the same order as
      // 'inputs'. For each tensor, the size of this content must match
      // what is expected by the tensor's shape and data type. The raw
      // data must be the flattened, one-dimensional, row-major order of
      // the tensor elements without any stride or padding between the
      // elements. Note that the FP16 data type must be represented as raw
      // content as there is no specific data type for a 16-bit float
      // type.
      //
      // If this field is specified then InferInputTensor::contents must
      // not be specified for any input tensor.
      repeated bytes raw_input_contents = 7;
    }

    message ModelInferResponse
    {
      // An output tensor returned for an inference request.
      message InferOutputTensor
      {
        // The tensor name.
        string name = 1;

        // The tensor data type.
        string datatype = 2;

        // The tensor shape.
        repeated int64 shape = 3;

        // Optional output tensor parameters.
        map<string, InferParameter> parameters = 4;

        // The tensor contents using a data-type format. This field must
        // not be specified if "raw" tensor contents are being used for
        // the inference response.
        InferTensorContents contents = 5;
      }

      // The name of the model used for inference.
      string model_name = 1;

      // The version of the model used for inference.
      string model_version = 2;

      // The id of the inference request if one was specified.
      string id = 3;

      // Optional inference response parameters.
      map<string, InferParameter> parameters = 4;

      // The output tensors holding inference results.
      repeated InferOutputTensor outputs = 5;

      // The data contained in an output tensor can be represented in
      // "raw" bytes form or in the repeated type that matches the
      // tensor's data type. To use the raw representation 'raw_output_contents'
      // must be initialized with data for each tensor in the same order as
      // 'outputs'. For each tensor, the size of this content must match
      // what is expected by the tensor's shape and data type. The raw
      // data must be the flattened, one-dimensional, row-major order of
      // the tensor elements without any stride or padding between the
      // elements. Note that the FP16 data type must be represented as raw
      // content as there is no specific data type for a 16-bit float
      // type.
      //
      // If this field is specified then InferOutputTensor::contents must
      // not be specified for any output tensor.
      repeated bytes raw_output_contents = 6;
    }

#### Parameters

The Parameters message describes a “name”/”value” pair, where the
“name” is the name of the parameter and the “value” is a boolean,
integer, or string corresponding to the parameter.

Currently no parameters are defined. As required a future proposal may define one or more standard parameters to allow portable functionality across different inference servers. A server can implement server-specific parameters to provide non-standard capabilities.

    //
    // An inference parameter value.
    //
    message InferParameter
    {
      // The parameter value can be a string, an int64, a boolean
      // or a message specific to a predefined parameter.
      oneof parameter_choice
      {
        // A boolean parameter value.
        bool bool_param = 1;

        // An int64 parameter value.
        int64 int64_param = 2;

        // A string parameter value.
        string string_param = 3;
      }
    }

---

### Tensor Data

In all representations tensor data must be flattened to a
one-dimensional, row-major order of the tensor elements. Element
values must be given in "linear" order without any stride or padding
between elements.

Using a "raw" representation of tensors with
ModelInferRequest::raw_input_contents and
ModelInferResponse::raw_output_contents will typically allow higher
performance due to the way protobuf allocation and reuse interacts
with GRPC. For example, see https://github.com/grpc/grpc/issues/23231.

An alternative to the "raw" representation is to use
InferTensorContents to represent the tensor data in a format that
matches the tensor's data type.

    //
    // The data contained in a tensor represented by the repeated type
    // that matches the tensor's data type. Protobuf oneof is not used
    // because oneofs cannot contain repeated fields.
    //
    message InferTensorContents
    {
      // Representation for BOOL data type. The size must match what is
      // expected by the tensor's shape. The contents must be the flattened,
      // one-dimensional, row-major order of the tensor elements.
      repeated bool bool_contents = 1;

      // Representation for INT8, INT16, and INT32 data types. The size
      // must match what is expected by the tensor's shape. The contents
      // must be the flattened, one-dimensional, row-major order of the
      // tensor elements.
      repeated int32 int_contents = 2;

      // Representation for INT64 data types. The size must match what
      // is expected by the tensor's shape. The contents must be the
      // flattened, one-dimensional, row-major order of the tensor elements.
      repeated int64 int64_contents = 3;

      // Representation for UINT8, UINT16, and UINT32 data types. The size
      // must match what is expected by the tensor's shape. The contents
      // must be the flattened, one-dimensional, row-major order of the
      // tensor elements.
      repeated uint32 uint_contents = 4;

      // Representation for UINT64 data types. The size must match what
      // is expected by the tensor's shape. The contents must be the
      // flattened, one-dimensional, row-major order of the tensor elements.
      repeated uint64 uint64_contents = 5;

      // Representation for FP32 data type. The size must match what is
      // expected by the tensor's shape. The contents must be the flattened,
      // one-dimensional, row-major order of the tensor elements.
      repeated float fp32_contents = 6;

      // Representation for FP64 data type. The size must match what is
      // expected by the tensor's shape. The contents must be the flattened,
      // one-dimensional, row-major order of the tensor elements.
      repeated double fp64_contents = 7;

      // Representation for BYTES data type. The size must match what is
      // expected by the tensor's shape. The contents must be the flattened,
      // one-dimensional, row-major order of the tensor elements.
      repeated bytes bytes_contents = 8;
    }

#### Tensor Data Types

Tensor data types are shown in the following table along with the size
of each type, in bytes.


| Data Type | Size (bytes) |
| --------- | ------------ |
| BOOL      | 1            |
| UINT8     | 1            |
| UINT16    | 2            |
| UINT32    | 4            |
| UINT64    | 8            |
| INT8      | 1            |
| INT16     | 2            |
| INT32     | 4            |
| INT64     | 8            |
| FP16      | 2            |
| FP32      | 4            |
| FP64      | 8            |
| BYTES     | Variable (max 2<sup>32</sup>) |

---
