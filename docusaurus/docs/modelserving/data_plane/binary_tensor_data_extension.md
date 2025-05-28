# Binary Tensor Data Extension

The Binary Tensor Data Extension allows clients to send and receive tensor data in a binary format in 
the body of an HTTP/REST request. This extension is particularly useful for sending and receiving FP16 data as 
there is no specific data type for a 16-bit float type in the Open Inference Protocol and large tensors 
for high-throughput scenarios.

## Overview

Tensor data represented as binary data is organized in little-endian byte order, row major, without stride or 
padding between elements. All tensor data types are representable as binary data in the native size of the data type. 
For BOOL type element true is a single byte with value 1 and false is a single byte with value 0. 
For BYTES type an element is represented by a 4-byte unsigned integer giving the length followed by the actual bytes. 
The binary data for a tensor is delivered in the HTTP body after the JSON object (see Examples).

The binary tensor data extension uses parameters to indicate that an input or output tensor is communicated as binary data. 

The `binary_data_size` parameter is used in `$request_input` and `$response_output` to indicate that the input or output tensor is communicated as binary data:

- "binary_data_size" : int64 parameter indicating the size of the tensor binary data, in bytes.

The `binary_data` parameter is used in `$request_output` to indicate that the output should be returned from KServe runtime 
as binary data.

- "binary_data" : bool parameter that is true if the output should be returned as binary data and false (or not given) if the 
  tensor should be returned as JSON.

The `binary_data_output` parameter is used in `$inference_request` to indicate that all outputs should be returned from KServe runtime as binary data, unless overridden by "binary_data" on a specific output.

- "binary_data_output" : bool parameter that is true if all outputs should be returned as binary data and false 
  (or not given) if the outputs should be returned as JSON. If "binary_data" is specified on an output it overrides this setting. 

When one or more tensors are communicated as binary data, the HTTP body of the request or response 
will contain the JSON inference request or response object followed by the binary tensor data in the same order as the 
order of the input or output tensors are specified in the JSON. 

- If any binary data is present in the request or response the `Inference-Header-Content-Length` header must be provided to 
  give the length of the JSON object, and Content-Length continues to give the full body length (as HTTP requires).


## Examples

### Sending and Receiving Binary Data

For the following request the input tensors `input0` and `input2` are sent as binary data while `input1` is sent as non-binary data. Note that the `input0` and `input2` input tensors have a parameter `binary_data_size` which represents the size of the binary data. 

The output tensor `output0` must be returned as binary data as that is what is requested by setting the `binary_data` parameter to true. Also note that the size of the JSON part is provided in the `Inference-Header-Content-Length` and the total size of the binary data is reflected in the `Content-Length` header.

```shell
POST /v2/models/mymodel/infer HTTP/1.1
Host: localhost:8000
Content-Type: application/octet-stream
Inference-Header-Content-Length: <xx> # Json length
Content-Length: <xx+19>     # Json length + binary data length (In this case 16 + 3 = 19)
{
  "model_name" : "mymodel",
  "inputs" : [
    {
      "name" : "input0",
      "shape" : [ 2, 2 ],
      "datatype" : "FP16",
      "parameters" : {
        "binary_data_size" : 16
      }
    },
    {
      "name" : "input1",
      "shape" : [ 2, 2 ],
      "datatype" : "UINT32",
      "data": [[1, 2], [3, 4]]
    },
    {
      "name" : "input2",
      "shape" : [ 3 ],
      "datatype" : "BOOL",
      "parameters" : {
        "binary_data_size" : 3
      }
    }
  ],
  "outputs" : [
    {
      "name" : "output0",
      "parameters" : {
        "binary_data" : true
      }
    },
    {
      "name" : "output1"
    }
  ]
}
<16 bytes of data for input0 tensor>
<3 bytes of data for input2 tensor>
```

Assuming the model returns a [ 3, 2 ] tensor of data type FP16 and a [2, 2] tensor of data type FP32 the following response would be returned.

```shell
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Inference-Header-Content-Length: <yy>  # Json length
Content-Length: <yy+16>   # Json length + binary data length (In this case 16)
{
  "outputs" : [
    {
      "name" : "output0",
      "shape" : [ 3, 2 ],
      "datatype"  : "FP16",
      "parameters" : {
        "binary_data_size" : 16
      }
    },
    {
      "name" : "output1",
      "shape" : [ 2, 2 ],
      "datatype"  : "FP32",
      "data" : [[1.203, 5.403], [3.434, 34.234]]
    }
  ]
}
<16 bytes of data for output0 tensor>
```

=== "Inference Client Example"

