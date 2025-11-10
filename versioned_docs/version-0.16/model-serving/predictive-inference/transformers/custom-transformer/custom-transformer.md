---
title: "How to write a Custom Transformer"
description: "Deploy a custom transformer with TorchServe in KServe"
---

import ActiveDocsVersion from '@site/src/components/ActiveDocsVersion';

# Deploy Transformer with InferenceService

A Transformer is an `InferenceService` component which performs pre/post processing alongside model inference. It takes raw input and transforms it into the input tensors that the model server expects. In this guide, we demonstrate running inference with a custom `Transformer` communicating using both REST and gRPC protocols.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` command line tool installed and configured.
- Docker installed (for building custom transformer images).
- Access to a container registry where you can push images.
- Basic understanding of Python and PyTorch.

## Create Custom Image Transformer

### Implement pre/post processing with KServe Model API

The `KServe.Model` base class defines three main handlers: `preprocess`, `predict`, and `postprocess`. These handlers execute in sequence, where:

1. The output of the `preprocess` handler is passed to the `predict` handler
2. When `predictor_host` is provided, the `predict` handler calls the predictor and receives a response
3. This response is then passed to the `postprocess` handler

KServe automatically fills in the `predictor_host` for `Transformer` and handles the call to the `Predictor`. By default, the transformer makes a REST call to the predictor. To make a gRPC call instead, you can pass the `--protocol` argument with value `grpc-v2`.

To implement a `Transformer`, derive from the base `Model` class and overwrite the `preprocess` and `postprocess` handlers with your customized transformation logic. For the `Open(v2) Inference Protocol`, KServe provides `InferRequest` and `InferResponse` API objects that abstract away REST/gRPC encoding and decoding details.

```python
import argparse
from kserve import Model, ModelServer, model_server, InferInput, InferRequest, logging
from typing import Dict
from PIL import Image
import torchvision.transforms as transforms
import logging
import io
import base64
import kserve


def image_transform(data):
    """converts the input image of Bytes Array into Tensor
    Args:
        data: The input image bytes.
    Returns:
        numpy.array: Returns the numpy array after the image preprocessing.
    """
    preprocess = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    preprocess = transforms.Compose(
        [transforms.ToTensor(), transforms.Normalize((0.1307,), (0.3081,))]
    )
    byte_array = base64.b64decode(data)
    image = Image.open(io.BytesIO(byte_array))
    tensor = preprocess(image).numpy()
    return tensor

# for v1 REST predictor the preprocess handler converts to input image bytes to float tensor dict in v1 inference REST protocol format
class ImageTransformer(kserve.Model):
    def __init__(self, name: str):
        super().__init__(name, return_response_headers=True)
        self.ready = True

    def preprocess(self, payload: Dict, headers: Dict[str, str] = None) -> Dict:
        input_tensors = [
            image_transform(instance["image"]["b64"]) for instance in payload["instances"]
        ]
        inputs = [{"data": input_tensor.tolist()} for input_tensor in input_tensors]
        payload = {"instances": inputs}
        return payload

    def postprocess(self, outputs: Dict, headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> Dict:
        # Example for custom response headers
        if response_headers is not None:
            response_headers.update(
                {"x-model-version": "1.0"}
            )
        return outputs


# for v2 gRPC predictor the preprocess handler converts the input image bytes tensor to float tensor in v2 inference protocol format
class ImageTransformer(kserve.Model):
    def __init__(self, name: str, headers: Dict[str, str] = None):
        super().__init__(name, return_response_headers=True)
        self.headers = headers
        self.ready = True

    def preprocess(
        self, request: InferRequest, headers: Dict[str, str] = None
    ) -> InferRequest:
        input_tensors = [
            image_transform(instance) for instance in request.inputs[0].data
        ]
        input_tensors = np.asarray(input_tensors)
        infer_inputs = [
            InferInput(
                name="INPUT__0",
                datatype="FP32",
                shape=list(input_tensors.shape),
                data=input_tensors,
            )
        ]
        infer_request = InferRequest(model_name=self.name, infer_inputs=infer_inputs)
        return infer_request
   
     def postprocess(self, infer_response: InferResponse, headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> InferResponse:
        # Example for custom response headers
        if response_headers is not None:
            response_headers.update(
                {"x-model-version": "1.0"}
            )
        return infer_response
```

You can find the complete code example [here](https://github.com/kserve/kserve/tree/release-<ActiveDocsVersion />/python/custom_transformer).

### Transformer Server Entrypoint

For a single model, create a transformer object and register it to the model server:

```python
if __name__ == "__main__":
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)  # Configure kserve and uvicorn logger
    model = ImageTransformer(args.model_name, predictor_host=args.predictor_host,
                             protocol=args.protocol)
    ModelServer().start(models=[model])
```

For multiple models, if they can share the same transformer, register the same transformer for different models. If each model requires its own transformation, use different transformers:

```python
if __name__ == "__main__":
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)  # Configure kserve and uvicorn logger
    for model_name in model_names:
        transformer = ImageTransformer(model_name, predictor_host=args.predictor_host)
        models.append(transformer)
    kserve.ModelServer().start(models=models)
