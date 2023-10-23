# Deploy InferenceService with Transformer using Feast online feature store
Transformer is an `InferenceService` component which does pre/post processing alongside with model inference. In this example, instead of typical input transformation of raw data to tensors, we demonstrate a use case of online feature augmentation as part of preprocessing. We use a [Feast](https://github.com/feast-dev/feast) `Transformer` to gather online features, run inference with a `SKLearn` predictor, and leave post processing as pass-through.

## Before you begin 

1. Your ~/.kube/config should point to a cluster with [KServe installed](../../../../get_started/README.md#install-the-kserve-quickstart-environment).
2. Your cluster's Istio Ingress gateway must be [network accessible](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/).
3. You can find the [code samples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/transformer/feast) on kserve repository.

!!! Note
    This example uses Feast version `0.30.2`

## Create the Redis server
This example uses the [Redis](https://redis.io/) as the online store. 
Deploy the Redis server using the below command.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-server
  template:
    metadata:
      labels:
        app: redis-server
        name: redis-server
    spec:
      containers:
        - name: redis-server
          image: redis
          args: [ "--appendonly", "yes" ]
          ports:
            - name: redis-server
              containerPort: 6379
          env:
            - name: ALLOW_EMPTY_PASSWORD
              value: "yes"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  type: LoadBalancer
  selector:
    app: redis-server
  ports:
    - protocol: TCP
      port: 6379
      targetPort: 6379
EOF
```

!!! Success "Expected output"
    ```{ .bash .no-copy }
    $ deployment.apps/redis-server created
    $ service/redis-service created
    ```

## Create the Feast server

### Build Feature Store Initializer docker image
The feature store initializer is a init container which initializes a new sample feature repository, populate the 
online store with sample driver data and copies the feature repository to the volume mount.
The [feature store initializer dockerfile](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/feast/feature_store_initializer.Dockerfile) can be found in the code example directory.
Checkout the feast code example and under the example directory run the commands as following:

```bash
docker build -t $USERNAME/feature-store-initializer:latest -f feature_store_initializer.Dockerfile .

docker push $USERNAME/feature-store-initializer:latest
```

### Build Feast server docker image
The [feast server dockerfile](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/feast/feast_server.Dockerfile) can be found in the code example directory.

```bash
docker build -t $USERNAME/feast-server:latest -f feast_server.Dockerfile .

docker push $USERNAME/feast-server:latest
```
### Deploy Feast server

Wait until the Redis `Deployment` is available.
Now, update the init container and container's `image` field in the below command and deploy the Feast server.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: feature-server
  template:
    metadata:
      labels:
        app: feature-server
        name: feature-server
    spec:
      initContainers:
        - name: feature-store-initializer
          image: "{username}/feature-store-initializer:latest"
          volumeMounts:
            - mountPath: /mnt
              name: feature-store-volume
      containers:
        - name: feature-server
          image: "{username}/feast-server:latest"
          args: [ -c, /mnt/driver_feature_repo/feature_repo, serve, -h, 0.0.0.0 ]
          ports:
            - name: feature-server
              containerPort: 6566
          resources:
            requests:
              memory: "64Mi"
              cpu: "250m"
            limits:
              memory: "128Mi"
              cpu: "500m"
          volumeMounts:
            - mountPath: /mnt
              name: feature-store-volume
      volumes:
        - name: feature-store-volume
          emptyDir:
            sizeLimit: 100Mi

---
apiVersion: v1
kind: Service
metadata:
  name: feature-server-service
spec:
  type: LoadBalancer
  selector:
    app: feature-server
  ports:
    - protocol: TCP
      port: 6566
      targetPort: 6566
EOF
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    $ deployment.apps/feature-server created
    $ service/feature-server-service created
    ```

## Create a Transformer with Feast

### Extend the Model class and implement pre/post processing functions
`KServe.Model` base class mainly defines three handlers `preprocess`, `predict` and `postprocess`, these handlers are executed
in sequence, the output of the `preprocess` is passed to `predict` as the input, when `predictor_host` is passed the `predict` handler by default makes a HTTP call to the predictor url
and gets back a response which then passes to `postproces` handler. KServe automatically fills in the `predictor_host` for `Transformer` and handle the call to the `Predictor`, for gRPC
predictor currently you would need to overwrite the `predict` handler to make the gRPC call.

To implement a `Transformer` you can derive from the base `Model` class and then overwrite the `preprocess` and `postprocess` handler to have your own
customized transformation logic.

We created a class, DriverTransformer, which extends `Model` for this driver ranking example. It takes additional arguments for the transformer to interact with Feast:

* __feast_serving_url__: The Feast serving URL, in the form of `<host_name:port>` or `<ip:port>`
* __entity_id_name__: The name of the entity ID for which to retrieve features from the Feast feature store
* __feature_refs__: The feature references for the features to be retrieved

### Build Transformer docker image
The [driver transformer dockerfile](https://github.com/kserve/kserve/blob/master/docs/samples/v1beta1/transformer/feast/driver_transformer.Dockerfile) can be found in the code example directory.
Checkout the feast code example and under the example directory run the commands as following:

```bash
docker build -t $USERNAME/driver-transformer:latest -f driver_transformer.Dockerfile .

docker push $USERNAME/driver-transformer:latest
```

## Create the InferenceService
In the Feast Transformer image we packaged the driver transformer class so KServe knows to use the preprocess implementation to augment inputs with online features before making model inference requests.
Then the `InferenceService` uses `SKLearn` to serve the [driver ranking model](https://github.com/feast-dev/feast-driver-ranking-tutorial), which is trained with Feast offline features, available in a gcs bucket specified under `storageUri`.
Update the container's `image` field and the `feast_serving_url` argument to create the `InferenceService`, which includes a Feast Transformer and a SKLearn Predictor.

=== "New Schema"
    ```bash
    cat <<EOF | kubectl apply -f -
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-driver-transformer"
    spec:
      transformer:
        containers:
          - image: "kserve/driver-transformer:latest"
            name: driver-container
            command:
              - "python"
              - "-m"
              - "driver_transformer"
            args:
              - --feast_serving_url
              - "feature-server-service.default.svc.cluster.local:6566"
              - --entity_id_name
              - "driver_id"
              - --feature_refs
              - "driver_hourly_stats:conv_rate"
              - "driver_hourly_stats:acc_rate"
              - "driver_hourly_stats:avg_daily_trips"
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/feast/driver"
    EOF
    ```
=== "Old Schema"
    ```bash
    cat <<EOF | kubectl apply -f -
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-driver-transformer"
    spec:
      transformer:
        containers:
          - image: "kserve/driver-transformer:latest"
            name: driver-container
            command:
              - "python"
              - "-m"
              - "driver_transformer"
            args:
              - --feast_serving_url
              - "feature-server-service.default.svc.cluster.local:6566"
              - --entity_id_name
              - "driver_id"
              - --feature_refs
              - "driver_hourly_stats:conv_rate"
              - "driver_hourly_stats:acc_rate"
              - "driver_hourly_stats:avg_daily_trips"
      predictor:
        sklearn:
          storageUri: "gs://kfserving-examples/models/feast/driver"
    EOF
    ```

!!! success "Expected output"
    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/sklearn-driver-transformer created
    ```

## Run a prediction
Prepare the inputs for the inference request. Copy the following Json into a file named `driver-input.json`.

```json
{
  "instances": [[1001], [1002], [1003], [1004], [1005]]
}
```
Before testing the `InferenceService`, first check if it is in ready state.
Now, [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports
) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
SERVICE_NAME=sklearn-driver-transformer
MODEL_NAME=sklearn-driver-transformer
INPUT_PATH=@./driver-input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

!!! success "Expected output"
    ```{ .bash .no-copy }
    > POST /v1/models/sklearn-driver-transformer:predict HTTP/1.1
    > Host: sklearn-driver-transformer.default.example.com
    > User-Agent: curl/7.85.0
    > Accept: */*
    > Content-Length: 57
    > Content-Type: application/x-www-form-urlencoded
    > 
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 115
    < content-type: application/json
    < date: Thu, 30 Mar 2023 09:46:52 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 112
    < 
    * Connection #0 to host 1.2.3.4 left intact
    {"predictions":[0.45905828209879473,1.5118208033011165,0.21514156911776539,0.5555778492605103,0.49638665080127176]}
    ```
