---
title: Azure
description: Deploy models to KServe InferenceService from Azure Blob Storage, with support for both public and private blobs.
---

# Deploy InferenceService with saved model on Azure

## Using Public Azure Blobs

By default, KServe uses anonymous client to download artifacts. To point to an Azure Blob, specify StorageUri to point to an Azure Blob Storage with the format:
```
https://{$STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{$CONTAINER}/{$PATH}
```

e.g. https://modelstoreaccount.blob.core.windows.net/model-store/model.joblib

## Using Private Blobs

KServe supports authenticating using an Azure Service Principle.

### Create an authorized Azure Service Principle

* To create an Azure Service Principle follow the steps [here](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?view=azure-cli-latest).
* Assign the SP the `Storage Blob Data Owner` role on your blob (KServe needs this permission as it needs to list contents at the blob path to filter items to download).
* Details on assigning storage roles [here](https://docs.microsoft.com/en-us/azure/storage/common/storage-auth-aad).

```bash
az ad sp create-for-rbac --name model-store-sp --role "Storage Blob Data Owner" \
    --scopes /subscriptions/2662a931-80ae-46f4-adc7-869c1f2bcabf/resourceGroups/cognitive/providers/Microsoft.Storage/storageAccounts/modelstoreaccount
```

## Create Azure Secret and attach to Service Account

### Create Azure secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azcreds
type: Opaque
stringData: # use `stringData` for raw credential string or `data` for base64 encoded string
  AZ_CLIENT_ID: xxxxx
  AZ_CLIENT_SECRET: xxxxx
  AZ_SUBSCRIPTION_ID: xxxxx
  AZ_TENANT_ID: xxxxx
```

A [SAS](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview) Token can be used to authenticate as well:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azcreds
type: Opaque
stringData: # use `stringData` for raw credential string or `data` for base64 encoded string
  AZURE_STORAGE_ACCESS_KEY: xxxxx
```

### Attach secret to a service account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
secrets:
- name: azcreds
```

```bash
kubectl apply -f create-azure-secret.yaml
```

## Deploy the model on Azure with `InferenceService`

Create the InferenceService with the azure `storageUri` and the service account with azure credential attached.

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-azure"
spec:
  predictor:
    serviceAccountName: sa
    model:
      modelFormat:
        name: sklearn
      storageUri: "https://modelstoreaccount.blob.core.windows.net/model-store/model.joblib"
```

Apply the `sklearn-azure.yaml`.

```bash
kubectl apply -f sklearn-azure.yaml
```

### Configuring blob download

There are a number of environment variables that allow to configure azure blob download parallelization:

```yaml
spec:
  predictor:
    model:
      env:
      - name: AZURE_MAX_FILE_CONCURRENCY
        value: 4
      - name: AZURE_MAX_CHUNK_CONCURRENCY
        value: 4
```

The above example shows the default values. Together they control how many files are downloaded in parallel, and the download parallelism of each file.
Note that each download has a buffer of 8MiB.

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

### Sample Input

Here is a sample input JSON file that you can use for testing:

```json title="input.json"
{
    "instances": [
      [6.8,  2.8,  4.8,  1.4],
      [6.0,  3.4,  4.5,  1.6]
    ]
}
```

### Running the prediction

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-azure -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=sklearn-azure
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]

```bash
*   Trying 127.0.0.1:8080...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/sklearn-azure:predict HTTP/1.1
> Host: sklearn-azure.default.example.com
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

:::
