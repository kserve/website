# Deploy MLflow models with InferenceService

This example walks you through how to deploy a `mlflow` model leveraging the KServe `InferenceService` CRD and how to send the inference request using [V2 Dataplane](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2).

## Training

The first step is to train a sample sklearn model and save as mlflow model format by calling mlflow `log_model` API.

```python
# Original source code and more details can be found in:
# https://www.mlflow.org/docs/latest/tutorials-and-examples/tutorial.html

# The data set used in this example is from
# http://archive.ics.uci.edu/ml/datasets/Wine+Quality
# P. Cortez, A. Cerdeira, F. Almeida, T. Matos and J. Reis.
# Modeling wine preferences by data mining from physicochemical properties.
# In Decision Support Systems, Elsevier, 47(4):547-553, 2009.

import warnings
import sys

import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.linear_model import ElasticNet
from urllib.parse import urlparse
import mlflow
import mlflow.sklearn
from mlflow.models.signature import infer_signature

import logging

logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)


def eval_metrics(actual, pred):
    rmse = np.sqrt(mean_squared_error(actual, pred))
    mae = mean_absolute_error(actual, pred)
    r2 = r2_score(actual, pred)
    return rmse, mae, r2


if __name__ == "__main__":
    warnings.filterwarnings("ignore")
    np.random.seed(40)

    # Read the wine-quality csv file from the URL
    csv_url = (
        "http://archive.ics.uci.edu/ml"
        "/machine-learning-databases/wine-quality/winequality-red.csv"
    )
    try:
        data = pd.read_csv(csv_url, sep=";")
    except Exception as e:
        logger.exception(
            "Unable to download training & test CSV, "
            "check your internet connection. Error: %s",
            e,
        )

    # Split the data into training and test sets. (0.75, 0.25) split.
    train, test = train_test_split(data)

    # The predicted column is "quality" which is a scalar from [3, 9]
    train_x = train.drop(["quality"], axis=1)
    test_x = test.drop(["quality"], axis=1)
    train_y = train[["quality"]]
    test_y = test[["quality"]]

    alpha = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
    l1_ratio = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5

    with mlflow.start_run():
        lr = ElasticNet(alpha=alpha, l1_ratio=l1_ratio, random_state=42)
        lr.fit(train_x, train_y)

        predicted_qualities = lr.predict(test_x)

        (rmse, mae, r2) = eval_metrics(test_y, predicted_qualities)

        print("Elasticnet model (alpha=%f, l1_ratio=%f):" % (alpha, l1_ratio))
        print("  RMSE: %s" % rmse)
        print("  MAE: %s" % mae)
        print("  R2: %s" % r2)

        mlflow.log_param("alpha", alpha)
        mlflow.log_param("l1_ratio", l1_ratio)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("r2", r2)
        mlflow.log_metric("mae", mae)

        tracking_url_type_store = urlparse(mlflow.get_tracking_uri()).scheme
        model_signature = infer_signature(train_x, train_y)

        # Model registry does not work with file store
        if tracking_url_type_store != "file":

            # Register the model
            # There are other ways to use the Model Registry,
            # which depends on the use case,
            # please refer to the doc for more information:
            # https://mlflow.org/docs/latest/model-registry.html#api-workflow
            mlflow.sklearn.log_model(
                lr,
                "model",
                registered_model_name="ElasticnetWineModel",
                signature=model_signature,
            )
        else:
            mlflow.sklearn.log_model(lr, "model", signature=model_signature)
```

The training script will also serialise our trained model, leveraging the MLflow Model format.

```text
model/
├── MLmodel
├── model.pkl
├── conda.yaml
└── requirements.txt
```

## Testing locally

Once you've got your model serialised `model.pkl`, we can then use [MLServer](https://github.com/SeldonIO/MLServer) to spin up a local server.
For more details on MLServer, feel free to check the [MLflow example doc](https://github.com/SeldonIO/MLServer/tree/master/docs/examples/mlflow/README.md).

!!! Note
    this step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-with-inferenceservice).

