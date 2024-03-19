# Deploy InferenceService with a saved model on Google Cloud Storage (GCS)

## Using Public GCS Bucket

If no credential is provided, anonymous client will be used to download the artifact from GCS bucket.
The uri is in the following format:


```
gs://${BUCKET_ NAME}/${PATH}
```

e.g. ```gs://kfserving-examples/models/tensorflow/flowers```


## Using Private GCS bucket

KServe supports authenticating using Google Service Account Key

### Create a Service Account Key

* To create a Service Account Key follow the steps [here](https://cloud.google.com/iam/docs/keys-create-delete#iam-service-account-keys-create-console).
* Base64 encode the generated Service Account Key file


## Create Google Secret

### Create secret
=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
stringData:
  gcs: |
    {
      "type": "gs",
      "bucket": "mlpipeline",
      "base64_service_account": "c2VydmljZWFjY291bnQ=" # base64 encoded value of the credential file
    }
```

=== "kubectl"
```bash
kubectl apply -f create-gcs-secret.yaml
```

## Deploy the model on GCS with `InferenceService`

Create the InferenceService with the Google service account credential
=== "yaml"
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
    name: sklearn-gcs
spec:
  predictor:
      sklearn:
        storage:
          key: gcs
          path: models/tensorflow/flowers
          parameters: # Parameters to override the default values
            bucket: kfserving-examples
```

Apply the `sklearn-gcs.yaml`.

=== "kubectl"
```bash
kubectl apply -f sklearn-gcs.yaml
```

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-gcs -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=sklearn-gcs
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    *   Trying 127.0.0.1:8080...
    * TCP_NODELAY set
    * Connected to localhost (127.0.0.1) port 8080 (#0)
    > POST /v1/models/sklearn-gcs:predict HTTP/1.1
    > Host: sklearn-gcs.default.example.com
    > User-Agent: curl/7.68.0
    > Accept: */*
    > Content-Length: 84
    > Content-Type: application/x-www-form-urlencoded
    >
    * upload completely sent off: 84 out of 84 bytes
    * Mark bundle as not supporting multiuse
    < HTTP/1.1 200 OK
    < content-length: 23
    < content-type: application/json; charset=UTF-8
    < date: Mon, 20 Sep 2021 04:55:50 GMT
    < server: istio-envoy
    < x-envoy-upstream-service-time: 6
    <
    * Connection #0 to host localhost left intact
    {"predictions": [1, 1]}
    ```

