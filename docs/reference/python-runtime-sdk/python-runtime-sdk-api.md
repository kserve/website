---
title: Python Runtime SDK API
displayed_sidebar: docsSidebar
---
# Python Runtime SDK API
# Table of Contents

* [kserve.model\_server](#kserve.model_server)
  * [ModelServer](#kserve.model_server.ModelServer)
    * [\_\_init\_\_](#kserve.model_server.ModelServer.__init__)
    * [start](#kserve.model_server.ModelServer.start)
    * [stop](#kserve.model_server.ModelServer.stop)
    * [register\_exception\_handler](#kserve.model_server.ModelServer.register_exception_handler)
    * [default\_exception\_handler](#kserve.model_server.ModelServer.default_exception_handler)
    * [register\_model](#kserve.model_server.ModelServer.register_model)
* [kserve.model](#kserve.model)
  * [BaseKServeModel](#kserve.model.BaseKServeModel)
    * [\_\_init\_\_](#kserve.model.BaseKServeModel.__init__)
    * [healthy](#kserve.model.BaseKServeModel.healthy)
    * [load](#kserve.model.BaseKServeModel.load)
    * [start](#kserve.model.BaseKServeModel.start)
    * [start\_engine](#kserve.model.BaseKServeModel.start_engine)
    * [stop](#kserve.model.BaseKServeModel.stop)
    * [stop\_engine](#kserve.model.BaseKServeModel.stop_engine)
  * [InferenceModel](#kserve.model.InferenceModel)
  * [Model](#kserve.model.Model)
    * [\_\_init\_\_](#kserve.model.Model.__init__)
    * [\_\_call\_\_](#kserve.model.Model.__call__)
    * [load](#kserve.model.Model.load)
    * [preprocess](#kserve.model.Model.preprocess)
    * [postprocess](#kserve.model.Model.postprocess)
    * [predict](#kserve.model.Model.predict)
    * [explain](#kserve.model.Model.explain)
* [kserve.protocol.infer\_type](#kserve.protocol.infer_type)
  * [serialize\_byte\_tensor](#kserve.protocol.infer_type.serialize_byte_tensor)
  * [deserialize\_bytes\_tensor](#kserve.protocol.infer_type.deserialize_bytes_tensor)
  * [InferInput](#kserve.protocol.infer_type.InferInput)
    * [\_\_init\_\_](#kserve.protocol.infer_type.InferInput.__init__)
    * [name](#kserve.protocol.infer_type.InferInput.name)
    * [datatype](#kserve.protocol.infer_type.InferInput.datatype)
    * [data](#kserve.protocol.infer_type.InferInput.data)
    * [data](#kserve.protocol.infer_type.InferInput.data)
    * [shape](#kserve.protocol.infer_type.InferInput.shape)
    * [parameters](#kserve.protocol.infer_type.InferInput.parameters)
    * [parameters](#kserve.protocol.infer_type.InferInput.parameters)
    * [shape](#kserve.protocol.infer_type.InferInput.shape)
    * [as\_string](#kserve.protocol.infer_type.InferInput.as_string)
    * [as\_numpy](#kserve.protocol.infer_type.InferInput.as_numpy)
    * [set\_data\_from\_numpy](#kserve.protocol.infer_type.InferInput.set_data_from_numpy)
  * [RequestedOutput](#kserve.protocol.infer_type.RequestedOutput)
    * [\_\_init\_\_](#kserve.protocol.infer_type.RequestedOutput.__init__)
    * [name](#kserve.protocol.infer_type.RequestedOutput.name)
    * [parameters](#kserve.protocol.infer_type.RequestedOutput.parameters)
    * [parameters](#kserve.protocol.infer_type.RequestedOutput.parameters)
    * [binary\_data](#kserve.protocol.infer_type.RequestedOutput.binary_data)
  * [InferRequest](#kserve.protocol.infer_type.InferRequest)
    * [\_\_init\_\_](#kserve.protocol.infer_type.InferRequest.__init__)
    * [use\_binary\_outputs](#kserve.protocol.infer_type.InferRequest.use_binary_outputs)
    * [from\_grpc](#kserve.protocol.infer_type.InferRequest.from_grpc)
    * [from\_bytes](#kserve.protocol.infer_type.InferRequest.from_bytes)
    * [from\_inference\_request](#kserve.protocol.infer_type.InferRequest.from_inference_request)
    * [to\_rest](#kserve.protocol.infer_type.InferRequest.to_rest)
    * [to\_grpc](#kserve.protocol.infer_type.InferRequest.to_grpc)
    * [as\_dataframe](#kserve.protocol.infer_type.InferRequest.as_dataframe)
    * [get\_input\_by\_name](#kserve.protocol.infer_type.InferRequest.get_input_by_name)
  * [InferOutput](#kserve.protocol.infer_type.InferOutput)
    * [\_\_init\_\_](#kserve.protocol.infer_type.InferOutput.__init__)
    * [name](#kserve.protocol.infer_type.InferOutput.name)
    * [datatype](#kserve.protocol.infer_type.InferOutput.datatype)
    * [data](#kserve.protocol.infer_type.InferOutput.data)
    * [data](#kserve.protocol.infer_type.InferOutput.data)
    * [shape](#kserve.protocol.infer_type.InferOutput.shape)
    * [shape](#kserve.protocol.infer_type.InferOutput.shape)
    * [parameters](#kserve.protocol.infer_type.InferOutput.parameters)
    * [parameters](#kserve.protocol.infer_type.InferOutput.parameters)
    * [as\_numpy](#kserve.protocol.infer_type.InferOutput.as_numpy)
    * [set\_data\_from\_numpy](#kserve.protocol.infer_type.InferOutput.set_data_from_numpy)
  * [InferResponse](#kserve.protocol.infer_type.InferResponse)
    * [\_\_init\_\_](#kserve.protocol.infer_type.InferResponse.__init__)
    * [from\_grpc](#kserve.protocol.infer_type.InferResponse.from_grpc)
    * [from\_rest](#kserve.protocol.infer_type.InferResponse.from_rest)
    * [from\_bytes](#kserve.protocol.infer_type.InferResponse.from_bytes)
    * [to\_rest](#kserve.protocol.infer_type.InferResponse.to_rest)
    * [to\_grpc](#kserve.protocol.infer_type.InferResponse.to_grpc)
    * [get\_output\_by\_name](#kserve.protocol.infer_type.InferResponse.get_output_by_name)
  * [to\_grpc\_parameters](#kserve.protocol.infer_type.to_grpc_parameters)
  * [to\_http\_parameters](#kserve.protocol.infer_type.to_http_parameters)

<a id="kserve.model_server"></a>

# kserve.model\_server

<a id="kserve.model_server.ModelServer"></a>

## ModelServer

```python
class ModelServer()
```

<a id="kserve.model_server.ModelServer.__init__"></a>

### \_\_init\_\_

```python
def __init__(http_port: int = args.http_port,
             grpc_port: int = args.grpc_port,
             workers: int = args.workers,
             max_threads: int = args.max_threads,
             max_asyncio_workers: int = args.max_asyncio_workers,
             registered_models: Optional[ModelRepository] = None,
             enable_grpc: bool = args.enable_grpc,
             enable_docs_url: bool = args.enable_docs_url,
             enable_latency_logging: bool = args.enable_latency_logging,
             access_log_format: str = args.access_log_format,
             grace_period: int = 30,
             predictor_config: Optional[PredictorConfig] = None)
```

KServe ModelServer Constructor

**Arguments**:

- `http_port`: HTTP port. Default: ``8080``.
- `grpc_port`: GRPC port. Default: ``8081``.
- `workers`: Number of uvicorn workers. Default: ``1``.
- `max_threads`: Max number of gRPC processing threads. Default: ``4``
- `max_asyncio_workers`: Max number of AsyncIO threads. Default: ``None``
- `registered_models`: A optional Model repository with registered models.
- `enable_grpc`: Whether to turn on grpc server. Default: ``True``
- `enable_docs_url`: Whether to turn on ``/docs`` Swagger UI. Default: ``False``.
- `enable_latency_logging`: Whether to log latency metric. Default: ``True``.
- `access_log_format`: Format to set for the access log (provided by asgi-logger). Default: ``None``.
it allows to override only the `uvicorn.access`'s format configuration with a richer
set of fields (output hardcoded to `stdout`). This limitation is currently due to the
ASGI specs that don't describe how access logging should be implemented in detail
(please refer to this Uvicorn
[github issue](https://github.com/encode/uvicorn/issues/527) for more info).
- `grace_period`: The grace period in seconds to wait for the server to stop. Default: ``30``.
- `predictor_config`: Optional configuration for the predictor. Default: ``None``.

<a id="kserve.model_server.ModelServer.start"></a>

### start

```python
def start(models: List[BaseKServeModel]) -> None
```

Start the model server with a set of registered models.

**Arguments**:

- `models`: a list of models to register to the model server.

<a id="kserve.model_server.ModelServer.stop"></a>

### stop

```python
def stop(sig: int)
```

Stop the instances of REST and gRPC model servers.

**Arguments**:

- `sig`: The signal to stop the server.

<a id="kserve.model_server.ModelServer.register_exception_handler"></a>

### register\_exception\_handler

```python
def register_exception_handler(
    handler: Callable[[asyncio.events.AbstractEventLoop, Dict[str, Any]],
                      None])
```

Add a custom handler as the event loop exception handler.

If a handler is not provided, the default exception handler will be set.

handler should be a callable object, it should have a signature matching '(loop, context)', where 'loop'
will be a reference to the active event loop, 'context' will be a dict object (see `call_exception_handler()`
documentation for details about context).


<a id="kserve.model_server.ModelServer.default_exception_handler"></a>

### default\_exception\_handler

```python
def default_exception_handler(loop: asyncio.events.AbstractEventLoop,
                              context: Dict[str, Any])
```

Default exception handler for event loop.

This is called when an exception occurs and no exception handler is set.
This can be called by a custom exception handler that wants to defer to the default handler behavior.


<a id="kserve.model_server.ModelServer.register_model"></a>

### register\_model

```python
def register_model(model: BaseKServeModel, name: Optional[str] = None)
```

Register a model to the model server.

**Arguments**:

- `model`: The model object.
- `name`: The name of the model. If not provided, the model's name will be used. This can be used to provide
additional names for the same model.

<a id="kserve.model"></a>

# kserve.model

<a id="kserve.model.BaseKServeModel"></a>

## BaseKServeModel

```python
class BaseKServeModel(ABC)
```

A base class to inherit all of the kserve models from.

This class implements the expectations of model repository and model server.


<a id="kserve.model.BaseKServeModel.__init__"></a>

### \_\_init\_\_

```python
def __init__(name: str)
```

Adds the required attributes

**Arguments**:

- `name`: The name of the model.

<a id="kserve.model.BaseKServeModel.healthy"></a>

### healthy

```python
async def healthy() -> bool
```

Check the health of this model. By default returns `self.ready`.

**Returns**:

True if healthy, false otherwise

<a id="kserve.model.BaseKServeModel.load"></a>

### load

```python
def load() -> bool
```

Load handler can be overridden to load the model from storage.

The `self.ready` should be set to True after the model is loaded. The flag is used for model health check.

**Returns**:

`bool`: True if model is ready, False otherwise

<a id="kserve.model.BaseKServeModel.start"></a>

### start

```python
def start()
```

Start handler can be overridden to perform model setup


<a id="kserve.model.BaseKServeModel.start_engine"></a>

### start\_engine

```python
async def start_engine()
```

Certain models may require an engine to be started before they can be used


<a id="kserve.model.BaseKServeModel.stop"></a>

### stop

```python
def stop()
```

Stop handler can be overridden to perform model teardown


<a id="kserve.model.BaseKServeModel.stop_engine"></a>

### stop\_engine

```python
def stop_engine()
```

Stop Engine handler can be overriden to perform the engine shutdown


<a id="kserve.model.InferenceModel"></a>

## InferenceModel

```python
class InferenceModel(BaseKServeModel)
```

Abstract class representing a model that supports standard inference and prediction.


<a id="kserve.model.Model"></a>

## Model

```python
class Model(InferenceModel)
```

<a id="kserve.model.Model.__init__"></a>

### \_\_init\_\_

```python
def __init__(name: str, return_response_headers: bool = False)
```

KServe Model Public Interface

Model is intended to be subclassed to implement the model handlers.

**Arguments**:

- `name`: The name of the model.

<a id="kserve.model.Model.__call__"></a>

### \_\_call\_\_

```python
async def __call__(
        body: Union[Dict, CloudEvent, InferRequest],
        headers: Optional[Dict[str, str]] = None,
        verb: InferenceVerb = InferenceVerb.PREDICT) -> InferReturnType
```

Method to call predictor or explainer with the given input.

**Arguments**:

- `body`: Request body.
- `verb`: The inference verb for predict/generate/explain
- `headers`: Request headers.

**Returns**:

Response output from preprocess -> predict/generate/explain -> postprocess

<a id="kserve.model.Model.load"></a>

### load

```python
def load() -> bool
```

Load handler can be overridden to load the model from storage.

The `self.ready` should be set to True after the model is loaded. The flag is used for model health check.

**Returns**:

`bool`: True if model is ready, False otherwise

<a id="kserve.model.Model.preprocess"></a>

### preprocess

```python
async def preprocess(
        payload: Union[Dict, InferRequest],
        headers: Dict[str, str] = None) -> Union[Dict, InferRequest]
```

`preprocess` handler can be overridden for data or feature transformation.

The model decodes the request body to `Dict` for v1 endpoints and `InferRequest` for v2 endpoints.

**Arguments**:

- `payload`: Payload of the request.
- `headers`: Request headers.

**Returns**:

A Dict or InferRequest in KServe Model Transformer mode which is transmitted on the wire to predictor.
Tensors in KServe Predictor mode which is passed to predict handler for performing the inference.

<a id="kserve.model.Model.postprocess"></a>

### postprocess

```python
async def postprocess(
        result: Union[Dict, InferResponse],
        headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None) -> Union[Dict, InferResponse]
```

The `postprocess` handler can be overridden for inference result or response transformation.

The predictor sends back the inference result in `Dict` for v1 endpoints and `InferResponse` for v2 endpoints.

**Arguments**:

- `result`: The inference result passed from `predict` handler or the HTTP response from predictor.
- `headers`: Request headers.

**Returns**:

A Dict or InferResponse after post-process to return back to the client.

<a id="kserve.model.Model.predict"></a>

### predict

```python
async def predict(
    payload: Union[Dict, InferRequest, ModelInferRequest],
    headers: Dict[str, str] = None,
    response_headers: Dict[str, str] = None
) -> Union[Dict, InferResponse, AsyncIterator[Any]]
```

The `predict` handler can be overridden for performing the inference.

By default, the predict handler makes call to predictor for the inference step.

Args:
    payload: Model inputs passed from `preprocess` handler.
    headers: Request headers.

Returns:
    Inference result or a Response from the predictor.

Raises:
    HTTPStatusError when getting back an error response from the predictor.


<a id="kserve.model.Model.explain"></a>

### explain

```python
async def explain(payload: Dict, headers: Dict[str, str] = None) -> Dict
```

`explain` handler can be overridden to implement the model explanation.

The default implementation makes call to the explainer if ``explainer_host`` is specified.

Args:
    payload: Explainer model inputs passed from preprocess handler.
    headers: Request headers.

Returns:
    An Explanation for the inference result.

Raises:
    HTTPStatusError when getting back an error response from the explainer.


<a id="kserve.protocol.infer_type"></a>

# kserve.protocol.infer\_type

<a id="kserve.protocol.infer_type.serialize_byte_tensor"></a>

### serialize\_byte\_tensor

```python
def serialize_byte_tensor(input_tensor: np.ndarray) -> np.ndarray
```

Serializes a bytes tensor into a flat numpy array of length prepended

bytes. The numpy array should use dtype of np.object. For np.bytes,
numpy will remove trailing zeros at the end of byte sequence and because
of this it should be avoided.

Args:
    input_tensor : np.array
        The bytes tensor to serialize.
Returns:
    serialized_bytes_tensor : np.array
        The 1-D numpy array of type uint8 containing the serialized bytes in row-major form.
Raises:
    InferenceError If unable to serialize the given tensor.


<a id="kserve.protocol.infer_type.deserialize_bytes_tensor"></a>

### deserialize\_bytes\_tensor

```python
def deserialize_bytes_tensor(encoded_tensor: bytes) -> np.ndarray
```

Deserializes an encoded bytes tensor into a

numpy array of dtype of python objects

**Arguments**:

- `encoded_tensor `: bytes
The encoded bytes tensor where each element
has its length in first 4 bytes followed by
the content

**Returns**:

string_tensor : np.array
The 1-D numpy array of type object containing the
deserialized bytes in row-major form.

<a id="kserve.protocol.infer_type.InferInput"></a>

## InferInput

```python
class InferInput()
```

<a id="kserve.protocol.infer_type.InferInput.__init__"></a>

### \_\_init\_\_

```python
def __init__(name: str,
             shape: List[int],
             datatype: str,
             data: Union[List, np.ndarray, InferTensorContents] = None,
             parameters: Optional[Union[Dict,
                                        MessageMap[str,
                                                   InferParameter]]] = None)
```

An object of InferInput class is used to describe the input tensor of an inference request.

**Arguments**:

- `name`: The name of the inference input whose data will be described by this object.
- `shape `: The shape of the associated inference input.
- `datatype `: The data type of the associated inference input.
- `data `: The data of the inference input.
When data is not set, raw_data is used for gRPC to transmit with numpy array bytes
by using `set_data_from_numpy`.
- `parameters `: The additional inference parameters.

<a id="kserve.protocol.infer_type.InferInput.name"></a>

### name

```python
@property
def name() -> str
```

Get the name of inference input associated with this object.

**Returns**:

The name of the inference input

<a id="kserve.protocol.infer_type.InferInput.datatype"></a>

### datatype

```python
@property
def datatype() -> str
```

Get the datatype of inference input associated with this object.

**Returns**:

The datatype of the inference input.

<a id="kserve.protocol.infer_type.InferInput.data"></a>

### data

```python
@property
def data() -> Union[List, np.ndarray, InferTensorContents]
```

Get the data of the inference input associated with this object.

**Returns**:

The data of the inference input.

<a id="kserve.protocol.infer_type.InferInput.data"></a>

### data

```python
@data.setter
def data(data: List)
```

Set the data of the inference input associated with this object.

**Arguments**:

- `data`: data of the inference input.

<a id="kserve.protocol.infer_type.InferInput.shape"></a>

### shape

```python
@property
def shape() -> List[int]
```

Get the shape of inference input associated with this object.

**Returns**:

The shape of the inference input.

<a id="kserve.protocol.infer_type.InferInput.parameters"></a>

### parameters

```python
@property
def parameters() -> Union[Dict, MessageMap[str, InferParameter], None]
```

Get the parameters of the inference input associated with this object.

**Returns**:

The additional inference parameters

<a id="kserve.protocol.infer_type.InferInput.parameters"></a>

### parameters

```python
@parameters.setter
def parameters(params: Optional[Union[Dict, MessageMap[str, InferParameter]]])
```

Set the parameters of the inference input associated with this object.

**Arguments**:

- `params`: parameters of the inference input

<a id="kserve.protocol.infer_type.InferInput.shape"></a>

### shape

```python
@shape.setter
def shape(shape: List[int])
```

Set the shape of inference input.

**Arguments**:

- `shape `: The shape of the associated inference input.

<a id="kserve.protocol.infer_type.InferInput.as_string"></a>

### as\_string

```python
def as_string() -> List[List[str]]
```

Decodes the inference input data as a list of strings.

**Raises**:

- `InvalidInput`: If the datatype of the inference input is not 'BYTES'.

**Returns**:

`List[List[str]]`: The decoded data as a list of strings.

<a id="kserve.protocol.infer_type.InferInput.as_numpy"></a>

### as\_numpy

```python
def as_numpy() -> np.ndarray
```

Decode the inference input data as numpy array.

**Raises**:

- `InvalidInput`: If the datatype of the inference input is not recognized.

**Returns**:

A numpy array of the inference input data

<a id="kserve.protocol.infer_type.InferInput.set_data_from_numpy"></a>

### set\_data\_from\_numpy

```python
def set_data_from_numpy(input_tensor: np.ndarray, binary_data: bool = True)
```

Set the tensor data from the specified numpy array for input associated with this object.

Args:
    input_tensor : The tensor data in numpy array format.
    binary_data : Indicates whether to set data for the input in binary format
                  or explicit tensor within JSON. The default value is True,
                  which means the data will be delivered as binary data with gRPC or in the
                  HTTP body after the JSON object for REST.

Raises:
    InferenceError if failed to set data for the tensor.


<a id="kserve.protocol.infer_type.RequestedOutput"></a>

## RequestedOutput

```python
class RequestedOutput()
```

<a id="kserve.protocol.infer_type.RequestedOutput.__init__"></a>

### \_\_init\_\_

```python
def __init__(name: str, parameters: Optional[Dict] = None)
```

The RequestedOutput class represents an output that is requested as part of an inference request.

**Arguments**:

- `name` (`str`): The name of the output.
- `parameters` (`Optional[Dict]`): Additional parameters for the output.

<a id="kserve.protocol.infer_type.RequestedOutput.name"></a>

### name

```python
@property
def name() -> str
```

Get the name of the output.

**Returns**:

`str`: The name of the output.

<a id="kserve.protocol.infer_type.RequestedOutput.parameters"></a>

### parameters

```python
@property
def parameters() -> Optional[Dict]
```

Get the additional parameters for the output.

**Returns**:

`Optional[Dict]`: The additional parameters for the output.

<a id="kserve.protocol.infer_type.RequestedOutput.parameters"></a>

### parameters

```python
@parameters.setter
def parameters(params: Optional[Union[Dict, MessageMap[str, InferParameter]]])
```

Set the parameters of the inference input associated with this object.

**Arguments**:

- `params`: parameters of the inference input

<a id="kserve.protocol.infer_type.RequestedOutput.binary_data"></a>

### binary\_data

```python
@property
def binary_data() -> Optional[bool]
```

Get the binary_data attribute from the parameters.

This attribute indicates whether the data for the input should be in binary format.

**Returns**:

bool or None: True if the data should be in binary format, False otherwise.
If the binary_data attribute is not set, returns None.

<a id="kserve.protocol.infer_type.InferRequest"></a>

## InferRequest

```python
class InferRequest()
```

<a id="kserve.protocol.infer_type.InferRequest.__init__"></a>

### \_\_init\_\_

```python
def __init__(model_name: str,
             infer_inputs: List[InferInput],
             request_id: Optional[str] = None,
             raw_inputs=None,
             from_grpc: Optional[bool] = False,
             parameters: Optional[Union[Dict,
                                        MessageMap[str,
                                                   InferParameter]]] = None,
             request_outputs: Optional[List[RequestedOutput]] = None,
             model_version: Optional[str] = None)
```

InferRequest Data Model.

**Arguments**:

- `model_name`: The model name.
- `infer_inputs`: The inference inputs for the model.
- `request_id`: The id for the inference request.
- `raw_inputs`: The binary data for the inference inputs.
- `from_grpc`: Indicate if the data model is constructed from gRPC request.
- `parameters`: The additional inference parameters.
- `request_outputs`: The output tensors requested for this inference.
- `model_version`: The version of the model.

<a id="kserve.protocol.infer_type.InferRequest.use_binary_outputs"></a>

### use\_binary\_outputs

```python
@property
def use_binary_outputs() -> bool
```

This attribute is used to determine if all the outputs should be returned as raw binary format.

For REST,
    Get the binary_data_output attribute from the parameters. This will be ovverided by the individual output's 'binary_data' parameter.
For GRPC,
    It is True, if the received inputs are raw_inputs, otherwise False. For GRPC, if the inputs are raw_inputs,
    then the outputs should be returned as raw_outputs.

**Returns**:

a boolean indicating whether to use binary raw outputs

<a id="kserve.protocol.infer_type.InferRequest.from_grpc"></a>

### from\_grpc

```python
@classmethod
def from_grpc(cls, request: ModelInferRequest) -> "InferRequest"
```

Class method to construct an InferRequest object from a ModelInferRequest object.

**Arguments**:

- `request` (`ModelInferRequest`): The gRPC ModelInferRequest object to be converted.

**Returns**:

`InferRequest`: The resulting InferRequest object.

<a id="kserve.protocol.infer_type.InferRequest.from_bytes"></a>

### from\_bytes

```python
@classmethod
def from_bytes(cls, req_bytes: bytes, json_length: int,
               model_name: str) -> "InferRequest"
```

The class method to construct the InferRequest object from REST raw request bytes.

**Arguments**:

- `req_bytes` (`bytes`): The raw InferRequest in bytes.
- `json_length` (`int`): The length of the json bytes.
- `model_name` (`str`): The name of the model.

**Raises**:

- `InvalidInput`: If the request format is unrecognized or if necessary fields are missing.

**Returns**:

`InferRequest`: The resulting InferRequest object.

<a id="kserve.protocol.infer_type.InferRequest.from_inference_request"></a>

### from\_inference\_request

```python
@classmethod
def from_inference_request(cls, request: InferenceRequest,
                           model_name: str) -> "InferRequest"
```

The class method to construct the InferRequest object from InferenceRequest object.

**Arguments**:

- `request` (`InferenceRequest`): The InferenceRequest object.
- `model_name` (`str`): The name of the model.

**Raises**:

- `InvalidInput`: If the request format is unrecognized.

**Returns**:

`InferRequest`: The resulting InferRequest object.

<a id="kserve.protocol.infer_type.InferRequest.to_rest"></a>

### to\_rest

```python
def to_rest() -> Tuple[Union[bytes, Dict], Optional[int]]
```

Converts the InferRequest object to v2 REST InferRequest Dict or bytes.

This method is used to convert the InferRequest object into a format that can be sent over a REST API.

**Raises**:

- `InvalidInput`: If the data is missing for an input or if both 'data' and 'raw_data' fields are set for an input.

**Returns**:

`Tuple[Union[bytes, Dict], Optional[int]]`: A tuple containing the InferRequest in bytes or Dict and the length of the JSON part of the request.
If it is dict, then the json length will be None.

<a id="kserve.protocol.infer_type.InferRequest.to_grpc"></a>

### to\_grpc

```python
def to_grpc() -> ModelInferRequest
```

Converts the InferRequest object to gRPC ModelInferRequest type.

**Returns**:

ModelInferRequest gRPC type converted from InferRequest object.

<a id="kserve.protocol.infer_type.InferRequest.as_dataframe"></a>

### as\_dataframe

```python
def as_dataframe() -> pd.DataFrame
```

Decode the tensor inputs as pandas dataframe.

**Returns**:

The inference input data as pandas dataframe

<a id="kserve.protocol.infer_type.InferRequest.get_input_by_name"></a>

### get\_input\_by\_name

```python
def get_input_by_name(name: str) -> Optional[InferInput]
```

Find an input Tensor in the InferenceRequest that has the given name

**Arguments**:

- `name `: str
name of the input Tensor object

**Returns**:

InferInput
The InferInput with the specified name, or None if no
input with this name exists

<a id="kserve.protocol.infer_type.InferOutput"></a>

## InferOutput

```python
class InferOutput()
```

<a id="kserve.protocol.infer_type.InferOutput.__init__"></a>

### \_\_init\_\_

```python
def __init__(name: str,
             shape: List[int],
             datatype: str,
             data: Union[List, np.ndarray, InferTensorContents] = None,
             parameters: Optional[Union[Dict,
                                        MessageMap[str,
                                                   InferParameter]]] = None)
```

An object of InferOutput class is used to describe the output tensor for an inference response.

**Arguments**:

- `name `: The name of inference output whose data will be described by this object.
- `shape `: The shape of the associated inference output.
- `datatype `: The data type of the associated inference output.
- `data `: The data of the inference output. When data is not set,
raw_data is used for gRPC with numpy array bytes by calling set_data_from_numpy.
- `parameters `: The additional inference parameters.

<a id="kserve.protocol.infer_type.InferOutput.name"></a>

### name

```python
@property
def name() -> str
```

Get the name of inference output associated with this object.

**Returns**:

The name of inference output.

<a id="kserve.protocol.infer_type.InferOutput.datatype"></a>

### datatype

```python
@property
def datatype() -> str
```

Get the data type of inference output associated with this object.

**Returns**:

The data type of inference output.

<a id="kserve.protocol.infer_type.InferOutput.data"></a>

### data

```python
@property
def data() -> Union[List, np.ndarray, InferTensorContents]
```

Get the data of inference output associated with this object.

**Returns**:

The data of inference output.

<a id="kserve.protocol.infer_type.InferOutput.data"></a>

### data

```python
@data.setter
def data(data: Union[List, np.ndarray, InferTensorContents])
```

Set the data of inference output associated with this object.

**Arguments**:

- `data`: inference output data.

<a id="kserve.protocol.infer_type.InferOutput.shape"></a>

### shape

```python
@property
def shape() -> List[int]
```

Get the shape of inference output associated with this object.

**Returns**:

The shape of inference output

<a id="kserve.protocol.infer_type.InferOutput.shape"></a>

### shape

```python
@shape.setter
def shape(shape: List[int])
```

Set the shape of inference output.

**Arguments**:

- `shape`: The shape of the associated inference output.

<a id="kserve.protocol.infer_type.InferOutput.parameters"></a>

### parameters

```python
@property
def parameters() -> Union[Dict, MessageMap[str, InferParameter], None]
```

Get the parameters of inference output associated with this object.

**Returns**:

The additional inference parameters associated with the inference output.

<a id="kserve.protocol.infer_type.InferOutput.parameters"></a>

### parameters

```python
@parameters.setter
def parameters(params: Union[Dict, MessageMap[str, InferParameter]])
```

Set the parameters of inference output associated with this object.

**Arguments**:

- `params`: The parameters of inference output

<a id="kserve.protocol.infer_type.InferOutput.as_numpy"></a>

### as\_numpy

```python
def as_numpy() -> np.ndarray
```

Decode the tensor output data as numpy array.

**Returns**:

The numpy array of the associated inference output data.

<a id="kserve.protocol.infer_type.InferOutput.set_data_from_numpy"></a>

### set\_data\_from\_numpy

```python
def set_data_from_numpy(output_tensor: np.ndarray, binary_data: bool = True)
```

Set the tensor data from the specified numpy array for the inference output associated with this object.

Args:
    output_tensor : The tensor data in numpy array format.
    binary_data : Indicates whether to set data for the input in binary format
                  or explicit tensor within JSON. The default value is True,
                  which means the data will be delivered as binary data with gRPC or in the
                  HTTP body after the JSON object for REST.

Raises:
    InferenceError if failed to set data for the output tensor.


<a id="kserve.protocol.infer_type.InferResponse"></a>

## InferResponse

```python
class InferResponse()
```

<a id="kserve.protocol.infer_type.InferResponse.__init__"></a>

### \_\_init\_\_

```python
def __init__(response_id: str,
             model_name: str,
             infer_outputs: List[InferOutput],
             model_version: Optional[str] = None,
             raw_outputs=None,
             from_grpc: Optional[bool] = False,
             parameters: Optional[Union[Dict,
                                        MessageMap[str,
                                                   InferParameter]]] = None,
             use_binary_outputs: Optional[bool] = False,
             requested_outputs: Optional[List[RequestedOutput]] = None)
```

The InferResponse Data Model

**Arguments**:

- `response_id`: The id of the inference response.
- `model_name`: The name of the model.
- `infer_outputs`: The inference outputs of the inference response.
- `model_version`: The version of the model.
- `raw_outputs`: The raw binary data of the inference outputs.
- `from_grpc`: Indicate if the InferResponse is constructed from a gRPC response.
- `parameters`: The additional inference parameters.
- `use_binary_outputs`: A boolean indicating whether the data for the outputs should be in binary format when sent over REST API.
This will be overridden by the individual output's binary_data attribute.
- `requested_outputs`: The output tensors requested for this inference.

<a id="kserve.protocol.infer_type.InferResponse.from_grpc"></a>

### from\_grpc

```python
@classmethod
def from_grpc(cls, response: ModelInferResponse) -> "InferResponse"
```

The class method to construct the InferResponse object from gRPC message type.

**Arguments**:

- `response`: The GRPC response as ModelInferResponse object.

**Returns**:

InferResponse object.

<a id="kserve.protocol.infer_type.InferResponse.from_rest"></a>

### from\_rest

```python
@classmethod
def from_rest(cls, response: Dict) -> "InferResponse"
```

The class method to construct the InferResponse object from REST message type.

**Arguments**:

- `response`: The response as a dict.

**Returns**:

InferResponse object.

<a id="kserve.protocol.infer_type.InferResponse.from_bytes"></a>

### from\_bytes

```python
@classmethod
def from_bytes(cls, res_bytes: bytes, json_length: int) -> "InferResponse"
```

Class method to construct an InferResponse object from raw response bytes.

This method is used to convert the raw response bytes received from a REST API into an InferResponse object.

**Arguments**:

- `res_bytes` (`bytes`): The raw response bytes received from the REST API.
- `json_length` (`int`): The length of the JSON part of the response.

**Raises**:

- `InvalidInput`: If the response format is unrecognized or if necessary fields are missing in the response.
- `InferenceError`: if failed to set data for the output tensor.

**Returns**:

`InferResponse`: The constructed InferResponse object.

<a id="kserve.protocol.infer_type.InferResponse.to_rest"></a>

### to\_rest

```python
def to_rest() -> Tuple[Union[bytes, Dict], Optional[int]]
```

Converts the InferResponse object to v2 REST InferResponse Dict or bytes.

This method is used to convert the InferResponse object into a format that can be sent over a REST API.

**Raises**:

- `InvalidInput`: If the output data is not a numpy array, bytes, or list.

**Returns**:

`Tuple[Union[bytes, Dict], Optional[int]]`: A tuple containing the InferResponse in bytes or Dict and the length of the JSON part of the response.
If it is dict, then the json length will be None.

<a id="kserve.protocol.infer_type.InferResponse.to_grpc"></a>

### to\_grpc

```python
def to_grpc() -> ModelInferResponse
```

Converts the InferResponse object to gRPC ModelInferResponse type.

**Raises**:

- `InvalidInput`: If the output data is not a List or if the datatype is invalid.

**Returns**:

The ModelInferResponse gRPC message.

<a id="kserve.protocol.infer_type.InferResponse.get_output_by_name"></a>

### get\_output\_by\_name

```python
def get_output_by_name(name: str) -> Optional[InferOutput]
```

Find an output Tensor in the InferResponse that has the given name

**Arguments**:

- `name `: str
name of the output Tensor object

**Returns**:

InferOutput
The InferOutput with the specified name, or None if no
output with this name exists

<a id="kserve.protocol.infer_type.to_grpc_parameters"></a>

### to\_grpc\_parameters

```python
def to_grpc_parameters(
    parameters: Union[Dict[str, Union[str, bool, int]],
                      MessageMap[str, InferParameter]]
) -> Dict[str, InferParameter]
```

Converts REST parameters to GRPC InferParameter objects

**Arguments**:

- `parameters`: parameters to be converted.

**Raises**:

- `InvalidInput`: if the parameter type is not supported.

**Returns**:

converted parameters as Dict[str, InferParameter]

<a id="kserve.protocol.infer_type.to_http_parameters"></a>

### to\_http\_parameters

```python
def to_http_parameters(
    parameters: Union[dict, MessageMap[str, InferParameter]]
) -> Dict[str, Union[str, bool, int]]
```

Converts GRPC InferParameter parameters to REST parameters

**Arguments**:

- `parameters`: parameters to be converted.

**Returns**:

converted parameters as Dict[str, Union[str, bool, int]]
