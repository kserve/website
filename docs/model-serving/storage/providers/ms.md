---
title: ModelScope
description: Deploy InferenceService with models from ModelScope Hub in KServe, including support for both public and private models.
---

# Deploy InferenceService with model from ModelScope Hub

You can specify the `storageUri` field on `InferenceService` YAML with the following format to deploy the models from ModelScope Hub.

```
ms://${NAMESPACE}/${MODEL}:${REVISION}(optional)
```

e.g. `ms://qwen/Qwen2-0.5B-Instruct`

[ModelScope](https://www.modelscope.cn) is one of the largest model hubs in China, hosting popular models such as Qwen, DeepSeek, and many others.

## Public ModelScope Models

If no credential is provided, anonymous client will be used to download the model from ModelScope repo.

## Private ModelScope Models

KServe supports authenticating with `MS_TOKEN` for downloading the model. Create a Kubernetes secret to store the ModelScope token.

```yaml title="yaml"
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
data:
  MS_TOKEN: bXN0X1ZOVXdSV0FHQmtJeFpmTEx1a3NlR3lvVVZvbnVOaUR1VU0==
```

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
    serviceAccountName: msserviceacc  # Option 1 for authenticating with MS_TOKEN
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
        - --model_dir=/mnt/models
      storageUri: ms://qwen/Qwen2-0.5B-Instruct
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
      storageUri: ms://qwen/Qwen2-0.5B-Instruct
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
        - name: MS_TOKEN  # Option 2 for authenticating with MS_TOKEN
          valueFrom:
            secretKeyRef:
              name: storage-config
              key: MS_TOKEN
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
