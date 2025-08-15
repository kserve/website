---
title: Fill Mask
description: Deploy Hugging Face Fill Mask models with KServe
---

# Hugging Face Fill Mask with KServe

This guide demonstrates how to deploy a BERT model for fill mask tasks using KServe's Hugging Face serving runtime. Fill mask models predict the words that should replace masked tokens in a text sequence, making them useful for text completion, entity substitution, and contextual understanding.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and Hugging Face models.
- GPU resources (optional but recommended for better performance).

## Deploying the BERT Model for Fill Mask

In this example, we'll deploy a BERT model for fill mask prediction using the Hugging Face serving runtime. We'll demonstrate deployment using both V1 and V2 protocols.

### Create a Hugging Face Secret (Optional)
If you plan to use private models from Hugging Face, you need to create a Kubernetes secret containing your Hugging Face API token. This step is optional for public models.
```bash
kubectl create secret generic hf-secret \
  --from-literal=HF_TOKEN=<your_huggingface_token>
```

### Create a StorageContainer (Optional)

For models that require authentication, you might need to create a `ClusterStorageContainer`. While the model in this example is public, for private models you would need to configure access:

```yaml title="huggingface-storage.yaml"
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    name: storage-initializer
    image: kserve/storage-initializer:latest
    env:
    - name: HF_TOKEN
      valueFrom:
        secretKeyRef:
          name: hf-secret
          key: HF_TOKEN
          optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: hf://
```

<!-- TODO: Update link to refer storagecontainer docs -->
To know more about storage containers, refer to the [Storage Containers documentation](../../../../../concepts/resources/index.md#storage-resources).

### Deploy with the V1 Protocol

Create an `InferenceService` resource to deploy the BERT fill mask model:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=bert
      storageUri: "hf://google-bert/bert-base-uncased"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
```

Save this configuration to a file named `huggingface-bert-v1.yaml` and apply it:

```bash
kubectl apply -f huggingface-bert-v1.yaml
```

#### Check the InferenceService Status

Verify that the InferenceService is deployed and ready:

```bash
kubectl get inferenceservices huggingface-bert
```

:::tip[Expected Output]
```
NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-bert     http://huggingface-bert.default.example.com           True           100                              huggingface-bert-predictor-default-47q2g     7d23h
```
:::

#### Perform Model Inference with V1 Protocol

The first step is to [determine the ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

Set up the environment variables:

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"instances": ["The capital of France is [MASK].", "The capital of [MASK] is paris."]}'
```

:::tip[Expected Output]
```json
{"predictions":["paris","france"]}
```
:::

### Deploy with the Open Inference Protocol (V2)

For V2 protocol deployment, we need to set the `protocolVersion` field to `v2`:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=bert
      storageUri: "hf://google-bert/bert-base-uncased"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
```

Save this configuration to a file named `huggingface-bert-v2.yaml` and apply it:

```bash
kubectl apply -f huggingface-bert-v2.yaml
```

#### Check the InferenceService Status

Verify that the InferenceService is deployed and ready:

```bash
kubectl get inferenceservices huggingface-bert
```

:::tip[Expected Output]
```
NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-bert     http://huggingface-bert.default.example.com           True           100                              huggingface-bert-predictor-default-47q2g     7d23h
```
:::

#### Perform Model Inference with V2 Protocol

The first step is to [determine the ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

Set up the environment variables:

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"inputs": [{"name": "input-0", "shape": [2], "datatype": "BYTES", "data": ["The capital of France is [MASK].", "The capital of [MASK] is paris."]}]}'
```

:::tip[Expected Output]
```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "e4bcfc28-e9f2-4c2a-b61f-c491e7346528",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": ["paris", "france"]
    }
  ]
}
```
:::

## Understanding the Output

In the response, the model replaces the `[MASK]` tokens with predicted words based on the context:

- "The capital of France is \[MASK\]." → "The capital of France is paris."
- "The capital of \[MASK\] is paris." → "The capital of france is paris."

The model identifies "paris" as the most likely word to fill the mask in the first sentence, and "france" in the second sentence.

## Advanced Configuration

### Return Probabilities

To include probability scores for predicted tokens, you can use the `--return_probabilities` flag:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert-probs
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=bert
        - --return_probabilities
      storageUri: "hf://google-bert/bert-base-uncased"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
```

With the `--return_probabilities` flag, the response will include a dictionary of token IDs and their corresponding probability scores:

```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "e4bcfc28-e9f2-4c2a-b61f-c491e7346528",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{\"2003\": 0.876, \"4827\": 0.052, \"3009\": 0.021, \"1037\": 0.018, \"2005\": 0.012, ... }",
        "{\"2085\": 0.921, \"2329\": 0.031, \"2003\": 0.019, \"1996\": 0.011, \"2001\": 0.008, ... }"
      ]
    }
  ]
}
```

In this output, the keys are token IDs from the model's vocabulary (e.g., "2003" corresponds to "paris" and "2085" corresponds to "france"), and the values are the probability scores for each token. Note that the example above shows truncated output; in reality, probabilities are returned for all token IDs in the model's vocabulary, though most will have very small values. You would need to use the model's tokenizer to map these IDs back to their corresponding words.

### Return Logits

To get the raw logits from the model, you can use the `--return_logits` flag:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert-logits
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=bert
        - --return_logits
      storageUri: "hf://google-bert/bert-base-uncased"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
```

With the `--return_logits` flag, the response will include the raw logits (unnormalized prediction scores) for the masked token positions:

```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "e4bcfc28-e9f2-4c2a-b61f-c491e7346528",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{\"2003\": 8.1, \"4827\": -2.3, \"3009\": 0.5, \"1037\": 1.7, \"2005\": -0.4, ... }",
        "{\"2085\": 10.2, \"2329\": -1.5, \"2003\": 0.8, \"1996\": 3.2, \"2001\": -2.1, ... }"
      ]
    }
  ]
}
```

The response contains raw, unnormalized logit scores for each token ID in the model's vocabulary. Note that the example above shows truncated output; in reality, logits are returned for all token IDs in the model's vocabulary. Unlike probabilities, logits can be negative and aren't constrained to sum to 1. These raw logits are useful for custom post-processing, applying alternative softmax temperatures, or when you need the full distribution of possible tokens before normalization.

## Troubleshooting

If you encounter issues with your deployment or inference requests, consider the following:

- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.

## Next Steps

- Explore other [Hugging Face model types](../overview.md) supported by KServe
- Try different fill mask models from the [Hugging Face Hub](https://huggingface.co/models?pipeline_tag=fill-mask)
