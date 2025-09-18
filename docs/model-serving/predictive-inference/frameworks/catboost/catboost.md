---
title: CatBoost
description: Deploy CatBoost models with KServe
---

# Deploying CatBoost Models with KServe

This guide demonstrates how to deploy MLflow models using KServe's `InferenceService` and how to send inference requests using the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- `kubectl` CLI configured to communicate with your cluster.
- Basic knowledge of Kubernetes concepts and MLflow models.
- Access to cloud storage (like Google Cloud Storage) to store your model artifacts.

## Training a Sample CatBoost Model

The first step is to train a sample CatBoost model and serialize it in an appropriate format using [save_model](https://catboost.ai/docs/en/concepts/python-reference_catboost_save_model) API.

```python
import numpy as np
from catboost import CatBoostClassifier

train_data = np.random.randint(0, 100, size=(100, 10))
train_labels = np.random.randint(0, 2, size=(100))

model = CatBoostClassifier(
    iterations=2,
    depth=2,
    learning_rate=1,
    loss_function="Logloss",
    verbose=True,
)
model.fit(train_data, train_labels)
model.save_model("model.cbm")
```

## Testing the Model Locally

Once you have your model serialized as `model.cbm`, you can use [MLServer](https://github.com/SeldonIO/MLServer) to create a local model server. For more details, check the [CatBoost example documentation](https://mlserver.readthedocs.io/en/stable/examples/catboost/README.html).

:::tip
This local testing step is optional. You can skip to the deployment section if you prefer.
:::

### Prerequisites

To use MLServer locally, install the `mlserver` package and the CatBoost runtime:

```bash
pip install mlserver mlserver-catboost
```

### Model Settings

Next, provide model settings so that MLServer knows:

- The inference runtime to serve your model (i.e. `mlserver_catboost.CatboostModel`)
- The model's parameters

These can be specified through environment variables or by creating a local `model-settings.json` file:

```json
{
  "implementation": "mlserver_catboost.CatboostModel",
  "name": "catboost-classifier",
  "parameters": {
    "uri": "./model.cbm",
    "version": "v0.1.0"
  }
}
```

### Starting the Model Server Locally

With the `mlserver` package installed and a local `model-settings.json` file, start your server with:

```bash
cat << EOF > model-settings.json
{
  "implementation": "mlserver_catboost.CatboostModel",
  "name": "catboost-classifier",
  "parameters": {
    "uri": "./model.cbm",
    "version": "v0.1.0"
  }
}
EOF

mlserver start .
```

If everything is fine, you will see such messages in the mlserver process output:

```txt
2025-09-18 01:15:05,483 [mlserver.parallel] DEBUG - Starting response processing loop...
2025-09-18 01:15:05,484 [mlserver.rest] INFO - HTTP server running on http://0.0.0.0:8080
...
2025-09-18 01:15:06,528 [mlserver][catboost-classifier:v0.1.0] INFO - Loaded model 'catboost-classifier' successfully.
2025-09-18 01:15:06,529 [mlserver][catboost-classifier:v0.1.0] INFO - Loaded model 'catboost-classifier' successfully.
```

## Deploying the Model with InferenceService

When deploying the model with InferenceService, KServe injects sensible defaults that work out-of-the-box without additional configuration. However, you can override these defaults by providing a `model-settings.json` file similar to your local one. You can even provide [multiple `model-settings.json` files to load multiple models](https://github.com/SeldonIO/MLServer/tree/master/docs/examples/mms).

To use the Open Inference Protocol (v2) for inference with the deployed model, set the `protocolVersion` field to `v2`. In this example, your model artifacts have already been uploaded to a Google Cloud Storage bucket and can be accessed at `gs://kfserving-examples/models/catboost/classifier`.

Apply the YAML manifest:

```bash
kubectl apply -f - << EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "catboost-example"
spec:
  predictor:
    model:
      runtime: kserve-mlserver
      modelFormat:
        name: catboost
      protocolVersion: v2
      storageUri: "gs://kfserving-examples/models/catboost/classifier"
      resources:
        requests:
          cpu: "1"
          memory: "1Gi"
        limits:
          cpu: "1"
          memory: "1Gi"
EOF
```

## Testing the Deployed Model

You can test your deployed model by sending a sample request following the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

Use our sample input file [catboost-input.json](./catboost-input.json) to test the model:

[Determine the ingress IP and ports](../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports), then set the `INGRESS_HOST` and `INGRESS_PORT` environment variables.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice catboost-example -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./catboost-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/catboost-example/infer
```

:::tip[Expected Output]
```json
{
  "model_name": "catboost-example",
  "id": "70062817-f7de-4105-93ef-e0e2ea3d214e",
  "parameters": {},
  "outputs": [
    {
      "name": "predict",
      "shape": [
        1,
        1
      ],
      "datatype": "INT64",
      "parameters": {
        "content_type": "np"
      },
      "data": [
        0
      ]
    }
  ]
}
```
:::
