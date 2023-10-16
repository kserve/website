# Deploy Spark MLlib model with PMML InferenceService

## Setup
1. Install `pyspark` 3.0.x and `pyspark2pmml`
```bash
pip install pyspark~=3.0.0
pip install pyspark2pmml
```
2. Get [JPMML-SparkML jar](https://github.com/jpmml/jpmml-sparkml/releases/download/1.6.3/jpmml-sparkml-executable-1.6.3.jar)

## Train a Spark MLlib model and export to PMML file

Launch pyspark with `--jars` to specify the location of the `JPMML-SparkML` uber-JAR
```bash
pyspark --jars ./jpmml-sparkml-executable-1.6.3.jar
```

Fitting a Spark ML pipeline:
```python
from pyspark.ml import Pipeline
from pyspark.ml.classification import DecisionTreeClassifier
from pyspark.ml.feature import RFormula

df = spark.read.csv("Iris.csv", header = True, inferSchema = True)

formula = RFormula(formula = "Species ~ .")
classifier = DecisionTreeClassifier()
pipeline = Pipeline(stages = [formula, classifier])
pipelineModel = pipeline.fit(df)

from pyspark2pmml import PMMLBuilder

pmmlBuilder = PMMLBuilder(sc, df, pipelineModel)

pmmlBuilder.buildFile("DecisionTreeIris.pmml")
```

Upload the `DecisionTreeIris.pmml` to a GCS bucket.
```bash
gsutil cp ./DecisionTreeIris.pmml gs://$BUCKET_NAME/sparkpmml/model.pmml
```
### Test the Model locally
For testing the model locally, please refer the [pmml server documentation](../pmml/README.md#test-the-model-locally).

## Deploy Spark MLlib model with V1 protocol
### Create the InferenceService with PMMLServer
Create the `InferenceService` with `pmml` predictor and specify the `storageUri` with bucket location you uploaded to

=== "New Schema"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "spark-pmml"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          storageUri: gs://kfserving-examples/models/sparkpmml
    ```

=== "Old Schema"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "spark-pmml"
    spec:
      predictor:
        pmml:
          storageUri: gs://kfserving-examples/models/sparkpmml
    ```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale 
    the replica size.

Apply the `InferenceService` custom resource
```bash
kubectl apply -f spark_pmml.yaml
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/spark-pmml created
    ```

Wait the `InferenceService` to be ready
```bash
kubectl wait --for=condition=Ready inferenceservice spark-pmml
$ inferenceservice.serving.kserve.io/spark-pmml condition met
```

### Run a prediction
The first step is to [determine the ingress IP and ports](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

You can see an example payload below. Create a file named `iris-input.json` with the sample input.
```json
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2]
  ]
}
```

```bash
MODEL_NAME=spark-pmml
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-pmml -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * Connected to spark-pmml.default.35.237.217.209.xip.io (35.237.217.209) port 80 (#0)
    > POST /v1/models/spark-pmml:predict HTTP/1.1
    > Host: spark-pmml.default.35.237.217.209.xip.io
    > User-Agent: curl/7.73.0
    > Accept: */*
    > Content-Length: 45
    > Content-Type: application/x-www-form-urlencoded
    >
    * upload completely sent off: 45 out of 45 bytes
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 39
    < content-type: application/json; charset=UTF-8
    < date: Sun, 07 Mar 2021 19:32:50 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 14
    <
    * Connection #0 to host spark-pmml.default.35.237.217.209.xip.io left intact
    {"predictions": [[1.0, 0.0, 1.0, 0.0]]}
    ```

## Deploy the model with [Open Inference Protocol](https://github.com/kserve/open-inference-protocol/)

## Deploy the Model with REST endpoint through InferenceService

Lastly, you will use KServe to deploy the trained model onto Kubernetes.
For this, you will just need to use **version `v1beta1`** of the
`InferenceService` CRD and set the **`protocolVersion` field to `v2`**.

=== "Yaml"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "spark-v2-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/sparkpmml"
    ```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale 
    the replica size.

=== "kubectl"
    ```bash
    kubectl apply -f spark-v2-iris.yaml
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
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/spark-v2-iris/infer
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "model_name": "spark-v2-iris",
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
      name: "spark-v2-iris-grpc"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/sparkpmml"
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
      name: "spark-v2-iris-grpc"
    spec:
      predictor:
        model:
          modelFormat:
            name: pmml
          protocolVersion: v2
          runtime: kserve-pmmlserver
          storageUri: "gs://kfserving-examples/models/sparkpmml"
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
kubectl apply -f spark-v2-grpc.yaml
```

#### Test the deployed model with grpcurl

After the gRPC `InferenceService` becomes ready, [grpcurl](https://github.com/fullstorydev/grpcurl), can be used to send gRPC requests to the `InferenceService`.

```bash
# download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-v2-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-v2-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "spark-v2-iris-grpc",
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
      "model_name": "spark-v2-iris",
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
