---
title: TorchScript
description: Deploy TorchScript Models with Triton on KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Triton TorchScript Models

While Python is a suitable and preferred language for many scenarios requiring dynamism and ease of iteration, there are equally many situations where precisely these properties of Python are unfavorable. One environment in which the latter often applies is production – the land of low latencies and strict deployment requirements. For production scenarios, C++ is very often the language of choice.

This guide outlines the path PyTorch provides to go from an existing Python model to a serialized representation that can be loaded and executed purely from C++ using Triton Inference Server, with no dependency on Python.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- Basic knowledge of PyTorch, TorchScript, and Triton Inference Server.
- kubectl CLI tool configured with your cluster.

## Setup (Knative Mode Only)

1. Skip [tag resolution](https://knative.dev/docs/serving/tag-resolution/) for `nvcr.io` which requires auth to resolve Triton inference server image digest:

```bash
kubectl patch cm config-deployment --patch '{"data":{"registriesSkippingTagResolving":"nvcr.io"}}' -n knative-serving
```

2. Increase progress deadline since pulling Triton image and big models may take longer than the default timeout of 120s (this setting requires Knative 0.15.0+):

```bash
kubectl patch cm config-deployment --patch '{"data":{"progressDeadline": "600s"}}' -n knative-serving
```

## Export as TorchScript Model

A PyTorch model's journey from Python to C++ is enabled by [Torch Script](https://pytorch.org/docs/master/jit.html), a representation of a PyTorch model that can be understood, compiled, and serialized by the Torch Script compiler. If you are starting out from an existing PyTorch model written in the vanilla `eager` API, you must first convert your model to Torch Script.

Convert your model via tracing and serialize the script module to a file:

```python
import torch
# Use torch.jit.trace to generate a torch.jit.ScriptModule via tracing
example = torch.rand(1, 3, 32, 32)
traced_script_module = torch.jit.trace(net, example)
traced_script_module.save("model.pt")
```

## Store Your Model on Cloud Storage in a Model Repository

Once the model is exported as a `TorchScript` model file, the next step is to upload it to a cloud storage bucket. Triton supports loading multiple models, so it expects a model repository which follows a required layout in the bucket:

```
<model-repository-path>/
  <model-name>/
    [config.pbtxt]
    [<output-labels-file> ...]
    <version>/
      <model-definition-file>
    <version>/
      <model-definition-file>
    ...
  <model-name>/
    [config.pbtxt]
    [<output-labels-file> ...]
    <version>/
      <model-definition-file>
    <version>/
      <model-definition-file>
```

For example, in your model repository bucket `gs://kfserving-examples/models/torchscript`, the layout can be:

```
torchscript/
  cifar/
    config.pbtxt
    1/
      model.pt
```

The `config.pbtxt` defines a model configuration that provides the required and optional information for the model. A minimal model configuration must specify name, platform, max_batch_size, input, and output.

Due to the absence of names for inputs and outputs in a TorchScript model, the `name` attribute of both the inputs and outputs in the configuration must follow a specific naming convention: `"<n>__<index>"`. Where `<n>` can be any string and `<index>` refers to the position of the corresponding input/output. This means if there are two inputs and two outputs, they must be named as: `INPUT__0`, `INPUT__1` and `OUTPUT__0`, `OUTPUT__1` such that `INPUT__0` refers to the first input and `INPUT__1` refers to the second input, etc.

```protobuf
name: "cifar"
platform: "pytorch_libtorch"
max_batch_size: 1
input [
  {
    name: "INPUT__0"
    data_type: TYPE_FP32
    dims: [3,32,32]
  }
]
output [
  {
    name: "OUTPUT__0"
    data_type: TYPE_FP32
    dims: [10]
  }
]

instance_group [
    {
        count: 1
        kind: KIND_CPU
    }
]
```

`instance_group` provides multiple instances of a model so that multiple inference requests for that model can be handled simultaneously:

```protobuf
instance_group [
    {
      count: 4
      kind: KIND_CPU
    }
]
```

To schedule the model on GPU, you would need to change the `instance_group` with GPU kind:

```protobuf
instance_group [
    {
        count: 1
        kind: KIND_GPU
    }
]
```

For more details, please refer to [Triton model configuration](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html).

## Inference with HTTP Endpoint

### Create the InferenceService

Create the inference service YAML with the model repository URI:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torchscript-cifar10
spec:
  predictor:
    model:
      modelFormat:
        name: triton
      protocolVersion: v2
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 20.10-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      resources:
        limits:
          cpu: 1
          memory: 2Gi
        requests:
          cpu: 1
          memory: 2Gi
```

:::tip
Setting OMP_NUM_THREADS or MKL_NUM_THREADS environment variables is critical for performance. These variables are used to control the intra-op parallelism for TorchScript model inference, and the number of CPU threads defaults to the number of CPU cores. Please refer to [CPU threading & TorchScript Inference](https://pytorch.org/docs/stable/notes/cpu_threading_torchscript_inference.html) for more details.
:::

Apply the inference service:

```bash
kubectl apply -f torchscript.yaml
```

### Run a Prediction with curl

First, determine the [ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

The latest Triton Inference Server uses the KServe [prediction V2 protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2), so the input request needs to follow the V2 schema with the specified data type and shape.

You can use the sample input file [input.json](./input.json) to test the model:

```bash
# Download the input file
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/triton/torchscript/input.json

MODEL_NAME=cifar10
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice torchscript-cifar10 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer -d $INPUT_PATH
```

:::tip[Expected Output]
```
* Connected to torchscript-cifar.default.svc.cluster.local (10.51.242.87) port 80 (#0)
> POST /v2/models/cifar10/infer HTTP/1.1
> Host: torchscript-cifar.default.svc.cluster.local
> User-Agent: curl/7.47.0
> Accept: */*
> Content-Length: 110765
> Content-Type: application/x-www-form-urlencoded
> Expect: 100-continue
>
< HTTP/1.1 100 Continue
* We are completely uploaded and fine
< HTTP/1.1 200 OK
< content-length: 315
< content-type: application/json
< date: Sun, 11 Oct 2020 21:26:51 GMT
< x-envoy-upstream-service-time: 8
< server: istio-envoy
<
* Connection #0 to host torchscript-cifar.default.svc.cluster.local left intact
{"model_name":"cifar10","model_version":"1","outputs":[{"name":"OUTPUT__0","datatype":"FP32","shape":[1,10],"data":[-2.0964810848236086,-0.13700756430625916,-0.5095657706260681,2.795621395111084,-0.5605481863021851,1.9934231042861939,1.1288187503814698,-1.4043136835098267,0.6004879474639893,-2.1237082481384279]}]}
```
:::

### Run a Performance Test

You can test the performance of your model using the provided performance test configuration. The QPS rate (`--rate`) can be changed in the [perf.yaml](./perf.yaml) file:

```bash
kubectl create -f perf.yaml
```

:::tip[Expected Output]
```
Requests      [total, rate, throughput]         6000, 100.02, 100.01
Duration      [total, attack, wait]             59.995s, 59.99s, 4.961ms
Latencies     [min, mean, 50, 90, 95, 99, max]  4.222ms, 5.7ms, 5.548ms, 6.384ms, 6.743ms, 9.286ms, 25.85ms
Bytes In      [total, mean]                     1890000, 315.00
Bytes Out     [total, mean]                     665874000, 110979.00
Success       [ratio]                           100.00%
Status Codes  [code:count]                      200:6000
Error Set:
```
:::

## Inference with gRPC Endpoint

### Create the InferenceService with gRPC

Create the inference service YAML and expose the gRPC port. Currently, only one port is allowed to expose either HTTP or gRPC port, and by default, the HTTP port is exposed:
<Tabs groupId="deployment-type">
<TabItem value="serverless" label="Knative" default>

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torchscript-cifar10
spec:
  predictor:
    model:
      modelFormat:
        name: triton
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 23.10-py3
      ports:
      - containerPort: 9000
        name: h2c         # knative expects grpc port name to be 'h2c'
        protocol: TCP
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      resources:
        limits:
          cpu: 1
          memory: 2Gi
        requests:
          cpu: 1
          memory: 2Gi
```
</TabItem>
<TabItem value="raw" label="Standard Deployment">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torchscript-cifar10
spec:
  predictor:
    model:
      modelFormat:
        name: triton
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 23.10-py3
      ports:
      - containerPort: 9000
        name: grpc-port # KServe requires the port name to be in the format <protocol>[-<suffix>]
        protocol: TCP
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      resources:
        limits:
          cpu: 1
          memory: 2Gi
        requests:
          cpu: 1
          memory: 2Gi
```
</TabItem>
</Tabs>
Apply the gRPC `InferenceService` YAML:

```bash
kubectl apply -f torchscript_grpc.yaml
```

### Run a Prediction with grpcurl

After the gRPC `InferenceService` becomes ready, you can use [grpcurl](https://github.com/fullstorydev/grpcurl) to send gRPC requests:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/predict-api/v2/grpc_predict_v2.proto

INPUT_PATH=input-grpc.json
PROTO_FILE=grpc_predict_v2.proto
SERVICE_HOSTNAME=$(kubectl get inferenceservice torchscript-cifar10 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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

:::tip[Expected Output]
```json
{
  "ready": true
}
```
:::

`ModelInfer` API takes input following the `ModelInferRequest` schema defined in the `grpc_predict_v2.proto` file. Note that the input file differs from that used in the previous `curl` example.
You can use the sample input file [input-grpc.json](./input-grpc.json) to test the model:


```bash
grpcurl \
  -vv \
  -plaintext \
  -proto ${PROTO_FILE} \
  -H "Host: ${SERVICE_HOSTNAME}" \
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
host: torchscript-cifar10.default.example.com

Response headers received:
accept-encoding: identity,gzip
content-type: application/grpc
date: Fri, 12 Aug 2022 01:49:53 GMT
grpc-accept-encoding: identity,deflate,gzip
server: istio-envoy
x-envoy-upstream-service-time: 16

Response contents:
{
  "modelName": "cifar10",
  "modelVersion": "1",
  "outputs": [
    {
      "name": "OUTPUT__0",
      "datatype": "FP32",
      "shape": [
        "1",
        "10"
      ]
    }
  ],
  "rawOutputContents": [
    "wCwGwOJLDL7icgK/dusyQAqAD799KP8/In2QP4zAs7+WuRk/2OoHwA=="
  ]
}

Response trailers received:
(empty)
Sent 1 request and received 1 response
```
:::

The content of the output tensor is encoded in the `rawOutputContents` field. It can be base64 decoded and loaded into a NumPy array with the given datatype and shape.

Alternatively, Triton also provides a [Python client library](https://pypi.org/project/tritonclient/) which has many [examples](https://github.com/triton-inference-server/client/tree/main/src/python/examples) showing how to interact with the KServe V2 gPRC protocol.

## Add Transformer to the InferenceService

Triton Inference Server expects tensors as input data, but often a pre-processing step is required when the user is sending a request with raw input format. The Transformer component can be specified in the InferenceService spec for user-implemented pre/post-processing code.

### Implement Pre/Post Processing Functions

Create a Python class that extends the KServe `Model` base class to implement the preprocessing handler:

```python title="image_transformer_v2.py"
import kserve
from typing import Dict
from PIL import Image
import torchvision.transforms as transforms
import logging
import io
import numpy as np
import base64

logging.basicConfig(level=kserve.constants.KSERVE_LOGLEVEL)

transform = transforms.Compose(
        [transforms.ToTensor(),
         transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))])

def image_transform(instance):
    byte_array = base64.b64decode(instance['image_bytes']['b64'])
    image = Image.open(io.BytesIO(byte_array))
    a = np.asarray(image)
    im = Image.fromarray(a)
    res = transform(im)
    logging.info(res)
    return res.tolist()


class ImageTransformerV2(kserve.Model):
    def __init__(self, name: str, predictor_host: str, protocol: str):
        super().__init__(name)
        self.predictor_host = predictor_host
        self.protocol = protocol

    def preprocess(self, inputs: Dict) -> Dict:
        return {
           'inputs': [
               {
                 'name': 'INPUT__0',
                 'shape': [1, 3, 32, 32],
                 'datatype': "FP32",
                 'data': [image_transform(instance) for instance in inputs['instances']]
               }
            ]
        }

    def postprocess(self, results: Dict) -> Dict:
        return {output["name"]: np.array(output["data"]).reshape(output["shape"]).tolist()
                for output in results["outputs"]}
```

You can find [the code example](https://github.com/kserve/kserve/tree/release-{{kserveDocsVersion}}/docs/samples/v1beta1/triton/torchscript/image_transformer_v2) and [Dockerfile](https://github.com/kserve/kserve/blob/release-{{kserveDocsVersion}}/docs/samples/v1beta1/triton/torchscript/transformer.Dockerfile) in the KServe repository.

### Build Transformer Docker Image

```bash
docker build -t $DOCKER_USER/image-transformer-v2:latest -f transformer.Dockerfile . --rm
```

### Create the InferenceService with Transformer

Use the following YAML to create the InferenceService with the image transformer component:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torch-transformer
spec:
  predictor:
    model:
      modelFormat:
        name: triton
      protocolVersion: v2
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 20.10-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
  transformer:
    containers:
    - image: kfserving/image-transformer-v2:latest
      name: kserve-container
      command:
      - "python"
      - "-m"
      - "image_transformer_v2"
      args:
      - --model_name
      - cifar10
      - --protocol
      - v2
```

Apply the InferenceService:

```bash
kubectl apply -f torch_transformer.yaml
```

### Run a Prediction with curl

The transformer does not enforce a specific schema like the predictor, but the general recommendation is to send input as a list of objects:

```json
{
  "instances": [
    {
      "image_bytes": { "b64": "aW1hZ2UgYnl0ZXM=" },
      "caption": "seaside"
    },
    {
      "image_bytes": { "b64": "YXdlc29tZSBpbWFnZSBieXRlcw==" },
      "caption": "mountains"
    }
  ]
}
```

Download the [input file](./image.json) and send a prediction request:

```bash

SERVICE_NAME=torch-transformer
MODEL_NAME=cifar10
INPUT_PATH=@./image.json

SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
> POST /v1/models/cifar10:predict HTTP/1.1
> Host: torch-transformer.kserve-triton.example.com
> User-Agent: curl/7.68.0
> Accept: */*
> Content-Length: 3400
> Content-Type: application/x-www-form-urlencoded
> Expect: 100-continue
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 100 Continue
* We are completely uploaded and fine
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 219
< content-type: application/json; charset=UTF-8
< date: Sat, 19 Mar 2022 12:15:54 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 41
<
{"OUTPUT__0": [[-2.0964810848236084, -0.137007474899292, -0.5095658302307129, 2.795621395111084, -0.560547947883606, 1.9934231042861938, 1.1288189888000488, -4043136835098267, 0.600488007068634, -2.1237082481384277]]}
```
:::
