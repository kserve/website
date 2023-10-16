# Deploying XGBoost models with InferenceService

This example walks you through how to deploy a `xgboost` model using KServe's `InferenceService` CRD.
Note that, by default it exposes your model through an API compatible with the existing V1 Dataplane. This example will show you how to serve a model through an API
compatible with the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

## Train the Model

The first step will be to train a sample `xgboost` model.
We will save this model as `model.bst`.

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

### Test the model locally
Once you've got your model serialized `model.bst`, we can then use [KServe XGBoost Server](https://github.com/kserve/kserve/tree/master/python/xgbserver) to spin up a local server.

!!! Note
    This step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-the-model-with-rest-endpoint-through-inferenceservice).

#### Pre-requisites

Firstly, to use kserve xgboost server locally, you will first need to install the `xgbserver` runtime package in your local environment.

1. Clone the Kserve repository and navigate into the directory.
    ```bash
    git clone https://github.com/kserve/kserve
    ```
2. Install `xgbserver` runtime. Kserve uses [Poetry](https://python-poetry.org/) as the dependency management tool. Make sure you have already [installed poetry](https://python-poetry.org/docs/#installation).
    ```bash
    cd python/xgbserver
    poetry install 
    ```
#### Serving model locally

The `xgbserver` package takes three arguments.

- `--model_dir`: The model directory path where the model is stored.
- `--model_name`: The name of the model deployed in the model server, the default value is `model`. This is optional. 
- `--nthread`: Number of threads to use by LightGBM. This is optional and the default value is 1.

With the `xgbserver` runtime package installed locally, you should now be ready to start our server as:

```bash
python3 xgbserver --model_dir /path/to/model_dir --model_name xgboost-v2-iris
```


## Deploy the Model with REST endpoint through InferenceService

Lastly, we use KServe to deploy our trained model on Kubernetes.
For this, we use the `InferenceService` CRD and set the **`protocolVersion` field to `v2`**.

=== "Yaml"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "xgboost-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: xgboost
          protocolVersion: v2
          runtime: kserve-xgbserver
          storageUri: "gs://kfserving-examples/models/xgboost/iris"
    ```
!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

Assuming that we've got a cluster accessible through `kubectl` with KServe already installed, we can deploy our model as:

```bash
kubectl apply -f xgboost.yaml
```

## Test the Deployed Model

We can now test our deployed model by sending a sample request.

Note that this request **needs to follow the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol)**.
You can see an example payload below. Create a file named `iris-input-v2.json` with the sample input.

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

[Determine the ingress IP and port](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.
Now, you can use `curl` to send the inference request as:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice xgboost-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/xgboost-v2-iris/infer
```

The output will be something similar to:

!!! success "Expected Output"
    ```{ .json .no-copy }
    {
      "id": "4e546709-0887-490a-abd6-00cbc4c26cf4",
      "model_name": "xgboost-v2-iris",
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

## Deploy the Model with GRPC endpoint through InferenceService
Create the inference service resource and expose the gRPC port using the below yaml.

!!! Note
    Currently, KServe only supports exposing either HTTP or gRPC port. By default, HTTP port is exposed.

=== "Serverless"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "xgboost-v2-iris-grpc"
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
=== "RawDeployment"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "xgboost-v2-iris-grpc"
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
!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

Apply the InferenceService yaml to get the gRPC endpoint

=== "kubectl"
```
kubectl apply -f xgboost-v2-grpc.yaml
```

#### Test the deployed model with grpcurl

After the gRPC `InferenceService` becomes ready, [grpcurl](https://github.com/fullstorydev/grpcurl), can be used to send gRPC requests to the `InferenceService`.

```bash
# download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-v2-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice xgboost-iris-v2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

[Determine the ingress IP and port](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`. Now, you can use `curl` to send the inference requests.
The gRPC APIs follows the KServe [prediction V2 protocol / Open Inference Protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2).
For example, `ServerReady` API can be used to check if the server is ready:

```bash
grpcurl \
  -plaintext \
  -proto ${PROTO_FILE} \
  -authority ${SERVICE_HOSTNAME} \
  ${INGRESS_HOST}:${INGRESS_PORT} \
  inference.GRPCInferenceService.ServerReady
```

!!! success "Expected Output"
    ```{ .json .no-copy }
    {
      "ready": true
    }
    ```

You can test the deployed model by sending a sample request with the below payload.
Notice that the input format differs from the in the previous `REST endpoint` example.
Prepare the inference input inside the file named `iris-input-v2-grpc.json`.
```json
{
  "model_name": "xgboost-v2-iris-grpc",
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

`ModelInfer` API takes input following the `ModelInferRequest` schema defined in the `grpc_predict_v2.proto` file.
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

!!! success "Expected Output"

    ```{ .bash .no-copy }
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
    "modelName": "xgboost-v2-iris-grpc",
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
