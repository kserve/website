# Binary Tensor Data Extension

The Binary Tensor Data Extension enables efficient transmission of large tensor data by encoding it in binary format rather than JSON. This extension significantly improves performance for models that work with large arrays, such as image processing or high-dimensional data.

## Overview

When working with large tensors (images, audio, video, or high-dimensional arrays), JSON encoding becomes inefficient due to:
- **Size overhead**: JSON arrays are verbose compared to binary representation
- **Parsing cost**: JSON parsing is computationally expensive for large arrays
- **Memory usage**: JSON requires more memory during serialization/deserialization

The binary extension solves these issues by:
- Encoding tensor data in native binary format
- Reducing payload size by 50-75% for typical use cases
- Improving parsing performance significantly

## Protocol Specification

### Request Format

When using binary encoding, the HTTP request consists of:
1. **JSON Header**: Contains metadata about tensors
2. **Binary Payload**: Raw tensor data in binary format

```
POST /v2/models/mymodel/infer
Content-Type: application/json
Content-Length: <total_length>

{JSON_METADATA}
<BINARY_DATA>
```

### JSON Metadata Structure

```json
{
  "inputs": [
    {
      "name": "image_tensor",
      "shape": [1, 3, 224, 224],
      "datatype": "FP32",
      "parameters": {
        "binary_data_size": 602112
      }
    }
  ]
}
```

The `binary_data_size` parameter indicates the size of binary data for this tensor in bytes.

### Binary Data Layout

Binary data is appended to the JSON payload in the order tensors appear in the `inputs` array:

```
[JSON_BYTES][TENSOR_1_BYTES][TENSOR_2_BYTES]...[TENSOR_N_BYTES]
```

Each tensor's binary data is encoded in:
- **Little-endian** byte order
- **Row-major** (C-style) array layout
- Native data type format (IEEE 754 for floats)

## Data Type Encoding

### Floating Point Types
- `FP16`: 2 bytes per element (IEEE 754 half precision)
- `FP32`: 4 bytes per element (IEEE 754 single precision)  
- `FP64`: 8 bytes per element (IEEE 754 double precision)

### Integer Types
- `INT8`/`UINT8`: 1 byte per element
- `INT16`/`UINT16`: 2 bytes per element
- `INT32`/`UINT32`: 4 bytes per element
- `INT64`/`UINT64`: 8 bytes per element

### Boolean Type
- `BOOL`: 1 byte per element (0x00 = false, 0x01 = true)

## Implementation Examples

### Python Client

```python
import requests
import numpy as np
import json

def send_binary_request(url, tensors):
    """Send inference request with binary tensor data."""
    
    # Prepare JSON metadata
    inputs = []
    binary_data = b""
    
    for name, tensor in tensors.items():
        # Convert to binary
        tensor_bytes = tensor.astype(tensor.dtype).tobytes()
        binary_data += tensor_bytes
        
        # Add metadata
        inputs.append({
            "name": name,
            "shape": list(tensor.shape),
            "datatype": numpy_to_kserve_dtype(tensor.dtype),
            "parameters": {
                "binary_data_size": len(tensor_bytes)
            }
        })
    
    # Create request payload
    json_data = {"inputs": inputs}
    json_bytes = json.dumps(json_data).encode('utf-8')
    
    # Combine JSON + binary data
    payload = json_bytes + binary_data
    
    # Send request
    response = requests.post(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Content-Length": str(len(payload))
        }
    )
    
    return response.json()

def numpy_to_kserve_dtype(np_dtype):
    """Convert NumPy dtype to KServe datatype string."""
    mapping = {
        np.float16: "FP16",
        np.float32: "FP32", 
        np.float64: "FP64",
        np.int8: "INT8",
        np.int16: "INT16",
        np.int32: "INT32",
        np.int64: "INT64",
        np.uint8: "UINT8",
        np.uint16: "UINT16",
        np.uint32: "UINT32", 
        np.uint64: "UINT64",
        np.bool_: "BOOL"
    }
    return mapping.get(np_dtype.type, "FP32")

# Example usage
image = np.random.rand(1, 3, 224, 224).astype(np.float32)
tensors = {"image_input": image}

result = send_binary_request(
    "https://resnet.example.com/v2/models/resnet/infer",
    tensors
)
```

### Go Client

