# Deploy Custom Python Serving Runtime with InferenceService
When the out-of-the-box `Serving Runtime` does not fit your need, you can choose to build your own model server using `KServe ModelServer API` 
to deploy as `Custom Serving Runtime` on KServe.

## Setup
1. Install [pack CLI](https://buildpacks.io/docs/tools/pack/) to build your custom model server image.

## Create Custom REST Model Serving Runtime
`KServe.Model` base class mainly defines three handlers `preprocess`, `predict` and `postprocess`, these handlers are executed
in sequence, the output of the `preprocess` is passed to `predict` as the input, the `predictor` handler should execute the
inference for your model, the `postprocess` handler then turns the raw prediction result into user-friendly inference response. There
is an additional `load` handler which is used for writing custom code to load your model into the memory from local file system or
remote model storage, a general good practice is to call the `load` handler in the model server class `__init__` function, so your model
is loaded on startup and ready to serve when user is making the prediction calls.

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
        np_array = np.asarray(payload["instances"][0]["data"])
        input_tensor = torch.Tensor(np_array).unsqueeze(0)
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
The full code example can be found [here](https://github.com/kserve/kserve/tree/master/python/custom_model/model.py).

### Build the custom image with Buildpacks
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

Send a test inference request locally
```bash
curl localhost:8080/v1/models/custom-model:predict -d @./input.json

{"predictions": [[14.861763000488281, 13.94291877746582, 13.924378395080566, 12.182709693908691, 12.00634765625]]}
```

### Deploy the REST Custom Predictor on KServe

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

### Arguments
You can supply additional command arguments on the container spec to configure the model server.

- `--workers`: Spawn the specified number of `uvicorn` workers(multi-processing) of the model server, the default value is 1, this option is often used
  to help increase the resource utilization of the container.
- `--http_port`: the http port model server is listening on, the default REST port is 8080.
- `--max_asyncio_workers`: Max number of workers to spawn for python async io loop, by default it is `min(32,cpu.limit + 4)`.
- `enable_latency_logging`: whether to log latency metrics per request, the default is False.

### Environment Variables

You can supply additional environment variables on the container spec.

- `STORAGE_URI`: load a model from a storage system supported by KServe e.g. `pvc://` `s3://`. This acts the same as `storageUri` when using a built-in predictor.
  The data will be available at `/mnt/models` in the container. For example, the following `STORAGE_URI: "pvc://my_model/model.onnx"` will be accessible at `/mnt/models/model.onnx`

Apply the yaml to deploy the InferenceService on KServe

!!! "kubectl"
```
kubectl apply -f custom.yaml
```

==** Expected Output **==
```
$ inferenceservice.serving.kserve.io/custom-model created
```

### Run a Prediction
The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```
MODEL_NAME=custom-model
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${MODEL_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d $INPUT_PATH
```

==** Expected Output **==
```
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
```
kubectl delete -f custom.yaml
```
## Create Custom gRPC Model Serving Runtime
```python
import argparse

from torchvision import models
from typing import Dict, Union
import torch
import numpy as np
from kserve import Model, ModelServer, InferRequest, InferResponse

class AlexNetModel(Model):
    def __init__(self, name: str):
       super().__init__(name)
       self.name = name
       self.load()

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        self.ready = True

    def predict(self, payload: InferRequest, headers: Dict[str, str] = None) -> InferResponse:
        np_array = payload.inputs[0].as_numpy()
        input_tensor = torch.Tensor(np_array)
        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.flatten().tolist()
        id = generate_uuid()
        response = {
            "id": id,
            "model_name": "custom-model",
            "outputs": [
                {
                    "contents": {
                        "fp32_contents": result,
                    },
                    "datatype": "FP32",
                    "name": "output-0",
                    "shape": list(values.shape)
                }
            ]}
        return response

if __name__ == "__main__":
    model = AlexNetModel("custom-model")
    ModelServer().start([model])
```


## Parallel Model Inference
By default the models are loaded in the same process and inference is executed in the same process as the HTTP or gRPC server, if you are hosting multiple models
the inference can only be run for one model at a time which limits the concurrency when you share the container for the models.
KServe integrates [RayServe](https://docs.ray.io/en/master/serve/index.html) which provides a programmable API to deploy models
as separate python workers so the inference can be performed in parallel.

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

The full code example can be found [here](https://github.com/kserve/kserve/tree/master/python/custom_model/model_remote.py).

Modify the `Procfile` to `web: python -m model_remote` and then run the above `pack` command, it builds the serving image which launches
each model as separate python worker and webserver routes to the model workers by name.

![parallel_inference](./parallel_inference.png)

