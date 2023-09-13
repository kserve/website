# Deploy LightGBM model with InferenceService

## Train a LightGBM model

To test the LightGBM Server, first you need to train a simple LightGBM model with following python code.

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

## Deploy LightGBM model with V1 protocol

### Test the model locally
Install and run the [LightGBM Server](https://github.com/kserve/kserve/tree/master/python/lgbserver) using the trained model locally and test the prediction. 

```shell
python -m lgbserver --model_dir /path/to/model_dir --model_name lgb
```

After the `LightGBM Server` is up locally we can then test the model by sending an inference request.

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

### Deploy with InferenceService

To deploy the model on Kubernetes you can create the InferenceService by specifying the `modelFormat` with `lightgbm` and `storageUri`. 

=== "Old Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "lightgbm-iris"
    spec:
      predictor:
        lightgbm:
          storageUri: "gs://kfserving-examples/models/lightgbm/iris"
    ```
=== "New Schema"

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

Apply the above yaml to create the InferenceService

```bash
kubectl apply -f lightgbm.yaml
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/lightgbm-iris created
    ```

### Test the deployed model

To test the deployed model the first step is to [determine the ingress IP and ports](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`, then run the following curl command to send the inference request to the `InferenceService`.

```bash
MODEL_NAME=lightgbm-iris
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
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

## Deploy the model with [V2 protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2)

### Test the model locally
Once you've got your model serialized `model.bst`, we can then use either
[Kserve LightGBM Server](https://github.com/kserve/kserve/tree/master/python/lgbserver) or [MLServer](https://github.com/SeldonIO/MLServer) which implements the KServe V2 inference protocol to spin up a local server.

!!! Note
    This step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-with-inferenceservice).

### Using Kserve LigtGBM Server

#### Pre-requisites

Firstly, to use kserve lightgbm server locally, you will first need to install the `lgbserver`
runtime package in your local environment.

1. Clone the Kserve repository and navigate into the directory.
    ```bash
    git clone https://github.com/kserve/kserve
    ```
2. Install `lgbserver` runtime. Kserve uses [Poetry](https://python-poetry.org/) as the dependency management tool. Make sure you have already [installed poetry](https://python-poetry.org/docs/#installation).
    ```bash
    cd python/lgbserver
    poetry install 
    ```
#### Serving model locally

The `lgbserver` package takes three arguments.

- `--model_dir`: The model directory path where the model is stored.
- `--model_name`: The name of the model deployed in the model server, the default value is `model`. This is optional. 
- `--nthread`: Number of threads to use by LightGBM. This is optional and the default value is 1.

With the `lgbserver` runtime package installed locally, you should now be ready to start our server as:

```bash
python3 lgbserver --model_dir /path/to/model_dir --model_name lightgbm-iris
```

### Using MLserver 

#### Pre-requisites

To run MLServer locally, you first install the `mlserver` package in your local environment, as well as the LightGBM runtime.
For more details on MLServer, please check the [LightGBM example doc](https://github.com/SeldonIO/MLServer/blob/master/docs/examples/lightgbm/README.md).


```bash
pip install mlserver mlserver-lightgbm
```

#### Model settings

The next step is to provide the model settings so that MLServer knows:

- The inference runtime to serve your model (i.e. `mlserver_lightgbm.LightGBMModel`)
- The model's name and version

These can be specified through environment variables or by creating a local
`model-settings.json` file:

```json
{
  "name": "lightgbm-iris",
  "version": "v1.0.0",
  "implementation": "mlserver_lightgbm.LightGBMModel"
}
```
Note that, when you [deploy your model](#deployment), **KServe will already
inject some sensible defaults** so that it runs out-of-the-box without any
further configuration.
However, you can still override these defaults by providing a
`model-settings.json` file similar to your local one.
You can even provide a [set of `model-settings.json` files to load multiple
models](https://github.com/SeldonIO/MLServer/tree/master/docs/examples/mms).

#### Serving model locally

With the `mlserver` package installed locally and a local `model-settings.json`
file, you should now be ready to start our server as:

```bash
mlserver start .
```

### Deploy InferenceService with REST endpoint
To deploy the LightGBM model with V2 inference protocol, you need to set the **`protocolVersion` field to `v2`**.

=== "Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "lightgbm-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: lightgbm
          runtime: kserve-lgbserver
          protocolVersion: v2
          storageUri: "gs://kfserving-examples/models/lightgbm/v2/iris"
    ```
!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

Apply the InferenceService yaml to get the REST endpoint
=== "kubectl"

```bash
kubectl apply -f lightgbm-v2.yaml
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/lightgbm-v2-iris created
    ```

### Test the deployed model with curl

You can now test your deployed model by sending a sample request.

Note that this request **needs to follow the [V2 Dataplane protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2)**.
You can see an example payload below:

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

Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](/docs/get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

You can use `curl` to send the inference request as:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/lightgbm-v2-iris/infer
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "model_name":"lightgbm-v2-iris",
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

### Create the InferenceService with gRPC endpoint
Create the inference service yaml and expose the gRPC port, currently only one port is allowed to expose either HTTP or gRPC port and by default HTTP port is exposed.

=== "Yaml"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "lightgbm-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: lightgbm
          protocolVersion: v2
          runtime: kserve-lgbserver
          storageUri: "gs://kfserving-examples/models/lightgbm/v2/iris"
          ports:
            - name: h2c
              protocol: TCP
              containerPort: 8081
    ```
!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

Apply the InferenceService yaml to get the gRPC endpoint
=== "kubectl"

```
kubectl apply -f lightgbm-v2-grpc.yaml
```

### Test the deployed model with grpcurl

After the gRPC `InferenceService` becomes ready, [grpcurl](https://github.com/fullstorydev/grpcurl), can be used to send gRPC requests to the `InferenceService`.

```bash
# download the proto file
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/predict-api/v2/grpc_predict_v2.proto

INPUT_PATH=iris-input-v2-grpc.json
PROTO_FILE=grpc_predict_v2.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice lightgbm-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

The gRPC APIs follow the KServe [prediction V2 protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2).

For example, `ServerReady` API can be used to check if the server is ready:

```bash
grpcurl \
  -plaintext \
  -proto ${PROTO_FILE} \
  -authority ${SERVICE_HOSTNAME}" \
  ${INGRESS_HOST}:${INGRESS_PORT} \
  inference.GRPCInferenceService.ServerReady
```

!!! success "Expected Output"
    ```{ .json .no-copy }
    {
      "ready": true
    }
    ```

`ModelInfer` API takes input following the `ModelInferRequest` schema defined in the `grpc_predict_v2.proto` file. Notice that the input file differs from that used in the previous `curl` example.

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
    accept-encoding: identity,gzip
    content-type: application/grpc
    date: Sun, 25 Sep 2022 10:25:05 GMT
    grpc-accept-encoding: identity,deflate,gzip
    server: istio-envoy
    x-envoy-upstream-service-time: 99
    
    Estimated response size: 91 bytes
    
    Response contents:
    {
      "modelName": "lightgbm-v2-iris",
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
