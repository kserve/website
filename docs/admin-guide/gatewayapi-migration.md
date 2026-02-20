---
title: "Gateway API Migration Guide"
description: "Migrating from Kubernetes Ingress to Gateway API"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kubernetes Ingress to Gateway API Migration Guide

:::tip

Gateway API is particularly recommended for generative inference workloads to better handle streaming responses and long-lived connections.

:::

## Benefits for Generative Inference

Gateway API offers several benefits that are particularly important for generative inference workloads:

- **Better Streaming Support**: More robust handling of streaming responses common in generative models
- **Advanced Traffic Control**: Fine-grained traffic policies for complex routing scenarios
- **Header-Based Routing**: Route traffic based on model-specific headers
- **Extended Timeouts**: Configure longer timeouts appropriate for generative models
- **Enhanced Load Balancing**: More sophisticated load balancing strategies

## 1. Install Gateway API CRD

The Kubernetes Gateway API is a newer, more flexible and standardized way to manage traffic ingress and egress in Kubernetes clusters. KServe implements the Gateway API version `1.2.1`.

The Gateway API is not part of the Kubernetes cluster, therefore it needs to be installed manually, to do this, follow the next step.
```shell
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

## 2. Create GatewayClass

Create a `GatewayClass` resource using your preferred network controller. For this example, we will use [Envoy Gateway](https://gateway.envoyproxy.io/docs/) as the network controller. **Note:** Kserve requires Envoy Gateway **v1.3.0**.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller  
```

## 3. Create Gateway

Create a `Gateway` resource to expose the `InferenceService`. In this example, you will use the `envoy` `GatewayClass` that we created above.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kserve-ingress-gateway
  namespace: kserve
spec:
  gatewayClassName: envoy
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: my-secret
            namespace: kserve
      allowedRoutes:
        namespaces:
          from: All
  infrastructure:
    labels:
      serving.kserve.io/gateway: kserve-ingress-gateway
```

This should create a gateway instance pod and a LoadBalancer service:

```bash
kubectl get pods,svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A
```

:::tip[Expected Output]
```
NAMESPACE              NAME                                                                READY   STATUS    RESTARTS   AGE
envoy-gateway-system   pod/envoy-kserve-kserve-ingress-gateway-deaaa49b-6679ddc496-dlqfs   2/2     Running   0          3m52s

NAMESPACE              NAME                                                   TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
envoy-gateway-system   service/envoy-kserve-kserve-ingress-gateway-deaaa49b   LoadBalancer   10.98.163.134   10.98.163.134   80:32390/TCP,443:32001/TCP   3m52s
```
:::

:::note
KServe can automatically create a default `Gateway` named `kserve-ingress-gateway` during installation if the Helm value `kserve.controller.gateway.ingressGateway.createGateway` is set to `true`. If you choose to use this default gateway, you can skip this step and proceed directly to the next step.
:::

## 4. Configure KServe to use Gateway API

To enable Gateway API in KServe, you need to update the KServe configuration to enable the Gateway API and specify the Gateway resource to use.

### Enable Gateway API Support

First, enable the Gateway API feature:

If using Helm, set the following values:

```bash
helm upgrade kserve oci://ghcr.io/kserve/charts/kserve --version v0.16.0 \
  --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true
```

If using YAML configuration, update the ConfigMap:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{\"enableGatewayApi\": true}"}}'
```

### Configure Gateway Name and Namespace

Next, specify the Gateway resource name and namespace in the format `<gateway namespace>/<gateway name>`:

If using Helm, set:

```bash
helm upgrade kserve oci://ghcr.io/kserve/charts/kserve --version v0.16.0 \
  --set kserve.controller.gateway.ingressGateway.kserveGateway=kserve/kserve-ingress-gateway
```

If using YAML configuration, update the ConfigMap:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{\"kserveIngressGateway\": \"kserve/kserve-ingress-gateway\"}"}}'
```

Or you can apply both settings at once:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{\"enableGatewayApi\": true, \"kserveIngressGateway\": \"kserve/kserve-ingress-gateway\"}"}}'
```

### Restart the KServe Controller

The existing InferenceServices will not use the Gateway API configuration until the next reconciliation. Restart the KServe controller to trigger the reconciliation and apply the Gateway API configuration to all existing InferenceServices:

```bash
kubectl rollout restart deployment kserve-controller-manager -n kserve
```

## 5. Configure External Traffic

If you're using a cloud provider, you may need to configure external traffic to the LoadBalancer service created by the Gateway:

```bash
kubectl get svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A
```

## 6. Verify the Gateway API Configuration

### Deploy a Test InferenceService

Create an InferenceService to verify that the Gateway API configuration is applied correctly:

```bash
kubectl apply -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-v2-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

Check the status of the InferenceService:

```bash
kubectl get isvc sklearn-v2-iris
```

### Set Up Access to the InferenceService

Execute the following command to determine if your Kubernetes cluster supports external load balancers:

```bash
kubectl get svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A
```

:::tip[Expected Output]
```
NAMESPACE              NAME                                           TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
envoy-gateway-system   envoy-kserve-kserve-ingress-gateway-deaaa49b   LoadBalancer   10.98.163.134   10.98.163.134   80:32390/TCP,443:32001/TCP   54s
```
:::

Choose one of the following methods to access your service:

<Tabs>
<TabItem value="loadbalancer" label="Load Balancer">

If the EXTERNAL-IP value is set, your environment has an external load balancer that you can use for the ingress gateway:

```bash
export INGRESS_HOST=$(kubectl get service -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl get service -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].spec.ports[?(@.name=="http2")].port}')
```

</TabItem>
<TabItem value="nodeport" label="Node Port">

If the EXTERNAL-IP value is none (or perpetually pending), your environment does not provide an external load balancer for the ingress gateway. In this case, you can access the gateway using the service's node port:

```bash
# GKE
export INGRESS_HOST=worker-node-address

# Minikube
export INGRESS_HOST=$(minikube ip)

# Other environment (On Prem)
export INGRESS_HOST=$(kubectl get po -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].status.hostIP}')
```

</TabItem>
<TabItem value="portforward" label="Port Forward">

Alternatively, you can use `Port Forward` for testing purposes:

```bash
kubectl port-forward -n envoy-gateway-system $(kubectl get pods -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-namespace=kserve,gateway.envoyproxy.io/owning-gateway-name=kserve-ingress-gateway -o jsonpath='{.items[0].metadata.name}') 8080:8080
export INGRESS_HOST=localhost
export INGRESS_PORT=8080
```

</TabItem>
</Tabs>

### Test the InferenceService

Create a file named `iris-input-v2.json` with sample input:

```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [1, 4],
      "datatype": "FP32",
      "data": [[5.1, 3.5, 1.4, 0.2]]
    }
  ]
}
```

Send a request to the InferenceService:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-v2-iris/infer -d @./iris-input-v2.json
```

:::tip[Expected Output]
```json
{
  "id": "3befffaa-9f4f-4c0b-97fb-3d267d070153",
  "model_name": "sklearn-v2-iris",
  "model_version": "1",
  "outputs": [
    {
      "name": "output-0",
      "shape": [1],
      "datatype": "INT64",
      "data": [0]
    }
  ]
}
```
:::
