---
title: Token Classification
description: Deploy Hugging Face Token Classification models with KServe
---

# Hugging Face Token Classification with KServe

This guide demonstrates how to deploy a BERT model for token classification tasks using KServe's Hugging Face serving runtime. Token classification models assign labels to individual tokens within a text sequence, making them useful for tasks like named entity recognition (NER), part-of-speech tagging, and chunking.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster
- Basic knowledge of Kubernetes concepts and Hugging Face models
- GPU resources (optional but recommended for better performance)

## Deploying the BERT Model for Token Classification

In this example, we'll deploy a BERT model for Named Entity Recognition (NER) using the Hugging Face Serving runtime. We'll demonstrate deployment using both V1 and V2 protocols.

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
<!-- TODO: FIX DOC LINK -->
To know more about storage containers, refer to the [Storage Containers documentation](../../../concepts/storage_containers.md).

### Deploy with the V1 Protocol

Create an `InferenceService` resource to deploy the BERT token classification model:

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
        - --disable_lower_case
      storageUri: "hf://dslim/bert-base-NER"
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

:::tip[Expected output]
```
NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-bert     http://huggingface-bert.default.example.com           True           100                              huggingface-bert-predictor-default-47q2g     7d23h
```
:::

#### Perform Model Inference with V1 Protocol

Set up the environment variables:

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"instances": ["My name is Wolfgang and I live in Berlin", "My name is Lisa and I live in Paris"]}'
```

:::tip[Expected Output]
```json
{"predictions":[[[0,0,0,0,3,0,0,0,0,7,0]],[[0,0,0,0,3,0,0,0,0,7,0]]]}
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
        - --disable_lower_case
      storageUri: "hf://dslim/bert-base-NER"
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

:::tip[Expected output]
```
NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-bert     http://huggingface-bert.default.example.com           True           100                              huggingface-bert-predictor-default-47q2g     7d23h
```
:::

#### Perform Model Inference with V2 Protocol

Set up the environment variables:

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
```

Send a prediction request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"inputs": [{"name": "input-0", "shape": [2], "datatype": "BYTES", "data": ["My name is Wolfgang and I live in Berlin", "My name is Lisa and I live in Paris"]}]}'
```

:::tip[Expected Output]
```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "3117e54b-8a6a-4072-9d87-6d7bdfe05eed",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2,1,11],
      "datatype": "INT64",
      "parameters": null,
      "data":[0,0,0,0,3,0,0,0,0,7,0,0,0,0,0,3,0,0,0,0,7,0]
    }
  ]
}
```
:::

## Understanding the Output

In the response, the numbers represent entity tags for each token in the input text. For the BERT NER model used in this example:

- `0`: "O" (Outside of a named entity)
- `3`: "B-PER" (Beginning of a person entity)
- `7`: "B-LOC" (Beginning of a location entity)

So in the example response:
- "Wolfgang" and "Lisa" are identified as person entities (B-PER)
- "Berlin" and "Paris" are identified as location entities (B-LOC)

## Customizing the Model

You can customize the deployment by:

1. **Using a different pre-trained model**: Change the `--model_id` argument to a different Hugging Face model ID
2. **Adding model configuration options**: Add additional arguments to customize tokenization or model behavior
3. **Adjusting resource requests**: Modify the CPU, memory, or GPU resources based on your requirements

## Advanced Configuration

### Return Token Probabilities

The Hugging Face runtime supports returning probabilities for each token prediction by adding the `--return_probabilities` argument to your deployment:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert-with-probs
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=bert
        - --disable_lower_case
        - --return_probabilities
      storageUri: "hf://dslim/bert-base-NER"
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

Save this configuration to a file named `huggingface-bert-with-probs.yaml` and apply it:

```bash
kubectl apply -f huggingface-bert-with-probs.yaml
```

When using the `--return_probabilities` flag, the response will include probability scores for each entity tag prediction, providing confidence levels for the model's predictions. This is particularly useful for:

- Understanding the model's confidence in its predictions
- Setting thresholds for accepting predictions based on confidence
- Analyzing ambiguous cases where multiple entity types might be plausible
- Fine-tuning model performance based on confidence distributions

The output format will include probability values for each possible entity tag, allowing you to see the confidence distribution across all possible classifications:

```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "a53fe3cf-a328-4d46-a92c-fd4a0e5c5301",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2,1,11],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{0: 0.982, 1: 0.003, 2: 0.001, 3: 0.002, 4: 0.001, 5: 0.002, 6: 0.001, 7: 0.002, 8: 0.001}",
        "{0: 0.978, 1: 0.003, 2: 0.001, 3: 0.010, 4: 0.001, 5: 0.002, 6: 0.001, 7: 0.005, 8: 0.003}",
        "{0: 0.983, 1: 0.003, 2: 0.001, 3: 0.006, 4: 0.003, 5: 0.001, 6: 0.001, 7: 0.002, 8: 0.003}",
        "{0: 0.977, 1: 0.004, 2: 0.002, 3: 0.008, 4: 0.003, 5: 0.001, 6: 0.001, 7: 0.003, 8: 0.004}",
        "{0: 0.002, 1: 0.001, 2: 0.001, 3: 0.985, 4: 0.002, 5: 0.002, 6: 0.001, 7: 0.004, 8: 0.001}",
        /* ... additional token probabilities for the first sentence ... */
        "{0: 0.936, 1: 0.078, 2: 0.002, 3: 0.102, 4: 0.002, 5: 0.001, 6: 0.001, 7: 0.073, 8: 0.002}",
        /* ... probabilities for tokens in the second sentence ... */
        "{0: 0.003, 1: 0.002, 2: 0.001, 3: 0.002, 4: 0.001, 5: 0.004, 6: 0.001, 7: 0.985, 8: 0.001}",
        "{0: 0.943, 1: 0.015, 2: 0.003, 3: 0.006, 4: 0.002, 5: 0.002, 6: 0.003, 7: 0.008, 8: 0.003}"
      ]
    }
  ]
}
```


### Processing Labels with Python

For a more user-friendly interpretation of the model outputs, you can process the labels using Python:

```python
import requests
import json
import ast

# Set up variables
ingress_host = "your-ingress-host"
ingress_port = "your-ingress-port"
service_hostname = "your-service-hostname"
model_name = "bert"

# Input text
texts = ["My name is Wolfgang and I live in Berlin", "My name is Lisa and I live in Paris"]

# Define the request payload (V2 protocol)
request_data = {
    "inputs": [
        {
            "name": "input-0", 
            "shape": [len(texts)], 
            "datatype": "BYTES", 
            "data": texts
        }
    ]
}

# Send the request
url = f"http://{ingress_host}:{ingress_port}/v2/models/{model_name}/infer"
headers = {
    "Host": service_hostname,
    "Content-Type": "application/json"
}
response = requests.post(url, headers=headers, data=json.dumps(request_data))

# Process the response
result = response.json()
probability_data = result["outputs"][0]["data"]

# NER tags for the dslim/bert-base-NER model
tag_map = {
    0: "O",       # Outside of a named entity
    1: "B-MISC",  # Beginning of a miscellaneous entity
    2: "I-MISC",  # Inside of a miscellaneous entity
    3: "B-PER",   # Beginning of a person entity
    4: "I-PER",   # Inside of a person entity
    5: "B-ORG",   # Beginning of an organization entity
    6: "I-ORG",   # Inside of an organization entity
    7: "B-LOC",   # Beginning of a location entity
    8: "I-LOC"    # Inside of a location entity
}

# Process probability data
token_predictions = []
token_probabilities = []

for prob_dict_str in probability_data:
    # Convert string representation to dictionary
    prob_dict = ast.literal_eval(prob_dict_str)
    
    # Find tag with highest probability
    max_tag = max(prob_dict.items(), key=lambda x: x[1])[0]
    token_predictions.append(max_tag)
    
    # Store all probabilities
    token_probabilities.append(prob_dict)

# Group by sentence (assuming we know the token counts per sentence)
# For this example, let's say the first sentence has 11 tokens
first_sentence_tokens = token_predictions[:11]
second_sentence_tokens = token_predictions[11:]

# Map numeric labels to text labels
first_sentence_entities = [tag_map.get(tag, f"Unknown-{tag}") for tag in first_sentence_tokens]
second_sentence_entities = [tag_map.get(tag, f"Unknown-{tag}") for tag in second_sentence_tokens]

# Display results with confidence scores
print("First sentence entities:")
for i, entity in enumerate(first_sentence_entities):
    if entity != "O":  # Only show named entities
        confidence = token_probabilities[i][int(token_predictions[i])]
        print(f"Entity: {entity}, Confidence: {confidence:.4f}")

print("\nSecond sentence entities:")
for i, entity in enumerate(second_sentence_entities):
    if entity != "O":  # Only show named entities
        confidence = token_probabilities[i+11][int(token_predictions[i+11])]
        print(f"Entity: {entity}, Confidence: {confidence:.4f}")
for i, (text, tags) in enumerate(zip(texts, tagged_outputs)):
    print(f"Text {i+1}: {text}")
    print(f"Tags {i+1}: {tags}")
    print()
```

