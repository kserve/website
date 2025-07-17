---
title: Tabular Explainer
description: Example of using Alibi AnchorTabular explainer on US income dataset with KServe
---

# Anchors Tabular Explanation for Income Prediction

This example uses a [US income dataset](https://archive.ics.uci.edu/ml/datasets/adult) to show an example of explanation on tabular data.
You can also try out the [Jupyter notebook](https://github.com/kserve/kserve/blob/master/docs/samples/explanation/alibi/income/income_explanations.ipynb) for a visual walkthrough.

## Prerequisites
- Ensure you have a Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- The code sample for this example is available in the [KServe GitHub repository](https://github.com/kserve/kserve/tree/master/docs/samples/explanation/alibi/income).

## Create the InferenceService with Alibi Explainer

We can create an InferenceService with a trained sklearn predictor for this dataset and an associated model explainer.
The black box explainer algorithm we will use is the Tabular version of Anchors from the [Alibi open source library](https://github.com/SeldonIO/alibi). More details on this algorithm and configuration settings can be found in the [Seldon Alibi documentation](https://docs.seldon.io/projects/alibi/en/stable/).

The InferenceService is shown below:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "income"
spec:
  predictor:
    minReplicas: 1
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.3/income/model"
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
        - --model_name=income
        - --http_port=8080
        - --predictor_host=income-predictor.default
        - --storage_uri=/mnt/models
        - AnchorTabular
        env:
          - name: STORAGE_URI
            value: "gs://kfserving-examples/models/sklearn/1.3/income/explainer"
        resources:
          requests:
            cpu: 0.1
            memory: 1Gi
          limits:
            cpu: 1
            memory: 4Gi
```

Create the InferenceService with the above yaml:

```bash
kubectl create -f income.yaml
```

### Run the inference

The first step is to [determine the ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`:

```bash
MODEL_NAME=income
SERVICE_HOSTNAME=$(kubectl get inferenceservice income -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Test the predictor:

```bash
curl -H "Host: $SERVICE_HOSTNAME" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d '{"instances":[[39, 7, 1, 1, 1, 1, 4, 1, 2174, 0, 40, 9]]}'
```

You should receive the response showing the prediction is for low salary:

:::tip[Expected Output]

```json
{"predictions": [0]}
```

:::

### Run the explanation
Now let's get an explanation for this:

```bash
curl -H "Host: $SERVICE_HOSTNAME" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:explain -d '{"instances":[[39, 7, 1, 1, 1, 1, 4, 1, 2174, 0, 40, 9]]}'
```

The returned explanation will be like:

:::note

The output is truncated for brevity.

:::

:::tip[Expected Output]

```json
{
  "names": [
    "Marital Status = Never-Married",
    "Workclass = State-gov"
  ],
  "precision": 0.9724770642201835,
  "coverage": 0.0147,
  "raw": {
    "feature": [
      3,
      1
    ],
    "mean": [
      0.9129746835443038,
      0.9724770642201835
    ],
    "precision": [
      0.9129746835443038,
      0.9724770642201835
    ],
    "coverage": [
      0.3327,
      0.0147
    ],
    "examples": [
      {
        "covered": [
          [
            30,
            "Self-emp-not-inc",
            "Bachelors",
            "Never-Married",
            "Sales",
            "Unmarried",
            "White",
            "Male",
            "Capital Gain <= 0.00",
            "Capital Loss <= 0.00",
            40,
            "United-States"
          ],
         ...
        ]
      },
    ]
    "all_precision": 0,
    "num_preds": 1000101,
    "names": [
      "Marital Status = Never-Married",
      "Workclass = State-gov"
    ],
    "instance": [
      [
        39
      ],
      [
        7
      ],
      [
        "28.00 < Age <= 37.00"
      ],
      [
        "28.00 < Age <= 37.00"
      ],
      [
        "28.00 < Age <= 37.00"
      ],
      [
        "28.00 < Age <= 37.00"
      ],
      [
        4
      ],
      [
        "28.00 < Age <= 37.00"
      ],
      [
        2174
      ],
      [
        "Age <= 28.00"
      ],
      [
        40
      ],
      [
        9
      ]
    ],
    "prediction": 0
  }
}
```

:::
