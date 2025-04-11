# Deploy Transformer with InferenceService
Transformer is an `InferenceService` component which does pre/post processing alongside with model inference. It usually takes raw input and transforms them to the
input tensors model server expects. In this example we demonstrate an example of running inference with a custom `Transformer` communicating by REST and gRPC protocol.

## Create Custom Image Transformer

### Implement pre/post processing with KServe Model API
`KServe.Model` base class mainly defines three handlers `preprocess`, `predict` and `postprocess`, these handlers are executed
in sequence where the output of the `preprocess` handler is passed to the `predict` handler as the input. When `predictor_host` is passed, the `predict` handler makes a call to the predictor
and gets back a response which is then passed to the `postprocess` handler. KServe automatically fills in the `predictor_host` for `Transformer` and hands over the call to the `Predictor`.
By default transformer makes a REST call to predictor, to make a gRPC call to predictor, you can pass the `--protocol` argument with value `grpc-v2`.

To implement a `Transformer` you can derive from the base `Model` class and then overwrite the `preprocess` and `postprocess` handler to have your own customized transformation logic.
For `Open(v2) Inference Protocol`, KServe provides `InferRequest` and `InferResponse` API object for `predict`, `preprocess`, `postprocess`
handlers to abstract away the implementation details of REST/gRPC decoding and encoding over the wire.
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


def image_transform(byte_array):
    """converts the input image of Bytes Array into Tensor
    Args:
        instance (dict): The request input for image bytes.
    Returns:
        list: Returns converted tensor as input for predict handler with v1/v2 inference protocol.
    """
    image_processing = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    image = Image.open(io.BytesIO(byte_array))
    tensor = image_processing(image).numpy()
    return tensor

# for v1 REST predictor the preprocess handler converts to input image bytes to float tensor dict in v1 inference REST protocol format
class ImageTransformer(kserve.Model):
    def __init__(self, name: str, predictor_host: str, headers: Dict[str, str] = None):
        super().__init__(name)
        self.predictor_host = predictor_host
        self.ready = True

    def preprocess(self, inputs: Dict, headers: Dict[str, str] = None) -> Dict:
        return {'instances': [image_transform(instance) for instance in inputs['instances']]}

    def postprocess(self, inputs: Dict, headers: Dict[str, str] = None) -> Dict:
        return inputs

# for v2 gRPC predictor the preprocess handler converts the input image bytes tensor to float tensor in v2 inference protocol format
class ImageTransformer(kserve.Model):
    def __init__(self, name: str, predictor_host: str, protocol: str, headers: Dict[str, str] = None):
        super().__init__(name)
        self.predictor_host = predictor_host
        self.protocol = protocol
        self.ready = True

    def preprocess(self, request: InferRequest, headers: Dict[str, str] = None) -> InferRequest:
        input_tensors = [image_transform(instance) for instance in request.inputs[0].data]
        input_tensors = np.asarray(input_tensors)
        infer_inputs = [InferInput(name="INPUT__0", datatype='FP32', shape=list(input_tensors.shape),
                                   data=input_tensors)]
        infer_request = InferRequest(model_name=self.model_name, infer_inputs=infer_inputs)
        return infer_request
```

Please see the code example [here](https://github.com/kserve/kserve/tree/release-0.14/python/custom_transformer).

### Transformer Server Entrypoint
For single model you just create a transformer object and register that to the model server.
```python
if __name__ == "__main__":
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)  # Configure kserve and uvicorn logger
    model = ImageTransformer(args.model_name, predictor_host=args.predictor_host,
                             protocol=args.protocol)
    ModelServer().start(models=[model])
```

For multi-model case if all the models can share the same transformer you can register the same transformer for different models,
or different transformers if each model requires its own transformation.
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
Kserve allows users to override the default logger configuration of serving runtime and uvicorn server.
You can follow the [logger configuration documentation](../../custom/custom_model/README.md#configuring-logger-for-serving-runtime) to configure the logger.

### Build Transformer docker image
Under `kserve/python` directory, build the transformer docker image using [Dockerfile](https://github.com/kserve/kserve/blob/release-0.14/python/custom_transformer.Dockerfile)
```bash
cd python
docker build -t $DOCKER_USER/image-transformer:latest -f custom_transformer.Dockerfile .

