---
title: Text Classification
description: Deploy Hugging Face Text Classification models with KServe
---

# Hugging Face Text Classification with KServe

This guide demonstrates how to deploy a distilBERT model for text classification tasks using KServe's Hugging Face serving runtime. Text classification models assign predefined categories to text sequences, making them useful for sentiment analysis, topic classification, and more.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and Hugging Face models.
- GPU resources (optional but recommended for better performance).

## Deploying the distilBERT Model for Text Classification

In this example, we'll deploy a fine-tuned distilBERT model for sentiment analysis using the Hugging Face serving runtime. We'll demonstrate deployment using both V1 and V2 protocols.

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
To know more about storage containers, refer to the Storage Containers documentation.

### Deploy with the V1 Protocol

Create an `InferenceService` resource to deploy the distilBERT text classification model:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-distilbert
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=distilbert
      storageUri: "hf://distilbert/distilbert-base-uncased-finetuned-sst-2-english"
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

Save this configuration to a file named `huggingface-distilbert-v1.yaml` and apply it:

```bash
kubectl apply -f huggingface-distilbert-v1.yaml
```

#### Check the InferenceService Status

Verify that the InferenceService is deployed and ready:

```bash
kubectl get inferenceservices huggingface-distilbert
```

:::tip[Expected Output]
```
NAME                     URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-distilbert   http://huggingface-distilbert.default.example.com     True           100                              huggingface-distilbert-predictor-default-47q2g   7d23h
```
:::

#### Perform Model Inference with V1 Protocol

Set up the environment variables:

```bash
MODEL_NAME=distilbert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-distilbert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"instances": ["Hello, my dog is cute", "I am feeling sad"]}'
```

:::tip[Expected Output]
```json
{"predictions":[1,0]}
```
:::

### Deploy with the Open Inference Protocol (V2)

For V2 protocol deployment, we need to set the `protocolVersion` field to `v2`:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-distilbert
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=distilbert
      storageUri: "hf://distilbert/distilbert-base-uncased-finetuned-sst-2-english"
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

Save this configuration to a file named `huggingface-distilbert-v2.yaml` and apply it:

```bash
kubectl apply -f huggingface-distilbert-v2.yaml
```

#### Check the InferenceService Status

Verify that the InferenceService is deployed and ready:

```bash
kubectl get inferenceservices huggingface-distilbert
```

:::tip[Expected Output]
```
NAME                     URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-distilbert   http://huggingface-distilbert.default.example.com     True           100                              huggingface-distilbert-predictor-default-47q2g   7d23h
```
:::

#### Perform Model Inference with V2 Protocol

Set up the environment variables:

```bash
MODEL_NAME=distilbert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-distilbert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"inputs": [{"name": "input-0", "shape": [2], "datatype": "BYTES", "data": ["Hello, my dog is cute", "I am feeling sad"]}]}'
```

:::tip[Expected Output]
```json
{
  "model_name": "distilbert",
  "model_version": null,
  "id": "e4bcfc28-e9f2-4c2a-b61f-c491e7346528",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2],
      "datatype": "INT64",
      "parameters": null,
      "data": [1, 0]
    }
  ]
}
```
:::

## Understanding the Output

In the response, the numbers represent sentiment classes:

- `0`: Negative sentiment
- `1`: Positive sentiment

So in the example response:
- "Hello, my dog is cute" is classified as positive sentiment (1)
- "I am feeling sad" is classified as negative sentiment (0)

## Advanced Configuration

### Return Class Probabilities

To get probability scores for each class instead of just the predicted class, add the `--return_probabilities` flag to your deployment:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-distilbert-probs
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=distilbert
        - --return_probabilities
      storageUri: "hf://distilbert/distilbert-base-uncased-finetuned-sst-2-english"
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

With the `--return_probabilities` flag, the response will include probability scores for each class:

```json
{
  "model_name": "distilbert",
  "model_version": null,
  "id": "41459fcc-ab85-46f8-866b-b41a8cc17ac3",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2, 1],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{0: 0.0002, 1: 0.9998}",
        "{0: 0.9991, 1: 0.0009}"
      ]
    }
  ]
}
```

### Raw Logits with --disable_postprocess

If you need access to the raw model outputs (logits) before post-processing, you can use the `--disable_postprocess` flag:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-distilbert-raw
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=distilbert
        - --disable_postprocess
      storageUri: "hf://distilbert/distilbert-base-uncased-finetuned-sst-2-english"
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

