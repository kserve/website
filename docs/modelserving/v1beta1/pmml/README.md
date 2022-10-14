# Deploy PMML model with InferenceService
PMML, or predictive model markup language, is an XML format for describing data mining and statistical models, including inputs to the models,
transformations used to prepare data for data mining, and the parameters that define the models themselves. In this example we show how you can
serve the PMML format model on `InferenceService`.


## Create the InferenceService
=== "Old Schema"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "pmml-demo"
    spec:
      predictor:
        pmml:
          storageUri: gs://kfserving-examples/models/pmml
    ```
=== "New Schema"
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
Create the InferenceService with above yaml
```
kubectl apply -f pmml.yaml
```

==** Expected Output **==
```
$ inferenceservice.serving.kserve.io/pmml-demo created
```

!!! warning
    The `pmmlserver` is based on [Py4J](https://github.com/bartdag/py4j) and that doesn't support multi-process mode, so we can't set `spec.predictor.containerConcurrency`.
    If you want to scale the PMMLServer to improve prediction performance, you should set the InferenceService's `resources.limits.cpu` to 1 and scale the replica size.


## Run a prediction
The first step is to [determine the ingress IP and ports](/docs/get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```
MODEL_NAME=pmml-demo
INPUT_PATH=@./pmml-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-demo -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

==** Expected Output **==

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
{"predictions": [{'Species': 'setosa', 'Probability_setosa': 1.0, 'Probability_versicolor': 0.0, 'Probability_virginica': 0.0, 'Node_Id': '2'}]}* Closing connection 0
```

