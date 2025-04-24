# Deploy Ensemble Learning with InferenceGraph
The tutorial demonstrate how to deploy Ensemble Learning model using `InferenceGraph`. The case should be that the classifiers are heavy or something else and you can't make them in one custom_model.

## Deploy the individual InferenceServices

### Build InferenceServices
We focus on how ensemble node gather classifiers outputs and give an example of how to extract them with python code. Therefore we skip classifier part and just use [dummy classifier 1, and 2](DummyClassifier1.py) to return fixed result for demonstartion.

#### Ensemble Node outputs
If `name` in `steps` is set, ensemble node will use it as key for its correspond `InferenceService` output. Otherwise, it use index of `InferenceService` in `steps` instead.

For example, Ensemble node deployed as following
```yaml
      routerType: Ensemble
      steps:
        - serviceName: classifier-1
          name: classifier-1
        - serviceName: classifier-2
```
will result in similar result like this.
```jsonld
{"1":{"predictions":[0.6,0.4]},"classifier-1":{"predictions":[0.8,0.2]}}
```
#### Vote
In this tutorial, we use following [python code](AvgVote.py) to build image for average vote.
```python
import argparse
from typing import Dict, Union
import numpy as np
from kserve import (
    Model,
    ModelServer,
    model_server,
    InferRequest,
    InferOutput,
    InferResponse,
    logging,
)
from kserve.utils.utils import get_predict_response

class AvgVote(Model):
    def __init__(self, name: str):
       super().__init__(name)
       self.model = None
       self.ready = False
       self.load()

    def load(self):
        self.ready = True

    def predict(self, payload: Union[Dict, InferRequest], headers: Dict[str, str] = None) -> Union[Dict, InferResponse]:
        tmp = []
        for isvcName, output in payload.items():
          prediction = output['predictions']
          tmp.append(prediction)

        result = [sum(x)/len(tmp) for x in zip(*tmp)] # assume same number of label
        return get_predict_response(payload, result, self.name)

parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    if args.configure_logging:
       logging.configure_logging(args.log_config_file)

    model = AvgVote(args.model_name)
    ModelServer().start([model])
```

#### Build Image
We are skipping this part for now. Take a look at [custom_model buildpacks](../../v1beta1/custom/custom_model/#build-custom-serving-image-with-buildpacks), or use else tools that help you build image.

### Deploy InferenceServices
```bash
kubectl apply -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: avg-vote
spec:
  predictor:
    containers:
      - name: avg-vote
        image: {avg-vote-image}
        args:
          - --model_name=avg-vote
---
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: classifier-1
spec:
  predictor:
    containers:
      - name: classifier-1
        image: {classifier-1-image}
        args:
          - --model_name=classifier-1
---
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: classifier-2
spec:
  predictor:
    containers:
      - name: classifier-2
        image: {classifier-2-image}
        args:
          - --model_name=classifier-2
EOF
```
All InferenceSerivces should be ready.
```bash
kubectl get isvc
NAME           URL                                       READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION            AGE
avg-vote       http://avg-vote.default.example.com       True           100                              avg-vote-predictor-00001       
classifier-1   http://classifier-1.default.example.com   True           100                              classifier-1-predictor-00001   
classifier-2   http://classifier-2.default.example.com   True           100                              classifier-2-predictor-00001   
```


## Deploy InferenceGraph

```bash
kubectl apply -f - <<EOF
apiVersion: "serving.kserve.io/v1alpha1"
kind: "InferenceGraph"
metadata:
  name: "ensemble-2-avg-vote"
spec:
  nodes:
    root:
      routerType: Sequence
      steps:
        - nodeName: ensemble-2
          name: ensemble-2
        - serviceName: avg-vote
          name: avg-vote
          data: $response
    ensemble-2:
      routerType: Ensemble
      steps:
        - serviceName: classifier-1
          name: classifier-1
        - serviceName: classifier-2
          name: classifier-2
EOF
```

## Test the InferenceGraph
First, check the `InferenceGraph` ready state
```bash
kubectl get ig ensemble-2-avg-vote                 
NAME                  URL                                              READY   AGE
ensemble-2-avg-vote   http://ensemble-2-avg-vote.default.example.com   True    
```
Second, [determine the ingress IP and ports](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`. Now, can test by sending [data](input.json).

```bash
SERVICE_HOSTNAME=$(kubectl get ig ensemble-2-avg-vote -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT} -d @./input.json
```
!!! success "Expected Output"
    ```{ .json .no-copy }
    {"predictions":[0.7,0.30000000000000004]
    ```

