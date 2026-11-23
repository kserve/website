---
title: Store Logs in Blob Storage
description: "Configure KServe to log inference data directly to blob storage"
---

# Store Logs in Blob Storage

The log messages can be stored directly to blob storage. Similar to the model storage configuration, the logger supports
access to the blob storage via service account.

## Prerequisites
- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- Have Familiarity with [Kserve Inference Logger](./basic-logger.md).

## Configuration Process

### 1. Create Service Account and Secret

The service account must exist and contain the credentials for the blob storage. First, create a secret with the credentials that the logger agent will use to access the blob storage. The secret must be in the same namespace as the InferenceService.

For S3:
```yaml
apiVersion: v1
kind: Secret
metadata:
  annotations:
      serving.kserve.io/s3-region: [YOUR_REGION]
  name: agent-logger-secret
  namespace: default
type: Opaque
data:
  AWS_ACCESS_KEY_ID: [YOUR_ACCESS_KEY_ID]
  AWS_DEFAULT_REGION: [YOUR_REGION]
  AWS_SECRET_ACCESS_KEY: [YOUR_SECRET_ACCESS_KEY]
```

For Azure:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: agent-logger-secret
  namespace: default
type: Opaque
data:
  AZURE_SERVICE_URL: [YOUR_SERVICE_URL]
  AZURE_ACCESS_TOKEN: [YOUR_TOKEN]
  AZURE_TENANT_ID: [YOUR_TENANT_ID]
```

For GCS:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: agent-logger-secret
  namespace: default
type: Opaque
data:
  gcloud-application-credentials.json: |
    {
      "type": "service_account",
      "project_id": "[YOUR_PROJECT_ID]",
      "private_key_id": "[YOUR_PRIVATE_KEY_ID]",
      "private_key": "[YOUR_PRIVATE_KEY]",
      "client_email": "[YOUR_CLIENT_EMAIL]",
      "client_id": "110958787537438673409",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "[YOUR_X509_CERT_URL]",
      "universe_domain": "googleapis.com"
    }
```


Next, create a service account that provides the secret.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: logger-sa
  namespace: default
secrets:
- name: agent-logger-secret
```

### 2. Create the InferenceService

Create the inference service and configure the blob storage logger.

When specifying the logger configuration you must specify the bucket url for the data that will be stored. The URL protocol is used to determine the cloud storage:
- `s3://` - S3-compatible
- `abfs://` - Azure
- `gs://` - Google cloud store

When specifying the logger configuration you must specify the logger format for the data that will be stored. Valid values are:
- `json` - The log messages will be stored as JSON files.

Additional supported formats are planned for future releases, such as `parquet` and `csv`.


```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
spec:
predictor:
  logger:
    mode: all
    url: [YOUR_BUCKET_URL]
    storage:
      path: /logs
      parameters:
        type: s3
        format: json
      key: logger-credentials
      serviceAccountName: logger-sa
  model:
    modelFormat:
      name: sklearn
    storageUri: gs://kfserving-examples/models/sklearn/1.0/model
```

## Storage Format

When inferences occur they will get stored as JSON files in the specified bucket. There will be a file for the request and a file for the response, and the response will contain the actual prediction in BASE64 encoding.

## Benefits of Blob Storage Logging

- **Persistence**: Log data is stored durably in blob storage, even if the cluster fails
- **Scalability**: Cloud storage can handle large volumes of log data
- **Separation of Concerns**: Logging system is decoupled from your serving infrastructure
- **Data Analytics**: Stored logs can be analyzed using big data processing tools
