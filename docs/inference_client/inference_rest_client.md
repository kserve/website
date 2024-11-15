# Inference REST Client

> InferenceRESTClient(config: RESTConfig = None)

InferenceRESTClient is designed to interact with inference servers that follow the V1 and V2 protocols for model serving.
It provides methods to perform inference, explanation, and health checks on the server and models. This feature is currently in alpha and may be subject to change.

parameter |  Description
------------ | -------------
config([RESTConfig](#restconfig)) |  Configuration for the REST client, including server protocol, timeout settings, and authentication. |

Initializes the InferenceRESTClient with the given configuration. If no configuration is provided, a default RESTConfig is used.

### RESTConfig

> RESTConfig(transport=None, protocol=v1, retries=3, http2=False, timeout=60, cert=None, verify=True, auth=None, verbose=False)

Configuration class for REST client settings.

parameter | Type | Description
------------ | ------------- | -------------
transport | httpx.AsyncBaseTransport |  Custom transport for HTTP requests. |
protocol | Union[str, PredictorProtocol] | Protocol version, default is "v1". |
retries | int | Number of retries for HTTP requests, default is 3. |
http2 | bool | Whether to use HTTP/2, default is False. |
timeout | (Union[float, None, tuple, httpx.Timeout]) | Timeout setting for HTTP requests, default is 60 seconds. |
cert | | SSL certificate to use for the requests. |
verify | (Union[str, bool, ssl.SSLContext]) | SSL verification setting, default is True. |
auth | | Authentication credentials for HTTP requests. |
verbose | bool | Whether to enable verbose logging, default is False. |


The APIs for InferenceRestClient are as following:

Class | Method |  Description
------------ | ------------- | -------------
InferenceRESTClient | [infer](#infer)    | Runs asynchronous inference using the supplied data. |
InferenceRESTClient | [explain](#explain)  | Runs asynchronous explanation using the supplied data. |
InferenceRESTClient | [is_server_ready](#is_server_ready) | Checks if the inference server is ready. |
InferenceRESTClient | [is_server_live](#is_server_live) | Checks if the inference server is live. |
InferenceRESTClient | [is_model_ready](#is_model_ready) | Checks if the specified model is ready. |

## infer()

> infer(base_url, data, model_name=None, headers=None, response_headers=None, is_graph_endpoint=False, timeout=USE_CLIENT_DEFAULT) ~async~

Perform inference by sending a request to the specified model endpoint.

### Example

```python
from kserve import RESTConfig, InferenceRESTClient

config = RESTConfig(protocol="v2", retries=5, timeout=30)
client = InferenceRESTClient(config)
base_url = "https://example.com:443"
data = {"inputs": [{"name": "input_1", "shape": [1, 3], "datatype": "FP32", "data": [1.0, 2.0, 3.0]}]}
model_name = "example_model"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
response_headers = {}
result = await client.infer(base_url, data, model_name, headers, response_headers)
print(result)

```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
base_url  | Union[httpx.URL, str] | The base URL of the inference server | Required
data | Union[InferRequest, dict] | Input data as InferRequest object | Required
model_name | str | The name of the model to be used for inference | Required
headers | Mapping[str, str] | HTTP headers to include when sending request | 
response_headers | Dict[str, str] | Dictionary to store response headers | 
is_graph_endpoint | bool | Flag indicating if the endpoint is a graph endpoint. Default value is False | 
timeout | Union[float, None, tuple, httpx.Timeout] | Timeout configuration for the request. Default value is 60 seconds |

### Returns

Return Type: `Union[InferResponse, Dict]`

The inference response, either as an InferResponse object or a dictionary

### Raises

`ValueError`: If model_name is None and not using a graph endpoint.

`UnsupportedProtocol`: If the protocol specified in the configuration is not supported.

`HTTPStatusError`: If the response status code indicates an error.

## explain()

> explain(base_url, model_name, data, headers=None, timeout) ~async~

Sends an asynchronous request to the model server to get an explanation for the given input data. Only supports V1 protocol.

### Example 

```python
from kserve import RESTConfig, InferenceRESTClient

config = RESTConfig(protocol="v2", retries=5, timeout=30)
client = InferenceRESTClient(config)
base_url = "https://example.com:443"
model_name = "my_model"
data = {"instances": [[1.0, 2.0, 5.0]]}
headers = {"Authorization": "Bearer my_token"}

result = await client.explain(base_url, model_name, data, headers=headers)
print(result)
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
base_url  | Union[httpx.URL, str] | The base URL of the model server |
model_name | str | The name of the model for which to get an explanation | 
data | dict | The input data for the model | 
headers | Mapping[str, str] | headers to include in the request | 
timeout | Union[float, None, tuple, httpx.Timeout] | Timeout configuration for the request |

### Returns

Return Type: `dict`

The explanation response from the model server as a dict.

### Raises

`UnsupportedProtocol`: If the protocol specified in the configuration is not supported.

`HTTPStatusError`: If the response status code indicates an error.


## is_server_ready()

> is_server_ready(base_url, headers=None, timeout=None) ~async~

Check if the inference server is ready. Only supports V2 protocol.

### Example

```python
from kserve import RESTConfig, InferenceRESTClient

config = RESTConfig(protocol="v2", retries=5, timeout=30)

client = InferenceClient(config)
is_ready = await client.is_server_ready("https://example.com:443")
if is_ready:
    print("Server is ready")
else:
    print("Server is not ready")
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
base_url  | Union[httpx.URL, str] | The base URL of the model server |
headers | Mapping[str, str] | headers to include in the request | 
timeout | Union[float, None, tuple, httpx.Timeout] | Timeout configuration for the request |

### Returns

Return Type: `bool`

`True`: if the Inference Server is ready
`False`: if the Inference Server is not ready

### Raises

`UnsupportedProtocol`: If the protocol specified in the configuration is not supported.

`HTTPStatusError`: If the response status code indicates an error.

## is_server_live()

> is_server_live(base_url, headers=None, timeout=USE_CLIENT_DEFAULT) ~async~

Get liveness of the inference server.

### Example

```python
from kserve import RESTConfig, InferenceRESTClient

config = RESTConfig(protocol="v2", retries=5, timeout=30)

client = InferenceClient(config)
is_live = await client.is_server_live("https://example.com:443")
if is_live:
    print("Server is live")
else:
    print("Server is not live")
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
base_url  | Union[httpx.URL, str] | The base URL of the model server |
headers | Mapping[str, str] | headers to include in the request | 
timeout | Union[float, None, tuple, httpx.Timeout] | Timeout configuration for the request |

### Returns

Return Type: `bool`

`True`: if the Inference Server is live
`False`: if the Inference Server is not live

### Raises

`UnsupportedProtocol`: If the protocol specified in the configuration is not supported.

`HTTPStatusError`: If the response status code indicates an error.

## is_model_ready()

> is_model_ready(base_url, model_name, headers=None, timeout=USE_CLIENT_DEFAULT) ~async~

Get readiness of the specified model.

### Example

```python
from kserve import RESTConfig, InferenceRESTClient

config = RESTConfig(protocol="v2", retries=5, timeout=30)

client = InferenceClient(config)
base_url = "https://example.com:443"
model_name = "my_model"
is_reay = await client.is_model_ready(base_url, model_name)
if is_ready:
    print("Model is ready")
else:
    print("Model is not ready")
```

### Parameters

Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
base_url  | Union[httpx.URL, str] | The base URL of the model server |
model_name | str | The name of the model to be used for inference | 
headers | Mapping[str, str] | headers to include in the request | 
timeout | Union[float, None, tuple, httpx.Timeout] | Timeout configuration for the request |

### Returns

Return Type: `bool`

`True`: if the Model is ready
`False`: if the Model is not ready

### Raises

`UnsupportedProtocol`: If the protocol specified in the configuration is not supported.

`HTTPStatusError`: If the response status code indicates an error.