With the `--disable_postprocess` flag, the response will include raw logit values from the model's final layer:

```json
{
  "model_name": "distilbert",
  "model_version": null,
  "id": "9668dc21-5b97-4510-aea0-a978e471a46b",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{0: -4.068715572357178, 1: 4.366886138916016}",
        "{0: 3.8371405601501465, 1: -3.1609644889831543}"
      ]
    }
  ]
}
```

#### When to Use Raw Logits

Raw logits can be useful for:

1. **Temperature scaling**: Applying different temperature parameters to logits before softmax
2. **Ensemble methods**: Combining outputs from multiple models
3. **Custom thresholding**: Implementing specialized decision boundaries
4. **Model calibration**: Analyzing and adjusting the model's confidence calibration

#### Processing Model Outputs with Python

This example shows how to process both raw logits and probability outputs:

```python
import numpy as np
from scipy.special import softmax
import ast

# Example texts from our request
texts = ["Hello, my dog is cute", "I am feeling sad"]

# Assuming 'result' contains the model response
output_data = result["outputs"][0]["data"]
output_type = result["outputs"][0]["datatype"]
sentiment_labels = ["Negative", "Positive"]
labeled_results = []

for i, text in enumerate(texts):
    # Process the output based on whether it's raw logits or probabilities
    # Both formats use dictionary strings in the output
    value_dict = ast.literal_eval(output_data[i])
    
    # Extract values in the correct order (by class index)
    values = np.array([value_dict[0], value_dict[1]])
    
    # If these are raw logits, convert to probabilities
    if "logits" in result["outputs"][0]["name"]:
        probs = softmax(values)
    else:
        # If these are already probabilities, use them directly
        probs = values
    
    # Get prediction (class with highest probability) and its confidence
    predicted_class = np.argmax(probs)
    confidence = probs[predicted_class]
    sentiment = sentiment_labels[predicted_class]
    
    labeled_results.append({
        "text": text,
        "sentiment": sentiment,
        "confidence": confidence,
        "probabilities": probs
    })

# Display results with both logits and probabilities
for item in labeled_results:
    print(f"Text: \"{item['text']}\"")
    print(f"Sentiment: {item['sentiment']} (confidence: {item['confidence']:.4f})")
    print(f"Raw logits: {item['raw_logits']}")
    print(f"Probabilities: {item['probabilities']}")
    print()
```

#### Processing Probability Outputs

If you're using the `--return_probabilities` flag, here's a simpler way to process the output:

```python
import ast
import numpy as np

# Example texts from our request
texts = ["Hello, my dog is cute", "I am feeling sad"]

# Process probability outputs (assuming 'result' contains the model response)
prob_strings = result["outputs"][0]["data"]
sentiment_labels = ["Negative", "Positive"]
results = []

for i, text in enumerate(texts):
    # Parse the probability dictionary
    prob_dict = ast.literal_eval(prob_strings[i])
    
    # Get prediction and confidence
    if prob_dict[1] > prob_dict[0]:
        sentiment = "Positive"
        confidence = prob_dict[1]
    else:
        sentiment = "Negative"
        confidence = prob_dict[0]
    
    results.append({
        "text": text,
        "sentiment": sentiment,
        "confidence": confidence,
        "probabilities": prob_dict
    })
    
    print(f"Text: \"{text}\"")
    print(f"Sentiment: {sentiment} (confidence: {confidence:.4f})")
    print(f"Probabilities: {prob_dict}")
    print()
```

### When to Use Probabilities

Probability scores are useful in many scenarios:

1. **Confidence thresholding**: Implement decision boundaries based on confidence levels, for example, only accepting predictions with >90% confidence
2. **Multi-label classification**: For problems where multiple labels can apply, you can select all classes above a probability threshold
3. **Uncertainty quantification**: Measure how confident the model is about its predictions, which is useful for sensitive applications
4. **User interface display**: Show confidence scores to end users to help them understand the reliability of predictions
5. **Ensemble weighting**: When using multiple models, weight each model's vote by its confidence score

Using probabilities provides more nuanced information than just class labels, enabling more sophisticated decision-making in your applications.

## Troubleshooting

If you encounter issues with your deployment or inference requests, consider the following:
- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.

## Next Steps

- Explore other [Hugging Face NLP Tasks](../overview.md) supported by KServe
- Try different text classification models from the [Hugging Face Hub](https://huggingface.co/models?pipeline_tag=text-classification)