docker push {username}/image-transformer:latest
```

## Deploy the InferenceService with REST Predictor

### Create the InferenceService
By default `InferenceService` uses `TorchServe` to serve the PyTorch models and the models can be loaded from a model repository in cloud storage according to `TorchServe` model repository layout.
In this example, the model repository contains a MNIST model, but you can store more than one model there.

=== "New Schema"

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
    ```

=== "Old Schema"

    ```yaml
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: torch-transformer
    spec:
      predictor:
        pytorch:
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
    ```

!!! note
    `STORAGE_URI` is a build-in environment variable used to inject the storage initializer for custom container just like `StorageURI` field for prepackaged predictors.
The downloaded artifacts are stored under `/mnt/models`.



Apply the InferenceService [transformer-new.yaml](transformer-new.yaml)
```bash
kubectl apply -f transformer-new.yaml
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/torch-transformer created
    ```

### Run a prediction
First, download the request [input payload](./input.json).

Then, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
SERVICE_NAME=torch-transformer
MODEL_NAME=mnist
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
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

## Deploy the InferenceService calling Predictor with gRPC protocol
Comparing with REST, gRPC is faster due to the tight packing of the Protocol Buffer and the use of HTTP/2 by gRPC.
In many cases, gRPC can be more efficient communication protocol between Transformer and Predictor as you may need to
transmit large tensors between them.

### Create InferenceService
Create the `InferenceService` with following yaml which includes a Transformer and a Triton Predictor.
As KServe by default uses `TorchServe` serving runtime for PyTorch model, here you need to override the
serving runtime to `kserve-tritonserver` for using the gRPC protocol.
The transformer calls out to predictor with V2 gRPC Protocol by specifying the `--protocol` argument.

=== "New Schema"

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
    ```

=== "Old Schema"

    ```yaml
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
    name: torch-grpc-transformer
    spec:
      predictor:
        triton:
          storageUri: gs://kfserving-examples/models/torchscript
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
    ```

Apply the InferenceService [grpc_transformer.yaml](./grpc_transformer.yaml)
```bash
kubectl apply -f grpc_transformer.yaml
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/torch-grpc-transformer created
    ```

### Run a prediction
First, download the request [input payload](./image.json).

Then, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
SERVICE_NAME=torch-grpc-transformer
MODEL_NAME=cifar10
INPUT_PATH=@./image.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
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

## Performance Comparison between gRPC and REST
From the following latency stats of both transformer and predictor you can see that the transformer to predictor call takes longer time(92ms vs 55ms) for REST than gRPC, REST takes more
time serializing and deserializing `3*32*32` shape tensor and with gRPC it is transmitted as tightly packed `numpy array` serialized bytes.

```bash
# from REST v1 transformer log
2023-01-09 07:15:55.263 79476 root INFO [__call__():128] requestId: N.A., preprocess_ms: 6.083965302, explain_ms: 0, predict_ms: 92.653036118, postprocess_ms: 0.007867813
# from REST v1 predictor log
2023-01-09 07:16:02.581 79402 root INFO [__call__():128] requestId: N.A., preprocess_ms: 13.532876968, explain_ms: 0, predict_ms: 48.450231552, postprocess_ms: 0.006914139
```

```bash
# from REST v1 transformer log
2023-01-09 07:27:52.172 79715 root INFO [__call__():128] requestId: N.A., preprocess_ms: 2.567052841, explain_ms: 0, predict_ms: 55.0532341, postprocess_ms: 0.101804733
# from gPPC v2 predictor log
2023-01-09 07:27:52.171 79711 root INFO [__call__():128] requestId: , preprocess_ms: 0.067949295, explain_ms: 0, predict_ms: 51.237106323, postprocess_ms: 0.049114227
```

## Transformer Specific Commandline Arguments
- `--predictor_protocol`: The protocol used to communicate with the predictor. The available values are "v1", "v2" and "grpc-v2". The default value is "v1".
- `--predictor_use_ssl`: Whether to use secure SSL when communicating with the predictor. The default value is "false".
- `--predictor_request_timeout_seconds`: The timeout seconds for the request sent to the predictor. The default value is 600 seconds.
- `--predictor_request_retries`: The number of retries for the request sent to the predictor. The default value is 0.
- `--enable_predictor_health_check`: The Transformer will perform readiness check for the predictor in addition to its health check. By default, it is disabled.
