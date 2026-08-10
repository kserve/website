---
title: XGBoost
description: Deploy XGBoost models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying XGBoost Models with KServe

This guide demonstrates how to deploy XGBoost models using KServe's `InferenceService`. You'll learn how to serve models through both HTTP/REST and gRPC endpoints using the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and XGBoost models.

## Training a Sample Model

First, train a sample XGBoost model that will be saved as `model.bst`:

```python
import xgboost as xgb
from sklearn.datasets import load_iris
import os

model_dir = "."
BST_FILE = "model.bst"

iris = load_iris()
y = iris['target']
X = iris['data']
dtrain = xgb.DMatrix(X, label=y)
param = {'max_depth': 6,
            'eta': 0.1,
            'silent': 1,
            'nthread': 4,
            'num_class': 10,
            'objective': 'multi:softmax'
            }
xgb_model = xgb.train(params=param, dtrain=dtrain)
model_file = os.path.join((model_dir), BST_FILE)
xgb_model.save_model(model_file)
```

## Testing the Model Locally

Once you've serialized your model as `model.bst`, you can use [KServe XGBoost Server](https://github.com/kserve/kserve/tree/master/python/xgbserver) to spin up a local server for testing.

:::tip
This local testing step is optional. You can skip to the deployment section below if you prefer.
:::

### Using KServe XGBoostServer Locally

#### Prerequisites

To use KServe XGBoost server locally, install the `xgbserver` runtime package:

1. Clone the KServe repository and navigate into the directory:
   ```bash
   git clone https://github.com/kserve/kserve
   ```

2. Install the `xgbserver` runtime using Uv (ensure you have [Uv installed](https://docs.astral.sh/uv/getting-started/installation/)):
   ```bash
   cd python/xgbserver
   uv sync
   ```

#### Serving the Model Locally

The `xgbserver` package takes three arguments:

- `--model_dir`: The directory path where the model is stored
- `--model_name`: The name of the model to be deployed (optional, default is `model`) 
- `--nthread`: Number of threads to use by XGBoost (optional, default is 1)

Start your server with:

```bash
python3 xgbserver --model_dir /path/to/model_dir --model_name xgboost-iris
```

## Deploying the Model with REST Endpoint

To deploy your trained model on Kubernetes with KServe, create an `InferenceService` resource specifying `protocolVersion: v2` to use the Open Inference Protocol:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "xgboost-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: xgboost
      protocolVersion: v2
      runtime: kserve-xgbserver
      storageUri: "gs://kfserving-examples/models/xgboost/iris"
```

:::tip
If the `runtime` field is not provided for V2 protocol, the `mlserver` runtime is used by default.
:::

:::note
Note that, by default the `v1beta1` version will expose your model through an API compatible with the existing [`V1 Dataplane`](../../../../concepts/architecture/data-plane/v1-protocol.md).
:::

This deployment assumes:
- Your model weights (`model.bst`) have been uploaded to a storage location accessible from your cluster
- The model file must have any of the following extensions: `.bst`, `.json`, `.ubj` for the XGBoost server to recognize it
- Your storage URI points to the directory containing the model file
- The `kserve-xgbserver` runtime is properly configured in your KServe installation

Apply the YAML manifest:

```bash
kubectl apply -f xgboost.yaml
```

### Testing the Deployed Model

You can test your deployed model by sending a sample request that follows the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

Here's an example input payload (`iris-input.json`):

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

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

Send the inference request:
 
```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice xgboost-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/xgboost-iris/infer
```

:::tip[Expected Output]
```json
{
  "id": "4e546709-0887-490a-abd6-00cbc4c26cf4",
  "model_name": "xgboost-iris",
  "model_version": "v1.0.0",
  "outputs": [
    {
      "data": [1.0, 1.0],
      "datatype": "FP32",
      "name": "predict",
      "parameters": null,
      "shape": [2]
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
  name: "xgboost-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: xgboost
      protocolVersion: v2
      runtime: kserve-xgbserver
      storageUri: "gs://kfserving-examples/models/xgboost/iris"
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
  name: "xgboost-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: xgboost
      protocolVersion: v2
      runtime: kserve-xgbserver
      storageUri: "gs://kfserving-examples/models/xgboost/iris"
      ports:
        - name: grpc-port  # Istio requires the port name to be in the format <protocol>[-<suffix>]
          protocol: TCP
          containerPort: 8081
```

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f xgboost-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice xgboost-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "xgboost-iris-grpc",
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
content-type: application/grpc
date: Mon, 09 Oct 2023 11:07:26 GMT
grpc-accept-encoding: identity, deflate, gzip
server: istio-envoy
x-envoy-upstream-service-time: 16

Estimated response size: 83 bytes

Response contents:
{
  "modelName": "xgboost-iris-grpc",
  "id": "41738561-7219-4e4a-984d-5fe19bed6298",
  "outputs": [
    {
      "name": "output-0",
      "datatype": "INT32",
      "shape": [
        "2"
      ],
      "contents": {
        "intContents": [
          1,
          1
        ]
      }
    }
  ]
}

Response trailers received:
(empty)
Sent 1 request and received 1 response
```
:::
