---
title: Spark MLlib
description: Deploy Spark MLlib models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying Spark MLlib Models with KServe

This guide demonstrates how to train and deploy Spark MLlib models with PMML format using KServe's InferenceService. Spark MLlib is a scalable machine learning library that provides various algorithms and utilities.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and Spark MLlib.
- Python environment with the following packages:
  - `pyspark` 3.0.x or later
  - `pyspark2pmml`
- [JPMML-SparkML jar](https://github.com/jpmml/jpmml-sparkml/releases/download/1.6.3/jpmml-sparkml-executable-1.6.3.jar) file
- Access to cloud storage (like Google Cloud Storage) to store your PMML model

## Training a Spark MLlib Model and Exporting to PMML

### Setting Up Your Environment

1. Install the required Python packages:

```bash
pip install pyspark~=3.0.0
pip install pyspark2pmml
```

2. Download the JPMML-SparkML jar:

```bash
wget https://github.com/jpmml/jpmml-sparkml/releases/download/1.6.3/jpmml-sparkml-executable-1.6.3.jar
```

### Training and Exporting the Model

Launch PySpark with the JPMML-SparkML jar:

```bash
pyspark --jars ./jpmml-sparkml-executable-1.6.3.jar
```

Train a model using the [Iris dataset](./iris.csv) and export it to PMML format:

```python
from pyspark.sql import SparkSession
from pyspark.ml import Pipeline
from pyspark.ml.classification import DecisionTreeClassifier
from pyspark.ml.feature import RFormula
from pyspark2pmml import PMMLBuilder

spark = SparkSession.builder.appName("SparkMLlib-KServe-Example").getOrCreate()
# Load the Iris dataset
df = spark.read.csv("Iris.csv", header=True, inferSchema=True)

# Define the pipeline
formula = RFormula(formula="Species ~ .")
classifier = DecisionTreeClassifier()
pipeline = Pipeline(stages=[formula, classifier])
pipelineModel = pipeline.fit(df)

# Export to PMML
pmmlBuilder = PMMLBuilder(spark, df, pipelineModel)
pmmlBuilder.buildFile("DecisionTreeIris.pmml")
```

### Uploading the Model to Cloud Storage

Upload the generated PMML file to your cloud storage:

```bash
gsutil cp ./DecisionTreeIris.pmml gs://YOUR_BUCKET_NAME/sparkpmml/model.pmml
```

## Testing the Model Locally

For local testing, you can use the KServe PMML server. Please refer to the [PMML server documentation](../pmml/pmml.md#testing-the-model-locally) for detailed instructions on testing locally.

:::warning[Performance Considerations]
The `pmmlserver` runtime used for Spark MLlib model deployment is based on [Py4J](https://github.com/bartdag/py4j) and doesn't support multi-process mode, so you can't set `spec.predictor.containerConcurrency`. If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale the replica size.
:::


## Deploying the Model with V1 Protocol

### Creating the InferenceService

To deploy your Spark MLlib PMML model, create an `InferenceService` resource with the PMML format:

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
      storageUri: "gs://kfserving-examples/models/sparkpmml"
```

Apply the YAML manifest:

```bash
kubectl apply -f spark-pmml.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/spark-pmml created
```
:::

Wait for the `InferenceService` to be ready:

```bash
kubectl wait --for=condition=Ready inferenceservice spark-pmml
```

### Running a Prediction

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

Create a file named `iris-input.json` with the following sample input:

```json
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2]
  ]
}
```

Send the inference request:

```bash
MODEL_NAME=spark-pmml
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-pmml -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
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
:::

## Deploying the Model with Open Inference Protocol (V2)

### Creating the InferenceService

To deploy your Spark MLlib model with the Open Inference Protocol, create an `InferenceService` resource with `protocolVersion: v2`:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "spark-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: pmml
      protocolVersion: v2
      runtime: kserve-pmmlserver
      storageUri: "gs://kfserving-examples/models/sparkpmml"
```

Apply the YAML manifest:

```bash
kubectl apply -f spark-iris.yaml
```

### Testing the Deployed Model

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

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

Send the inference request:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/spark-iris/infer
```

:::tip[Expected Output]
```json
{
  "model_name": "spark-iris",
  "model_version": null,
  "id": "a187a478-c614-46ce-a7de-2f07871f43f3",
  "parameters": null,
  "outputs": [
    {
      "name": "Species",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": ["versicolor", "versicolor"]
    },
    {
      "name": "Probability_setosa",
      "shape": [2],
      "datatype": "FP64",
      "parameters": null,
      "data": [0, 0]
    },
    {
      "name": "Probability_versicolor",
      "shape": [2],
      "datatype": "FP64",
      "parameters": null,
      "data": [0.9074074074074074, 0.9074074074074074]
    },
    {
      "name": "Probability_virginica",
      "shape": [2],
      "datatype": "FP64",
      "parameters": null,
      "data": [0.09259259259259259, 0.09259259259259259]
    },
    {
      "name": "Node_Id",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": ["6", "6"]
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
  name: "spark-iris-grpc"
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

</TabItem>
<TabItem value="raw" label="Standard Deployment">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "spark-iris-grpc"
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

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f spark-iris-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

First, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice spark-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "spark-iris-grpc",
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
Response contents:
{
  "model_name": "spark-iris",
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
:::
