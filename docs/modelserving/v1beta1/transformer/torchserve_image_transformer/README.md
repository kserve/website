# Deploy Transformer with InferenceService
Transformer is an `InferenceService` component which does pre/post processing alongside with model inference. It usually takes raw input and transforms them to the
input tensors model server expects. In this example we demonstrate an example of running inference with a custom image `Transformer` and  `Predictor` with REST and gRPC protocol.

## Create Custom Image Transformer

### Extend ModelServer and implement pre/post processing functions
`KServe.Model` base class mainly defines three handlers `preprocess`, `predict` and `postprocess`, these handlers are executed
in sequence where the output of the `preprocess` handler is passed to the `predict` handler as the input. When `predictor_host` is passed, the `predict` handler makes a call to the predictor
and gets back a response which is then passed to the `postprocess` handler. KServe automatically fills in the `predictor_host` for `Transformer` and hands over the call to the `Predictor`.
By default transformer makes a REST call to predictor, to make a gRPC call to predictor, you can pass the `--protocol` argument with value `grpc-v2`.

To implement a `Transformer` you can derive from the base `Model` class and then overwrite the `preprocess` and `postprocess` handler to have your own customized transformation logic.

```python
import kserve
from typing import Dict
from PIL import Image
import torchvision.transforms as transforms
import logging
import io
import base64

logging.basicConfig(level=kserve.constants.KSERVE_LOGLEVEL)

def image_transform(instance):
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
    byte_array = base64.b64decode(instance["data"])
    image = Image.open(io.BytesIO(byte_array))
    instance["data"] = image_processing(image).tolist()
    logging.info(instance)
    return instance

# for REST predictor the preprocess handler converts to input dict to the v1 REST protocol dict
class ImageTransformer(kserve.Model):
    def __init__(self, name: str, predictor_host: str):
        super().__init__(name)
        self.predictor_host = predictor_host

    def preprocess(self, inputs: Dict) -> Dict:
        return {'instances': [image_transform(instance) for instance in inputs['instances']]}

    def postprocess(self, inputs: Dict) -> Dict:
        return inputs

# for gRPC predictor the preprocess handler converts the input dict to the v2 gRPC protocol ModelInferRequest
class ImageTransformer(kserve.Model):
    def __init__(self, name: str, predictor_host: str, protocol: str):
        super().__init__(name)
        self.predictor_host = predictor_host
        self.protocol = protocol

    def preprocess(self, request: Dict) -> ModelInferRequest:
        input_tensors = [image_transform(instance) for instance in request["instances"]]
        input_tensors = numpy.asarray(input_tensors)
        request = ModelInferRequest()
        request.model_name = self.name
        input_0 = InferInput("INPUT__0", input_tensors.shape, "FP32")
        input_0.set_data_from_numpy(input_tensors)
        request.inputs.extend([input_0._get_tensor()])
        if input_0._get_content() is not None:
            request.raw_input_contents.extend([input_0._get_content()])
        return request

    def postprocess(self, infer_response: ModelInferResponse) -> Dict:
        response = InferResult(infer_response)
        return {"predictions": response.as_numpy("OUTPUT__0").tolist()}
```

Please see the code example [here](https://github.com/kserve/kserve/tree/release-0.9/python/custom_transformer).

### Transformer Server Entrypoint
For single model you just create a transformer object and register that to the model server.
```python
if __name__ == "__main__":
    model = ImageTransformer(args.model_name, predictor_host=args.predictor_host,
                             protocol=args.protocol)
    ModelServer().start(models=[model])
```

For multi-model case if all the models can share the same transformer you can register the same transformer for different models,
or different transformers if each model requires its own transformation.
```python
if __name__ == "__main__":
    for model_name in model_names:
        transformer = ImageTransformer(model_name, predictor_host=args.predictor_host)
        models.append(transformer)
    kserve.ModelServer().start(models=models)
```

### Build Transformer docker image

```bash
docker build -t {username}/image-transformer:latest -f transformer.Dockerfile .

docker push {username}/image-transformer:latest
```

## Deploy the InferenceService with REST Predictor

### Create the InferenceService
Please use the [YAML file](./transformer.yaml) to create the `InferenceService`, which includes a Transformer and a PyTorch Predictor.

By default `InferenceService` uses `TorchServe` to serve the PyTorch models and the models are loaded from a model repository in KServe example gcs bucket according to `TorchServe` model repository layout.
The model repository contains a MNIST model but you can store more than one model there.
=== "Old Schema"
    ```yaml
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: torch-transformer
    spec:
      predictor:
        pytorch:
          storageUri: gs://kfserving-examples/models/torchserve/image_classifier
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
          storageUri: gs://kfserving-examples/models/torchserve/image_classifier
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



Apply the InferenceService
```
kubectl apply -f transformer.yaml
```

Expected Output
```
$ inferenceservice.serving.kserve.io/torchserve-transformer created
```

### Run a prediction
First, download the request [input payload](./input.json).

Then, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```
SERVICE_NAME=torch-transformer
MODEL_NAME=mnist
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

==** Expected Output **==
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

## Deploy the InferenceService calling Predictor with gRPC protocol

### Create InferenceService
Create the `InferenceService` with following yaml which includes a Transformer and a Triton Predictor, the transformer calls out to
predictor with V2 gRPC Protocol.

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

Apply the InferenceService
```
kubectl apply -f grpc_transformer.yaml
```

Expected Output
```
$ inferenceservice.serving.kserve.io/torch-grpc-transformer created
```

### Run a prediction
First, download the request [input payload](./image.json).

Then, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```
SERVICE_NAME=torch-grpc-transformer
MODEL_NAME=cifar10
INPUT_PATH=@./image.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

==** Expected Output **==
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