```

### Configuring Logger for Serving Runtime

KServe allows users to override the default logger configuration of the serving runtime and uvicorn server. You can follow the [logger configuration documentation](../../frameworks/custom-predictor/custom-predictor.md#configuring-logger-for-custom-serving-runtime) to configure the logger.

### Build Transformer Docker Image

From the `kserve/python` directory, build the transformer docker image using the [Dockerfile](https://github.com/kserve/kserve/blob/release-<ActiveDocsVersion />/python/custom_transformer.Dockerfile):

```bash
cd python
docker build -t $DOCKER_USER/image-transformer:latest -f custom_transformer.Dockerfile .

docker push $DOCKER_USER/image-transformer:latest
```

## Deploy the InferenceService with REST Predictor

### Create the InferenceService

By default, `InferenceService` uses `TorchServe` to serve PyTorch models. Models can be loaded from a cloud storage model repository according to the `TorchServe` model repository layout. In this example, the model repository contains a MNIST model, but you can store multiple models there.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torch-transformer
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchserve/image_classifier/v1
  transformer:
    containers:
      - image: kserve/image-transformer:latest
        name: kserve-container
        command:
          - "python"
          - "-m"
          - "model"
        args:
          - --model_name
          - mnist
        resources:
          limits:
            cpu: 1
            memory: 2Gi
          requests:
            cpu: 100m
            memory: 512Mi
```

:::tip
`STORAGE_URI` is a built-in environment variable used to inject the storage initializer for custom containers, similar to the `storageUri` field for prepackaged predictors.
The downloaded artifacts are stored under `/mnt/models`.
:::

Apply the InferenceService YAML:

```bash
kubectl apply -f transformer.yaml
```

:::tip[Expected output]

```
inferenceservice.serving.kserve.io/torch-transformer created
```

:::

### Run a Prediction

First, download the request [input payload](./image.json).

Then, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT` according to your cluster configuration.

```bash
SERVICE_NAME=torch-transformer
MODEL_NAME=mnist
INPUT_PATH=@./image.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

:::tip[Expected output]

```
> POST /v1/models/mnist:predict HTTP/1.1
> Host: torch-transformer.default.example.com
> User-Agent: curl/7.73.0
> Accept: */*
> Content-Length: 401
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 401 out of 401 bytes
Handling connection for 8080
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 20
< content-type: application/json; charset=UTF-8
< date: Tue, 12 Jan 2021 09:52:30 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 83
<
* Connection #0 to host localhost left intact
{"predictions": [2]}
```

:::

## Deploy the InferenceService Calling Predictor with gRPC Protocol

Compared to REST, gRPC is faster due to the tight packing of the Protocol Buffer and the use of HTTP/2. In many cases, gRPC is a more efficient communication protocol between Transformer and Predictor, especially when transmitting large tensors between them.

### Create InferenceService

