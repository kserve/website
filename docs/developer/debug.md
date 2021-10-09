# KServe Debugging Guide

## Debug KServe Request flow

```
  +----------------------+        +-----------------------+      +--------------------------+
  |Istio Virtual Service |        |Istio Virtual Service  |      | K8S Service              |
  |                      |        |                       |      |                          |
  |sklearn-iris          |        |sklearn-iris-predictor |      | sklearn-iris-predictor   |
  |                      +------->|-default               +----->| -default-$revision       |
  |                      |        |                       |      |                          |
  |KServe Route          |        |Knative Route          |      | Knative Revision Service |
  +----------------------+        +-----------------------+      +------------+-------------+
   Istio Ingress Gateway           Knative Local Gateway                    Kube Proxy
                                                                              |
                                                                              |
                                                                              |
  +-------------------------------------------------------+                   |
  |  Knative Revision Pod                                 |                   |
  |                                                       |                   |
  |  +-------------------+      +-----------------+       |                   |
  |  |                   |      |                 |       |                   |
  |  |kserve-container   |<-----+ Queue Proxy     |       |<------------------+
  |  |                   |      |                 |       |
  |  +-------------------+      +--------------^--+       |
  |                                            |          |
  +-----------------------^-------------------------------+
                          | scale deployment   |
                 +--------+--------+           | pull metrics
                 |  Knative        |           |
                 |  Autoscaler     |-----------
                 |  KPA/HPA        |
                 +-----------------+
```
1. Traffic arrives through:
   - The `Istio Ingress Gateway` for external traffic
   - The `Istio Cluster Local Gateway` for internal traffic
   
