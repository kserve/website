# Deploy InferenceService with a saved model on Huggingface (HF)

## Using Public HuggingFace Repo

If no credential is provided, anonymous client will be used to download the model from HF repo.
The uri is in the following format:


```
hf://${REPO}/${MODEL}:${HASH}(optional)
```

e.g. ```hf://facebook/opt-125m```

## Using Private HuggingFace Repo

KServe supports authenticating with HF_TOKEN for downloading the model.

### Create secret and attach the secret to service account
=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
type: Opaque
data:
  HF_TOKEN: aGZfVk5Vd1JVAUdCa0l4WmZMTHVrc2VHeW9VVm9udU5pBHUVT==
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hfserviceacc
secrets:
  - name: storage-config
```

Specify the ServiceAccountName in InferenceService Spec

## Deploy the model on HF with `InferenceService`

Create the InferenceService with the a saved model on HF

=== "yaml"
```yaml
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
        - --model_name=llama2
        - --model_dir=/mnt/models
        - --backend=huggingface
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
```

Apply the `hf-llama3.yaml`.

=== "kubectl"
```bash
kubectl apply -f hf-llama3.yaml
```


### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-llama3
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-llama3   http://huggingface-llama3.default.example.com         True           100                              huggingface-llama3-predictor-default-47q2g   7d23h
    ```
