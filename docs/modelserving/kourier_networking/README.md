# Deploy model with alternative networking layer

Kserve v0.9 and before versions are all tightly coupled with istio network layer. It may cause the Kserve users who deployed the model in the GKE cluster to face deprecated warnings or errors. But Kserve now provides an option to disable top level virtual service and configure other network layers.

**GKE has deprecated istio and won't support istio on existing clusters as well after September 2022.**
Refer this [link](https://cloud.google.com/istio/docs/istio-on-gke/overview) to know more.

Knative Operator can configure the Knative Serving component with different network layer options. So Kserve also added support to configure other networking layer.

Istio is a default networking layer in Knative and it can be changed to any other network layers. For example, [Kourier](https://developers.redhat.com/blog/2020/06/30/kourier-a-lightweight-knative-serving-ingress) is an alternative network layer. The following steps helps to migrate or set a Kourier network layer.

## Delete Istio networking layer

> **_NOTE:_** Skip this command if you are not install istio previously.

```bash
kubectl delete --filename https://github.com/knative/net-istio/releases/download/${KNATIVE_VERSION}/release.yaml
```

## Create Kourier networking layer

1. Install the Knative Kourier controller by running the command:

    ```bash
    kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.7.0/kourier.yaml
    ```

2. Configure Knative Serving to use Kourier by default by running the command:

    ```bash
    kubectl patch configmap/config-network \
    --namespace knative-serving \
    --type merge \
    --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
    ```

## Verify Kourier has installed

```bash
kubectl get pods -n knative-serving && kubectl get pods -n kourier-system
```

Example output:

```bash
NAME                                      READY   STATUS    RESTARTS   AGE
activator-77db7d9dd7-kbrgr                1/1     Running   0          10m
autoscaler-67dbf79b95-htnp9               1/1     Running   0          10m
controller-684b6bc97f-ffm58               1/1     Running   0          10m
domain-mapping-6d99d99978-ktmrf           1/1     Running   0          10m
domainmapping-webhook-5f998498b6-sddnm    1/1     Running   0          10m
net-kourier-controller-68967d76dc-ncj2n   1/1     Running   0          10m
webhook-97bdc7b4d-nr7qf                   1/1     Running   0          10m
NAME                                      READY   STATUS    RESTARTS   AGE
3scale-kourier-gateway-54c49c8ff5-x8tgn   1/1     Running   0          10m
```

## Edit inference-configmap to disable istio virtual host

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve
```

Add the flag `"disableIstioVirtualHost": true` under **ingress** config in inferenceservice configmap.

## Restart the KServe controller

To know the kserve controller manager pod name

```bash
kubectl get pods --namespace kserve
```

Example output:

```bash
NAME                                         READY   STATUS    RESTARTS   AGE
kserve-controller-manager-6f6786b8b4-z9hv2   2/2     Running   0          34m
```

Restart the kserve controller manager pod by deleting pod

```bash
kubectl delete pods kserve-controller-manager-6f6786b8b4-z9hv2 --namespace kserve
```

## Port Forward Kourier

You can do `Port Forward` for testing purpose.

```bash
kubectl port-forward --namespace kourier-system \
$(kubectl get pod -n kourier-system -l "app=3scale-kourier-gateway" --output=jsonpath="{.items[0].metadata.name}") 8080:8080
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
