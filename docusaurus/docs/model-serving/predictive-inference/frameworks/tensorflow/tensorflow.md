---
title: TensorFlow
description: Deploy TensorFlow models with KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploying TensorFlow Models with KServe

This guide walks you through how to deploy a `TensorFlow` model using KServe's `InferenceService`. You'll learn how to serve models through both HTTP/REST and gRPC endpoints, and implement canary rollout strategies for model updates.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and TensorFlow saved models.

## Creating the InferenceService with V1 REST Endpoints

Create an `InferenceService` resource that specifies the `TensorFlow` model format and a `storageUri` pointing to your saved TensorFlow model:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "flower-sample"
spec:
  predictor:
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
```

Apply the YAML configuration to create the `InferenceService`:

```bash
kubectl apply -f tensorflow.yaml 
```

:::tip
```
inferenceservice.serving.kserve.io/flower-sample created
```
:::

Wait for the `InferenceService` to be in ready state:

```shell
kubectl get isvc flower-sample
```

:::tip[Expected Output]
You should see output similar to:

```
NAME            URL                                        READY   PREV   LATEST   PREVROLLEDOUTREVISION        LATESTREADYREVISION                     AGE
flower-sample   http://flower-sample.default.example.com   True           100                                   flower-sample-predictor-default-n9zs6   7m15s
```
:::

## Running a Prediction

To test your deployed model:

1. First, [determine the ingress IP and ports](../../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) for your cluster.
2. Set the `INGRESS_HOST` and `INGRESS_PORT` environment variables accordingly.
3. Use the following command to send a prediction request with [sample input](./input.json):

```bash
MODEL_NAME=flower-sample
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${MODEL_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
* Connected to localhost (::1) port 8080 (#0)
> POST /v1/models/tensorflow-sample:predict HTTP/1.1
> Host: tensorflow-sample.default.example.com
> User-Agent: curl/7.73.0
> Accept: */*
> Content-Length: 16201
> Content-Type: application/x-www-form-urlencoded
> 
* upload completely sent off: 16201 out of 16201 bytes
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 222
< content-type: application/json
< date: Sun, 31 Jan 2021 01:01:50 GMT
< x-envoy-upstream-service-time: 280
< server: istio-envoy
< 
{
    "predictions": [
        {
            "scores": [0.999114931, 9.20987877e-05, 0.000136786213, 0.000337257545, 0.000300532585, 1.84813616e-05],
            "prediction": 0,
            "key": "   1"
        }
    ]
}
```
:::

## Creating the InferenceService with gRPC Endpoints

KServe also supports gRPC for inference requests. To create an `InferenceService` that exposes a gRPC endpoint:

<Tabs groupId="deployment-type">
<TabItem value="serverless" label="Serverless" default>

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "flower-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
      ports:
        - containerPort: 9000
          name: h2c          # knative expects grpc port name to be 'h2c'
          protocol: TCP
```

</TabItem>
<TabItem value="raw" label="Raw Deployment" default>

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "flower-grpc"
spec:
  predictor:
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
      ports:
        - containerPort: 9000
          name: grpc-port    # KServe requires the port name to be in the format <protocol>[-<suffix>]
          protocol: TCP
```

</TabItem>
</Tabs>

Apply the YAML configuration to create the gRPC `InferenceService`:

```bash
kubectl apply -f grpc.yaml 
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/flower-grpc created
```
:::

### Running a gRPC Prediction

To run predictions using the gRPC endpoint, you'll need to:

1. Set up a Python virtual environment with TensorFlow Serving API:

```shell
# The prediction script is written in TensorFlow 1.x
pip install tensorflow-serving-api>=1.14.0,<2.0.0
```

2. Create a Python script named `grpc_client.py` to handle gRPC requests.
Below is a Python client example for making gRPC requests to your deployed TensorFlow model:

```python
import argparse
import json
import base64
import grpc

from tensorflow.contrib.util import make_tensor_proto
from tensorflow_serving.apis import predict_pb2
from tensorflow_serving.apis import prediction_service_pb2_grpc


def predict(host, port, hostname, model, signature_name, input_path):
    # If hostname not set, we assume the host is a valid knative dns.
    if hostname:
        host_option = (('grpc.ssl_target_name_override', hostname,),)
    else:
        host_option = None
    channel = grpc.insecure_channel(target='{host}:{port}'.format(host=host, port=port), options=host_option)
    stub = prediction_service_pb2_grpc.PredictionServiceStub(channel)
    with open(input_path) as json_file:
        data = json.load(json_file)
    image = data['instances'][0]['image_bytes']['b64']
    key = data['instances'][0]['key']

    # Call classification model to make prediction
    request = predict_pb2.PredictRequest()
    request.model_spec.name = model
    request.model_spec.signature_name = signature_name
    image = base64.b64decode(image)
    request.inputs['image_bytes'].CopyFrom(
        make_tensor_proto(image, shape=[1]))
    request.inputs['key'].CopyFrom(make_tensor_proto(key, shape=[1]))

    result = stub.Predict(request, 10.0)
    print(result)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', help='Ingress Host Name', default='localhost', type=str)
    parser.add_argument('--port', help='Ingress Port', default=80, type=int)
    parser.add_argument('--model', help='TensorFlow Model Name', type=str)
    parser.add_argument('--signature_name', help='Signature name of saved TensorFlow model',
                        default='serving_default', type=str)
    parser.add_argument('--hostname', help='Service Host Name', default='', type=str)
    parser.add_argument('--input_path', help='Prediction data input path', default='./input.json', type=str)

    args = parser.parse_args()
    predict(args.host, args.port, args.hostname, args.model, args.signature_name, args.input_path)
```

3. Run the gRPC prediction script with the [sample input](./input.json):

```shell
MODEL_NAME=flower-grpc
INPUT_PATH=./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${MODEL_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
python grpc_client.py --host $INGRESS_HOST --port $INGRESS_PORT --model $MODEL_NAME --hostname $SERVICE_HOSTNAME --input_path $INPUT_PATH
```

:::tip[Expected Output]
```
outputs {
  key: "key"
  value {
    dtype: DT_STRING
    tensor_shape {
      dim {
        size: 1
      }
    }
    string_val: "   1"
  }
}
outputs {
  key: "prediction"
  value {
    dtype: DT_INT64
    tensor_shape {
      dim {
        size: 1
      }
    }
    int64_val: 0
  }
}
outputs {
  key: "scores"
  value {
    dtype: DT_FLOAT
    tensor_shape {
      dim {
        size: 1
      }
      dim {
        size: 6
      }
    }
    float_val: 0.9991149306297302
    float_val: 9.209887502947822e-05
    float_val: 0.00013678647519554943
    float_val: 0.0003372581850271672
    float_val: 0.0003005331673193723
    float_val: 1.848137799242977e-05
  }
}
model_spec {
  name: "flowers-sample"
  version {
    value: 1
  }
  signature_name: "serving_default"
}
```
:::
