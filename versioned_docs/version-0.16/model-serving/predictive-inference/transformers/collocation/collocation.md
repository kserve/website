---
title: Collocate Transformer and Predictor
description: Learn how to deploy a transformer and predictor in the same pod
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Collocate Transformer and Predictor

KServe by default deploys the Transformer and Predictor as separate Kubernetes deployments, allowing you to deploy them on different devices and scale them independently.

Nevertheless, there are certain situations where you might prefer to collocate the transformer and predictor within the same pod. Here are a few scenarios:

1. If your transformer is tightly coupled with the predictor, and you want to perform canary deployment together.
2. If you want to reduce sidecar resources.
3. If you want to reduce networking latency.

## Before you begin 

1. Your ~/.kube/config should point to a cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
2. Your cluster's Ingress gateway must be network accessible.

## Collocate Transformer and Model Container

Since the predictor and the transformer are now in the same pod as a list of containers, they need to listen on different ports to avoid conflict. In the following example `transformer-container` is configured to listen on port 8080 (REST) and 8081 (GRPC)
while `kserve-container` listens on port 8085 (REST). `transformer-container` calls `kserve-container` on port 8085 via local socket.

HTTP readiness probe can be specified in the transformer container to override the default TCP readiness probe.
You can set `--enable_predictor_health_check` argument to allow the transformer container to probe the model container health to make sure that both containers are healthy before the isvc is marked as ready.

### Deploy the InferenceService

Deploy the `Inferenceservice` using the below command:

<Tabs>
<TabItem value="model" label="With Predictor Model">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: "transformer-collocation"
spec:
  predictor:
    model:
      modelFormat:
        name: "pytorch"
      storageUri: "gs://kfserving-examples/models/torchserve/image_classifier/v1"
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 1
          memory: 1Gi
    containers:
      - name: "transformer-container"    # Do not change the container name
        image: "kserve/image-transformer:latest"
        args:
          - --model_name=mnist
          - --predictor_protocol=v1
          - --http_port=8080
          - --grpc_port=8081
          - "--predictor_host=localhost:8085"      # predictor listening port
          - "--enable_predictor_health_check"      # transformer checks for predictor health before marking itself as ready
        ports:
          - containerPort: 8080
            protocol: TCP
        readinessProbe:
          httpGet:
            path: /v1/models/mnist
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1
            memory: 1Gi
```

</TabItem>
<TabItem value="custom" label="With Custom Predictor">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: "transformer-collocation"
spec:
  predictor:
    containers:
      - name: "kserve-container"        # Do not change the name; This should be the predictor container
        image: "pytorch/torchserve:0.9.0-cpu"
        args:
          - "torchserve"
          - "--start"
          - "--model-store=/mnt/models/model-store"
          - "--ts-config=/mnt/models/config/config.properties"
        env:
          - name: TS_SERVICE_ENVELOPE
            value: kserve
          - name: STORAGE_URI    # This will trigger storage initializer; Should be only present in predictor container
            value: "gs://kfserving-examples/models/torchserve/image_classifier/v1"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1
            memory: 1Gi
      - name: "transformer-container "   # Do not change the container name
        image: kserve/image-transformer:latest
        args:
          - --model_name=mnist
          - --predictor_protocol=v1
          - --http_port=8080
          - --grpc_port=8081
          - "--predictor_host=localhost:8085"      # predictor listening port
          - "--enable_predictor_health_check"
        ports:
          - containerPort: 8080
            protocol: TCP
        readinessProbe:
          httpGet:
            path: /v1/models/mnist
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1
            memory: 1Gi
```

</TabItem>
</Tabs>

:::note

The storageUri should be only present in the `kserve-container` not in the `transformer-container`.

:::

:::note

Set the transformer container name to `transformer-container` so, the model volume is also mounted to the transformer
container besides the model container. The model container name should be set to `kserve-container` as KServe internally uses this name to find out the
model container.

:::

:::note

