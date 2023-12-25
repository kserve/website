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

## Deploy the InferenceService

Since, the predictor and the transformer are in the same pod, they need to listen on different ports to avoid conflict. `Transformer` is configured to listen on port 8080 (REST) and 8081 (GRPC) 
while, `Predictor` listens on port 8085 (REST). `Transformer` calls `Predictor` on port 8085 via local socket. 
Deploy the `Inferenceservice` using the below command.

```bash
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
          - --protocol=v1    # protocol of the predictor; used for converting the input to specific protocol supported by the predictor
          - --http_port=8080
          - --grpc_port=8081
          - --predictor_host=localhost:8085      # predictor listening port
        ports:
          - containerPort: 8080
            protocol: TCP
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
    Currently, The collocation support is limited to the custom container spec for kserve model container.

!!! Note
    In Serverless mode, Specifying ports for predictor will result in isvc creation failure as specifying multiple ports 
    is not supported by knative. Due to this limitation predictor cannot be exposed to the outside cluster. 
    For more info see, [knative discussion on multiple ports](https://github.com/knative/serving/issues/8471).

## Check InferenceService status
```bash
kubectl get isvc custom-transformer-collocation
```
!!! success "Expected output"
    ```{ .bash .no-copy }
    NAME                             URL                                                         READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                              AGE
    custom-transformer-collocation   http://custom-transformer-collocation.default.example.com   True           100                              custom-transformer-collocation-predictor-00001   133m
    ```

!!! Note
    If your DNS contains `svc.cluster.local`, then `Inferenceservice` is not exposed through Ingress. you need to [configure DNS](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns) 
    or [use a custom domain](https://knative.dev/docs/serving/using-a-custom-domain/) in order to expose the `isvc`.

## Run a prediction
Prepare the [inputs](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/collocation/input.json) for the inference request. Copy the following Json into a file named `input.json`.

Now, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports
) and set `INGRESS_HOST` and `INGRESS_PORT`

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
