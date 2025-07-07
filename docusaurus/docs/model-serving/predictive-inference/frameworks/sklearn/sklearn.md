---
title: Scikit-learn
description: Deploy Scikit-learn models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying Scikit-learn Models with KServe

This guide walks you through how to deploy a `scikit-learn` model using KServe's `InferenceService`. You'll learn how to serve models through both HTTP/REST and gRPC endpoints using the [Open Inference Protocol](../../../../concepts/architecture/data-plane/v2-protocol/v2-protocol.md).

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and Scikit-learn models.


## Training a Sample Model

First, train a sample `scikit-learn` model that will be saved as `model.joblib`:

```python
from sklearn import svm
from sklearn import datasets
from joblib import dump

iris = datasets.load_iris()
X, y = iris.data, iris.target

clf = svm.SVC(gamma='scale')
clf.fit(X, y)

dump(clf, 'model.joblib')
```

## Testing the Model Locally

Once you've serialized your model as `model.joblib`, you can use [KServe SKLearn Server](https://github.com/kserve/kserve/tree/master/python/sklearnserver) to spin up a local server for testing.

:::tip
This local testing step is optional. You can skip to the deployment section below if you prefer.
:::

### Using KServe SKLearnServer Locally

#### Prerequisites

To use KServe SKLearn server locally, install the `sklearnserver` runtime package in your environment:

1. Clone the KServe repository and navigate into the directory:
   ```bash
   git clone https://github.com/kserve/kserve
   ```

2. Install the `sklearnserver` runtime using Poetry (ensure you have [Poetry installed](https://python-poetry.org/docs/#installation)):
   ```bash
   cd python/sklearnserver
   poetry install 
   ```

#### Serving the Model Locally

The `sklearnserver` package takes two arguments:

- `--model_dir`: The directory path where the model is stored
- `--model_name`: The name of the model to be deployed (optional, default is `model`)

Start your server with:

```bash
python3 sklearnserver --model_dir /path/to/model_dir --model_name sklearn-iris
```

## Deploying the Model with REST Endpoint

To deploy your trained model on Kubernetes with KServe, create an `InferenceService` resource specifying `protocolVersion: v2` to use the Open Inference Protocol:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      protocolVersion: v2
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

:::tip
If the `runtime` field is not provided for V2 protocol, the `mlserver` runtime is used by default.
:::

:::note
Note that, by default the `v1beta1` version will expose your model through an API compatible with the existing [`V1 Dataplane`](../../../../concepts/architecture/data-plane/v1-protocol.md).
:::

This deployment assumes:
- Your model weights (`model.joblib`) have been uploaded to a storage location accessible from your cluster
- The model file must have any of the following extensions: `.joblib`, `.pkl`, `.pickle` for the SKLearn server to recognize it
- Your storage URI points to the directory containing the model file (not the file itself)
- The `kserve-sklearnserver` runtime is properly configured in your KServe installation

Apply the YAML manifest:

```bash
kubectl apply -f sklearn.yaml
```

## Testing the Deployed Model

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

First, determine the ingress IP and port, then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

Send the inference request:
 
```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-iris/infer
```

:::tip[Expected Output]
```json
{
  "id": "823248cc-d770-4a51-9606-16803395569c",
  "model_name": "sklearn-iris",
  "model_version": "v1.0.0",
  "outputs": [
    {
      "data": [1, 1],
      "datatype": "INT64",
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
<TabItem value="serverless" label="Serverless" default>

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      protocolVersion: v2
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
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
  name: "sklearn-iris-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      protocolVersion: v2
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
      ports:
        - name: grpc-port  # KServe requires the port name to be in the format <protocol>[-<suffix>]
          protocol: TCP
          containerPort: 8081
```

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f sklearn-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "sklearn-iris-grpc",
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
  "modelName": "sklearn-iris-grpc",
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