In Knative mode, specifying ports for predictor will result in isvc creation failure as specifying multiple ports
is not supported by knative. Due to this limitation predictor cannot be exposed outside of the cluster.
For more info see, [knative discussion on multiple ports](https://github.com/knative/serving/issues/8471).

:::
Apply the InferenceService YAML:

```bash
kubectl apply -f transformer-collocation.yaml
```

:::tip[Expected output]

```bash
inferenceservice.serving.kserve.io/transformer-collocation created
```

:::

:::tip

Check the [Transformer documentation](../custom-transformer/custom-transformer.md#transformer-specific-command-line-arguments) for list of arguments that can be passed to the transformer container.

:::

### Check InferenceService Status
```bash
kubectl get isvc transformer-collocation
```
:::tip[Expected output]

```bash
NAME                      URL                                                READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                      AGE
transformer-collocation   http://transformer-collocation.default.example.com True           100                              transformer-collocation-predictor-00001   133m
```

:::

:::note

If your DNS contains `svc.cluster.local`, then `Inferenceservice` is not exposed through Ingress. You need to [configure DNS](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns) 
or [use a custom domain](https://knative.dev/docs/serving/using-a-custom-domain/) in order to expose the `isvc`.

:::

### Run a Prediction
Prepare the [inputs](../custom-transformer/image.json) for the inference request. Copy the following Json into a file named `image.json`.

Now, [determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
SERVICE_NAME=transformer-collocation
MODEL_NAME=mnist
INPUT_PATH=@./image.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```
You can use `curl` to send the inference request as:
```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

:::tip[Expected output]

```bash
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/mnist:predict HTTP/1.1
> Host: transformer-collocation.default.example.com
> User-Agent: curl/7.85.0
> Accept: */*
> Content-Type: application/json
> Content-Length: 427
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 19
< content-type: application/json
< date: Sat, 02 Dec 2023 09:13:16 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 315
< 
* Connection #0 to host localhost left intact
{"predictions":[2]}
```

:::

## Defining Collocation In ServingRuntime

You can also define the collocation in the `ServingRuntime` and use it in the `InferenceService`. This is useful when you want to use the same transformer for multiple models.

### Create ServingRuntime

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: pytorch-collocation
spec:
  annotations:
    prometheus.kserve.io/port: "8080"
    prometheus.kserve.io/path: "/metrics"
  supportedModelFormats:
    - name: pytorch
      version: "1"
      autoSelect: true
      priority: 1
  protocolVersions:
    - v1
  containers:
    - name: kserve-container
      image: pytorch/torchserve:0.9.0-cpu
      args:
        - torchserve
        - --start
        - --model-store=/mnt/models/model-store
        - --ts-config=/mnt/models/config/config.properties
      env:
        - name: "TS_SERVICE_ENVELOPE"
          value: "{{.Labels.serviceEnvelope}}"
      securityContext:
        runAsUser: 1000    # User ID is not defined in the Dockerfile, so we need to set it here to run as non-root
        allowPrivilegeEscalation: false
        privileged: false
        runAsNonRoot: true
        capabilities:
          drop:
            - ALL
      resources:
        requests:
          cpu: "1"
          memory: 2Gi
        limits:
          cpu: "1"
          memory: 2Gi
    
    - name: "transformer-container"    # Do not change the container name
      image: kserve/image-transformer:latest
      args:
        - --model_name={{.Labels.modelName}}
        - --predictor_protocol=v1
        - --http_port=8080
        - --grpc_port=8081
        - "--predictor_host=localhost:8085"      # predictor listening port
        - "--enable_predictor_health_check"      # transformer checks for predictor health before marking itself as ready
      ports:
        - containerPort: 8080
          protocol: TCP
      readinessProbe:
          httpGet:
            path: /v1/models/{{.Labels.modelName}}
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 1
          memory: 1Gi
```

:::note

Do not specify ports for predictor in the serving runtime for Knative deployment. This is not supported by knative. 
For more information, please take a look at [knative discussion on multiple ports](https://github.com/knative/serving/issues/8471).

:::

Apply the ServingRuntime YAML:

```bash
kubectl apply -f collocation-servingruntime.yaml
```

:::tip[Expected output]

```bash
servingruntime.serving.kserve.io/pytorch-collocation created
```

:::

### Deploy the InferenceService
You can now use the `pytorch-collocation` runtime in your `InferenceService`:

```yaml 
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: transformer-collocation-runtime
  labels:
    modelName: mnist
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchserve/image_classifier/v1
      #  highlight-next-line
      runtime: "pytorch-collocation"
    containers:
      - name: "transformer-container"    # Do not change the container name
        image: kserve/image-transformer:latest
        resources:                         # You can override the serving runtime values
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
```

:::tip[Expected output]

```bash
inferenceservice.serving.kserve.io/transformer-collocation-runtime created
```

:::
