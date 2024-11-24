# Secure InferenceService with ServiceMesh
A service mesh is a dedicated infrastructure layer that you can add to your InferenceService to allow you to transparently add capabilities like observability, traffic management and security.
In this example we show how you can turn on the Istio service mesh mode to provide a uniform and efficient way to secure service-to-service communication in a cluster with TLS encryption, strong
identity-based authentication and authorization.

## Turn on strict mTLS and Authorization Policy
For namespace traffic isolation, we lock down the in cluster traffic to only allow requests from the same namespace and enable mTLS for TLS encryption and strong identity-based authentication.
Because Knative requests are frequently routed through activator, when turning on mTLS additional traffic rules are required and activator/autoscaler in `knative-serving` namespace must have sidecar injected as well.
For more details please see [mTLS in Knative](https://knative.dev/docs/serving/istio-authorization/#mutual-tls-in-knative), to understand when requests are forwarded through the activator, see [target burst capacity](https://knative.dev/docs/serving/load-balancing/target-burst-capacity/) docs.

Create the namespace `user1` which is used for this example.
```bash
kubectl create namespace user1
```

- When activator is not on the request path, the rule checks if the source namespace of the request is the same as the destination namespace of `InferenceService`.

- When activator is on the request path, the rule checks the source namespace `knative-serving` namespace as the request is proxied through activator.

!!! warning

    Currently when activator is on the request path, it is not able to check the originated namespace or original identity due to the [net-istio issue](https://github.com/knative-sandbox/net-istio/issues/554).

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: user1
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-serving-tests
  namespace: user1
spec:
  action: ALLOW
  rules:
    # 1. mTLS for service from source "user1" namespace to destination service when TargetBurstCapacity=0 without local gateway and activator on the path
    # Source Service from "user1" namespace -> Destination Service in "user1" namespace
    - from:
        - source:
            namespaces: ["user1"]
    # 2. mTLS for service from source "user1" namespace to destination service with activator on the path
    # Source Service from "user1" namespace -> Activator(Knative Serving namespace) -> Destination service in "user1" namespace
    # unfortunately currently we could not lock down the source namespace as Activator does not capture the source namespace when proxying the request, see https://github.com/knative-sandbox/net-istio/issues/554.
    - from:
        - source:
            namespaces: ["knative-serving"]
    # 3. allow metrics and probes from knative serving namespaces
    - from:
        - source:
            namespaces: ["knative-serving"]
      to:
        - operation:
            paths: ["/metrics", "/healthz", "/ready", "/wait-for-drain"]
```

Apply the `PeerAuthentication` and `AuthorizationPolicy` rules with [auth.yaml](./auth.yaml):

```bash
kubectl apply -f auth.yaml
```

### Disable Top Level Virtual Service {{ '{' }}#disable-top-level-vs{{ '}' }}
KServe currently creates an Istio top level virtual service to support routing between InferenceService components like predictor, transformer and explainer, as well as support path based routing as an alternative routing with service hosts.
In serverless service mesh mode this creates a problem that in order to route through the underlying virtual service created by Knative Service, the top level virtual service is required to route to the `Istio Gateway` instead of to the InferenceService component on the service mesh directly.

By disabling the top level virtual service, it eliminates the extra route to Istio local gateway and the authorization policy can check the source namespace when mTLS is established directly between service to service and activator is not on the request path.
To disable the top level virtual service, add the flag `"disableIstioVirtualHost": true` under the **ingress** config in inferenceservice configmap.

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve

ingress : |- {
    "disableIstioVirtualHost": true
}
```

## Turn on strict mTLS on the entire service mesh {{ '{' }}#mesh-wide-mtls{{ '}' }}
In the previous section, turning on strict mTLS on a namespace is discussed. For users requiring to lock down all workloads in the service mesh, Istio can be configured with [strict mTLS on the whole mesh](https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/#lock-down-mutual-tls-for-the-entire-mesh).

Istio's Mutual TLS Migration docs are using `PeerAuthentication` resources to lock down the mesh, which act at server side. This means that Istio sidecars will only reject non-mTLS incoming connections while non-TLS _outgoing_ connections will still be allowed ([reference](https://istio.io/latest/docs/concepts/security/#authentication-policies)). To further lock down the mesh, you can also create a `DestinationRule` resource to require mTLS on outgoing connections. However, under this very strict mTLS configuration, you may notice that the KServe top level virtual service will stop working and inference requests will be blocked. You can fix this either by disabling the top level virtual service [as mentioned above](#disable-top-level-vs), or by configuring the Knative's local gateway with mTLS on its listening port.

To configure Knative's local gateway with mTLS, assuming you have followed [Knative's guides to use Istio as networking layer](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#__tabbed_1_2), you will need to patch the `knative-local-gateway` resource to be like the following:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: knative-local-gateway
  namespace: knative-serving
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - '*'
      port:
        name: https
        number: 8081
        protocol: HTTPS
      tls:
        mode: ISTIO_MUTUAL
```

After patching Knative's local gateway resource, the KServe top level virtual service will work again.

## Deploy InferenceService with Istio sidecar injection {{ '{' }}#isvc-inject-sidecar{{ '}' }}
First label the namespace with `istio-injection=enabled` to turn on the sidecar injection for the namespace.

```bash
kubectl label namespace user1 istio-injection=enabled --overwrite
```

Create the InferenceService with and without Knative activator on the path:
When `autoscaling.knative.dev/targetBurstCapacity` is set to 0,
Knative removes the activator from the request path so the test service can directly establish the mTLS connection to the `InferenceService` and
the authorization policy can check the original namespace of the request to lock down the traffic for namespace isolation.

=== "InferenceService with activator on path"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris-burst"
      namespace: user1
      annotations:
        "sidecar.istio.io/inject": "true"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```
=== "InferenceService without activator on path"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
      namespace: user1
      annotations:
        "autoscaling.knative.dev/targetBurstCapacity": "0"
        "sidecar.istio.io/inject": "true"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```

```bash
kubectl apply -f sklearn_iris.yaml
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/sklearn-iris created
    $ inferenceservice.serving.kserve.io/sklearn-iris-burst created

    kubectl get pods -n user1
    NAME                                                              READY   STATUS    RESTARTS   AGE
    httpbin-6484879498-qxqj8                                          2/2     Running   0          19h
    sklearn-iris-burst-predictor-default-00001-deployment-5685n46f6   3/3     Running   0          12h
    sklearn-iris-predictor-default-00001-deployment-985d5cd46-zzw4x   3/3     Running   0          12h
    ```

## Run a prediction from the same namespace
Deploy a test service in `user1` namespace with [httpbin.yaml](./httpbin.yaml).

```bash
kubectl apply -f httpbin.yaml
```

Run a prediction request to the `sklearn-iris` InferenceService without activator on the path, you are expected to get HTTP 200 as the authorization rule allows traffic from the same namespace.
```bash
kubectl exec -it httpbin-6484879498-qxqj8 -c istio-proxy -n user1 -- curl -v sklearn-iris-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * Connected to sklearn-iris-predictor-default.user1.svc.cluster.local (10.96.137.152) port 80 (#0)
    > GET /v1/models/sklearn-iris HTTP/1.1
    > Host: sklearn-iris-predictor-default.user1.svc.cluster.local
    > User-Agent: curl/7.81.0
    > Accept: */*
    >
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 36
    < content-type: application/json
    < date: Sat, 26 Nov 2022 01:45:10 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 42
    <
    * Connection #0 to host sklearn-iris-predictor-default.user1.svc.cluster.local left intact
    {"name":"sklearn-iris","ready":true}
    ```

Run a prediction request to the `sklearn-iris-burst` InferenceService with activator on the path, you are expected to get HTTP 200 as the authorization rule allows traffic from `knative-serving` namespace.
```bash
kubectl exec -it httpbin-6484879498-qxqj8 -c istio-proxy -n user1 -- curl -v sklearn-iris-burst-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris-burst
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * Connected to sklearn-iris-burst-predictor-default.user1.svc.cluster.local (10.96.137.152) port 80 (#0)
    > GET /v1/models/sklearn-iris-burst HTTP/1.1
    > Host: sklearn-iris-burst-predictor-default.user1.svc.cluster.local
    > User-Agent: curl/7.81.0
    > Accept: */*
    >
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 42
    < content-type: application/json
    < date: Sat, 26 Nov 2022 13:55:14 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 209
    <
    * Connection #0 to host sklearn-iris-burst-predictor-default.user1.svc.cluster.local left intact
    {"name":"sklearn-iris-burst","ready":true}
    ```

## Run a prediction from a different namespace
Deploy a test service in `default` namespace with [sleep.yaml](./sleep.yaml) which is different from the namespace the `InferenceService` is deployed to.

```bash
kubectl apply -f sleep.yaml
```

When you send a prediction request to the `sklearn-iris` InferenceService without activator on the request path from a different namespace, you are expected to get HTTP 403 "RBAC denied" as the authorization rule only
allows the traffic from the same namespace `user1` where the InferenceService is deployed.
```bash
kubectl exec -it sleep-6d6b49d8b8-6ths6   -- curl -v sklearn-iris-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * Connected to sklearn-iris-predictor-default.user1.svc.cluster.local (10.96.137.152) port 80 (#0)
    > GET /v1/models/sklearn-iris HTTP/1.1
    > Host: sklearn-iris-predictor-default.user1.svc.cluster.local
    > User-Agent: curl/7.86.0-DEV
    > Accept: */*
    >
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 403 Forbidden
    < content-length: 19
    < content-type: text/plain
    < date: Sat, 26 Nov 2022 02:45:46 GMT
    < server: envoy
    < x-envoy-upstream-service-time: 14
    <
    * Connection #0 to host sklearn-iris-predictor-default.user1.svc.cluster.local left intact
    ```

When you send a prediction request to the `sklearn-iris-burst` InferenceService with activator on the request path from a different namespace, you actually get HTTP 200 response due to the above limitation as the authorization policy is
not able to lock down the traffic only from the same namespace as the request is proxied through activator in `knative-serving` namespace, we expect to get HTTP 403 once upstream Knative `net-istio` is fixed.

```bash
kubectl exec -it sleep-6d6b49d8b8-6ths6 -- curl -v sklearn-iris-burst-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris-burst
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    * Connected to sklearn-iris-burst-predictor-default.user1.svc.cluster.local (10.96.137.152) port 80 (#0)
    > GET /v1/models/sklearn-iris-burst HTTP/1.1
    > Host: sklearn-iris-burst-predictor-default.user1.svc.cluster.local
    > User-Agent: curl/7.86.0-DEV
    > Accept: */*
    >
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 42
    < content-type: application/json
    < date: Sat, 26 Nov 2022 13:59:04 GMT
    < server: envoy
    < x-envoy-upstream-service-time: 6
    <
    * Connection #0 to host sklearn-iris-burst-predictor-default.user1.svc.cluster.local left intact
    {"name":"sklearn-iris-burst","ready":true}
    ```

## Invoking InferenceServices from workloads that are not part of the mesh {{ '{' }}#invoking-isvc-non-mesh{{ '}'}}
Ideally, when using service mesh, all involved workloads should belong to the service mesh. This allows enabling strict mTLS in Istio and ensures policies are correctly applied. However, given the diverse requirements of applications, it is not always possible to migrate all workloads to the service mesh.

When using KServe, you may successfully migrate InferenceServices to the service mesh (i.e. by [injecting the Istio sidecar](#isvc-inject-sidecar)), while workloads invoking inferencing remain outside the mesh. In this hybrid environment, workloads that are not part of the service mesh need to use an Istio ingress gateway as a port-of-entry to InferenceServices. In the default setup, KServe integrates with the gateway used by Knative. Both Knative and KServe apply the needed configurations to allow for these hybrid environments, however, this only works transparently if you haven't enabled strict TLS on Istio.

Especially under a mesh-wide highly strict mTLS setup (involving both `PeerAuthentication` and `DestinationRule` resources as mentioned [above](#mesh-wide-mtls)), you will notice that workloads that are not part of the mesh will become blocked from calling InferenceServices. The easiest way to fix this is by [disabling the KServe top-level virtual service](#disable-top-level-vs). However, if you need the KServe top-level virtual service, you can still have a working hybrid environment by configuring KServe with its dedicated local Istio Gateway.

First, you will need to patch the Knative gateway, as shown [above for turning on mesh-wide strict mTLS](#mesh-wide-mtls). Then, you will need to create the following resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: kserve-local-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - '*'
      port:
        name: http
        number: 8082
        protocol: HTTP
---
apiVersion: v1
kind: Service
metadata:
  name: kserve-local-gateway
  namespace: istio-system
  labels:
    experimental.istio.io/disable-gateway-port-translation: "true"
spec:
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8082
  selector:
    istio: ingressgateway
```

Finally, you need to edit the **ingress** config in the inferenceservice ConfigMap to have the following:

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve

ingress : |- {
    "knativeLocalGatewayService": "knative-local-gateway.istio-system.svc.cluster.local",
    "localGateway":               "istio-system/kserve-local-gateway",
    "localGatewayService":        "kserve-local-gateway.istio-system.svc.cluster.local"
}
```

After restarting the KServe controller, the needed Services and VirtualServices will be reconfigured and workloads outside the mesh will be unblocked from calling InferenceServices.

## Securing the network border with TLS
If you require TLS over all the network, the easiest is to enable mesh-wide strict mTLS in Istio. Though, communications are secure only for workloads inside the service mesh and the mesh-border is the weak point: if the Istio ingress gateway is not setup with TLS, data arriving at or departing from the mesh would still be plain-text.

If you need incoming connections at the mesh-border to be secured with TLS:

* For requests coming from outside the cluster (i.e. public endpoints), you can follow [Knative external domain encryption guide](https://knative.dev/docs/serving/encryption/external-domain-tls/)
* For requests coming from workloads inside the cluster that are not part of the service mesh, you may use [Knative cluster local encryption](https://knative.dev/docs/serving/encryption/encryption-overview/#cluster-local-encryption), although it is still in an experimental state. It would, also, require you to [disable the KServe top-level virtual service](#disable-top-level-vs) to ensure there is no plain-text port-of-entry.

If the experimental Knative cluster local encryption is not suitable for you, it is still possible to secure cluster-local traffic on the mesh border by configuring KServe with its own dedicated local gateway [similarly as shown previously](#invoking-isvc-non-mesh). The resources to create are as follows:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: kserve-local-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - '*'
      port:
        name: https
        number: 8445
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: kserve-cluster-local-tls
---
apiVersion: v1
kind: Service
metadata:
  name: kserve-local-gateway
  namespace: istio-system
spec:
  ports:
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8445
  selector:
    istio: ingressgateway
```

In the `istio-system` namespace, you will need to create a Secret named `kserve-cluster-local-tls` holding the TLS certificate. You may get this certificate from `cert-manager` operator.

Finally, edit the **ingress** config in the inferenceservice ConfigMap to have the following:

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve

ingress : |- {
    "knativeLocalGatewayService": "knative-local-gateway.istio-system.svc.cluster.local",
    "localGateway":               "istio-system/kserve-local-gateway",
    "localGatewayService":        "kserve-local-gateway.istio-system.svc.cluster.local"
}
```

After restarting KServe controller, cluster-local workloads outside the mesh would need to use HTTPS to run predictions.

If you combine protecting the mesh border with TLS and also configuring Istio with mesh-wide strict mTLS, you would end up with a setup where traffic to KServe workloads with a sidecar is secured.

