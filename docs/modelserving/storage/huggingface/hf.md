# Deploy InferenceService with a saved model on Huggingface (HF)

## Using Public HuggingFace Repo

If no credential is provided, anonymous client will be used to download the model from HF repo.
The uri is in the following format:


```
hf://${REPO}/${MODEL}:${HASH}(optional)
```

e.g. ```hf://facebook/opt-125m```

## Using Private HuggingFace Repo

KServe supports authenticating using HF_TOKEN

## Option 1: Create HF Secret

### Create secret
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

=== "kubectl"
```bash
kubectl apply -f create-hf-secret.yaml
```

## Option 2: using env

Create the InferenceService with HF_TOKEN as env

=== "yaml"
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama2
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
      - --model_name=<model_name>
      - --model_id=<private_model>
      - --backend=huggingface
      - --task=text_generation
      env:
      - name: HF_TOKEN
        value: <token> or (envFromSecret)
```


## Deploy the model on GCS with `InferenceService`

Create the InferenceService with the a saved model on HF

=== "yaml"
```yaml
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
