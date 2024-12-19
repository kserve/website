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

### Create a Google Service Account Key

* To create a Service Account Key follow the steps [here](https://cloud.google.com/iam/docs/keys-create-delete#iam-service-account-keys-create-console).
* Base64 encode the generated Service Account Key file


## Create Secret and attach to Service Account


### Create secret

You can create a secret using either the imperative kubectl command or by declaratively defining it in a YAML file.

#### Using Imperative Command

=== "kubectl"
```bash
kubectl create secret generic gcscreds --from-file=gcloud-application-credentials.json=/path/to/gcloud-application-credentials.json
```

#### Using Declarative YAML

=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcscreds
type: Opaque
data:
  gcloud-application-credentials.json: <base64 encoded value of the credential file>
```

=== "kubectl"
```bash
kubectl apply -f gcs-secret.yaml
```

### Attach secret to a service account
=== "yaml"
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
secrets:
- name: gcscreds
```


## Deploy the model on GCS with `InferenceService`

Create the InferenceService with the Google service account credential
=== "yaml"
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: tensorflow-gcs
spec:
  predictor:
    serviceAccountName: sa
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"

```

Apply the `tensorflow-gcs.yaml`.

=== "kubectl"
```bash
kubectl apply -f tensorflow-gcs.yaml
```

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice tensorflow-gcs -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=tensorflow-gcs
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    *   Trying 127.0.0.1:8080...
    * TCP_NODELAY set
    * Connected to localhost (127.0.0.1) port 8080 (#0)
    > POST /v1/models/tensorflow-gcs:predict HTTP/1.1
    > Host: tensorflow-gcs.default.example.com
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

