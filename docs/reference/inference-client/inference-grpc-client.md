# Inference GRPC Client

> InferenceGRPCClient(url, verbose=None, use_ssl=None, root_certificates=None, private_key=None, certificate_chain=None, creds=None, channel_args=None, timeout=60)

This asynchronous client provides methods to communicate with an inference server using gRPC protocol. This feature is currently in alpha and may be subject to change.

!!! note 
    This client uses a default retry config. To override, explicitly provide the 'method_config' in channel
    options or to disable retry set the channel option ("grpc.enable_retries", 0).
    ```json
    {
        "methodConfig": [
            {
                # Apply retry to all methods
                "name": [{}],
                "retryPolicy": {
                    "maxAttempts": 3,
                    "initialBackoff": "0.1s",
                    "maxBackoff": "1s",
                    "backoffMultiplier": 2,
                    "retryableStatusCodes": ["UNAVAILABLE"],
                },
            }
        ]
    }

    ```

### Parameters

parameter | Type | Description | Notes
------------ | ------------- | ------------- | -------------
url | str | Inference server url as a string | required
verbose | bool | A boolean to enable verbose logging. Defaults to False | optional
use_ssl | bool | A boolean value indicating whether to use an SSL-enabled channel (True) or not (False). If creds provided the client will use SSL-enabled channel regardless of the specified value. | optional
root_certificates | str | Path to the PEM-encoded root certificates file as a string, or None to retrieve them from a default location chosen by gRPC runtime. If creds provided this will be ignored. | optional
private_key | str | Path to the PEM-encoded private key file as a string or None if no private key should be used. If creds provided this will be ignored | optional 
certificate_chain | str | Path to the PEM-encoded certificate chain file as a string or None if no certificate chain should be used. If creds provided this will be ignored. | optional
creds | grpc.ChannelCredentials | A ChannelCredentials instance for secure channel communication. | optional
channel_args | List[Tuple[str, Any]] | An list of key-value pairs (channel_arguments in gRPC Core runtime) to configure the channel | optional
timeout | float | The maximum end-to-end time, in seconds, the request is allowed to take. By default, client timeout is 60 seconds. To disable timeout explicitly set it to 'None' | optional

The APIs for InferenceGRPCClient are as following:

Class | Method |  Description
------------ | ------------- | -------------
InferenceGRPCClient | [infer](#infer)    | Runs asynchronous inference using the supplied data. |
InferenceGRPCClient | [is_server_ready](#is_server_ready) | Checks if the inference server is ready. |
InferenceGRPCClient | [is_server_live](#is_server_live) | Checks if the inference server is live. |
InferenceGRPCClient | [is_model_ready](#is_model_ready) | Checks if the specified model is ready. |

## infer()

>infer(infer_request, timeout=USE_CLIENT_DEFAULT, headers=None) ~async~

This method sends an inference request to the server and returns the inference response. 
It supports asynchronous execution and allows for optional timeout and headers customization.

### Example

```python
from kserve import InferenceGRPCClient

client = InferenceGRPCClient(url="https://localhost:443")
infer_request = InferRequest(...)
headers = [("header-key", "header-value")]

response = await inference_client.infer(infer_request, timeout, headers)
print(response)
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
infer_request | InferRequest | Inference input data as InferRequest or ModelInferRequest object | required
timeout | float | The maximum end-to-end time, in seconds, the request is allowed to take. The default value is 60 seconds. To disable timeout explicitly set it to 'None'. This will override the client's timeout. Defaults to USE_CLIENT_DEFAULT. | optional
headers | Union[grpc.aio.Metadata, Sequence[Tuple[str, str]], None] | Additional headers to be transmitted with the request. Defaults to None. | optional

### Returns

Return Type: `InferResponse`

Inference output as ModelInferResponse

### Raises

`InvalidInput`: If the input format is invalid.

`grpc.RpcError`: For non-OK-status response.


## is_server_ready()

> is_server_ready(timeout=USE_CLIENT_DEFAULT, headers=None) ~async~

Check if the inference server is ready.

This asynchronous method sends a readiness request to the inference server and returns a boolean indicating
whether the server is ready to handle requests.

### Example

```python
from kserve import InferenceGRPCClient

client = InferenceClient(...)
is_ready = await client.is_server_ready(timeout=30.0)
if is_ready:
    print("Server is ready to handle requests.")
else:
    print("Server is not ready.")
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
timeout | float | The maximum time, in seconds, allowed for the request to complete. The default value is 60 seconds. To disable the timeout, explicitly set it to 'None'. This value will override the client's default timeout if specified. | optional
headers | Union[grpc.aio.Metadata, Sequence[Tuple[str, str]]]Additional headers to include in the request. This can be useful for passing metadata such as authentication tokens. | optional


### Returns

Return Type: `bool`

True if the server is ready, False otherwise

### Raises

`grpc.RpcError`:  If the server responds with a non-OK status, an RPCError is raised. This can occur due to network
issues, server-side errors.

## is_server_live()

> is_server_live(timeout=USE_CLIENT_DEFAULT, headers=None) ~async~

Check if the inference server is live.

This asynchronous method sends a request to the inference server to check its liveness status.

### Example 

```python
from kserve import InferenceGRPCClient

client = InferenceClient(...)
is_live = await client.is_server_live(timeout=30.0)
if is_live:
    print("Server is live")
else:
    print("Server is not live")
```

### Parameters


Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
timeout | float | The maximum time, in seconds, allowed for the request to complete. The default value is 60 seconds. To disable the timeout, explicitly set it to 'None'. This value will override the client's default timeout if specified. | optional
headers | Union[grpc.aio.Metadata, Sequence[Tuple[str, str]]]Additional headers to include in the request. This can be useful for passing metadata such as authentication tokens. | optional


### Returns

Return Type: `bool`

True if the server is live, False if the server is not live

### Raises

`grpc.RpcError`:  If the server responds with a non-OK status, an RPCError is raised. This can occur due to network
issues, server-side errors.

## is_model_ready()

> is_model_ready()

Check if the specified model is ready.

This asynchronous method sends a request to check the readiness of a model by its name.

### Example 

```python
from kserve import InferenceGRPCClient

client = InferenceClient(...)
is_ready = await client.is_model_ready("my_model")
if is_ready:
    print("Model is ready for inference.")
else:
    print("Model is not ready.")
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
model_name | string | The name of the model to check for readiness. | required
timeout | float | The maximum time, in seconds, allowed for the request to complete. The default value is 60 seconds. To disable the timeout, explicitly set it to 'None'. This value will override the client's default timeout if specified. | optional
headers | Union[grpc.aio.Metadata, Sequence[Tuple[str, str]]]Additional headers to include in the request. This can be useful for passing metadata such as authentication tokens. | optional

### Returns

Return Type: `bool`

`True` if the model is ready, `False` if the model is not ready

### Raises

`grpc.RpcError`:  If the server responds with a non-OK status, an RPCError is raised. This can occur due to network
issues, server-side errors.

