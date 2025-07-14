---
title: Binary Tensor Data Extension
---

# Binary Tensor Data Extension

The Binary Tensor Data Extension enhances the Open Inference Protocol (V2) by allowing clients to send and receive tensor data in a binary format in the body of an HTTP/REST request. This extension is particularly valuable for:

- Sending and receiving FP16 data, which lacks a specific data type representation in standard JSON
- Handling large tensors in high-throughput scenarios
- Improving overall inference performance with reduced serialization/deserialization costs

## Overview

When using the Binary Tensor Data Extension, tensor data is organized in little-endian byte order, row major, without stride or padding between elements. All tensor data types are representable as binary data in the native size of the data type.

This extension uses parameters to indicate that tensors are communicated as binary data, with the binary data placed in the HTTP body after the JSON object.

## Extension Parameters

The extension defines three key parameters:

### binary_data_size
Used in `$request_input` and `$response_output` objects to indicate that the tensor is communicated as binary data:

- **Type**: int64 
- **Purpose**: Indicates the size of the tensor binary data in bytes.

### binary_data
Used in `$request_output` objects to request that an output should be returned as binary data:

- **Type**: boolean 
- **Purpose**: When `true`, the output will be returned as binary data. When `false` or not specified, the output will be returned as JSON.

### binary_data_output
Used in `$inference_request` parameters to indicate that all outputs should be returned as binary data:

- **Type**: boolean
- **Purpose**: When `true`, all outputs will be returned as binary data. When `false` or not specified, outputs will be returned as JSON.
- **Note**: Can be overridden by the `binary_data` parameter on specific outputs.

## HTTP Headers

When binary data is present in the request or response, two important HTTP headers are used:

- **Inference-Header-Content-Length**: Contains the length of the JSON object in bytes
- **Content-Length**: Contains the total length of the HTTP body (JSON + binary data) in bytes

## Data Representation

Special data type representations in binary format:

- **BOOL**: A single byte with value 1 for `true`, 0 for `false`
- **BYTES**: A 4-byte unsigned integer giving the length, followed by the actual bytes
- **FP16**: Native 16-bit float representation

## Examples

### Sending and Receiving Binary Data

This example shows a request with two inputs (`input0` and `input2`) sent as binary data and one input (`input1`) sent as JSON data. The response has one output (`output0`) in binary format and another (`output1`) in JSON format.

**Request**:

```http
POST /v2/models/mymodel/infer HTTP/1.1
Host: localhost:8000
Content-Type: application/octet-stream
Inference-Header-Content-Length: <xx>
Content-Length: <xx+19>
{
  "model_name": "mymodel",
  "inputs": [
    {
      "name": "input0",
      "shape": [2, 2],
      "datatype": "FP16",
      "parameters": {
        "binary_data_size": 16
      }
    },
    {
      "name": "input1",
      "shape": [2, 2],
      "datatype": "UINT32",
      "data": [[1, 2], [3, 4]]
    },
    {
      "name": "input2",
      "shape": [3],
      "datatype": "BOOL",
      "parameters": {
        "binary_data_size": 3
      }
    }
  ],
  "outputs": [
    {
      "name": "output0",
      "parameters": {
        "binary_data": true
      }
    },
    {
      "name": "output1"
    }
  ]
}
<16 bytes of data for input0 tensor>
<3 bytes of data for input2 tensor>
```

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Inference-Header-Content-Length: <yy>
Content-Length: <yy+16>
{
  "outputs": [
    {
      "name": "output0",
      "shape": [3, 2],
      "datatype": "FP16",
      "parameters": {
        "binary_data_size": 16
      }
    },
    {
      "name": "output1",
      "shape": [2, 2],
      "datatype": "FP32",
      "data": [[1.203, 5.403], [3.434, 34.234]]
    }
  ]
}
<16 bytes of data for output0 tensor>
```

### Requesting All Outputs As Binary Data

This example shows how to request all outputs in binary format using the `binary_data_output` parameter:

**Request**:

```http
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
      "data": [[32.045, 399.043]]
    }
  ],
  "parameters": {
     "binary_data_output": true
  }
}
```

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Inference-Header-Content-Length: <yy>
Content-Length: <yy+48>
{
  "outputs": [
    {
      "name": "output_tensor0",
      "shape": [3, 2],
      "datatype": "FP16",
      "parameters": {
        "binary_data_size": 16
      }
    },
    {
      "name": "output_tensor1",
      "shape": [2, 2],
      "datatype": "FP32",
      "parameters": {
        "binary_data_size": 32
      }
    }
  ]
}
<16 bytes of data for output_tensor0 tensor>
<32 bytes of data for output_tensor1 tensor>
```

## Client Implementation

Here's an example using the KServe Python client to work with binary data:

```python
from kserve import ModelServer, InferenceRESTClient, InferRequest, InferInput
from kserve.protocol.infer_type import RequestedOutput
from kserve.inference_client import RESTConfig
import numpy as np

# Create input data
fp16_data = np.array([[1.1, 2.22], [3.345, 4.34343]], dtype=np.float16)
uint32_data = np.array([[1, 2], [3, 4]], dtype=np.uint32)
bool_data = np.array([True, False, True], dtype=np.bool)

# Create input tensors with binary data
input_0 = InferInput(name="input_0", datatype="FP16", shape=[2, 2])
input_0.set_data_from_numpy(fp16_data, binary_data=True)
input_1 = InferInput(name="input_1", datatype="UINT32", shape=[2, 2])
input_1.set_data_from_numpy(uint32_data, binary_data=False)
input_2 = InferInput(name="input_2", datatype="BOOL", shape=[3])
input_2.set_data_from_numpy(bool_data, binary_data=True)

# Create request outputs
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
fp32_output = output_1.as_numpy()
```

## Performance Benefits

The Binary Tensor Data Extension offers significant performance benefits:

1. **Reduced Serialization/Deserialization Overhead**: Binary data requires no JSON parsing or formatting
2. **Compact Representation**: Binary format is more size-efficient than JSON, especially for numeric data
3. **Native Format Support**: Direct representation of all numeric types including FP16 and other specialized formats
4. **Reduced Memory Usage**: Less memory allocation for data conversion between formats
5. **Faster Transmission**: Smaller payload sizes mean faster data transfer

## Best Practices

When using the Binary Tensor Data Extension:

- Use binary format for large tensors to reduce size and improve performance
- Use binary format for FP16 data which lacks proper JSON representation
- Consider using `binary_data_output: true` for high-throughput scenarios
- Remember to set both `Inference-Header-Content-Length` and `Content-Length` headers properly
- For mixed format responses, specify `binary_data` parameter on each output as needed

## Limitations

- Not all model servers or clients may support this extension
- Additional complexity in client and server implementation
- Requires proper handling of binary data in HTTP bodies
- Debugging can be more challenging compared to standard JSON

## Next Steps

- Explore the [Open Inference Protocol (V2)](./v2-protocol.md) for the complete API specification
- See the [V1 Protocol](../v1-protocol.md) for explain functionality
- Review [KServe Client Libraries](../../../../reference/inference-client/inference-rest-client.md) that support binary data.
