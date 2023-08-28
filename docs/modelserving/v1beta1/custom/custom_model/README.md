# Deploy Custom Python Serving Runtime with InferenceService
When the out-of-the-box `Serving Runtime` does not fit your need, you can choose to build your own model server using `KServe ModelServer API`
to deploy as `Custom Serving Runtime` on KServe.

## Setup
1. Install [pack CLI](https://buildpacks.io/docs/tools/pack/) to build your custom model server image.

## Create and Deploy Custom REST ServingRuntime
### Implement Custom Model using KServe API
`KServe.Model` base class mainly defines three handlers `preprocess`, `predict` and `postprocess`, these handlers are executed
in sequence, the output of the `preprocess` is passed to `predict` as the input, the `predictor` handler executes the
inference for your model, the `postprocess` handler then turns the raw prediction result into user-friendly inference response. There
is an additional `load` handler which is used for writing custom code to load your model into the memory from local file system or
remote model storage, a general good practice is to call the `load` handler in the model server class `__init__` function, so your model
is loaded on startup and ready to serve prediction requests.

```python
import argparse

from torchvision import models
from typing import Dict, Union
import torch
import numpy as np
from kserve import Model, ModelServer

class AlexNetModel(Model):
    def __init__(self, name: str):
       super().__init__(name)
       self.name = name
       self.load()

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        self.ready = True

    def predict(self, payload: Dict, headers: Dict[str, str] = None) -> Dict:
        img_data = payload["instances"][0]["image"]["b64"]
        raw_img_data = base64.b64decode(img_data)
        input_image = Image.open(io.BytesIO(raw_img_data))
        preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        input_tensor = preprocess(input_image).unsqueeze(0)
        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.flatten().tolist()
        response_id = generate_uuid()
        return {"predictions": result}

if __name__ == "__main__":
    model = AlexNetModel("custom-model")
    ModelServer().start([model])
```

### Build Custom Serving Image with BuildPacks
[Buildpacks](https://buildpacks.io/) allows you to transform your inference code into images that can be deployed on KServe without
needing to define the `Dockerfile`. Buildpacks automatically determines the python application and then install the dependencies from the
`requirements.txt` file, it looks at the `Procfile` to determine how to start the model server. Here we are showing how to build the serving
image manually with `pack`, you can also choose to use [kpack](https://github.com/pivotal/kpack)
to run the image build on the cloud and continuously build/deploy new versions from your source git repository.

You can use pack cli to build and push the custom model server image
```bash
pack build --builder=heroku/buildpacks:20 ${DOCKER_USER}/custom-model:v1
docker push ${DOCKER_USER}/custom-model:v1
```

Note: If your buildpack command fails, make sure you have a `runtimes.txt` file with the correct python version specified. See the [custom model server runtime.txt](https://github.com/kserve/kserve/blob/master/python/custom_model/runtime.txt) file as an example.

### Deploy Locally and Test
Launch the docker image built from last step with `buildpack`.
```bash
docker run -ePORT=8080 -p8080:8080 ${DOCKER_USER}/custom-model:v1
```

Send a test inference request locally with [input.json](./input.json)
```bash
curl localhost:8080/v1/models/custom-model:predict -d @./input.json
```
!!! success "Expected Output"
    ```{ .json .no-copy }
    {"predictions": [[14.861763000488281, 13.94291877746582, 13.924378395080566, 12.182709693908691, 12.00634765625]]}
    ```

### Deploy the REST Custom Serving Runtime on KServe

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: custom-model
spec:
  predictor:
    containers:
      - name: kserve-container
        image: ${DOCKER_USER}/custom-model:v1
```
In the `custom.yaml` file edit the container image and replace ${DOCKER_USER} with your Docker Hub username.

#### Arguments
You can supply additional command arguments on the container spec to configure the model server.

- `--workers`: Spawn the specified number of `uvicorn` workers(multi-processing) of the model server, the default value is 1, this option is often used
  to help increase the resource utilization of the container.
- `--http_port`: The http port model server is listening on, the default REST port is 8080.
- `--model_name`: The model name deployed in the model server, the default name the same as the service name.
- `--max_asyncio_workers`: Max number of workers to spawn for python async io loop, by default it is `min(32,cpu.limit + 4)`.
- `--enable_latency_logging`: Whether to log latency metrics per request, the default is True.
- `--configure_logging`: Whether to configure KServe and Uvicorn logging, the default is True.
In this case you may want to set the KServe `ModelServer`'s `log_config` parameter to pass a dictionary containing all the logging directives and configurations (see [the Python upstream docs](https://docs.python.org/3/library/logging.config.html#dictionary-schema-details) for more info). The alternative is to use the `--log_config_file` argument described below.
- `--log_config_file`: The path of the Python config file configuration to use (either a json or a yaml file). This file allows to override the default Uvicorn configuration shipped with KServe. The default is None.
- `--access_log_format`: A string representing the access log format configuration to use. The functionality is provided by the `asgi-logger` library and it allows to override only the `uvicorn.access`'s format configuration with a richer set of fields (output hardcoded to `stdout`). This limitation is currently due to the ASGI specs that don't describe how access logging should be implemented in detail (please refer to this Uvicorn [github issue](https://github.com/encode/uvicorn/issues/527) for more info). By default is None.

#### Environment Variables

You can supply additional environment variables on the container spec.

- `STORAGE_URI`: load a model from a storage system supported by KServe e.g. `pvc://` `s3://`. This acts the same as `storageUri` when using a built-in predictor.
  The data will be available at `/mnt/models` in the container. For example, the following `STORAGE_URI: "pvc://my_model/model.onnx"` will be accessible at `/mnt/models/model.onnx`
- `PROTOCOL`: specify the protocol version supported by the model e.g `V1`. This acts the same as `protocolVersion` when using a built-in predictor.
- `KSERVE_LOGLEVEL`: sets the `kserve` and `kserve_trace`'s logger verbosity. Default is `INFO`.

Apply the yaml to deploy the InferenceService on KServe

=== "kubectl"
```
kubectl apply -f custom.yaml
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/custom-model created
    ```

### Run a Prediction
The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
MODEL_NAME=custom-model
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${MODEL_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d $INPUT_PATH
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    *   Trying 169.47.250.204...
    * TCP_NODELAY set
    * Connected to 169.47.250.204 (169.47.250.204) port 80 (#0)
    > POST /v1/models/custom-model:predict HTTP/1.1
    > Host: custom-model.default.example.com
    > User-Agent: curl/7.64.1
    > Accept: */*
    > Content-Length: 105339
    > Content-Type: application/x-www-form-urlencoded
    > Expect: 100-continue
    >
    < HTTP/1.1 100 Continue
    * We are completely uploaded and fine
    < HTTP/1.1 200 OK
    < content-length: 232
    < content-type: text/html; charset=UTF-8
    < date: Wed, 26 Feb 2020 15:19:15 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 213
    <
    * Connection #0 to host 169.47.250.204 left intact
    {"predictions": [[14.861762046813965, 13.942917823791504, 13.9243803024292, 12.182711601257324, 12.00634765625]]}
    ```

### Delete the InferenceService
```bash
kubectl delete -f custom.yaml
```


## Create and Deploy Custom gRPC ServingRuntime
KServe gRPC ServingRuntimes enables high performance inference data plane which implements the `Open(v2) Inference Protocol`:

- gRPC is built on top of HTTP/2 for addressing the
  shortcomings of [head-of-line-blocking](https://en.wikipedia.org/wiki/Head-of-line_blocking) and [pipelining](https://en.wikipedia.org/wiki/HTTP_pipelining),
- gRPC transports binary data format with [Protobuf](https://github.com/protocolbuffers/protobuf) which is efficient to send over the wire.

Compared to REST it has limited support for browser and the message is not human-readable which requires additional debugging tools.

### Implement Custom Model using KServe API
For `Open(v2) Inference Protocol`, KServe provides `InferRequest` and `InferResponse` API object for `predict`, `preprocess`, `postprocess`
handlers to abstract away the implementation details of REST/gRPC decoding and encoding over the wire.

```python title="model_grpc.py"
import io
from typing import Dict

import torch
from kserve import InferRequest, InferResponse, InferOutput, Model, ModelServer
from kserve.utils.utils import generate_uuid
from PIL import Image
from torchvision import models, transforms


# This custom predictor example implements the custom model following KServe v2 inference gPPC protocol,
# the input can be raw image bytes or image tensor which is pre-processed by transformer
# and then passed to predictor, the output is the prediction response.
class AlexNetModel(Model):
    def __init__(self, name: str):
        super().__init__(name)
        self.name = name
        self.load()
        self.model = None
        self.ready = False

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        self.ready = True

    def predict(self, payload: InferRequest, headers: Dict[str, str] = None) -> InferResponse:
        req = payload.inputs[0]
        input_image = Image.open(io.BytesIO(req.data[0]))
        preprocess = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                     std=[0.229, 0.224, 0.225]),
            ])

        input_tensor = preprocess(input_image)
        input_tensor = input_tensor.unsqueeze(0)
        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.flatten().tolist()
        response_id = generate_uuid()
        infer_output = InferOutput(name="output-0", shape=list(values.shape), datatype="FP32", data=result)
        infer_response = InferResponse(model_name=self.name, infer_outputs=[infer_output], response_id=response_id)
        return infer_response


if __name__ == "__main__":
    model = AlexNetModel("custom-model")
    model.load()
    ModelServer().start([model])
```

### Build Custom Serving Image with BuildPacks
Similar to building the REST custom image, you can also use pack cli to build and push the custom gRPC model server image
```bash
pack build --builder=heroku/buildpacks:20 ${DOCKER_USER}/custom-model-grpc:v1
docker push ${DOCKER_USER}/custom-model-grpc:v1
```

Note: If your buildpack command fails, make sure you have a `runtimes.txt` file with the correct python version specified. See the [custom model server runtime.txt](https://github.com/kserve/kserve/blob/master/python/custom_model/runtime.txt) file as an example.

### Deploy Locally and Test
Launch the docker image built from last step with `buildpack`.
```bash
docker run -ePORT=8081 -p8081:8081 ${DOCKER_USER}/custom-model-grpc:v1
```

Send a test inference request locally using `InferenceServerClient` [grpc_test_client.py](./grpc_test_client.py)
```python
from kserve import InferRequest, InferInput, InferenceServerClient
import json
import base64
import os

client = InferenceServerClient(url=os.environ.get("INGRESS_HOST", "localhost")+":"+os.environ.get("INGRESS_PORT", "8081"),
                               channel_args=(('grpc.ssl_target_name_override', os.environ.get("SERVICE_HOSTNAME", "")),))
json_file = open("./input.json")
data = json.load(json_file)
infer_input = InferInput(name="input-0", shape=[1], datatype="BYTES", data=[base64.b64decode(data["instances"][0]["image"]["b64"])])
request = InferRequest(infer_inputs=[infer_input], model_name="custom-model")
res = client.infer(infer_request=request)
print(res)
```

```bash
python grpc_test_client.py
```

!!! success "Expected Output"
    ```{ .json .no-copy }
    id: "df27b8a5-f13e-4c7a-af61-20bdb55b6523"
    outputs {
      name: "output-0"
      datatype: "FP32"
      shape: 1
      shape: 5
      contents {
        fp32_contents: 14.9756203
        fp32_contents: 14.036808
        fp32_contents: 13.9660349
        fp32_contents: 12.2522783
        fp32_contents: 12.0862684
      }
    }

    model_name: "custom-model"
    id: "df27b8a5-f13e-4c7a-af61-20bdb55b6523"
    outputs {
      name: "output-0"
      datatype: "FP32"
      shape: 1
      shape: 5
      contents {
        fp32_contents: 14.9756203
        fp32_contents: 14.036808
        fp32_contents: 13.9660349
        fp32_contents: 12.2522783
        fp32_contents: 12.0862684
      }
    }
    ```

### Deploy the gRPC Custom Serving Runtime on KServe
Create the InferenceService yaml and expose the gRPC port by specifying on `ports` section, currently only one port is allowed to expose and by default HTTP port is exposed.
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: custom-model-grpc
spec:
  predictor:
    containers:
      - name: kserve-container
        image: ${DOCKER_USER}/custom-model-grpc:v1
        ports:
          - name: h2c
            containerPort: 8081
            protocol: TCP
```
In the `custom_grpc.yaml` file edit the container image and replace ${DOCKER_USER} with your Docker Hub username.

#### Arguments
You can supply additional command arguments on the container spec to configure the model server.

- `--grpc_port`: the http port model server is listening on, the default gRPC port is 8081.
- `--model_name`: the model name deployed in the model server, the default name the same as the service name.
- `enable_latency_logging`: whether to log latency metrics per request, the default is True.

Apply the yaml to deploy the InferenceService on KServe

=== "kubectl"
```bash
kubectl apply -f custom_grpc.yaml
```

!!! successs "Expected Output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/custom-model-grpc created
    ```

### Run a gRPC Prediction
The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
MODEL_NAME=custom-model
SERVICE_HOSTNAME=$(kubectl get inferenceservice custom-model-grpc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Send an inference request to the gRPC service using `InferenceServerClient` [grpc_test_client.py](./grpc_test_client.py).

```bash
python grpc_test_client.py
```

!!! success "Expected Output"
    ```{ .json .no-copy }
    id: "df27b8a5-f13e-4c7a-af61-20bdb55b6523"
    outputs {
      name: "output-0"
      datatype: "FP32"
      shape: 1
      shape: 5
      contents {
        fp32_contents: 14.9756203
        fp32_contents: 14.036808
        fp32_contents: 13.9660349
        fp32_contents: 12.2522783
        fp32_contents: 12.0862684
      }
    }

    model_name: "custom-model"
    id: "df27b8a5-f13e-4c7a-af61-20bdb55b6523"
    outputs {
      name: "output-0"
      datatype: "FP32"
      shape: 1
      shape: 5
      contents {
        fp32_contents: 14.9756203
        fp32_contents: 14.036808
        fp32_contents: 13.9660349
        fp32_contents: 12.2522783
        fp32_contents: 12.0862684
      }
    }
    ```

## Parallel Model Inference
By default, the models are loaded in the same process and inference is executed in the same process as the HTTP or gRPC server, if you are hosting multiple models
the inference can only be run for one model at a time which limits the concurrency when you share the container for the models.
KServe integrates [RayServe](https://docs.ray.io/en/master/serve/index.html) which provides a programmable API to deploy models
as separate python workers so the inference can be performed in parallel when serving multiple custom models.

```python
import kserve
from typing import Dict
from ray import serve

@serve.deployment(name="custom-model", num_replicas=2)
class AlexNetModel(kserve.Model):
    def __init__(self):
       self.name = "custom-model"
       super().__init__(self.name)
       self.load()

    def load(self):
        ...

    def predict(self, request: Dict) -> Dict:
        ...

if __name__ == "__main__":
    kserve.ModelServer().start({"custom-model": AlexNetModel})
```
fractional gpu example
```python
@serve.deployment(name="custom-model", num_replicas=2, ray_actor_options={"num_cpus":1, "num_gpus": 0.5})
class AlexNetModel(kserve.Model):
    def __init__(self):
       self.name = "custom-model"
       super().__init__(self.name)
       self.load()

    def load(self):
        ...

    def predict(self, request: Dict) -> Dict:
        ...

if __name__ == "__main__":
    ray.init(num_cpus=2, num_gpus=1)
    kserve.ModelServer().start({"custom-model": AlexNetModel})
```
The more details for ray fractional cpu and gpu can be found [here](https://docs.ray.io/en/latest/serve/scaling-and-resource-allocation.html#fractional-cpus-and-fractional-gpus).

The full code example can be found [here](https://github.com/kserve/kserve/blob/release-0.11/python/custom_model/model_remote.py).

Modify the `Procfile` to `web: python -m model_remote` and then run the above `pack` command, it builds the serving image which launches
each model as separate python worker and web server routes to the model workers by name.

![parallel_inference](./parallel_inference.png)
