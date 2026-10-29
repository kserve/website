---
title: ModelScope
description: Deploy InferenceService with models from ModelScope Hub in KServe, including support for both public and private models.
---

# Deploy InferenceService with models from ModelScope Hub

You can specify the `storageUri` field on `InferenceService` YAML with the following format to deploy the models from ModelScope Hub.

```
modelscope://${OWNER}/${MODEL}[:${REVISION}]
```

For example, `modelscope://Qwen/Qwen2.5-0.5B-Instruct`. To download a
specific revision, append it after a colon, for example,
`modelscope://Qwen/Qwen2.5-0.5B-Instruct:<revision>`.

[ModelScope](https://www.modelscope.cn) is one of the largest model hubs in China, hosting popular models such as Qwen, DeepSeek, and many others.

## Public ModelScope Models

If no credential is provided, an anonymous client will be used to download the model from the ModelScope repository.

## Private ModelScope Models

KServe supports authenticating with `MODELSCOPE_API_TOKEN` for downloading the model. Create a Kubernetes secret to store the ModelScope token.

```yaml title="yaml"
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
data:
  MODELSCOPE_API_TOKEN: bXN0X1ZOVXdSV0FHQmtJeFpmTEx1a3NlR3lvVVZvbnVOaUR1VU0==
```

## Private endpoints and mirrors

For a private ModelScope-compatible hub or mirror, add `MODELSCOPE_ENDPOINT` to
the credential Secret referenced by the predictor's ServiceAccount. Keep the model
URI as `modelscope://owner/model[:revision]`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
stringData:
  MODELSCOPE_ENDPOINT: "https://models.internal.example"
  # Omit this key for an anonymous mirror.
  MODELSCOPE_API_TOKEN: "replace-with-your-token"
```

Use the ServiceAccount and `spec.predictor.serviceAccountName` configuration in
[Option 1](#option-1-use-service-account-with-secret-ref) below. The Secret,
ServiceAccount, and InferenceService must share a namespace. Alternatively, set
`serving.kserve.io/storageSecretName: storage-config` in the InferenceService
annotations; this takes precedence over ServiceAccount Secrets.

KServe injects the endpoint and optional token into the storage initializer using
Secret references. The ModelScope SDK uses them for repository metadata and file
downloads. Without an endpoint, the public ModelScope endpoint remains the
default. Setting `spec.predictor.model.env` configures the serving container and
does not configure the storage initializer.

The endpoint must implement the ModelScope Hub APIs, and any returned file URLs
must be reachable from the initializer. For HTTPS, the initializer must trust the
server's certificate chain.

:::note[Development version]
Endpoint injection from credential Secrets requires the controller change tracked
in [kserve/kserve#6498](https://github.com/kserve/kserve/issues/6498).
:::

## Deploy InferenceService with Models from ModelScope Hub

### Option 1: Use Service Account with Secret Ref
Create a Kubernetes `ServiceAccount` with the ModelScope token secret name reference and specify the `ServiceAccountName` in the `InferenceService` Spec.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: msserviceacc
secrets:
  - name: storage-config
---
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: modelscope-qwen
spec:
  predictor:
    serviceAccountName: msserviceacc  # Option 1 for authenticating with MODELSCOPE_API_TOKEN
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
        - --model_dir=/mnt/models
      storageUri: modelscope://Qwen/Qwen2.5-0.5B-Instruct
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
```

### Option 2: Use Environment Variable with Secret Ref
Create a Kubernetes ModelScope token secret and specify the MS token secret reference using environment variable in the `InferenceService` Spec.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: modelscope-qwen
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
        - --model_dir=/mnt/models
      storageUri: modelscope://Qwen/Qwen2.5-0.5B-Instruct
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
      env:
        - name: MODELSCOPE_API_TOKEN  # Option 2 for authenticating with MODELSCOPE_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: storage-config
              key: MODELSCOPE_API_TOKEN
              optional: false
```

## Check the InferenceService status.

```bash
kubectl get inferenceservices modelscope-qwen
```

:::tip[Expected Output]

```bash
NAME              URL                                                READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                       AGE
modelscope-qwen   http://modelscope-qwen.default.example.com         True           100                              modelscope-qwen-predictor-default-47q2g   7d23h
```

:::