```go
package main

import (
    "bytes"
    "encoding/binary"
    "encoding/json"
    "fmt"
    "net/http"
)

type TensorInput struct {
    Name       string                 `json:"name"`
    Shape      []int                  `json:"shape"`
    Datatype   string                 `json:"datatype"`
    Parameters map[string]interface{} `json:"parameters"`
}

type InferenceRequest struct {
    Inputs []TensorInput `json:"inputs"`
}

func sendBinaryRequest(url string, tensors map[string][]float32, shapes map[string][]int) error {
    var inputs []TensorInput
    var binaryData bytes.Buffer
    
    for name, tensor := range tensors {
        // Convert to binary
        for _, val := range tensor {
            binary.Write(&binaryData, binary.LittleEndian, val)
        }
        
        // Add metadata
        inputs = append(inputs, TensorInput{
            Name:     name,
            Shape:    shapes[name],
            Datatype: "FP32",
            Parameters: map[string]interface{}{
                "binary_data_size": len(tensor) * 4, // 4 bytes per float32
            },
        })
    }
    
    // Create JSON metadata
    request := InferenceRequest{Inputs: inputs}
    jsonData, _ := json.Marshal(request)
    
    // Combine JSON + binary
    var payload bytes.Buffer
    payload.Write(jsonData)
    payload.Write(binaryData.Bytes())
    
    // Send request
    resp, err := http.Post(url, "application/json", &payload)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    // Process response...
    return nil
}
```

### JavaScript Client

```javascript
async function sendBinaryRequest(url, tensors) {
    const inputs = [];
    const binaryChunks = [];
    
    for (const [name, tensorData] of Object.entries(tensors)) {
        const { data, shape, dtype } = tensorData;
        
        // Convert to binary
        const buffer = new ArrayBuffer(data.length * 4); // Assuming FP32
        const view = new Float32Array(buffer);
        view.set(data);
        
        binaryChunks.push(buffer);
        
        // Add metadata
        inputs.push({
            name: name,
            shape: shape,
            datatype: "FP32",
            parameters: {
                binary_data_size: buffer.byteLength
            }
        });
    }
    
    // Create request payload
    const jsonData = JSON.stringify({ inputs });
    const jsonBytes = new TextEncoder().encode(jsonData);
    
    // Combine JSON + binary data
    const totalLength = jsonBytes.length + 
        binaryChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    
    const payload = new Uint8Array(totalLength);
    let offset = 0;
    
    // Copy JSON
    payload.set(jsonBytes, offset);
    offset += jsonBytes.length;
    
    // Copy binary data
    for (const chunk of binaryChunks) {
        payload.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }
    
    // Send request
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length.toString()
        },
        body: payload
    });
    
    return await response.json();
}
```

## Performance Benefits

### Size Reduction Examples

| Data Type | Array Size | JSON Size | Binary Size | Reduction |
|-----------|------------|-----------|-------------|-----------|
| FP32      | 224×224×3  | ~4.5 MB   | ~600 KB     | 87%       |
| INT64     | 512×512    | ~3.2 MB   | ~2 MB       | 37%       |
| UINT8     | 1024×1024  | ~8.5 MB   | ~1 MB       | 88%       |

### Latency Improvements

- **Parsing**: 5-10x faster than JSON for large arrays
- **Network**: Reduced transfer time due to smaller payloads
- **Memory**: Lower memory footprint during processing

## Best Practices

### When to Use Binary Encoding

**Use binary encoding for:**
- Image data (typically > 50KB)
- Audio/video tensors
- High-dimensional feature vectors
- Large batch requests

**Use JSON encoding for:**
- Small tensors (< 1KB)
- Sparse data
- Text/string inputs
- Simple scalar values

### Optimization Tips

1. **Batch Processing**: Combine multiple samples into single tensors
2. **Data Type Selection**: Use appropriate precision (FP16 vs FP32)
3. **Compression**: Consider gzip compression for network transport
4. **Memory Management**: Stream large tensors when possible

### Error Handling

Common issues and solutions:

```python
# Validate tensor size matches binary_data_size
expected_size = np.prod(shape) * dtype_size
if len(binary_data) != expected_size:
    raise ValueError(f"Binary data size mismatch: expected {expected_size}, got {len(binary_data)}")

# Handle endianness
if sys.byteorder != 'little':
    tensor = tensor.byteswap().newbyteorder()
```

## Limitations

1. **Streaming**: Binary extension doesn't support streaming responses
2. **Debugging**: Binary data is not human-readable
3. **Middleware**: Some proxies may not handle binary payloads correctly
4. **Caching**: HTTP caches may not work optimally with binary data

## Next Steps

- Learn about [V2 Inference Protocol](./v2_protocol.md) fundamentals
- Explore [Request Batching](../batcher/batcher.md) for performance optimization
- Configure [Model Storage](../storage/storagecontainers.md) for large models
