# Kubernetes Ingress to Gateway API Migration Guide

## 1. Install Gateway API CRD
The Kubernetes Gateway API is a newer, more flexible and standardized way to manage traffic ingress and egress in Kubernetes clusters. KServe Implements the Gateway API version `1.2.1`.

The Gateway API is not part of the Kubernetes cluster, therefore it needs to be installed manually, to do this, follow the next step.
```shell
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

## 2. Create GatewayClass
Create a `GatewayClass` resource using your preferred network controller. For this example, we will use [Envoy Gateway](https://gateway.envoyproxy.io/docs/) as the network controller.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller  
```

## 3. Enable Gateway API
To enable Gateway API support in KServe you need to set the `enableGatewayApi` to `true` in the `inferenceservice-config` ConfigMap.

=== "Helm"

    ```shell
    helm upgrade kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }} \
      --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true
    ```

=== "Kubectl"

    ```shell
    kubectl edit configmap inferenceservice-config -n kserve
    ```
    ```yaml
    data:
      ingress: |-
             {    
                 "enableGatewayApi": true,
             }
    ```

## 4. Create Gateway resource
Create a `Gateway` resource to expose the `InferenceService`. In this example, we will use the `envoy` `GatewayClass` that was created in [step 2](#2-create-gatewayclass). If you already have a `Gateway` resource, you can skip this step.

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

This should create a gateway instance pod and a LoadBalancer service.
```shell
kubectl get pods,svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A
```

!!! success "Expected Output"
```shell
NAMESPACE              NAME                                                                READY   STATUS    RESTARTS   AGE
envoy-gateway-system   pod/envoy-kserve-kserve-ingress-gateway-deaaa49b-6679ddc496-dlqfs   2/2     Running   0          3m52s

NAMESPACE              NAME                                                   TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
envoy-gateway-system   service/envoy-kserve-kserve-ingress-gateway-deaaa49b   LoadBalancer   10.98.163.134   10.98.163.134   80:32390/TCP,443:32001/TCP   3m52s
```

!!! note
    KServe can automatically create a default `Gateway` named `kserve-ingress-gateway` during installation if the Helm value `kserve.controller.gateway.ingressGateway.createGateway` set to `true`. If you choose to use this default gateway, you can skip this step and proceed to [step 6](#6-restart-the-kserve-controller).

## 5. Configure the Gateway name and namespace in KServe
In the ConfigMap `inferenceservice-config` modify the `kserveIngressGateway` in the `ingress` section with `gateway namespace` and `name` respecting the format `<gateway namespace>/<gateway name>`. In this example, we will use the `Gateway` resource that was created in [step 4](#4-create-gateway-resource).

=== "Helm"
    
    ```shell
    helm upgrade kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }} \
      --set kserve.controller.gateway.ingressGateway.kserveGateway=kserve/kserve-ingress-gateway
    ```

=== "Kubectl"

    ```shell
    kubectl edit configmap inferenceservice-config -n kserve
    ```
    ```yaml
    data:
      ingress: |-
             {    
                 "kserveIngressGateway": "kserve/kserve-ingress-gateway",
             }
    ```

## 6. Restart the KServe controller
The existing InferenceServices will not use the Gateway API configuration until the next reconciliation.
You can restart the KServe controller to trigger the reconciliation and apply the Gateway API configuration to all the existing InferenceServices.
```shell
kubectl rollout restart deployment kserve-controller-manager -n kserve
```

## 7. Configure the external traffic
If you are using a cloud provider, you may need to configure the external traffic to the LoadBalancer service created in [step 4](#4-create-gateway-resource).

```shell
kubectl get svc kserve-ingress-gateway -l  -A
```

## 8. Verify the Gateway API configuration
Create an InferenceService to verify that the Gateway API configuration is applied to the InferenceService.

```yaml
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
      protocolVersion: v2
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

Execute the following command to determine if the Kubernetes cluster is running in an environment that supports external load balancers
```shell
kubectl get svc kserve-ingress-gateway -l serving.kserve.io/gateway=kserve-ingress-gateway -A
```

!!! success "Expected Output"
    ```shell
    NAMESPACE              NAME                                           TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
    envoy-gateway-system   envoy-kserve-kserve-ingress-gateway-deaaa49b   LoadBalancer   10.98.163.134   10.98.163.134   80:32390/TCP,443:32001/TCP   54s
    ```

=== "Load Balancer"
    If the EXTERNAL-IP value is set, your environment has an external load balancer that you can use for the ingress gateway.

    ```bash
    export INGRESS_HOST=$(kubectl get service -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
    export INGRESS_PORT=$(kubectl get service -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].spec.ports[?(@.name=="http2")].port}')
    ```

=== "Node Port"
    If the EXTERNAL-IP value is none (or perpetually pending), your environment does not provide an external load balancer for the ingress gateway.
    In this case, you can access the gateway using the service’s node port.
    ```bash
    # GKE
    export INGRESS_HOST=worker-node-address
    # Minikube
    export INGRESS_HOST=$(minikube ip)
    # Other environment(On Prem)
    export INGRESS_HOST=$(kubectl get po -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].status.hostIP}')
    export INGRESS_PORT=$(kubectl get service -l serving.kserve.io/gateway=kserve-ingress-gateway -A -o jsonpath='{.items[0].spec.ports[?(@.name=="http-80")].nodePort}')
    ```

=== "Port Forward"
    Alternatively you can do `Port Forward` for testing purposes.
    ```bash
    INGRESS_GATEWAY_SERVICE=$(kubectl get svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A --output jsonpath='{.items[0].metadata.name}')
    INGRESS_GATEWAY_NAMESPACE=$(kubectl get svc -l serving.kserve.io/gateway=kserve-ingress-gateway -A --output jsonpath='{.items[0].metadata.namespace}')
    kubectl port-forward --namespace ${INGRESS_GATEWAY_NAMESPACE} svc/${INGRESS_GATEWAY_SERVICE} 8080:80
    ```
    Open another terminal, and enter the following to perform inference:
    ```bash
    export INGRESS_HOST=localhost
    export INGRESS_PORT=8080
    ```

Create a file named `iris-input-v2.json` with the sample input.
```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [
        [6.8, 2.8, 4.8, 1.4],
        [6.0, 3.4, 4.5, 1.6]
      ]
    }
  ]
}
```
Now, verify the InferenceService is accessible outside the cluster using `curl`.
```shell
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-v2-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input-v2.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-v2-iris/infer
```

!!! success "Expected Output"
    ```json
    {
      "id": "823248cc-d770-4a51-9606-16803395569c",
      "model_name": "sklearn-v2-iris",
      "outputs": [
        {
          "data": [1, 1],
          "datatype": "INT64",
          "name": "predict",
          "parameters": null,
          "shape": [2]
        }
      ]
    }
    ```
