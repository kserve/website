# Collocate transformer and predictor in same pod

KServe by default deploys the Transformer and Predictor as separate services, allowing you to deploy them on different devices and scale them independently.
<br/>Nevertheless, there are certain situations where you might prefer to collocate the transformer and predictor within the same pod. Here are a few scenarios:

1. If your transformer is tightly coupled with the predictor and you want to perform canary deployment together.
2. If you want to reduce sidecar resources.
3. If you want to reduce networking latency.

## Before you begin 

1. Your ~/.kube/config should point to a cluster with [KServe installed](../../../../get_started/README.md#install-the-kserve-quickstart-environment).
2. Your cluster's Istio Ingress gateway must be [network accessible](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/).
3. You can find the [code samples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/transformer/collocation) on kserve repository.

## Collocation with Custom Containers
### Deploy the InferenceService

Since, the predictor and the transformer are in the same pod, they need to listen on different ports to avoid conflict. `Transformer` is configured to listen on port 8080 (REST) and 8081 (GRPC) 
while, `Predictor` listens on port 8085 (REST). `Transformer` calls `Predictor` on port 8085 via local socket. 
Deploy the `Inferenceservice` using the below command.

!!! note
    HTTP readiness probe can be specified in the transformer container to override the default TCP readiness probe. You can provide `--enable_predictor_health_check` argument to allow the transformer container to check the predictor health as well. This will make sure that both the containers are healthy before the isvc is marked as ready.

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: custom-transformer-collocation
spec:
  predictor:
    containers:
      - name: kserve-container        # Do not change the name; This should be the predictor container
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

      - name: transformer-container    # Do not change the container name
        image: kserve/image-transformer:latest
        args:
          - --model_name=mnist
          - --predictor_protocol=v1
          - --http_port=8080
          - --grpc_port=8081
          - --predictor_host=localhost:8085      # predictor listening port
          - --enable_predictor_health_check
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
EOF
```
!!! success "Expected output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/custom-transformer-collocation created
    ```

!!! Warning
    Always use the transformer container name as `transformer-container`. Otherwise, the model volume is not mounted to the transformer 
    container which may result in an error.

!!! Warning
    Always use the predictor container name as `kserve-container`. Kserve internally uses this name to find out the
    predictor. The storage uri should be only present in this container. If it is specified in the transformer 
    container the isvc creation will fail.

!!! Note
    In Serverless mode, Specifying ports for predictor will result in isvc creation failure as specifying multiple ports 
    is not supported by knative. Due to this limitation predictor cannot be exposed to the outside cluster. 
    For more info see, [knative discussion on multiple ports](https://github.com/knative/serving/issues/8471).

!!! Tip
    Check the [Transformer documentation](../torchserve_image_transformer/#transformer-specific-commandline-arguments) for list of arguments that can be passed to the transformer container.

### Check InferenceService Status
```bash
kubectl get isvc custom-transformer-collocation
```
!!! success "Expected output"
    ```{ .bash .no-copy }
    NAME                             URL                                                         READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                              AGE
    custom-transformer-collocation   http://custom-transformer-collocation.default.example.com   True           100                              custom-transformer-collocation-predictor-00001   133m
    ```

!!! Note
    If your DNS contains `svc.cluster.local`, then `Inferenceservice` is not exposed through Ingress. You need to [configure DNS](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns) 
    or [use a custom domain](https://knative.dev/docs/serving/using-a-custom-domain/) in order to expose the `isvc`.

### Run a Prediction
Prepare the [inputs](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/collocation/input.json) for the inference request. Copy the following Json into a file named `input.json`.

Now, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
SERVICE_NAME=custom-transformer-collocation
MODEL_NAME=mnist
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```
You can use `curl` to send the inference request as:
```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    *   Trying 127.0.0.1:8080...
    * Connected to localhost (127.0.0.1) port 8080 (#0)
    > POST /v1/models/mnist:predict HTTP/1.1
    > Host: custom-transformer-collocation.default.example.com
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

## Collocation with Model Serving Runtime
### Deploy the InferenceService

Since the predictor and the transformer are in the same pod, they need to listen on different ports to avoid conflict. In this example `Transformer` is configured to listen on port 8080 (REST) and 8081 (GRPC) 
while `Predictor` listens on port 8085 (REST) and `Transformer` calls `Predictor` on port 8085 via local socket. Please review the default listening ports for each model serving runtimes to configure properly.
Deploy the `Inferenceservice` using the following command:

!!! note
    HTTP readiness probe can be specified in the transformer container to override the default TCP readiness probe. You can provide `--enable_predictor_health_check` argument to allow the transformer container to check the predictor health as well. This will make sure that both the containers are healthy before the isvc is marked as ready.

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: transformer-collocation
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchserve/image_classifier/v1
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 1
          memory: 1Gi
    containers:
      - name: transformer-container    # Do not change the container name
        image: kserve/image-transformer:latest
        args:
          - --model_name=mnist
          - --predictor_protocol=v1
          - --http_port=8080
          - --grpc_port=8081
          - --predictor_host=localhost:8085      # predictor listening port
          - --enable_predictor_health_check      # transformer checks for predictor health before marking itself as ready
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
EOF
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/transformer-collocation created
    ```

### Check InferenceService Status
```bash
kubectl get isvc custom-transformer-collocation
```
!!! success "Expected output"
    ```{ .bash .no-copy }
    NAME                             URL                                                         READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                              AGE
    transformer-collocation   http://transformer-collocation.default.example.com   True           100                              transformer-collocation-predictor-00001   133m
    ```

!!! Note
    If your DNS contains `svc.cluster.local`, then `Inferenceservice` is not exposed through Ingress. You need to [configure DNS](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns) 
    or [use a custom domain](https://knative.dev/docs/serving/using-a-custom-domain/) in order to expose the `isvc`.

### Run a Prediction
Prepare the [inputs](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/collocation/input.json) for the inference request. Copy the following Json into a file named `input.json`.

Now, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
SERVICE_NAME=transformer-collocation
MODEL_NAME=mnist
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```
You can use `curl` to send the inference request as:
```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

!!! success "Expected output"
    ```{ .bash .no-copy }
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


## Defining Collocation In ServingRuntime

You can also define the collocation in the `ServingRuntime` and use it in the `InferenceService`. This is useful when you want to use the same transformer for multiple models.

### Create ServingRuntime

```yaml
cat <<EOF | kubectl apply -f -
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
          value: "{% raw %}{{.Labels.serviceEnvelope}}{% endraw %}"
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
    
    - name: transformer-container    # Do not change the container name
      image: kserve/image-transformer:latest
      args:
        - --model_name={% raw %}{{.Labels.modelName}}{% endraw %}
        - --predictor_protocol=v1
        - --http_port=8080
        - --grpc_port=8081
        - --predictor_host=localhost:8085      # predictor listening port
        - --enable_predictor_health_check      # transformer checks for predictor health before marking itself as ready
      ports:
        - containerPort: 8080
          protocol: TCP
      readinessProbe:
          httpGet:
            path: /v1/models/{% raw %}{{.Labels.modelName}}{% endraw %}
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
EOF
```

!!! note
    Do not specify ports for predictor in the serving runtime for Serverless deployment. This is not supported by knative. 
    For more information, please take a look at [knative discussion on multiple ports](https://github.com/knative/serving/issues/8471).

!!! success "Expected output"
    ```{ .bash .no-copy }
    $ servingruntime.serving.kserve.io/pytorch-collocation created
    ```
### Create InferenceService

```yaml
cat <<EOF | kubectl apply -f -
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
      runtime: pytorch-collocation
    containers:
      - name: transformer-container    # Do not change the container name
        image: kserve/image-transformer:latest
        resources:                         # You can override the serving runtime values
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
EOF
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/transformer-collocation-runtime created
    ```
