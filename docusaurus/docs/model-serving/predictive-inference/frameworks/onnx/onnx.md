---
title: ONNX
description: Deploy ONNX models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying ONNX Models with KServe

This guide demonstrates how to deploy an ONNX model using KServe's `InferenceService` and run inference on the deployed model.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with KServe installed. If not, follow the [KServe installation guide](https://kserve.github.io/website/master/admin/serverless/serverless/).
- `kubectl` CLI configured to communicate with your cluster.

## Create the InferenceService

Create an `InferenceService` resource to deploy your ONNX model:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "style-sample"
spec:
  predictor:
    model:
      protocolVersion: v2
      modelFormat:
        name: onnx
      storageUri: "gs://kfserving-examples/models/onnx"
      resources:
        requests:
          cpu: "100m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
```

:::tip
For the default KServe installation, when using the new schema, you must specify **protocolVersion** as v2 for ONNX models. Otherwise, you will get a "no runtime found" error.
:::

Save this configuration to a file named `onnx.yaml` and apply it:

```bash
kubectl apply -f onnx.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/style-sample configured
```
:::

## Run a Sample Inference

### 1. Set Up Environment Variables

First, determine the ingress IP and ports and set the necessary environment variables:

```bash
export ISVC_NAME=style-sample
export SERVICE_HOSTNAME=$(kubectl get inferenceservice ${ISVC_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
export INGRESS_HOST=localhost
export INGRESS_PORT=8080
```

### 2. Verify the Service is Healthy

Check that your service is ready to receive requests:

```bash
curl -v -H "Host:${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v2/health/ready
```

### 3. Install Dependencies

If you haven't already, install the required Python packages:

```bash
pip install numpy pillow protobuf requests
```

### 4. Run Inference Using Python

Below is the code to perform inference with the deployed ONNX model. This code is adapted from the original notebook example to work directly in the documentation. We'll use a [sample image](./image.jpg) for the style transfer example.

#### Load and Preprocess the Image

```python
from PIL import Image
import numpy as np
import requests
import json
import os

# Load & resize image
image = Image.open("image.jpg")
image = image.resize((224, 224), Image.LANCZOS)

# Preprocess image data
norm_img_data = np.array(image).astype('float32')
norm_img_data = np.transpose(norm_img_data, [2, 0, 1])
norm_img_data = np.expand_dims(norm_img_data, axis=0)
```

#### Create the Request Message

```python
# Create request message to be sent to the predictor
message_data = {}
inputs = {}
message_data["inputs"] = []
inputs["name"] = "input1"
inputs["shape"] = norm_img_data.shape
inputs["datatype"] = "FP32"  # ONNX model expects float32
inputs["data"] = norm_img_data.tolist()
message_data["inputs"].append(inputs)
```

#### Call the Predictor and Process the Response

```python
# Define variables (should match what you set earlier)
service_hostname = os.environ.get("SERVICE_HOSTNAME")
model_name = "style"  # The model name used by the ONNX sample
ingress_ip = os.environ.get("INGRESS_HOST", "localhost")
ingress_port = os.environ.get("INGRESS_PORT", "8080")

# Call predictor
predictor_url = f"http://{ingress_ip}:{ingress_port}/v2/models/{model_name}/infer"
request_headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Host': service_hostname
}

response = requests.post(
    predictor_url,
    headers=request_headers,
    data=json.dumps(message_data)
)

print(f"Response status code: {response.status_code}")

# Process response
if response.status_code == 200:
    response_message = json.loads(response.text)
    output1 = np.array(response_message["outputs"][0]['data'], dtype=np.float32)
    output1 = output1.reshape(3, 224, 224)
    
    # Postprocess
    result = np.clip(output1, 0, 255)
    result = result.transpose(1, 2, 0).astype("uint8")
    img = Image.fromarray(result)
    
    # Display or save the image
    img.save("output_image.jpg")
    print("Stylized image saved as 'output_image.jpg'")
else:
    print(f"Error: {response.text}")
```

## Complete Jupyter Notebook Example

If you prefer to run this as a Jupyter notebook, we've provided a complete example in the [mosaic-onnx.ipynb](./mosaic-onnx.ipynb) file. The notebook includes:

1. Setting up environment variables
2. Loading and preprocessing the image
3. Creating the request message
4. Sending the inference request
5. Processing the response
6. Visualizing the stylized result

To run the notebook, first install the required dependencies from the [requirements.txt](./requirements.txt) file:

```bash
pip install -r requirements.txt
```

Then launch Jupyter and open the notebook:

```bash
jupyter notebook mosaic-onnx.ipynb
```
## Uploading Your Own Model

### Store your trained model on cloud storage in a Model Repository
Once the model is exported as `ONNX` model file, the next step is to upload the model to a GCS bucket.
Triton supports loading multiple models so, it expects a model repository which follows a required layout in the bucket.
```
<model-repository-path>/
  <model-name>/
    [config.pbtxt]
    [<output-labels-file> ...]
    <version>/ 
      <model-definition-file>
    <version>/
      <model-definition-file>
    ...
  <model-name>/
    [config.pbtxt]
    [<output-labels-file> ...]
    <version>/
      <model-definition-file>
    <version>/
      <model-definition-file>
```

The sample model used in this example is already uploaded and available for use. However, if you would like to use your own ONNX model, follow these steps:

1. Export your model in ONNX format.
2. Upload your model as `model.onnx` to a cloud storage service (S3, GCS, or Azure Blob).
3. Update the `storageUri` in the InferenceService YAML to point to your model location.
4. Apply the updated YAML configuration.

:::tip
Make sure your model is compatible with ONNX Runtime and follows the expected input/output formats.
:::
