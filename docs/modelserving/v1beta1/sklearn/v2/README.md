# Deploy Scikit-learn models with InferenceService

This example walks you through how to deploy a `scikit-learn` model leveraging
the `v1beta1` version of the `InferenceService` CRD.
Note that, by default the `v1beta1` version will expose your model through an
API compatible with the existing V1 Dataplane.
This example will show you how to serve a model through [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

## Train the Model

The first step will be to train a sample `scikit-learn` model.
Note that this model will be then saved as `model.joblib`.

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

## Test the Model locally

Once you've got your model serialised `model.joblib`, we can then use [KServe Sklearn Server](https://github.com/kserve/kserve/tree/master/python/sklearnserver) to spin up a local server.

!!! Note
    This step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-the-model-with-rest-endpoint-through-inferenceservice).

### Using KServe SklearnServer

#### Pre-requisites

Firstly, to use KServe sklearn server locally, you will first need to install the `sklearnserver`
runtime package in your local environment.

1. Clone the KServe repository and navigate into the directory.
    ```bash
    git clone https://github.com/kserve/kserve
    ```
2. Install `sklearnserver` runtime. Kserve uses [Poetry](https://python-poetry.org/) as the dependency management tool. Make sure you have already [installed poetry](https://python-poetry.org/docs/#installation).
    ```bash
    cd python/sklearnserver
    poetry install 
    ```
#### Serving model locally

The `sklearnserver` package takes two arguments.

- `--model_dir`: The model directory path where the model is stored.
- `--model_name`: The name of the model deployed in the model server, the default value is `model`. This is optional. 

With the `sklearnserver` runtime package installed locally, you should now be ready to start our server as:

```bash
python3 sklearnserver --model_dir /path/to/model_dir --model_name sklearn-v2-iris
```

## Deploy the Model with REST endpoint through InferenceService

Lastly, you will use KServe to deploy the trained model onto Kubernetes.
For this, you will just need to use **version `v1beta1`** of the
`InferenceService` CRD and set the **`protocolVersion` field to `v2`**.

=== "Yaml"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          protocolVersion: v2
          runtime: kserve-sklearnserver
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```

!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

=== "kubectl"
    ```bash
    kubectl apply -f sklearn.yaml
    ```

## Test the Deployed Model

You can now test your deployed model by sending a sample request.

Note that this request **needs to follow the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol)**.
You can see an example payload below.  Create a file named `iris-input-v2.json` with the sample input.

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
[Determine the ingress IP and port](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.
Now, you can use `curl` to send the inference request as:
 
```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-v2-iris/infer
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "id": "823248cc-d770-4a51-9606-16803395569c",
      "model_name": "sklearn-v2-iris",
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
## Deploy the Model with GRPC endpoint through InferenceService
Create the inference service resource and expose the gRPC port using the below yaml.

!!! Note
    Currently, KServe only supports exposing either HTTP or gRPC port. By default, HTTP port is exposed.

=== "Serverless"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-v2-iris-grpc"
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
=== "RawDeployment"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-v2-iris-grpc"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          protocolVersion: v2
          runtime: kserve-sklearnserver
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
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
kubectl apply -f sklearn-v2-grpc.yaml
```

#### Test the deployed model with grpcurl

After the gRPC `InferenceService` becomes ready, [grpcurl](https://github.com/fullstorydev/grpcurl), can be used to send gRPC requests to the `InferenceService`.

```bash
# download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-v2-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-v2-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

[Determine the ingress IP and port](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`. Now, you can use `curl` to send the inference requests.
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
  "model_name": "sklearn-v2-iris-grpc",
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
    "modelName": "sklearn-v2-iris-grpc",
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
