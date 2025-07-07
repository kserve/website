---
title: PMML
description: Deploy PMML models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying PMML Models with KServe

PMML (Predictive Model Markup Language) is an XML-based format for describing data mining and statistical models, including inputs to the models, transformations used to prepare data, and the parameters that define the models themselves. This guide demonstrates how to deploy PMML models using KServe's `InferenceService`.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with KServe installed
- `kubectl` CLI configured to communicate with your cluster
- Basic knowledge of Kubernetes concepts and PMML models
- Access to cloud storage (like Google Cloud Storage) or a persistent volume to store your model artifacts
- For local testing: Python environment with PMML libraries and OpenJDK-11 installed

## Testing the Model Locally

Once you have your model serialized as `model.pmml`, you can use [KServe PMML Server](https://github.com/kserve/kserve/tree/master/python/pmmlserver) to test it locally before deployment.

:::tip
This local testing step is optional. You can skip to the deployment section below if you prefer.
:::

### Using KServe PMMLServer Locally

#### Prerequisites

To use KServe PMML server locally, install the required dependencies:

1. Install [OpenJDK-11](https://adoptium.net/en-GB/temurin/releases/?version=11&package=jdk)

2. Clone the KServe repository:
   ```bash
   git clone https://github.com/kserve/kserve
   ```

3. Install the `pmmlserver` runtime using Poetry (ensure you have [Poetry installed](https://python-poetry.org/docs/#installation)):
   ```bash
   cd python/pmmlserver
   poetry install 
   ```

#### Serving the Model Locally

The `pmmlserver` package takes two arguments:

- `--model_dir`: The directory path where the model is stored
- `--model_name`: The name of the model to be deployed (optional, default is `model`)

Start your server with:

```bash
python3 pmmlserver --model_dir /path/to/model_dir --model_name pmml-iris
```

:::warning[Performance Considerations]
The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and doesn't support multi-process mode, so you can't set `spec.predictor.containerConcurrency`. If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale the replica size.
:::

## Deploying PMML Model with V1 Protocol

### Creating the InferenceService

To deploy a PMML model, create an `InferenceService` manifest:

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

Apply the YAML manifest:

```bash
kubectl apply -f pmml.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/pmml-demo created
```
:::

### Running a Prediction

First, determine the ingress IP and port, then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

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
MODEL_NAME=pmml-demo
INPUT_PATH=@./iris-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-demo -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
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
```
:::

## Deploying the Model with REST Endpoint Using Open Inference Protocol

To deploy your PMML model with the Open Inference Protocol (V2), create an `InferenceService` resource specifying `protocolVersion: v2`:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pmml-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: pmml
      protocolVersion: v2
      runtime: kserve-pmmlserver
      storageUri: "gs://kfserving-examples/models/pmml"
```

Apply the YAML manifest:

```bash
kubectl apply -f pmml-v2.yaml
```

## Testing the Deployed Model

You can test your deployed model by sending a sample request that follows the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

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
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/pmml-iris/infer
```

:::tip[Expected Output]
```json
{
  "model_name": "pmml-iris",
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
  name: "pmml-iris-grpc"
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

</TabItem>
<TabItem value="raw" label="Raw Kubernetes Deployment">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "pmml-iris-grpc"
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

</TabItem>
</Tabs>

Apply the YAML to create the gRPC InferenceService:

```bash
kubectl apply -f pmml-grpc.yaml
```

### Testing the gRPC Endpoint with grpcurl

After the gRPC `InferenceService` becomes ready, use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_grpc.proto

INPUT_PATH=iris-input-grpc.json
PROTO_FILE=open_inference_grpc.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-iris-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
  "model_name": "pmml-iris-grpc",
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
  "model_name": "pmml-iris",
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
:::
