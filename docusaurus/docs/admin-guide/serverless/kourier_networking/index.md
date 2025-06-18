---
title: "Install KServe with Alternative Networking Layer"
description: "Using alternative networking layers with KServe"
---

# Deploy InferenceService with Alternative Networking Layer

KServe creates the top level `Istio Virtual Service` for routing to `InferenceService` components based on the virtual host or path based routing.
Now KServe provides an option for disabling the top level virtual service to allow configuring other networking layers Knative supports.
For example, [Kourier](https://developers.redhat.com/blog/2020/06/30/kourier-a-lightweight-knative-serving-ingress) is an alternative networking layer and
the following steps show how you can deploy KServe with `Kourier`.

## Install Kourier Networking Layer

Please refer to the [Serverless Installation Guide](../serverless.md) and change the second step to install `Kourier` instead of `Istio`.

1. Install the Kourier networking layer:

    ```bash
    kubectl apply -f https://github.com/knative/net-kourier/releases/download/${KNATIVE_VERSION}/kourier.yaml
    ```

2. Configure Knative Serving to use Kourier:

    ```bash
    kubectl patch configmap/config-network \
    --namespace knative-serving \
    --type merge \
    --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
    ```

3. Verify Kourier installation:

    ```bash
    kubectl get pods -n knative-serving && kubectl get pods -n kourier-system
    ```

    :::tip[Expected Output]
    ```
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
    :::

## Configure KServe with Kourier

To deploy KServe with Kourier, you need to disable the built-in Istio Virtual Service creation:

1. Edit the `inferenceservice-config` configmap to disable Istio top level virtual host:

    ```bash
    kubectl edit configmap/inferenceservice-config --namespace kserve
    # Add the flag `"disableIstioVirtualHost": true` under the ingress section
    ingress : |- {
        "disableIstioVirtualHost": true
    }
    ```

   Alternatively, you can use this patch command:

    ```bash
    kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{ \"disableIstioVirtualHost\": true}"}}'
    ```

2. Restart the KServe Controller:

    ```bash
    kubectl rollout restart deployment kserve-controller-manager -n kserve
    ```

3. Watch the KServe controller pod to verify it restarts with the new configuration:

    ```bash
    kubectl get pods -n kserve --watch
    ```

## Deploy InferenceService for Testing Kourier Gateway

### Create the InferenceService

Create a file named `pmml.yaml` with the following content:

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

Deploy the InferenceService:

```bash
kubectl apply -f pmml.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/pmml-demo created
```
:::

### Run a Prediction

Note that when setting `INGRESS_HOST` and `INGRESS_PORT` following the [determining the ingress IP and ports](../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) guide you
need to replace `istio-ingressgateway` with `kourier-gateway`.

For example if you choose to do `Port Forward` for testing you need to select the `kourier-gateway` pod as following.

```bash
kubectl port-forward --namespace kourier-system \
$(kubectl get pod -n kourier-system -l "app=3scale-kourier-gateway" --output=jsonpath="{.items[0].metadata.name}") 8080:8080
export INGRESS_HOST=localhost
export INGRESS_PORT=8080
```

Create a file named `pmml-input.json` with the following content, under your current terminal path:

```json
{
   "instances": [
      [5.1, 3.5, 1.4, 0.2]
   ]
}
```

Send a prediction request to the InferenceService and check the output:

```bash
MODEL_NAME=pmml-demo
INPUT_PATH=@./pmml-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice pmml-demo -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]
```
* Trying 127.0.0.1...
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
:::

## Benefits of Using Kourier

Kourier offers several benefits as an alternative networking layer for KServe:

- Lightweight and focused on Knative use cases
- Simpler architecture compared to Istio
- Lower resource usage
- Faster startup time
- Easier to configure and manage

However, it lacks some of the advanced traffic management features of Istio, so choose the networking layer that best fits your requirements.
