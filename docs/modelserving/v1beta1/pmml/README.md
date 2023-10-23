# Deploy PMML model with InferenceService
PMML, or predictive model markup language, is an XML format for describing data mining and statistical models, including inputs to the models,
transformations used to prepare data for data mining, and the parameters that define the models themselves. In this example we show how you can
serve the PMML format model on `InferenceService`.

## Deploy PMML model with V1 protocol
### Create the InferenceService
=== "New Schema"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "pmml-demo"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          storageUri: "gs://kfserving-examples/models/pmml"
    ```

=== "Old Schema"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "pmml-demo"
    spec:
      predictor:
        pmml:
          storageUri: gs://kfserving-examples/models/pmml
    ```

Create the InferenceService with above yaml
```bash
kubectl apply -f pmml.yaml
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/pmml-demo created
    ```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale 
    the replica size.


### Run a prediction
The first step is to [determine the ingress IP and ports](/docs/get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

You can see an example payload below. Create a file named `iris-input.json` with the sample input.
```json
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2]
  ]
}
```

```bash
MODEL_NAME=pmml-demo
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-demo -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * TCP_NODELAY set
    * Connected to localhost (::1) port 8081 (#0)
    > POST /v1/models/pmml-demo:predict HTTP/1.1
    > Host: pmml-demo.default.example.com
    > User-Agent: curl/7.64.1
    > Accept: */*
    > Content-Length: 45
    > Content-Type: application/x-www-form-urlencoded
    >
    * upload completely sent off: 45 out of 45 bytes
    < HTTP/1.1 200 OK
    < content-length: 39
    < content-type: application/json; charset=UTF-8
    < date: Sun, 18 Oct 2020 15:50:02 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 12
    <
    * Connection #0 to host localhost left intact
    {"predictions": [{'Species': 'setosa', 'Probability_setosa': 1.0, 'Probability_versicolor': 0.0, 'Probability_virginica': 0.0, 'Node_Id': '2'}]}
    * Closing connection 0
    ```

## Deploy the model with [Open Inference Protocol](https://github.com/kserve/open-inference-protocol/)

### Test the Model locally

Once you've got your model serialised `model.pmml`, we can then use [KServe Pmml Server](https://github.com/kserve/kserve/tree/master/python/pmmlserver) to spin up a local server.

!!! Note
    This step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-the-model-with-rest-endpoint-through-inferenceservice).

### Using KServe PMMLServer

#### Pre-requisites

Firstly, to use KServe pmml server locally, you will first need to install the `pmmlserver`
runtime package in your local environment.

1. Install [OpenJdk-11](https://adoptium.net/en-GB/temurin/releases/?version=11&package=jdk).
2. Clone the KServe repository and navigate into the directory.
    ```bash
    git clone https://github.com/kserve/kserve
    ```
3. Install `pmmlserver` runtime. Kserve uses [Poetry](https://python-poetry.org/) as the dependency management tool. Make sure you have already [installed poetry](https://python-poetry.org/docs/#installation).
    ```bash
    cd python/pmmlserver
    poetry install 
    ```
#### Serving model locally

The `pmmlserver` package takes two arguments.

- `--model_dir`: The model directory path where the model is stored.
- `--model_name`: The name of the model deployed in the model server, the default value is `model`. This is optional. 

With the `pmmlserver` runtime package installed locally, you should now be ready to start our server as:

```bash
python3 pmmlserver --model_dir /path/to/model_dir --model_name pmml-v2-iris
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
      name: "pmml-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/pmml"
    ```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale 
    the replica size.

=== "kubectl"
    ```bash
    kubectl apply -f pmml-v2-iris.yaml
    ```

## Test the Deployed Model

You can now test your deployed model by sending a sample request.

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
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/pmml-v2-iris/infer
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "model_name": "pmml-v2-iris",
      "model_version": null,
      "id": "a187a478-c614-46ce-a7de-2f07871f43f3",
      "parameters": null,
      "outputs": [
        {
          "name": "Species",
          "shape": [
            2
          ],
          "datatype": "BYTES",
          "parameters": null,
          "data": [
            "versicolor",
            "versicolor"
          ]
        },
        {
          "name": "Probability_setosa",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0,
            0
          ]
        },
        {
          "name": "Probability_versicolor",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0.9074074074074074,
            0.9074074074074074
          ]
        },
        {
          "name": "Probability_virginica",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0.09259259259259259,
            0.09259259259259259
          ]
        },
        {
          "name": "Node_Id",
          "shape": [
            2
          ],
          "datatype": "BYTES",
          "parameters": null,
          "data": [
            "6",
            "6"
          ]
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
      name: "pmml-v2-iris-grpc"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/pmml"
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
      name: "pmml-v2-iris-grpc"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/pmml"
          ports:
            - name: grpc-port  # Istio requires the port name to be in the format <protocol>[-<suffix>]
              protocol: TCP
              containerPort: 8081
    ```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale 
    the replica size.

Apply the InferenceService yaml to get the gRPC endpoint

=== "kubectl"
```
kubectl apply -f pmml-v2-grpc.yaml
```

#### Test the deployed model with grpcurl

After the gRPC `InferenceService` becomes ready, [grpcurl](https://github.com/fullstorydev/grpcurl), can be used to send gRPC requests to the `InferenceService`.

```bash
# download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-v2-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-v2-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "pmml-v2-iris-grpc",
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
      "model_name": "pmml-v2-iris",
      "model_version": null,
      "id": "a187a478-c614-46ce-a7de-2f07871f43f3",
      "parameters": null,
      "outputs": [
        {
          "name": "Species",
          "shape": [
            2
          ],
          "datatype": "BYTES",
          "parameters": null,
          "data": [
            "versicolor",
            "versicolor"
          ]
        },
        {
          "name": "Probability_setosa",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0,
            0
          ]
        },
        {
          "name": "Probability_versicolor",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0.9074074074074074,
            0.9074074074074074
          ]
        },
        {
          "name": "Probability_virginica",
          "shape": [
            2
          ],
          "datatype": "FP64",
          "parameters": null,
          "data": [
            0.09259259259259259,
            0.09259259259259259
          ]
        },
        {
          "name": "Node_Id",
          "shape": [
            2
          ],
          "datatype": "BYTES",
          "parameters": null,
          "data": [
            "6",
            "6"
          ]
        }
      ]
    }

    Response trailers received:
    (empty)
    Sent 1 request and received 1 response
    ```
