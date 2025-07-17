---
title: "Secure InferenceService with ServiceMesh"
description: "Configure TLS encryption and authentication for InferenceService using Istio"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

:::warning
Currently when activator is on the request path, it is not able to check the originated namespace or original identity due to the [net-istio issue](https://github.com/knative-sandbox/net-istio/issues/554).
:::

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

### Disable Top Level Virtual Service {#disable-top-level-vs}
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

## Turn on strict mTLS on the entire service mesh {#mesh-wide-mtls}
In the previous section, turning on strict mTLS on a namespace is discussed. For users requiring to lock down all workloads in the service mesh, Istio can be configured with [strict mTLS on the whole mesh](https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/#lock-down-mutual-tls-for-the-entire-mesh).

Istio's Mutual TLS Migration docs are using `PeerAuthentication` resources to lock down the mesh, which act at server side. This means that Istio sidecars will only reject non-mTLS incoming connections while non-TLS _outgoing_ connections will still be allowed ([reference](https://istio.io/latest/docs/concepts/security/#authentication-policies)). To further lock down the mesh, you can also create a `DestinationRule` resource to require mTLS on outgoing connections. However, under this very strict mTLS configuration, you may notice that the KServe top level virtual service will stop working and inference requests will be blocked. You can fix this either by disabling the top level virtual service as mentioned above, or by configuring the Knative's local gateway with mTLS on its listening port.

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

## Deploy InferenceService with Istio sidecar injection {#isvc-inject-sidecar}
First label the namespace with `istio-injection=enabled` to turn on the sidecar injection for the namespace.

```bash
kubectl label namespace user1 istio-injection=enabled --overwrite
```

Create the InferenceService with and without Knative activator on the path:
When `autoscaling.knative.dev/targetBurstCapacity` is set to 0,
Knative removes the activator from the request path so the test service can directly establish the mTLS connection to the `InferenceService` and
the authorization policy can check the original namespace of the request to lock down the traffic for namespace isolation.

<Tabs>
  <TabItem value="with-activator" label="InferenceService with activator on path" default>
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
  </TabItem>
  <TabItem value="without-activator" label="InferenceService without activator on path">
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
  </TabItem>
</Tabs>

```bash
kubectl apply -f sklearn_iris.yaml
```

:::tip[Expected Output]
```
$ inferenceservice.serving.kserve.io/sklearn-iris created
$ inferenceservice.serving.kserve.io/sklearn-iris-burst created
```
:::

## Verify InferenceService is running
Check the status of the InferenceService:
```bash
kubectl get pods -n user1
```
:::tip[Expected Output]
```
NAME                                                              READY   STATUS    RESTARTS   AGE
httpbin-6484879498-qxqj8                                          2/2     Running   0          19h
sklearn-iris-burst-predictor-default-00001-deployment-5685n46f6   3/3     Running   0          12h
sklearn-iris-predictor-default-00001-deployment-985d5cd46-zzw4x   3/3     Running   0          12h
```
:::

## Run a prediction from the same namespace
Deploy a test service in `user1` namespace with [httpbin.yaml](./httpbin.yaml).

```bash
kubectl apply -f httpbin.yaml
```

Run a prediction request to the `sklearn-iris` InferenceService without activator on the path, you are expected to get HTTP 200 as the authorization rule allows traffic from the same namespace.
```bash
kubectl exec -it httpbin-6484879498-qxqj8 -c istio-proxy -n user1 -- curl -v sklearn-iris-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris
```

:::tip[Expected Output]
```
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
:::

Run a prediction request to the `sklearn-iris-burst` InferenceService with activator on the path, you are expected to get HTTP 200 as the authorization rule allows traffic from `knative-serving` namespace.
```bash
kubectl exec -it httpbin-6484879498-qxqj8 -c istio-proxy -n user1 -- curl -v sklearn-iris-burst-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris-burst
```

:::tip[Expected Output]
```
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
:::

## Run a prediction from a different namespace
Deploy a test service in `default` namespace with [sleep.yaml](./sleep.yaml) which is different from the namespace the `InferenceService` is deployed to.

```bash
kubectl apply -f sleep.yaml
```
Before running predictions, create a file called [sklearn-input.yaml](./sklearn-input.yaml) with the following content:

```yaml
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2]
  ]
}
```

Now you can run the prediction:

```bash
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn -n user1 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
sleep_pod=$(kubectl get pod -n user1 -l app=sleep -o jsonpath={.items..metadata.name})
kubectl exec -n user1 ${sleep_pod} -c sleep -- curl -s -X POST http://${SERVICE_HOSTNAME}:${INGRESS_PORT}/v1/models/sklearn:predict -d @./sklearn-input.yaml
```

From another namespace should fail with the strict authorization policy:

```bash
sleep_pod=$(kubectl get pod -n user2 -l app=sleep -o jsonpath={.items..metadata.name})
kubectl exec -n user2 ${sleep_pod} -c sleep -- curl -s -X POST http://${SERVICE_HOSTNAME}:${INGRESS_PORT}/v1/models/sklearn:predict -d @./sklearn-input.yaml
```

### TLS Setup with HTTP Traffic
If the external traffic is HTTP instead of HTTPS and you want to terminate TLS at the ingress gateway, you will need to add TLS section to the gateway spec.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: kserve-gateway
  namespace: kserve
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*"
    tls:
      mode: SIMPLE
      privateKey: /etc/istio/ingressgateway-certs/tls.key
      serverCertificate: /etc/istio/ingressgateway-certs/tls.crt
```

## Configure JWT authorization
For the external traffic, you can secure the models with JWT token based authentication. A JSON Web Token (JWT) is an access token that is issued by an authorization server and is consumed by the API as a way to securely
transmit information between parties.

For setting up the authorization server, please refer to [Istio JWT authorization documentation](https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/).

### Install `httpbin` InferenceService
```bash
kubectl apply -f httpbin.yaml -n user1
```

### Create request authentication for JWT validation
Add the following section to `auth.yaml`

```yaml
apiVersion: "security.istio.io/v1beta1"
kind: "RequestAuthentication"
metadata:
  name: jwt-httpbins
  namespace: user1
spec:
  selector:
    matchLabels:
      serving.knative.dev/service: httpbin-predictor-default
  jwtRules:
  - issuer: "testing@secure.istio.io"
    jwksUri: "https://raw.githubusercontent.com/istio/istio/release-1.11/security/tools/jwt/samples/jwks.json"
```

This policy applies to requests to service with `serving.knative.dev/service: httpbin-predictor-default`.

### Update policy for jwt validation
Update authorization policy to define who can access the service with RequestAuthenticaion

```yaml
apiVersion: "security.istio.io/v1beta1"
kind: "AuthorizationPolicy"
metadata:
  name: require-jwt
  namespace: user1
spec:
  action: ALLOW
  selector:
    matchLabels:
      serving.knative.dev/service: httpbin-predictor-default
  rules:
  # Knative mesh runs control plane in knative-serving namespace
  # the rule checks if the source namespace of the request is the knative-serving namespace. 
  - from:
    - source:
       principals: ["cluster.local/ns/knative-serving/*"]
  - from:
    # use a specific namespace name in the rule
    - source:
        namespaces: ["user1"]
    # The request must contain a valid JWT
    when:
    - key: request.auth.claims[iss]
      values: ["testing@secure.istio.io"]
```

Apply updated `auth.yaml`
```bash
kubectl apply -f auth.yaml -n user1
```

Save the following token as the variable `TOKEN`
```bash
TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6IkRIRmJwb0lVcXJZOHQyenBBMnFYZkNtcjVWTzVaRXI0UnpIVV8tZW52dlEiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjQ2ODU5ODk3MDAsImZvbyI6ImJhciIsImlhdCI6MTUzMjM4OTcwMCwiaXNzIjoidGVzdGluZ0BzZWN1cmUuaXN0aW8uaW8iLCJzdWIiOiJ0ZXN0aW5nQHNlY3VyZS5pc3Rpby5pbyJ9.CfNnxWP2tcnR9q0vxyxweaF3ovQYHYZl82hAUsn21bwQd9zP7c-LS9qd_vpdLG4Tn1A15NxfCjp5f7QNBUo-KC9PJqYpgGbaXhaGx7bEdFWjcwv3nZzvc7M__ZpaCERdwU7igUmJqYGBYQ51vr2njU9ZimyKkfDe3axcyiBZde7G6dabliUosJvvKOPcKIWPccCgefSj_GNfwIip3-SsFdlR7BtbVUcqR-yv-XOxJ3Uc1MI0tz3uMiiZcyPV7sNCU4KRnemRIMHVOfuvHsU60_GhGbiSFzgPTAa9WTltbnarTbxudb_YEOx12JiwYToeX0DCPb43W1tzIBxgm8NxUg
```

In order to make requests to the httpbin service, a valid JWT should be attached with the `Authorization` header.

```bash
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
SERVICE_HOSTNAME=$(kubectl get inferenceservice httpbin -n user1 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl --header "Host: ${SERVICE_HOSTNAME}" --header "Authorization: Bearer ${TOKEN}" "http://${INGRESS_HOST}:${INGRESS_PORT}/get"
```

:::tip
**Expected Output:**
```
{
  "args": {},
  "headers": {
    "Accept": "*/*",
    "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IkRIRmJwb0lVcXJZOHQyenBBMnFYZkNtcjVWTzVaRXI0UnpIVV8tZW52dlEiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjQ2ODU5ODk3MDAsImZvbyI6ImJhciIsImlhdCI6MTUzMjM4OTcwMCwiaXNzIjoidGVzdGluZ0BzZWN1cmUuaXN0aW8uaW8iLCJzdWIiOiJ0ZXN0aW5nQHNlY3VyZS5pc3Rpby5pbyJ9.CfNnxWP2tcnR9q0vxyxweaF3ovQYHYZl82hAUsn21bwQd9zP7c-LS9qd_vpdLG4Tn1A15NxfCjp5f7QNBUo-KC9PJqYpgGbaXhaGx7bEdFWjcwv3nZzvc7M__ZpaCERdwU7igUmJqYGBYQ51vr2njU9ZimyKkfDe3axcyiBZde7G6dabliUosJvvKOPcKIWPccCgefSj_GNfwIip3-SsFdlR7BtbVUcqR-yv-XOxJ3Uc1MI0tz3uMiiZcyPV7sNCU4KRnemRIMHVOfuvHsU60_GhGbiSFzgPTAa9WTltbnarTbxudb_YEOx12JiwYToeX0DCPb43W1tzIBxgm8NxUg",
    "Content-Length": "0",
    "Host": "httpbin-predictor-default.user1.example.com",
    "User-Agent": "curl/7.64.1",
    "X-B3-Parentspanid": "4940dc478332207a",
    "X-B3-Sampled": "0",
    "X-B3-Spanid": "fe28351a5f38a0e3",
    "X-B3-Traceid": "36872d82c1ab1f7b4940dc478332207a",
    "X-Envoy-Attempt-Count": "1",
    "X-Forwarded-Client-Cert": "By=spiffe://cluster.local/ns/user1/sa/default;Hash=39b5c154e6306d640eb304612c2a76c92f1e7f031a0f592022fafd644a8e5272;Subject=\"\";URI=spiffe://cluster.local/ns/user1/sa/default"
  },
  "origin": "127.0.0.6",
  "url": "http://httpbin-predictor-default.user1.example.com/get"
}
```
:::

While requests without JWT will be denied with `403` response:

```bash
curl --header "Host: ${SERVICE_HOSTNAME}" "http://${INGRESS_HOST}:${INGRESS_PORT}/get" -v
```

:::tip[Expected Output]
```
*   Trying 34.83.190.197...
* TCP_NODELAY set
* Connected to 34.83.190.197 (34.83.190.197) port 80 (#0)
> GET /get HTTP/1.1
> Host: httpbin-predictor-default.user1.example.com
> User-Agent: curl/7.64.1
> Accept: */*
>
< HTTP/1.1 403 Forbidden
< content-length: 19
< content-type: text/plain
< date: Wed, 05 Aug 2020 05:29:34 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 13
<
* Connection #0 to host 34.83.190.197 left intact
RBAC: access denied* Closing connection 0
```
:::

## External Authorization with OpenID Connect (OIDC)
You can set up the ingress gateway to perform OpenID Connect end-user authentication with an external authorization server. Please check the [Istio OIDC authentication guide](https://istio.io/latest/docs/tasks/security/authorization/authz-custom/).

## Invoking InferenceServices from workloads that are not part of the mesh
Ideally, when using service mesh, all involved workloads should belong to the service mesh. This allows enabling strict mTLS in Istio and ensures policies are correctly applied. However, given the diverse requirements of applications, it is not always possible to migrate all workloads to the service mesh.

When using KServe, you may successfully migrate InferenceServices to the service mesh (i.e. by injecting the Istio sidecar as described above), while workloads invoking inferencing remain outside the mesh. In this hybrid environment, workloads that are not part of the service mesh need to use an Istio ingress gateway as a port-of-entry to InferenceServices. In the default setup, KServe integrates with the gateway used by Knative. Both Knative and KServe apply the needed configurations to allow for these hybrid environments, however, this only works transparently if you haven't enabled strict TLS on Istio.

Especially under a mesh-wide highly strict mTLS setup (involving both `PeerAuthentication` and `DestinationRule` resources as mentioned above), you will notice that workloads that are not part of the mesh will become blocked from calling InferenceServices. The easiest way to fix this is by disabling the KServe top-level virtual service as described earlier. However, if you need the KServe top-level virtual service, you can still have a working hybrid environment by configuring KServe with its dedicated local Istio Gateway.

First, you will need to patch the Knative gateway, as shown above for turning on mesh-wide strict mTLS. Then, you will need to create the following resources:

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
* For requests coming from workloads inside the cluster that are not part of the service mesh, you may use [Knative cluster local encryption](https://knative.dev/docs/serving/encryption/encryption-overview/#cluster-local-encryption), although it is still in an experimental state. It would, also, require you to disable the KServe top-level virtual service as described earlier to ensure there is no plain-text port-of-entry.

If the experimental Knative cluster local encryption is not suitable for you, it is still possible to secure cluster-local traffic on the mesh border by configuring KServe with its own dedicated local gateway similarly as shown previously. The resources to create are as follows:

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
