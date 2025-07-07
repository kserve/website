---
title: Paddle
description: Deploy Paddle models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying Paddle Models with KServe

This guide demonstrates how to deploy Paddle models using KServe's `InferenceService`. You'll learn how to deploy a trained Paddle ResNet50 model to classify images through both HTTP/REST and gRPC endpoints.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with KServe installed
- `kubectl` CLI configured to communicate with your cluster
- Basic knowledge of Kubernetes concepts and Paddle models
- Python environment with the following packages:
  - `opencv-python` (for image preprocessing)
  - `numpy`


## Testing the Model Locally

Once you have your model serialized as `model.pdmodel`, you can use [KServe Paddle Server](https://github.com/kserve/kserve/tree/master/python/paddleserver) to spin up a local server.

:::tip
This local testing step is optional. You can skip to the deployment section below if you prefer.
:::

### Using KServe PaddleServer Locally

#### Prerequisites

To use KServe Paddle server locally, install the `paddleserver` runtime package:

1. Clone the KServe repository and navigate into the directory:
   ```bash
   git clone https://github.com/kserve/kserve
   ```

2. Install the `paddleserver` runtime using Poetry (ensure you have [Poetry installed](https://python-poetry.org/docs/#installation)):
   ```bash
   cd python/paddleserver
   poetry install 
   ```

#### Serving the Model Locally

The `paddleserver` package takes two arguments:

- `--model_dir`: The directory path where the model is stored
- `--model_name`: The name of the model to be deployed (optional, default is `model`)

Start your server with:

```bash
python3 paddleserver --model_dir /path/to/model_dir --model_name paddle-resnet50
```

## Deploy Paddle Model with V1 Protocol

### Creating the InferenceService

To deploy a Paddle model using the V1 protocol, create an `InferenceService` resource:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "paddle-resnet50"
spec:
  predictor:
    model:
      modelFormat:
        name: paddle
      storageUri: "gs://kfserving-examples/models/paddle/resnet50"
```

Apply the YAML manifest:

```bash
kubectl apply -f paddle.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/paddle-resnet50 created
```
:::

### Running a Prediction

First, determine the ingress IP and port, then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

For testing the model, you'll need to prepare an image for classification. You can use the provided Python scripts img_preprocess.py and img2json.py to preprocess an image and convert it to the required JSON format:

```python title="img_preprocess.py"
import cv2
import numpy as np

def resize_short(img, target_size):
    """ resize_short """
    percent = float(target_size) / min(img.shape[0], img.shape[1])
    resized_width = int(round(img.shape[1] * percent))
    resized_height = int(round(img.shape[0] * percent))
    resized = cv2.resize(img, (resized_width, resized_height))
    return resized

def crop_image(img, target_size, center):
    """ crop_image """
    height, width = img.shape[:2]
    size = target_size
    if center:
        w_start = (width - size) / 2
        h_start = (height - size) / 2
    else:
        w_start = np.random.randint(0, width - size + 1)
        h_start = np.random.randint(0, height - size + 1)
    w_end = w_start + size
    h_end = h_start + size
    img = img[int(h_start):int(h_end), int(w_start):int(w_end), :]
    return img

def preprocess(img):
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    img = resize_short(img, 224)
    img = crop_image(img, 224, True)
    # bgr-> rgb && hwc->chw
    img = img[:, :, ::-1].astype('float32').transpose((2, 0, 1)) / 255
    img_mean = np.array(mean).reshape((3, 1, 1))
    img_std = np.array(std).reshape((3, 1, 1))
    img -= img_mean
    img /= img_std
    return img[np.newaxis, :]
```

```python title="img2json.py"
#!/usr/bin/python3
import os
import argparse
import json
import cv2
from img_preprocess import preprocess

parser = argparse.ArgumentParser()
parser.add_argument("filename", help="converts image to json request",
                    type=str)
args = parser.parse_args()

input_file = args.filename

img = preprocess(cv2.imread(input_file))

request = {"instances": img.tolist()}

output_file = os.path.splitext(input_file)[0] + '.json'
with open(output_file, 'w') as out:
    json.dump(request, out)
```

Use these scripts to convert the [jay.jpeg](./jay.jpeg) image to the JSON format required by the inference service:

```bash
python img2json.py jay.jpeg
```

This will create [`jay.json`](./jay.json) which can be used as input for the prediction request:

```bash
MODEL_NAME=paddle-resnet50
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${MODEL_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" \
 -H "Content-Type: application/json" \
 -d @./jay.json \
 http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict
```

:::tip[Expected Output]
```
*   Trying 127.0.0.1:80...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 80 (#0)
> POST /v1/models/paddle-resnet50:predict HTTP/1.1
> Host: paddle-resnet50.default.example.com
> User-Agent: curl/7.68.0
> Accept: */*
> Content-Length: 3010209
> Content-Type: application/x-www-form-urlencoded
> Expect: 100-continue
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 100 Continue
* We are completely uploaded and fine
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 23399
< content-type: application/json; charset=UTF-8
< date: Mon, 17 May 2021 03:34:58 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 511
<
{"predictions": [[6.736678770380422e-09, 1.1535990829258935e-08, 5.142250714129659e-08, 6.647170636142619e-08, 4.094492567219277e-08, 1.3402451770616608e-07, 9.355561303436843e-08, 2.8935891904779965e-08, 6.845367295227334e-08, 7.680615965455218e-08, 2.0334689452283783e-06, 1.1085678579547675e-06, 2.3477592492326949e-07, 6.582037030966603e-07, 0.00012373103527352214, ...]]}
```
:::

## Deploying the Model with REST Endpoint Using Open Inference Protocol

To deploy your Paddle model with the Open Inference Protocol (V2), create an `InferenceService` resource with `protocolVersion: v2`:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "paddle-v2-resnet50"
spec:
  predictor:
    model:
      modelFormat:
        name: paddle
      protocolVersion: v2
      runtime: kserve-paddleserver
      storageUri: "gs://kfserving-examples/models/paddle/resnet50"
```

Apply the YAML manifest:

```bash
kubectl apply -f paddle-v2.yaml
```

## Testing the Deployed Model

You can test your deployed model by sending a sample request that follows the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

Create a file named `jay-v2.json` with your sample input, or use the provided sample file [jay-v2.json](./jay-v2.json):

```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [1, 3, 224, 224],
      "datatype": "FP64",
      "data": [] // Add your preprocessed image data here
    }
  ]
}
```

Send the inference request:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice paddle-v2-resnet50 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./jay-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/paddle-v2-resnet50/infer
```

:::tip[Expected Output]
```
{
  "model_name": "paddle-v2-resnet50",
  "id": "d0fbb4e6-4a5d-4236-b989-2730b0c97e43",
  "parameters": null,
  "outputs": [
    {
      "name": "softmax_0.tmp_0",
      "shape": [1, 1000],
      "datatype": "FP32",
      "parameters": null,
      "data": [0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 
               0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0001, ... ]
    }
  ]
}
```
:::

## Deploying the Model with gRPC Endpoint

For applications requiring gRPC communication, you can expose a gRPC endpoint by modifying the `InferenceService` definition.

:::tip
KServe currently supports exposing either HTTP or gRPC port, not both simultaneously. By default, the HTTP port is exposed.
:::

<Tabs groupId="deployment-type">
<TabItem value="serverless" label="Serverless" default>

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "paddle-v2-resnet50-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: paddle
      protocolVersion: v2
      runtime: kserve-paddleserver
      storageUri: "gs://kfserving-examples/models/paddle/resnet50"
      ports:
        - name: h2c     # knative expects grpc port name to be 'h2c'
          protocol: TCP
          containerPort: 8081
```

</TabItem>
<TabItem value="raw" label="Raw Deployment">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "paddle-v2-resnet50-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: paddle
      protocolVersion: v2
      runtime: kserve-paddleserver
      storageUri: "gs://kfserving-examples/models/paddle/resnet50"
      ports:
        - name: grpc-port  # Istio requires the port name to be in the format <protocol>[-<suffix>]
          protocol: TCP
          containerPort: 8081
```

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f paddle-v2-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=jay-v2-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice paddle-v2-resnet50-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

First, check if the server is ready:

```bash
grpcurl \
  -plaintext \
  -proto ${PROTO_FILE} \
  -authority ${SERVICE_HOSTNAME} \
  ${INGRESS_HOST}:${INGRESS_PORT} \
  inference.GRPCInferenceService.ServerReady
```

:::tip[Expected Output]
```json
{
  "ready": true
}
```
:::

To test the model with inference requests, use the provided [jay-v2-grpc.json](./jay-v2-grpc.json) file:

```json
{
  "model_name": "paddle-v2-resnet50-grpc",
  "inputs": [
    {
      "name": "input-0",
      "shape": [1, 3, 224, 224],
      "datatype": "FP64",
      "contents": {
        "fp64_contents": []
      }
    }
  ]
}
```

Send the gRPC inference request:

```bash
grpcurl \
  -vv \
  -plaintext \
  -proto ${PROTO_FILE} \
  -authority ${SERVICE_HOSTNAME} \
  -d @ \
  ${INGRESS_HOST}:${INGRESS_PORT} \
  inference.GRPCInferenceService.ModelInfer \
  <<< $(cat "$INPUT_PATH")
```

:::tip[Expected Output]
```
Resolved method descriptor:
rpc ModelInfer ( .inference.ModelInferRequest ) returns ( .inference.ModelInferResponse );

Request metadata to send:
(empty)

Response headers received:
content-type: application/grpc
date: Wed, 16 Aug 2023 14:25:18 GMT
grpc-accept-encoding: identity,deflate,gzip
server: istio-envoy
x-envoy-upstream-service-time: 126

Estimated response size: 112 bytes

Response contents:
{
  "modelName": "paddle-v2-resnet50-grpc",
  "outputs": [
    {
      "name": "softmax_0.tmp_0",
      "datatype": "FP32",
      "shape": [
        "1",
        "1000"
      ],
      "contents": {
        "fp32Contents": [
          0.0000097,
          0.0000213,
          0.0000761,
          0.0000183,
          0.0000458,
          0.0000992,
          /* More values... */
        ]
      }
    }
  ]
}
```
:::
