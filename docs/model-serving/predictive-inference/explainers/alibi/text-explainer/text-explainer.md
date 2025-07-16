---
title: Text Explainer 
description: Example of using Alibi AnchorText explainer on movie sentiment data with KServe
---

# Anchors Text Explanation for Movie Sentiment

This example uses a [movie sentiment dataset](http://www.cs.cornell.edu/people/pabo/movie-review-data/) to show the explanation on text data. For a more visual walkthrough, please try the [Jupyter notebook](https://github.com/kserve/kserve/blob/master/docs/samples/explanation/alibi/moviesentiment/movie_review_explanations.ipynb).

## Prerequisites
- Ensure you have a Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- The code sample for this example is available in the [KServe GitHub repository](https://github.com/kserve/kserve/tree/master/docs/samples/explanation/alibi/moviesentiment).

## Deploy InferenceService with AnchorText Explainer

We can create an InferenceService with a trained sklearn predictor for this dataset and an associated explainer. 
The black box explainer algorithm we will use is the Text version of Anchors from the [Alibi open source library](https://github.com/SeldonIO/alibi).
More details on this algorithm and configuration settings can be found in the [Seldon Alibi documentation](https://docs.seldon.io/projects/alibi/en/stable/).

The InferenceService is shown below:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "moviesentiment"
spec:
  predictor:
    minReplicas: 1
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://seldon-models/v1.16.0/sklearn/moviesentiment"
      resources:
        requests:
          cpu: 0.1
          memory: 1Gi       
        limits:
          cpu: 1
          memory: 1Gi         
  explainer:
    minReplicas: 1
    containers:
      - name: kserve-container
        image: kserve/alibi-explainer:v0.12.1
        args:
          - --model_name=moviesentiment
          - --http_port=8080
          - --predictor_host=moviesentiment-predictor.default
          - AnchorText
        resources:
          requests:
            cpu: 0.1
            memory: 6Gi 
          limits:
            cpu: 1
            memory: 10Gi
```

Create this InferenceService:

```bash
kubectl create -f moviesentiment.yaml
```

## Run Inference and Explanation
The first step is to [determine the ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`:

```bash
MODEL_NAME=moviesentiment
SERVICE_HOSTNAME=$(kubectl get inferenceservice moviesentiment -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Test the predictor on an example sentence:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```

You should receive the response showing negative sentiment:

:::tip[Expected Output]

```json
{"predictions": [0]}
```

:::

Test on another sentence:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d '{"instances":["a touching , sophisticated film that almost seems like a documentary in the way it captures an italian immigrant family on the brink of major changes ."]}'
```

You should receive the response showing positive sentiment:

:::tip[Expected Output]

```json
{"predictions": [1]}
```

:::

Now let's get an explanation for the first sentence:

```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:explain -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```

:::note

The output is truncated for brevity.

:::

:::tip[Expected Output]

```json
{
  "names": ["exercise"],
  "precision": 1,
  "converage": 0.5005,
  "raw": {
    "feature": [9],
    "mean": [1],
    "precision": [1],
    "coverage": [0.5005],
    "examples": [
      {
        "covered": [
          ["a visually ... vapid exercise UNK"],
          ["a visually flashy ... emotionally UNK exercise ."],
          ["a visually flashy ... UNK exercise ."],
          ...
        ],
        "covered_true": [
          ["UNK visually flashy ... emotionally vapid exercise ."],
          ["UNK visually ... UNK exercise ."],
          ...
        ],
        "covered_false": [],
        "uncovered_true": [],
        "uncovered_false": []
      }
    ],
    "all_precision": 0,
    "num_preds": 1000101,
    "positions": [63],
    "instance": "a visually flashy but narratively opaque and emotionally vapid exercise .",
    "prediction": 0
  }
}
```

:::

This shows the key word "exercise" was identified and examples show it in context using the default "UNK" placeholder for surrounding words.

## Custom Configuration

You can add custom configuration for the Anchor Text explainer in the 'config' section. For example, we can change the text explainer to sample from the corpus rather than use UNK placeholders:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "moviesentiment"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://seldon-models/v1.16.0/sklearn/moviesentiment"
      resources:
        requests:
          cpu: 0.1
  explainer:
    containers:
      - name: kserve-container
        image: kserve/alibi-explainer:v0.12.1
        args:
          - --model_name=moviesentiment
          - --http_port=8080
          - --predictor_host=moviesentiment-predictor.default
          - ----use_unk=false
          - --sample_proba=0.5
          - AnchorText
        resources:
          requests:
            cpu: 0.1
            memory: 6Gi 
          limits:
            cpu: 1
            memory: 10Gi
```

If we apply this:

```bash
kubectl create -f moviesentiment2.yaml
```

and then ask for an explanation:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:explain -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```
:::note

The output is truncated for brevity.

:::

:::tip[Expected Output]

```json
{
  "names": ["exercise"],
  "precision": 0.9918,
  "coverage": 0.5072,
  "raw": {
    "feature": [9],
    "mean": [0.9918],
    "precision": [0.9918],
    "coverage": [0.5072],
    "examples": [
      {
        "covered": [
          ["each visually ... vapid exercise ."],
          ["each academically ... vapid exercise ."],
          ["a masterfully ... disingenuous exercise ."],
          ...
        ],
        "covered_true": [
          ["another visually ... vapid exercise ."],
          ["the visually ... vapid exercise ."],
          ...
        ],
        "covered_false": [
          ["another enormously ... idiotic exercise ."],
          ["each visually ... vapid exercise ."]
        ],
        "uncovered_true": [],
        "uncovered_false": []
      }
    ],
    "all_precision": 0,
    "num_preds": 1000101,
    "positions": [63],
    "instance": "a visually flashy but narratively opaque and emotionally vapid exercise .",
    "prediction": 0
  }
}
```

:::
