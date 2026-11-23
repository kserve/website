---
title: ModelScope
description: Deploy InferenceService and LLMInferenceService with public or private models from ModelScope Hub.
---

# Deploy models from ModelScope Hub

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

## Deploy LLMInferenceService with Models from ModelScope Hub

:::note[Development version]
LLMInferenceService support requires a KServe build that includes
[kserve/kserve#6438](https://github.com/kserve/kserve/pull/6438).
Earlier controllers reject `modelscope://` in `spec.model.uri`.
:::

Install the [LLMInferenceService dependencies](../../generative-inference/llmisvc/llmisvc-dependencies.md),
[configure a Gateway](../../generative-inference/llmisvc/llmisvc-envoy-ai-gateway.md),
and make an NVIDIA GPU available for the following example.
The storage initializer needs network access to ModelScope.

Set `spec.model.uri` to a ModelScope repository. The default storage initializer
downloads the model into `/mnt/models` before the inference container starts.
For a specific revision, use `modelscope://owner/model:revision`; omitting the
revision uses the repository default.

Save the following as `llmisvc-modelscope.yaml`:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: qwen3-modelscope
spec:
  model:
    uri: modelscope://Qwen/Qwen3-0.6B
    name: Qwen/Qwen3-0.6B
  replicas: 1
  router:
    route: {}
    gateway: {}
  template:
    containers:
      - name: main
        resources:
          limits:
            cpu: "2"
            memory: 8Gi
            nvidia.com/gpu: "1"
          requests:
            cpu: "1"
            memory: 4Gi
            nvidia.com/gpu: "1"
```

Deploy the service and check the download:

```bash
kubectl apply -f llmisvc-modelscope.yaml
kubectl logs deployment/qwen3-modelscope-kserve -c storage-initializer
kubectl wait --for=condition=Ready llminferenceservice/qwen3-modelscope --timeout=15m
```

Public repositories do not require credentials. For a private repository, export
your access token as `MODELSCOPE_API_TOKEN`, then create a Secret and a
ServiceAccount in the same namespace as the service:

```bash
kubectl create secret generic modelscope-token \
  --from-literal=MODELSCOPE_API_TOKEN="$MODELSCOPE_API_TOKEN"
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: modelscope
secrets:
  - name: modelscope-token
EOF
```

Replace `spec.model.uri` with your private repository URI and set
`spec.template.serviceAccountName: modelscope` on the LLMInferenceService.
For a separate prefill workload, also set
`spec.prefill.template.serviceAccountName: modelscope`. KServe injects
`MODELSCOPE_API_TOKEN` into the storage initializer through a Secret reference.

The same base-model URI works with single-node, multi-node, and prefill workloads.
Standalone tokenizer containers download only tokenizer and configuration files.
Setting `spec.storageInitializer.enabled: false` disables automatic downloads.
ModelScope URIs are not supported for LoRA adapters or ModelExpress native sources.
