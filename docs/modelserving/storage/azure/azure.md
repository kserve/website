
# Predict on a InferenceService with saved model on Azure

## Using Public Azure Blobs

By default, KServe uses anonymous client to download artifacts. To point to an Azure Blob, specify StorageUri to point to an Azure Blob Storage with the format: 
```https://{$STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{$CONTAINER}/{$PATH}```

e.g. https://kserve.blob.core.windows.net/triton/v1.0/


## Using Private Blobs

KServe supports authenticating using an Azure Service Principle.

### Create an authorized Azure Service Principle

* To create an Azure Service Principle follow the steps [here](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?view=azure-cli-latest).
* Assign the SP the `Storage Blob Data Owner` role on your blob (KServe needs this permission as it needs to list contents at the blob path to filter items to download).
* Details on assigning storage roles [here](https://docs.microsoft.com/en-us/azure/storage/common/storage-auth-aad).

## Create Azure Secret and attach to Service Account

### Create Azure secret
=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azcreds
type: Opaque
data:
  AZ_CLIENT_ID: xxxxx
  AZ_CLIENT_SECRET: xxxxx
  AZ_SUBSCRIPTION_ID: xxxxx
  AZ_TENANT_ID: xxxxx
```

### Attach secret to a service account
=== "yaml"
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
secrets:
- name: azcreds
```

=== "kubectl"
```bash
kubectl apply -f create-azure-secret.yaml
```

!!! note
    To use model binary provide reference the folder where it's located with an ending ```/``` to denote it`s a folder.

```bash
https://accountname.blob.core.windows.net/container/models/iris/v1.1/
```
