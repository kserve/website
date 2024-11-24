# Deploy InferenceService with model from Hugging Face(HF) Hub

You can specify the `storageUri` field on `InferenceService` YAML with the following format to deploy the models from Hugging Face Hub.

```
hf://${REPO}/${MODEL}:${HASH}(optional)
```

e.g. ```hf://facebook/opt-125m```

## Public Hugging Face Models

If no credential is provided, anonymous client will be used to download the model from HF repo.

## Private Hugging Face Models

KServe supports authenticating with `HF_TOKEN` for downloading the model and create a Kubernetes secret to store the HF token.

=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
data:
  HF_TOKEN: aGZfVk5Vd1JVAUdCa0l4WmZMTHVrc2VHeW9VVm9udU5pBHUVT==
```


## Deploy InferenceService with Models from HF Hub

### Option 1: Use Service Account with Secret Ref
Create a Kubernetes `ServiceAccount` with the HF token secret name reference and specify the `ServiceAccountName` in the `InferenceService` Spec.

=== "yaml"
```yaml
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hfserviceacc
secrets:
  - name: storage-config
---
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    serviceAccountName: hfserviceacc  # Option 1 for authenticating with HF_TOKEN
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3
        - --model_dir=/mnt/models
      storageUri: hf://meta-llama/meta-llama-3-8b-instruct
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
EOF
```

### Option 2: Use Environment Variable with Secret Ref
Create a Kubernete HF token and specify the HF token secret reference using environment variable in the `InferenceService` Spec.

=== "yaml"
```yaml
cat <<EOF | kubectl apply -f -
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3
        - --model_dir=/mnt/models
      storageUri: hf://meta-llama/meta-llama-3-8b-instruct
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
        - name: HF_TOKEN  # Option 2 for authenticating with HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-secret
              key: HF_TOKEN
              optional: false
EOF
```

## Check the InferenceService status.

```bash
kubectl get inferenceservices huggingface-llama3
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-llama3   http://huggingface-llama3.default.example.com         True           100                              huggingface-llama3-predictor-default-47q2g   7d23h
    ```