```python
from kserve import ModelServer, InferenceRESTClient, InferRequest, InferInput
from kserve.protocol.infer_type import RequestedOutput
from kserve.inference_client import RESTConfig

fp16_data = np.array([[1.1, 2.22], [3.345, 4.34343]], dtype=np.float16)
uint32_data = np.array([[1, 2], [3, 4]], dtype=np.uint32)
bool_data = np.array([True, False, True], dtype=np.bool)

# Create input tensor with binary data
input_0 = InferInput(name="input_0", datatype="FP16", shape=[2, 2])
input_0.set_data_from_numpy(fp16_data, binary_data=True)
input_1 = InferInput(name="input_1", datatype="UINT32", shape=[2, 2])
input_1.set_data_from_numpy(uint32_data, binary_data=False)
input_2 = InferInput(name="input_2", datatype="BOOL", shape=[3])
input_2.set_data_from_numpy(bool_data, binary_data=True)

# Create request output
output_0 = RequestedOutput(name="output_0", binary_data=True)
output_1 = RequestedOutput(name="output_1", binary_data=False)

# Create inference request
infer_request = InferRequest(
    model_name="mymodel",
    request_id="2ja0ls9j1309",
    infer_inputs=[input_0, input_1, input_2],
    requested_outputs=[output_0, output_1],
)

# Create the REST client
config = RESTConfig(verbose=True, protocol="v2")
rest_client = InferenceRESTClient(config=config)

# Send the request
infer_response = await rest_client.infer(
          "http://localhost:8000",
          model_name="TestModel",
          data=infer_request,
          headers={"Host": "test-server.com"},
          timeout=2,
      )

# Read the binary data from the response
output_0 = infer_response.outputs[0]
fp16_output = output_0.as_numpy()

# Read the non-binary data from the response
output_1 = infer_response.outputs[1]
fp32_output = output_1.data # This will return the data as a list
fp32_output_arr = output_1.as_numpy()
```

### Requesting All The Outputs To Be In Binary Format

For the following request, `binary_data_output` is set to true to receive all the outputs as binary data. Note that the 
`binary_data_output` is set in the `$inference_request` parameters field, not in the `$inference_input` parameters field. This parameter can be overridden for a specific output by setting `binary_data` parameter to false in the `$request_output`.

```shell
POST /v2/models/mymodel/infer HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Content-Length: 75
{
  "model_name": "my_model",
  "inputs": [
    {
      "name": "input_tensor",
      "datatype": "FP32",
      "shape": [1, 2],
      "data": [[32.045, 399.043]],
    }
  ],
  "parameters": {
     "binary_data_output": true
  }
}
```
Assuming the model returns a [ 3, 2 ] tensor of data type FP16 and a [2, 2] tensor of data type FP32 the following response would be returned.

```shell
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Inference-Header-Content-Length: <yy>  # Json length
Content-Length: <yy+48>   # Json length + binary data length (In this case 16 + 32)
{
  "outputs" : [
    {
      "name" : "output_tensor0",
      "shape" : [ 3, 2 ],
      "datatype"  : "FP16",
      "parameters" : {
        "binary_data_size" : 16
      }
    },
    {
      "name" : "output_tensor1",
      "shape" : [ 2, 2 ],
      "datatype"  : "FP32",
      "parameters": {
        "binary_data_size": 32
      }
    }
  ]
}
<16 bytes of data for output_tensor0 tensor>
<32 bytes of data for output_tensor1 tensor>
```

=== "Inference Client Example"

```python
from kserve import ModelServer, InferenceRESTClient, InferRequest, InferInput
from kserve.protocol.infer_type import RequestedOutput
from kserve.inference_client import RESTConfig

fp32_data = np.array([[32.045, 399.043]], dtype=np.float32)

# Create the input tensor
input_0 = InferInput(name="input_0", datatype="FP32", shape=[1, 2])
input_0.set_data_from_numpy(fp16_data, binary_data=False)

# Create inference request with binary_data_output set to True
infer_request = InferRequest(
    model_name="mymodel",
    request_id="2ja0ls9j1309",
    infer_inputs=[input_0],
    parameters={"binary_data_output": True}
)

# Create the REST client
config = RESTConfig(verbose=True, protocol="v2")
rest_client = InferenceRESTClient(config=config)

# Send the request
infer_response = await rest_client.infer(
                      "http://localhost:8000",
                      model_name="TestModel",
                      data=infer_request,
                      headers={"Host": "test-server.com"},
                      timeout=2,
                 )

# Read the binary data from the response
output_0 = infer_response.outputs[0]
fp16_output = output_0.as_numpy()
output_1 = infer_response.outputs[1]
fp32_output_arr = output_1.as_numpy()
```