`Istio Gateway` describes the edge of the mesh receiving incoming or outgoing HTTP/TCP connections. The specification describes a set of ports
that should be exposed and the type of protocol to use. If you are using `Standalone` mode, it installs the `Gateway` in `knative-serving` namespace,
if you are using `Kubeflow KServe`(KServe installed with Kubeflow), it installs the `Gateway` in `kubeflow` namespace e.g on GCP the gateway is protected behind `IAP` with [Istio authentication policy](https://istio.io/docs/tasks/security/authentication/authn-policy).

```bash
kubectl get gateway knative-ingress-gateway -n knative-serving -oyaml
```
```yaml
kind: Gateway
metadata:
  labels:
    networking.knative.dev/ingress-provider: istio
    serving.knative.dev/release: v0.12.1
  name: knative-ingress-gateway
  namespace: knative-serving
spec:
  selector:
    istio: ingressgateway
  servers:
  - hosts:
    - '*'
    port:
      name: http
      number: 80
      protocol: HTTP
  - hosts:
    - '*'
    port:
      name: https
      number: 443
      protocol: HTTPS
    tls:
      mode: SIMPLE
      privateKey: /etc/istio/ingressgateway-certs/tls.key
      serverCertificate: /etc/istio/ingressgateway-certs/tls.crt
```
The `InferenceService` request routes to the `Istio Ingress Gateway` by matching the host and port from the url, by default http is configured, you can [configure
HTTPS with TLS certificates](https://knative.dev/docs/serving/using-a-tls-cert).
 
2. KServe creates a `Istio virtual service` to specify routing rule for predictor, transformer, explainer.
```bash
kubectl get vs sklearn-iris -oyaml
```

==== "YAML"
```
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: sklearn-iris
  namespace: default
  gateways:
  - knative-serving/knative-local-gateway
  - knative-serving/knative-ingress-gateway
  hosts:
  - sklearn-iris.default.svc.cluster.local
  - sklearn-iris.default.example.com
  http:
  - headers:
      request:
        set:
          Host: sklearn-iris-predictor-default.default.svc.cluster.local
    match:
    - authority:
        regex: ^sklearn-iris\.default(\.svc(\.cluster\.local)?)?(?::\d{1,5})?$
      gateways:
      - knative-serving/knative-local-gateway
    - authority:
        regex: ^sklearn-iris\.default\.example\.com(?::\d{1,5})?$
      gateways:
      - knative-serving/knative-ingress-gateway
    route:
    - destination:
        host: knative-local-gateway.istio-system.svc.cluster.local
        port:
          number: 80
      weight: 100
```
- KServe creates the routing rule which by default routes to `Predictor` if you only have `Predictor` specified on `InferenceService`.
- When `Transformer` and `Explainer` are specified on `InferenceService` the routing rule configures the traffic to route to `Transformer`
or `Explainer` based on the verb.
- The request then routes to the second level `Knative` created virtual service via local gateway with the matching host header.

3. Knative creates a `Istio virtual service` to configure the gateway to route the inference request to the latest ready revision.

```bash
kubectl get vs sklearn-iris-predictor-default-ingress -oyaml
```

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: sklearn-iris-predictor-default-mesh
  namespace: default
spec:
  gateways:
  - knative-serving/knative-ingress-gateway
  - knative-serving/knative-local-gateway
  hosts:
  - sklearn-iris-predictor-default.default
  - sklearn-iris-predictor-default.default.example.com
  - sklearn-iris-predictor-default.default.svc
  - sklearn-iris-predictor-default.default.svc.cluster.local
  http:
  - headers:
      request:
        set:
          K-Network-Hash: fb61ebcd84e5af92624f7b01823bea2e40e2f6df37bce2bcce71d5dbcca26a8b
    match:
    - authority:
        prefix: sklearn-iris-predictor-default.default
      gateways:
      - knative-serving/knative-local-gateway
      headers:
        K-Network-Hash:
          exact: override
    - authority:
        prefix: sklearn-iris-predictor-default.default.svc
      gateways:
      - knative-serving/knative-local-gateway
      headers:
        K-Network-Hash:
          exact: override
    - authority:
        prefix: sklearn-iris-predictor-default.default
      gateways:
      - knative-serving/knative-local-gateway
      headers:
        K-Network-Hash:
          exact: override
    retries: {}
    route:
    - destination:
        host: sklearn-iris-predictor-default-00001.default.svc.cluster.local
        port:
          number: 80
      headers:
        request:
          set:
            Knative-Serving-Namespace: default
            Knative-Serving-Revision: sklearn-iris-predictor-default-00001
      weight: 100
  - match:
    - authority:
        prefix: sklearn-iris-predictor-default.default
      gateways:
      - knative-serving/knative-local-gateway
    - authority:
        prefix: sklearn-iris-predictor-default.default.svc
      gateways:
      - knative-serving/knative-local-gateway
    - authority:
        prefix: sklearn-iris-predictor-default.default
      gateways:
      - knative-serving/knative-local-gateway
    retries: {}
    route:
    - destination:
        host: sklearn-iris-predictor-default-00001.default.svc.cluster.local
        port:
          number: 80
      headers:
        request:
          set:
            Knative-Serving-Namespace: default
            Knative-Serving-Revision: sklearn-iris-predictor-default-00001
      weight: 100
  - headers:
      request:
        set:
          K-Network-Hash: fb61ebcd84e5af92624f7b01823bea2e40e2f6df37bce2bcce71d5dbcca26a8b
    match:
    - authority:
        prefix: sklearn-iris-predictor-default.default.example.com
      gateways:
      - knative-serving/knative-ingress-gateway
      headers:
        K-Network-Hash:
          exact: override
    retries: {}
    route:
    - destination:
        host: sklearn-iris-predictor-default-00001.default.svc.cluster.local
        port:
          number: 80
      headers:
        request:
          set:
            Knative-Serving-Namespace: default
            Knative-Serving-Revision: sklearn-iris-predictor-default-00001
      weight: 100
  - match:
    - authority:
        prefix: sklearn-iris-predictor-default.default.example.com
      gateways:
      - knative-serving/knative-ingress-gateway
    retries: {}
    route:
    - destination:
        host: sklearn-iris-predictor-default-00001.default.svc.cluster.local
        port:
          number: 80
      headers:
        request:
          set:
            Knative-Serving-Namespace: default
            Knative-Serving-Revision: sklearn-iris-predictor-default-00001
      weight: 100
```
The destination here is the `k8s Service` for the latest ready `Knative Revision` and it is reconciled by `Knative` every time
user rolls out a new revision. When a new revision is rolled out and in ready state, the old revision is then scaled down, after
configured revision GC time the revision resource is garbage collected if the revision no longer has traffic referenced.

4. Once the revision pods are ready, the `Kubernetes Service` routes the requests to the `queue proxy` sidecar of the inference service predictor pod on `port 8012`.
```bash
kubectl get svc sklearn-iris-predictor-default-fhmjk-private -oyaml
```
```yaml
apiVersion: v1
kind: Service
metadata:
  name: sklearn-iris-predictor-default-fhmjk-private
  namespace: default
spec:
  clusterIP: 10.105.186.18
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 8012
  - name: queue-metrics
    port: 9090
    protocol: TCP
    targetPort: queue-metrics
  - name: http-usermetric
    port: 9091
    protocol: TCP
    targetPort: http-usermetric
  - name: http-queueadm
    port: 8022
    protocol: TCP
    targetPort: 8022
  selector:
    serving.knative.dev/revisionUID: a8f1eafc-3c64-4930-9a01-359f3235333a
  sessionAffinity: None
  type: ClusterIP

```
5. The `queue proxy` sends concurrent requests that the `kserve container` can handle at a time configured with `ContainerConcurrency`.
If the `queue proxy` has more requests than it can handle, the [Knative Autoscaler](https://knative.dev/docs/serving/configuring-autoscaling/)
creates more pods to handle additional requests.

6. Finally The `queue proxy` routes traffic to the `kserve-container` for processing the inference requests.

## Debug KServe InferenceService Status

You deployed an InferenceService to KServe, but it is not in ready state. Go through this step by step guide to understand what failed.

```bash
kubectl get inferenceservices sklearn-iris 
NAME                  URL   READY   DEFAULT TRAFFIC   CANARY TRAFFIC   AGE
model-example               False                                      1m
```

### IngressNotConfigured
If you see `IngressNotConfigured` error, this indicates `Istio Ingress Gateway` probes are failing.

```bash
kubectl get ksvc
NAME                             URL                                                            LATESTCREATED                          LATESTREADY                            READY     REASON
sklearn-iris-predictor-default   http://sklearn-iris-predictor-default.default.example.com   sklearn-iris-predictor-default-jk794   mnist-sample-predictor-default-jk794   Unknown   IngressNotConfigured
```
You can then check Knative `networking-istio` pod logs for more details.
```shell
kubectl logs -l app=networking-istio -n knative-serving
```


If you are seeing HTTP 403, then you may have `Istio RBAC` turned on which blocks the probes to your service.
```json
{"level":"error","ts":"2020-03-26T19:12:00.749Z","logger":"istiocontroller.ingress-controller.status-manager","caller":"ingress/status.go:366",
"msg":"Probing of http://flowers-sample-predictor-default.kubeflow-jeanarmel-luce.example.com:80/ failed, IP: 10.0.0.29:80, ready: false, error: unexpected status code: want [200], got 403 (depth: 0)",
"commit":"6b0e5c6","knative.dev/controller":"ingress-controller","stacktrace":"knative.dev/serving/pkg/reconciler/ingress.(*StatusProber).processWorkItem\n\t/home/prow/go/src/knative.dev/serving/pkg/reconciler/ingress/status.go:366\nknative.dev/serving/pkg/reconciler/ingress.(*StatusProber).Start.func1\n\t/home/prow/go/src/knative.dev/serving/pkg/reconciler/ingress/status.go:268"}
``` 


### RevisionMissing Error
If you see `RevisionMissing` error, then your service pods are not in ready state. `Knative Service` creates [Knative Revision](https://knative.dev/docs/serving/spec/knative-api-specification-1.0/#revision) 
which represents a snapshot of the `InferenceService` code and configuration.


#### Storage Initializer fails to download model
```bash
kubectl get revision $(kubectl get configuration sklearn-iris-predictor-default --output jsonpath="{.status.latestCreatedRevisionName}") 
NAME                                   CONFIG NAME                      K8S SERVICE NAME                       GENERATION   READY     REASON
sklearn-iris-predictor-default-csjpw   sklearn-iris-predictor-default   sklearn-iris-predictor-default-csjpw   2            Unknown   Deploying
```

If you see `READY` status in `Unknown` error, this usually indicates that the KServe `Storage Initializer` init container fails to download the model and you can
check the init container logs to see why it fails, **note that the pod scales down after sometime if the init container fails**. 
```bash
kubectl get pod -l serving.kserve.io/inferenceservice=sklearn-iris
NAME                                                              READY   STATUS       RESTARTS   AGE
sklearn-iris-predictor-default-29jks-deployment-5f7d4b9996hzrnc   0/3     Init:Error   1          10s

kubectl logs -l model=sklearn-iris -c storage-initializer
[I 200517 03:56:19 initializer-entrypoint:13] Initializing, args: src_uri [gs://kfserving-samples/models/sklearn/iris-1] dest_path[ [/mnt/models]
[I 200517 03:56:19 storage:35] Copying contents of gs://kfserving-samples/models/sklearn/iris-1 to local
Traceback (most recent call last):
  File "/storage-initializer/scripts/initializer-entrypoint", line 14, in <module>
    kserve.Storage.download(src_uri, dest_path)
  File "/usr/local/lib/python3.7/site-packages/kfserving/storage.py", line 48, in download
    Storage._download_gcs(uri, out_dir)
  File "/usr/local/lib/python3.7/site-packages/kfserving/storage.py", line 116, in _download_gcs
    The path or model %s does not exist." % (uri))
RuntimeError: Failed to fetch model. The path or model gs://kfserving-samples/models/sklearn/iris-1 does not exist.
[I 200517 03:40:19 initializer-entrypoint:13] Initializing, args: src_uri [gs://kfserving-samples/models/sklearn/iris] dest_path[ [/mnt/models]
[I 200517 03:40:19 storage:35] Copying contents of gs://kfserving-samples/models/sklearn/iris to local
[I 200517 03:40:20 storage:111] Downloading: /mnt/models/model.joblib
[I 200517 03:40:20 storage:60] Successfully copied gs://kfserving-samples/models/sklearn/iris to /mnt/models
```

#### Inference Service in OOM status
If you see `ExitCode137` from the revision status, this means the revision has failed and this usually happens when the inference service pod is out of memory. To address it, you might need to bump up the memory limit of the `InferenceService`.
```bash
kubectl get revision $(kubectl get configuration sklearn-iris-predictor-default --output jsonpath="{.status.latestCreatedRevisionName}") 
NAME                                   CONFIG NAME                      K8S SERVICE NAME                       GENERATION   READY   REASON
sklearn-iris-predictor-default-84bzf   sklearn-iris-predictor-default   sklearn-iris-predictor-default-84bzf   8            False   ExitCode137s
```

#### Inference Service fails to start
If you see other exit codes from the revision status you can further check the pod status.
```bash
kubectl get pods -l serving.kserve.io/inferenceservice=sklearn-iris
sklearn-iris-predictor-default-rvhmk-deployment-867c6444647tz7n   1/3     CrashLoopBackOff        3          80s
```

If you see the `CrashLoopBackOff`, then check the `kserve-container` log to see more details where it fails, the error log is usually propagated on revision container status also.
```bash
kubectl logs sklearn-iris-predictor-default-rvhmk-deployment-867c6444647tz7n  kserve-container
[I 200517 04:58:21 storage:35] Copying contents of /mnt/models to local
Traceback (most recent call last):
  File "/usr/local/lib/python3.7/runpy.py", line 193, in _run_module_as_main
    "__main__", mod_spec)
  File "/usr/local/lib/python3.7/runpy.py", line 85, in _run_code
    exec(code, run_globals)
  File "/sklearnserver/sklearnserver/__main__.py", line 33, in <module>
    model.load()
  File "/sklearnserver/sklearnserver/model.py", line 36, in load
    model_file = next(path for path in paths if os.path.exists(path))
StopIteration
```

### Inference Service cannot fetch docker images from AWS ECR
If you don't see the inference service created at all for custom images from private registries (such as AWS ECR), it might be that the Knative Serving Controller fails to authenticate itself against the registry.

```bash
failed to resolve image to digest: failed to fetch image information: unsupported status code 401; body: Not Authorized
```

You can verify that this is actually the case by spinning up a pod that uses your image. The pod should be able to fetch it, if the correct IAM roles are attached, while Knative is not able to. To circumvent this issue you can either skip tag resolution or provide certificates for your registry as detailed in [the official knative docs](https://knative.dev/docs/serving/tag-resolution/).

```bash
kubectl -n knative-serving edit configmap config-deployment
```

The resultant yaml will look like something below.
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-deployment
  namespace: knative-serving
data:
  # List of repositories for which tag to digest resolving should be skipped (for AWS ECR: {account_id}.dkr.ecr.{region}.amazonaws.com)
  registriesSkippingTagResolving: registry.example.com
```