### Pre-requisites

Firstly, to use MLServer locally, you will first need to install the `mlserver`
package in your local environment, as well as the MLflow runtime.

```bash
pip install mlserver mlserver-mlflow
```

### Model settings

The next step will be providing some model settings so that
MLServer knows:

- The inference runtime to serve your model (i.e. `mlserver_mlflow.MLflowRuntime`)
- The model's name and version

These can be specified through environment variables or by creating a local
`model-settings.json` file:

```json
{
  "name": "mlflow-wine-classifier",
  "version": "v1.0.0",
  "implementation": "mlserver_mlflow.MLflowRuntime"
}
```

### Start the model server locally

With the `mlserver` package installed locally and a local `model-settings.json` file, you should now be ready to start our server as:

```bash
mlserver start .
```

## Deploy with InferenceService

When you deploy the model with InferenceService, KServe injects sensible defaults so that it runs out-of-the-box without any
further configuration. However, you can still override these defaults by providing a `model-settings.json` file similar to your local one.
You can even provide a [set of `model-settings.json` files to load multiple models](https://github.com/SeldonIO/MLServer/tree/master/docs/examples/mms).

To use v2 protocol for inference with the deployed model you set the **`protocolVersion` field to `v2`**, in this eample your model artifacts have already been uploaded to a "GCS model repository" and can be accessed as `gs://kfserving-examples/models/mlflow/wine`.

=== "New Schema"

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "mlflow-v2-wine-classifier"
spec:
  predictor:
    model:
      modelFormat:
        name: mlflow
      protocolVersion: v2
      storageUri: "gs://kfserving-examples/models/mlflow/wine"
```

=== "kubectl"

```bash
kubectl apply -f mlflow-new.yaml
```

## Testing deployed model

You can now test your deployed model by sending a sample request.

Note that this request **needs to follow the [V2 Dataplane protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2)**.
You can see an example payload below:

```json
{
  "parameters": {
    "content_type": "pd"
  },
  "inputs": [
      {
        "name": "fixed acidity",
        "shape": [1],
        "datatype": "FP32",
        "data": [7.4]
      },
      {
        "name": "volatile acidity",
        "shape": [1],
        "datatype": "FP32",
        "data": [0.7000]
      },
      {
        "name": "citric acid",
        "shape": [1],
        "datatype": "FP32",
        "data": [0]
      },
      {
        "name": "residual sugar",
        "shape": [1],
        "datatype": "FP32",
        "data": [1.9]
      },
      {
        "name": "chlorides",
        "shape": [1],
        "datatype": "FP32",
        "data": [0.076]
      },
      {
        "name": "free sulfur dioxide",
        "shape": [1],
        "datatype": "FP32",
        "data": [11]
      },
      {
        "name": "total sulfur dioxide",
        "shape": [1],
        "datatype": "FP32",
        "data": [34]
      },
      {
        "name": "density",
        "shape": [1],
        "datatype": "FP32",
        "data": [0.9978]
      },
      {
        "name": "pH",
        "shape": [1],
        "datatype": "FP32",
        "data": [3.51]
      },
      {
        "name": "sulphates",
        "shape": [1],
        "datatype": "FP32",
        "data": [0.56]
      },
      {
        "name": "alcohol",
        "shape": [1],
        "datatype": "FP32",
        "data": [9.4]
      }
  ]
}
```

Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

you can use `curl` to send the inference request as:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice mlflow-v2-wine-classifier -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./mlflow-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/mlflow-v2-wine-classifier/infer
```

==**Expected Output**==

```json
{
  "model_name":"mlflow-v2-wine-classifier",
  "model_version":null,
  "id":"699cf11c-e843-444e-9dc3-000d991052cc",
  "parameters":null,
  "outputs":[
    {
      "name":"predict",
      "shape":[1],
      "datatype":"FP64",
      "parameters":null,
      "data":[5.576883936610762]
    }
  ]
}
```