Create the `InferenceService` with the following YAML, which includes a Transformer and a Triton Predictor.
As KServe by default uses `TorchServe` serving runtime for PyTorch models, you need to override the
serving runtime to `kserve-tritonserver` for using the gRPC protocol.
The transformer calls out to the predictor with V2 gRPC Protocol by specifying the `--protocol` argument.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torch-grpc-transformer
spec:
  predictor:
    model:
      modelFormat: 
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchscript
      runtime: kserve-tritonserver
      runtimeVersion: 20.10-py3
      ports:
      - name: h2c
        protocol: TCP
        containerPort: 9000
  transformer:
    containers:
    - image: kserve/image-transformer:latest
      name: kserve-container
      command:
      - "python"
      - "-m"
      - "model"
      args:
      - --model_name
      - cifar10
      - --protocol
      - grpc-v2
      resources:
        limits:
          cpu: 1
          memory: 2Gi
        requests:
          cpu: 100m
          memory: 512Mi
```

Apply the InferenceService YAML:

```bash
kubectl apply -f grpc-transformer.yaml
```

:::tip[Expected output]

```
inferenceservice.serving.kserve.io/torch-grpc-transformer created
```

:::

### Run a Prediction

First, download the request [input payload](./image.json).

Then, determine the ingress IP and ports and set `INGRESS_HOST` and `INGRESS_PORT` according to your cluster configuration:

```bash
SERVICE_NAME=torch-grpc-transformer
MODEL_NAME=cifar10
INPUT_PATH=@./image.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

:::tip[Expected output]

```
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 8080 (#0)
> POST /v1/models/cifar10:predict HTTP/1.1
> Host: torch-transformer.default.example.com
> User-Agent: curl/7.64.1
> Accept: */*
> Content-Length: 3394
> Content-Type: application/x-www-form-urlencoded
> Expect: 100-continue
>
Handling connection for 8080
< HTTP/1.1 100 Continue
* We are completely uploaded and fine
< HTTP/1.1 200 OK
< content-length: 222
< content-type: application/json; charset=UTF-8
< date: Thu, 03 Feb 2022 01:50:07 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 73
<
* Connection #0 to host localhost left intact
{"predictions": [[-1.192867636680603, -0.35750141739845276, -2.3665435314178467, 3.9186441898345947, -2.0592284202575684, 4.091977119445801, 0.1266237050294876, -1.8284690380096436, 2.628898859024048, -4.255198001861572]]}* Closing connection 0
```

:::

## Performance Comparison Between gRPC and REST

From the following latency statistics of both transformer and predictor, you can see that the transformer-to-predictor call takes longer for REST than gRPC (92ms vs 55ms). REST takes more time serializing and deserializing the `3*32*32` shape tensor, while with gRPC it is transmitted as tightly packed `numpy array` serialized bytes.

REST latency:
```
# from REST v1 transformer log
2023-01-09 07:15:55.263 79476 root INFO [__call__():128] requestId: N.A., preprocess_ms: 6.083965302, explain_ms: 0, predict_ms: 92.653036118, postprocess_ms: 0.007867813
# from REST v1 predictor log
2023-01-09 07:16:02.581 79402 root INFO [__call__():128] requestId: N.A., preprocess_ms: 13.532876968, explain_ms: 0, predict_ms: 48.450231552, postprocess_ms: 0.006914139
```

gRPC latency:
```
# from REST v1 transformer log
2023-01-09 07:27:52.172 79715 root INFO [__call__():128] requestId: N.A., preprocess_ms: 2.567052841, explain_ms: 0, predict_ms: 55.0532341, postprocess_ms: 0.101804733
# from gPPC v2 predictor log
2023-01-09 07:27:52.171 79711 root INFO [__call__():128] requestId: , preprocess_ms: 0.067949295, explain_ms: 0, predict_ms: 51.237106323, postprocess_ms: 0.049114227
```

## Transformer-Specific Command Line Arguments

- `--predictor_protocol`: The protocol used to communicate with the predictor. The available values are "v1", "v2" and "grpc-v2". The default value is "v1".
- `--predictor_use_ssl`: Whether to use secure SSL when communicating with the predictor. The default value is "false".
- `--predictor_request_timeout_seconds`: The timeout seconds for the request sent to the predictor. The default value is 600 seconds.
- `--predictor_request_retries`: The number of retries for the request sent to the predictor. The default value is 0.
- `--enable_predictor_health_check`: The Transformer will perform readiness check for the predictor in addition to its health check. By default, it is disabled.
