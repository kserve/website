---
title: gRPC API Reference
---



### ServerLive

The ServerLive API indicates if the inference server is able to receive 
and respond to metadata and inference requests.

> rpc inference.GRPCInferenceService/ServerLive([ServerLiveRequest](#serverliverequest))
>   returns [ServerLiveResponse](#serverliveresponse)

### ServerReady

The ServerReady API indicates if the server is ready for inferencing.

> rpc inference.GRPCInferenceService/ServerReady([ServerReadyRequest](#serverreadyrequest))
>   returns [ServerReadyResponse](#serverreadyresponse)

### ModelReady

The ModelReady API indicates if a specific model is ready for inferencing.

> rpc inference.GRPCInferenceService/ModelReady([ModelReadyRequest](#modelreadyrequest))
>   returns [ModelReadyResponse](#modelreadyresponse)

### ServerMetadata

The ServerMetadata API provides information about the server. Errors are 
indicated by the google.rpc.Status returned for the request. The OK code 
indicates success and other codes indicate failure.

> rpc inference.GRPCInferenceService/ServerMetadata([ServerMetadataRequest](#servermetadatarequest))
>   returns [ServerMetadataResponse](#servermetadataresponse)

### ModelMetadata

The per-model metadata API provides information about a model. Errors are 
indicated by the google.rpc.Status returned for the request. The OK code 
indicates success and other codes indicate failure.

> rpc inference.GRPCInferenceService/ModelMetadata([ModelMetadataRequest](#modelmetadatarequest))
>   returns [ModelMetadataResponse](#modelmetadataresponse)

### ModelInfer

The ModelInfer API performs inference using the specified model. Errors are
indicated by the google.rpc.Status returned for the request. The OK code 
indicates success and other codes indicate failure.

> rpc inference.GRPCInferenceService/ModelInfer([ModelInferRequest](#modelinferrequest))
>   returns [ModelInferResponse](#modelinferresponse)




------
### Messages



#### InferParameter

An inference parameter value. The Parameters message describes a 
“name”/”value” pair, where the “name” is the name of the parameter
and the “value” is a boolean, integer, or string corresponding to 
the parameter.


| Field | Type | Description |
| ----- | ---- | ----------- |
| [oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) parameter_choice.bool_param | [bool](#bool) | A boolean parameter value. |
| [oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) parameter_choice.int64_param | [int64](#int64) | An int64 parameter value. |
| [oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) parameter_choice.string_param | [string](#string) | A string parameter value. |
| [oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) parameter_choice.double_param | [double](#double) | A double parameter value. |
| [oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) parameter_choice.uint64_param | [uint64](#uint64) | A uint64 parameter value. |




#### InferTensorContents

The data contained in a tensor represented by the repeated type
that matches the tensor's data type. Protobuf oneof is not used
because oneofs cannot contain repeated fields.


| Field | Type | Description |
| ----- | ---- | ----------- |
| bool_contents | [repeated bool](#bool) | Representation for BOOL data type. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| int_contents | [repeated int32](#int32) | Representation for INT8, INT16, and INT32 data types. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| int64_contents | [repeated int64](#int64) | Representation for INT64 data types. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| uint_contents | [repeated uint32](#uint32) | Representation for UINT8, UINT16, and UINT32 data types. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| uint64_contents | [repeated uint64](#uint64) | Representation for UINT64 data types. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| fp32_contents | [repeated float](#float) | Representation for FP32 data type. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| fp64_contents | [repeated double](#double) | Representation for FP64 data type. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |
| bytes_contents | [repeated bytes](#bytes) | Representation for BYTES data type. The size must match what is expected by the tensor's shape. The contents must be the flattened, one-dimensional, row-major order of the tensor elements. |




#### ModelInferRequest




| Field | Type | Description |
| ----- | ---- | ----------- |
| model_name | [string](#string) | The name of the model to use for inferencing. |
| model_version | [string](#string) | The version of the model to use for inference. If not given the server will choose a version based on the model and internal policy. |
| id | [string](#string) | Optional identifier for the request. If specified will be returned in the response. |
| parameters | [map ModelInferRequest.ParametersEntry](#modelinferrequest-parametersentry) | Optional inference parameters. |
| inputs | [repeated ModelInferRequest.InferInputTensor](#modelinferrequest-inferinputtensor) | The input tensors for the inference. |
| outputs | [repeated ModelInferRequest.InferRequestedOutputTensor](#modelinferrequest-inferrequestedoutputtensor) | The requested output tensors for the inference. Optional, if not specified all outputs produced by the model will be returned. |
| raw_input_contents | [repeated bytes](#bytes) | The data contained in an input tensor can be represented in "raw" bytes form or in the repeated type that matches the tensor's data type. To use the raw representation 'raw_input_contents' must be initialized with data for each tensor in the same order as 'inputs'. For each tensor, the size of this content must match what is expected by the tensor's shape and data type. The raw data must be the flattened, one-dimensional, row-major order of the tensor elements without any stride or padding between the elements. Note that the FP16 and BF16 data types must be represented as raw content as there is no specific data type for a 16-bit float type.

If this field is specified then InferInputTensor::contents must not be specified for any input tensor. |




#### ModelInferRequest.InferInputTensor

An input tensor for an inference request.


| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The tensor name. |
| datatype | [string](#string) | The tensor data type. |
| shape | [repeated int64](#int64) | The tensor shape. |
| parameters | [map ModelInferRequest.InferInputTensor.ParametersEntry](#modelinferrequest-inferinputtensor-parametersentry) | Optional inference input tensor parameters. |
| contents | [InferTensorContents](#infertensorcontents) | The tensor contents using a data-type format. This field must not be specified if "raw" tensor contents are being used for the inference request. |




#### ModelInferRequest.InferInputTensor.ParametersEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [InferParameter](#inferparameter) | N/A |




#### ModelInferRequest.InferRequestedOutputTensor

An output tensor requested for an inference request.


| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The tensor name. |
| parameters | [map ModelInferRequest.InferRequestedOutputTensor.ParametersEntry](#modelinferrequest-inferrequestedoutputtensor-parametersentry) | Optional requested output tensor parameters. |




#### ModelInferRequest.InferRequestedOutputTensor.ParametersEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [InferParameter](#inferparameter) | N/A |




#### ModelInferRequest.ParametersEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [InferParameter](#inferparameter) | N/A |




#### ModelInferResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| model_name | [string](#string) | The name of the model used for inference. |
| model_version | [string](#string) | The version of the model used for inference. |
| id | [string](#string) | The id of the inference request if one was specified. |
| parameters | [map ModelInferResponse.ParametersEntry](#modelinferresponse-parametersentry) | Optional inference response parameters. |
| outputs | [repeated ModelInferResponse.InferOutputTensor](#modelinferresponse-inferoutputtensor) | The output tensors holding inference results. |
| raw_output_contents | [repeated bytes](#bytes) | The data contained in an output tensor can be represented in "raw" bytes form or in the repeated type that matches the tensor's data type. To use the raw representation 'raw_output_contents' must be initialized with data for each tensor in the same order as 'outputs'. For each tensor, the size of this content must match what is expected by the tensor's shape and data type. The raw data must be the flattened, one-dimensional, row-major order of the tensor elements without any stride or padding between the elements. Note that the FP16 and BF16 data types must be represented as raw content as there is no specific data type for a 16-bit float type.

If this field is specified then InferOutputTensor::contents must not be specified for any output tensor. |




#### ModelInferResponse.InferOutputTensor

An output tensor returned for an inference request.


| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The tensor name. |
| datatype | [string](#string) | The tensor data type. |
| shape | [repeated int64](#int64) | The tensor shape. |
| parameters | [map ModelInferResponse.InferOutputTensor.ParametersEntry](#modelinferresponse-inferoutputtensor-parametersentry) | Optional output tensor parameters. |
| contents | [InferTensorContents](#infertensorcontents) | The tensor contents using a data-type format. This field must not be specified if "raw" tensor contents are being used for the inference response. |




#### ModelInferResponse.InferOutputTensor.ParametersEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [InferParameter](#inferparameter) | N/A |




#### ModelInferResponse.ParametersEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [InferParameter](#inferparameter) | N/A |




#### ModelMetadataRequest




| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The name of the model. |
| version | [string](#string) | The version of the model to check for readiness. If not given the server will choose a version based on the model and internal policy. |




#### ModelMetadataResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The model name. |
| versions | [repeated string](#string) | The versions of the model available on the server. |
| platform | [string](#string) | The model's platform. See Platforms. |
| inputs | [repeated ModelMetadataResponse.TensorMetadata](#modelmetadataresponse-tensormetadata) | The model's inputs. |
| outputs | [repeated ModelMetadataResponse.TensorMetadata](#modelmetadataresponse-tensormetadata) | The model's outputs. |
| properties | [map ModelMetadataResponse.PropertiesEntry](#modelmetadataresponse-propertiesentry) | Optional Model Properties |




#### ModelMetadataResponse.PropertiesEntry




| Field | Type | Description |
| ----- | ---- | ----------- |
| key | [string](#string) | N/A |
| value | [string](#string) | N/A |




#### ModelMetadataResponse.TensorMetadata

Metadata for a tensor.


| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The tensor name. |
| datatype | [string](#string) | The tensor data type. |
| shape | [repeated int64](#int64) | The tensor shape. A variable-size dimension is represented by a -1 value. |




#### ModelReadyRequest




| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The name of the model to check for readiness. |
| version | [string](#string) | The version of the model to check for readiness. If not given the server will choose a version based on the model and internal policy. |




#### ModelReadyResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| ready | [bool](#bool) | True if the model is ready, false if not ready. |




#### ServerLiveRequest






#### ServerLiveResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| live | [bool](#bool) | True if the inference server is live, false if not live. |




#### ServerMetadataRequest






#### ServerMetadataResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| name | [string](#string) | The server name. |
| version | [string](#string) | The server version. |
| extensions | [repeated string](#string) | The extensions supported by the server. |




#### ServerReadyRequest






#### ServerReadyResponse




| Field | Type | Description |
| ----- | ---- | ----------- |
| ready | [bool](#bool) | True if the inference server is ready, false if not ready. |