This script will produce a more readable output showing the named entity tags for each token in the input text.

### Processing Probabilities with Python

If you're using the `--return_probabilities` flag, you can also process and analyze the probability values to understand the model's confidence in its predictions:

```python
import requests
import json
import numpy as np
import ast
from scipy.special import softmax

# Set up variables
ingress_host = "your-ingress-host"
ingress_port = "your-ingress-port"
service_hostname = "your-service-hostname"
model_name = "bert"

# Input text
texts = ["My name is Wolfgang and I live in Berlin"]

# Define the request payload (V2 protocol)
request_data = {
    "inputs": [
        {
            "name": "input-0", 
            "shape": [len(texts)], 
            "datatype": "BYTES", 
            "data": texts
        }
    ]
}

# Send the request
url = f"http://{ingress_host}:{ingress_port}/v2/models/{model_name}/infer"
headers = {
    "Host": service_hostname,
    "Content-Type": "application/json"
}
response = requests.post(url, headers=headers, data=json.dumps(request_data))

# Process the response
result = response.json()

# Get logits from the output (response contains raw logits in string format)
logits_data = result["outputs"][0]["data"]

# NER tags for the dslim/bert-base-NER model
tag_map = {
    0: "O",       # Outside of a named entity
    1: "B-MISC",  # Beginning of a miscellaneous entity
    2: "I-MISC",  # Inside of a miscellaneous entity
    3: "B-PER",   # Beginning of a person entity
    4: "I-PER",   # Inside of a person entity
    5: "B-ORG",   # Beginning of an organization entity
    6: "I-ORG",   # Inside of an organization entity
    7: "B-LOC",   # Beginning of a location entity
    8: "I-LOC"    # Inside of a location entity
}

# Parse logits from string format and convert to probabilities
token_predictions = []
token_probabilities = []

for logits_str in logits_data:
    # Convert the string representation to a dictionary
    logits_dict = ast.literal_eval(logits_str)
    
    # Extract logits values and sort by key to ensure correct order
    logits = [logits_dict[i] for i in range(len(logits_dict))]
    
    # Convert logits to probabilities using softmax
    probs = softmax(logits)
    
    # Get the most likely tag
    pred_idx = np.argmax(probs)
    
    token_predictions.append(pred_idx)
    token_probabilities.append(probs)

# Process results for each token
tokens = texts[0].split()  # Simple tokenization (not accurate for BERT)

print(f"Text: {texts[0]}")
print("Token\tPredicted Tag\tConfidence\tAll Probabilities")
print("-----\t------------\t----------\t----------------")

# Note: This is a simplified example - actual BERT tokenization would be different
for i, (token, pred, probs) in enumerate(zip(tokens, token_predictions[:len(tokens)], token_probabilities[:len(tokens)])):
    tag = tag_map.get(pred, f"Unknown-{pred}")
    confidence = probs[pred]
    
    # Format probabilities as percentages
    probs_formatted = ", ".join([f"{tag_map[i]}:{p*100:.1f}%" for i, p in enumerate(probs)])
    
    print(f"{token}\t{tag}\t{confidence*100:.1f}%\t{probs_formatted}")
print()
```

This script demonstrates how to:

1. Extract both prediction labels and probability values
2. Reshape probability values for each token
3. Calculate confidence scores for each prediction
4. Display all possible tag probabilities for each token

By analyzing these probability distributions, you can identify cases where the model is uncertain (e.g., when multiple tags have similar probabilities) or set confidence thresholds for using predictions in production systems.

### Understanding Probabilities vs. Raw Logits

When working with token classification models, you have two options for accessing the model's confidence values:

1. **Probabilities** (`--return_probabilities`): Normalized values between 0 and 1 that sum to 1 across all possible tags for each token. These are easier to interpret as they directly represent the model's confidence in each tag.

2. **Raw Logits** (`--disable_postprocess`): Unnormalized output values directly from the model before softmax is applied. These values can range from negative to positive infinity and are harder to interpret directly, but preserve more information for specialized processing.

#### When to Use Probabilities vs. Raw Logits

| Feature | Probabilities | Raw Logits |
|---------|--------------|------------|
| Interpretability | ✅ Directly represents confidence (0-1) | ❌ Requires conversion to be meaningful |
| Preservation of information | ❌ Information loss due to softmax | ✅ Preserves full model output |
| Typical use case | Production systems, thresholding, user-facing applications | Research, model fine-tuning, custom processing pipelines |
| Processing requirement | Ready to use | Needs softmax conversion |

