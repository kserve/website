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

Since, the predictor and the transformer are in the same pod, they need to listen on different ports to avoid conflict. `Transformer` is configured to listen on port 8000 and 8081 
while, `Predictor` listens on port 8080 and 8082. `Transformer` calls `Predictor` on port 8082 via local socket. 
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
      - name: kserve-container
        image: kserve/custom-model-grpc:latest
        args:
          - --model_name=custom-model
          - --grpc_port=8082
          - --http_port=8080

      - image: kserve/image-transformer:latest
        name: transformer-container    # Do not change the container name
        args:
          - --model_name=custom-model
          - --protocol=grpc-v2
          - --http_port=8000
          - --grpc_port=8081
          - --predictor_host=localhost:8082
        ports:
          - containerPort: 8000
            protocol: TCP
EOF
```
!!! success "Expected output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/custom-transformer-collocation created
    ```

!!! Warning
    Always use the transformer container name as `transformer-container`. Otherwise, the model volume is not mounted to the transformer 
    container which may result in an error.

!!! Note
     Currently, The collocation support is limited to the custom container spec for kserve model container.

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
MODEL_NAME=custom-model
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```
You can use `curl` to send the inference request as:
```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/$MODEL_NAME/infer
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    *   Trying 127.0.0.1:8080...
    * Connected to localhost (127.0.0.1) port 8080 (#0)
    > POST /v2/models/custom-model/infer HTTP/1.1
    > Host: custom-transformer-collocation.default.example.com
    > User-Agent: curl/7.85.0
    > Accept: */*
    > Content-Type: application/json
    > Content-Length: 105396
    > 
    * We are completely uploaded and fine
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 298
    < content-type: application/json
    < date: Thu, 04 May 2023 10:35:30 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 1273
    < 
    * Connection #0 to host localhost left intact
    {"model_name":"custom-model","model_version":null,"id":"d685805f-a310-4690-9c71-a2dc38085d6f","parameters":null,"outputs":[{"name":"output-0","shape":[1,5],"datatype":"FP32","parameters":null,"data":[14.975618362426758,14.036808967590332,13.966032028198242,12.252279281616211,12.086268424987793]}]}
    ```
