---
title: LightGBM
description: Deploy LightGBM models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying LightGBM Models with KServe

This guide demonstrates how to deploy LightGBM models using KServe's `InferenceService`. You'll learn how to train a model, test it locally, and serve it through both HTTP/REST and gRPC endpoints using the Open Inference Protocol.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and LightGBM models.

## Training a LightGBM Model

To test the LightGBM Server, first train a simple LightGBM model with the following Python code:

```python
import lightgbm as lgb
from sklearn.datasets import load_iris
import os

model_dir = "."
BST_FILE = "model.bst"

iris = load_iris()
y = iris['target']
X = iris['data']
dtrain = lgb.Dataset(X, label=y, feature_names=iris['feature_names'])

params = {
    'objective':'multiclass', 
    'metric':'softmax',
    'num_class': 3
}
lgb_model = lgb.train(params=params, train_set=dtrain)
model_file = os.path.join(model_dir, BST_FILE)
lgb_model.save_model(model_file)
```

## Testing the Model Locally with V1 Protocol

Once you have your model serialized as `model.bst`, you can use [KServe LightGBM Server](https://github.com/kserve/kserve/tree/master/python/lgbserver) to create a local model server.

:::tip
This local testing step is optional. You can skip to the deployment section below if you prefer.
:::

### Using KServe LightGBMServer Locally

#### Prerequisites

To use KServe LightGBM server locally, install the `lgbserver` runtime package:

1. Clone the KServe repository:
   ```bash
   git clone https://github.com/kserve/kserve
   ```

2. Install the `lgbserver` runtime using Uv (ensure you have [Uv installed](https://docs.astral.sh/uv/getting-started/installation/)):
   ```bash
   cd python/lgbserver
   uv sync
   ```

#### Serving the Model Locally

The `lgbserver` package takes three arguments:

- `--model_dir`: The directory path where the model is stored
- `--model_name`: The name of the model to be deployed (optional, default is `model`)
- `--nthread`: Number of threads to use by LightGBM (optional, default is 1)

Start your server with:

```bash
python3 lgbserver --model_dir /path/to/model_dir --model_name lightgbm-iris
```

After the LightGBM Server is running locally, test the model by sending an inference request:

```python
import requests

request = {'sepal_width_(cm)': {0: 3.5}, 'petal_length_(cm)': {0: 1.4}, 'petal_width_(cm)': {0: 0.2},'sepal_length_(cm)': {0: 5.1} }
formData = {
    'inputs': [request]
}
res = requests.post('http://localhost:8080/v1/models/lgb:predict', json=formData)
print(res)
print(res.text)
```

## Deploying LightGBM Model with V1 Protocol

To deploy the model on Kubernetes, create an `InferenceService` by specifying the `modelFormat` as `lightgbm` and providing the `storageUri`:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "lightgbm-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: lightgbm
      storageUri: "gs://kfserving-examples/models/lightgbm/iris"
```

Apply the YAML manifest:

```bash
kubectl apply -f lightgbm.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/lightgbm-iris created
```
:::

### Testing the Deployed Model

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

Create a file named `iris-input.json` with the following sample input:

```json
{
  "inputs": [{
    "sepal_length_(cm)": [5.1],
    "sepal_width_(cm)": [3.5],
    "petal_length_(cm)": [1.4],
    "petal_width_(cm)": [0.2]
  }]
}
```

Send the inference request:

```bash
MODEL_NAME=lightgbm-iris
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
*   Trying 169.63.251.68...
* TCP_NODELAY set
* Connected to 169.63.251.68 (169.63.251.68) port 80 (#0)
> POST /models/lightgbm-iris:predict HTTP/1.1
> Host: lightgbm-iris.default.svc.cluster.local
> User-Agent: curl/7.60.0
> Accept: */*
> Content-Length: 76
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 76 out of 76 bytes
< HTTP/1.1 200 OK
< content-length: 27
< content-type: application/json; charset=UTF-8
< date: Tue, 21 May 2019 22:40:09 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 13032
<
* Connection #0 to host 169.63.251.68 left intact
{"predictions": [[0.9, 0.05, 0.05]]}
```
:::

## Deploying the Model with REST Endpoint Using Open Inference Protocol

To deploy your LightGBM model with the Open Inference Protocol (V2), create an `InferenceService` resource with `protocolVersion: v2`:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "lightgbm-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: lightgbm
      protocolVersion: v2
      runtime: kserve-lgbserver
      storageUri: "gs://kfserving-examples/models/lightgbm/v2/iris"
```

:::tip
If the `runtime` field is not provided for V2 protocol, the `mlserver` runtime is used by default.
:::

Apply the YAML manifest:

```bash
kubectl apply -f lightgbm-v2.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/lightgbm-iris created
```
:::

### Testing the Deployed Model

Create a file named `iris-input-v2.json` with the following sample input:

```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [
        [6.8, 2.8, 4.8, 1.4],
        [6.0, 3.4, 4.5, 1.6]
      ]
    }
  ]
}
```

[Determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

Send the inference request:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/lightgbm-iris/infer
```

:::tip[Expected Output]
```json
{
  "model_name":"lightgbm-iris",
  "model_version":null,
  "id":"96253e27-83cf-4262-b279-1bd4b18d7922",
  "parameters":null,
  "outputs":[
    {
      "name":"predict",
      "shape":[2,3],
      "datatype":"FP64",
      "parameters":null,
      "data":
        [8.796664107010673e-06,0.9992300031041593,0.0007612002317336916,4.974786820804187e-06,0.9999919650711493,3.0601420299625077e-06]
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
<TabItem value="serverless" label="Knative" default>

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "lightgbm-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: lightgbm
      protocolVersion: v2
      runtime: kserve-lgbserver
      storageUri: "gs://kfserving-examples/models/lightgbm/v2/iris"
      ports:
        - name: h2c     # knative expects grpc port name to be 'h2c'
          protocol: TCP
          containerPort: 8081
```

</TabItem>
<TabItem value="raw" label="Standard Deployment">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "lightgbm-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: lightgbm
      protocolVersion: v2
      runtime: kserve-lgbserver
      storageUri: "gs://kfserving-examples/models/lightgbm/v2/iris"
      ports:
        - name: grpc-port  # Istio requires the port name to be in the format <protocol>[-<suffix>]
          protocol: TCP
          containerPort: 8081
```

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f lightgbm-iris-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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

To test the model with inference requests, create an input file `iris-input-grpc.json`:

```json
{
  "model_name": "lightgbm-iris-grpc",
  "inputs": [
    {
      "name": "input-0",
      "shape": [2, 4],
      "datatype": "FP32",
      "contents": {
        "fp32_contents": [6.8, 2.8, 4.8, 1.4, 6.0, 3.4, 4.5, 1.6]
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
// The ModelInfer API performs inference using the specified model. Errors are
// indicated by the google.rpc.Status returned for the request. The OK code
// indicates success and other codes indicate failure.
rpc ModelInfer ( .inference.ModelInferRequest ) returns ( .inference.ModelInferResponse );

Request metadata to send:
(empty)

Response headers received:
accept-encoding: identity,gzip
content-type: application/grpc
date: Sun, 25 Sep 2022 10:25:05 GMT
grpc-accept-encoding: identity,deflate,gzip
server: istio-envoy
x-envoy-upstream-service-time: 99

Estimated response size: 91 bytes

Response contents:
{
  "modelName": "lightgbm-iris-grpc",
  "outputs": [
    {
      "name": "predict",
      "datatype": "FP64",
      "shape": [
        "2",
        "3"
      ],
      "contents": {
        "fp64Contents": [
          8.796664107010673e-06,
          0.9992300031041593,
          0.0007612002317336916,
          4.974786820804187e-06,
          0.9999919650711493,
          3.0601420299625077e-06
        ]
      }
    }
  ]
}
```
:::