#### Converting Between Logits and Probabilities

If you receive raw logits but need probabilities, you can convert them using the softmax function:

```python
import numpy as np
from scipy.special import softmax

# Convert logits to probabilities
def logits_to_probs(logits):
    return softmax(logits)

# Example
raw_logits = [7.069, -0.455, -1.075, -0.858, -1.136, -0.965, -1.593, -0.979, -1.188]
probabilities = logits_to_probs(raw_logits)
print([f"{p:.4f}" for p in probabilities])
# Output: ['0.9918', '0.0030', '0.0016', '0.0020', '0.0015', '0.0018', '0.0010', '0.0018', '0.0014']
```

#### Practical Applications for Raw Logits

Raw logits can be particularly useful for:

1. **Temperature scaling**: Adjust the "confidence" of predictions by applying different temperature parameters to logits before softmax
2. **Ensemble methods**: Combine logits from multiple models before applying softmax
3. **Calibration**: Apply post-hoc calibration techniques that work directly on logits
4. **Custom decision thresholds**: Implement specialized decision boundaries that work better with unnormalized values

### Accessing Raw Logits with --disable_postprocess

For advanced use cases requiring the raw model outputs, you can disable the post-processing step entirely using the `--disable_postprocess` flag. This returns the raw logits directly from the model:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-bert-with-logits
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      protocolVersion: v2
      args:
        - --model_name=bert
        - --disable_lower_case
        - --disable_postprocess
      storageUri: "hf://dslim/bert-base-NER"
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

With `--disable_postprocess`, the response includes raw logit values before any softmax normalization:

```json
{
  "model_name": "bert",
  "model_version": null,
  "id": "a53fe3cf-a328-4d46-a92c-fd4a0e5c5301",
  "parameters": null,
  "outputs": [
    {
      "name": "output-0",
      "shape": [2,1,11],
      "datatype": "BYTES",
      "parameters": null,
      "data": [
        "{0: 7.06871223449707, 1: -0.45536208152770996, 2: -1.0750019550323486, 3: -0.8583133816719055, 4: -1.1360667943954468, 5: -0.9653294682502747, 6: -1.593642234802246, 7: -0.9799260497093201, 8: -1.1887028217315674}",
        /* ... more token logits ... */
      ]
    }
  ]
}
```

#### Processing Raw Logits with Python

Here's an example of how to process raw logits and convert them to probabilities:

```python
import requests
import json
import numpy as np
import ast
from scipy.special import softmax

# Set up variables and send request (same as previous examples)
# ...

# Process the raw logits response
result = response.json()
logits_data = result["outputs"][0]["data"]

# Parse and convert logits
tokens = texts[0].split()  # Simplified tokenization
processed_tokens = []

for token, logits_str in zip(tokens, logits_data[:len(tokens)]):
    # Parse the logits dictionary
    logits_dict = ast.literal_eval(logits_str)
    
    # Extract logits in correct order
    logits = [logits_dict[i] for i in sorted(logits_dict.keys())]
    
    # Convert to probabilities
    probs = softmax(logits)
    
    # Get predicted tag and its probability
    pred_idx = np.argmax(logits)
    tag = tag_map[pred_idx]
    confidence = probs[pred_idx]
    
    processed_tokens.append({
        "token": token,
        "tag": tag,
        "confidence": confidence,
        "logits": logits,
        "probabilities": probs
    })

# Print results with both logits and probabilities
for item in processed_tokens:
    if item["tag"] != "O":  # Only show named entities
        print(f"Token: {item['token']}")
        print(f"  Tag: {item['tag']} (confidence: {item['confidence']:.4f})")
        print(f"  Logits: {[f'{l:.2f}' for l in item['logits'][:3]]}")
        print(f"  Probs: {[f'{p:.4f}' for p in item['probabilities'][:3]]}")
        print()
```

#### When to Use --disable_postprocess

The `--disable_postprocess` flag is particularly useful for:

1. **Advanced model analysis**: Examining raw model outputs to understand prediction behavior
2. **Custom processing pipelines**: Implementing your own post-processing logic instead of using the default
3. **Model calibration**: Analyzing and adjusting the model's confidence calibration
4. **Academic research**: Preserving all numerical information from the model for research purposes

## Troubleshooting
If you encounter issues during deployment or inference, consider the following:

- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.

## Next Steps

- Learn about [other NLP tasks](../../overview.md) supported by Hugging Face and KServe

