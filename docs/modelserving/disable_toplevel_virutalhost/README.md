# Deploy model without istio top level virtual service

Kserve provides an option to disable istio top level virtual service.
For internal cluster only traffic, Kserve doesn't want the top level virtual service. The local gateway is more than enough.

To disable top level virtual service add the flag `"disableIstioVirtualHost": true` under **ingress** config in inferenceservice configmap.

## Edit inference-configmap to disable istio virtual host

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve
```

## Deploy PMML model for testing

### Create the InferenceService
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

```bash
kubectl apply -f pmml.yaml
```

==** Expected Output **==

```bash
inferenceservice.serving.kserve.io/pmml-demo created
```
## Run a prediction

The first step is to [determine the ingress IP and ports](../../../get_started/first_isvc/#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
MODEL_NAME=pmml-demo
INPUT_PATH=@./pmml-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-demo -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

==** Expected Output **==

```bash
*   Trying 127.0.0.1...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/pmml-demo:predict HTTP/1.1
> Host: pmml-demo-predictor-default.default.example.com
> User-Agent: curl/7.58.0
> Accept: */*
> Content-Length: 45
> Content-Type: application/x-www-form-urlencoded
> 
* upload completely sent off: 45 out of 45 bytes
< HTTP/1.1 200 OK
< content-length: 144
< content-type: application/json; charset=UTF-8
< date: Wed, 14 Sep 2022 13:30:09 GMT
< server: envoy
< x-envoy-upstream-service-time: 58
< 
* Connection #0 to host localhost left intact
{"predictions": [{"Species": "setosa", "Probability_setosa": 1.0, "Probability_versicolor": 0.0, "Probability_virginica": 0.0, "Node_Id": "2"}]}
```
