# Deploy InferenceService in ServiceMesh mode
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

- When activator is not on the request path, the rule should be simply checking the source namespace which is `user1` in this example.

- When activator is on the request path, the rule needs to check the source namespace from `knative-serving` namespace, however currently it is not able to check the original namespace or identity due to the [net-istio issue](https://github.com/knative-sandbox/net-istio/issues/554).

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

### Disable Top Level Virtual Service 
KServe currently creates an Istio top level virtual service to support routing between InferenceService components like predictor, transformer and explainer, as well as support path based routing as an alternative routing with service hosts. However in serverless service mesh mode this creates a problem that in order to route through the underlying virtual service created by Knative Service, the top level virtual service is required to route to the Istio Gateway instead of the InferenceService component on the service mesh directly.

By disabling the top level virtual service, it eliminates the extra route to istio local gateway and the authorization policy can check the source namespace when mTLS happens directly between service to service when activator is not on the request path. To disable the top level virtual service, add the flag `"disableIstioVirtualHost": true` under the **ingress** config in inferenceservice configmap.

```bash
kubectl edit configmap/inferenceservice-config --namespace kserve

ingress : |- {
    "disableIstioVirtualHost": true
}
```

## Deploy InferenceService with Istio sidecar injection
First label the namespace with `istio-injection=enabled` to turn on the sidecar injection for the namespace.

```bash
kubectl label namespace user1 istio-injection=enabled --overwrite
```

Create the InferenceService with and without Knative activator on the path, when `autoscaling.knative.dev/targetBurstCapacity` is set to 0,
Knative removes the activator from the request path so the request from test service directly establishes the mTLS connection to the `InferenceService` and
authorization policy can check the original namespace to lock down the traffic for namespace isolation.

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
==** Expected Output **==

```bash
inferenceservice.serving.kserve.io/sklearn-iris created
inferenceservice.serving.kserve.io/sklearn-iris-burst created

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

==** Expected Output **==

```bash
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

==** Expected Output **==

```bash
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

Run a prediction request to the `sklearn-iris` InferenceService without activator, you are expected to get HTTP 403 "RBAC denied" as the authorization rule only
allows the traffic from the same namespace `user1` which the InferenceService is deployed to.
```bash
kubectl exec -it sleep-6d6b49d8b8-6ths6   -- curl -v sklearn-iris-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris
```

==** Expected Output **==

```bash
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

How when you send a prediction request to the `sklearn-iris-burst` InferenceService with activator, you are getting the HTTP 200 response due to the above limitation as we are
not able to lock down the traffic original namespace as the request is proxyed through activator in `knative-serving` namespace.
```bash
kubectl exec -it sleep-6d6b49d8b8-6ths6   -- curl -v sklearn-iris-burst-predictor-default.user1.svc.cluster.local/v1/models/sklearn-iris-burst
```

==** Expected Output **==

```bash
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