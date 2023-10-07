# Deploy Scikit-learn models with InferenceService

This example walks you through how to deploy a `scikit-learn` model leveraging
the `v1beta1` version of the `InferenceService` CRD.
Note that, by default the `v1beta1` version will expose your model through an
API compatible with the existing V1 Dataplane.
This example will show you how to serve a model through [Open Inference Protocol](https://github.com/kserve/open-inference-protocol).

## Train the Model

The first step will be to train a sample `scikit-learn` model.
Note that this model will be then saved as `model.joblib`.

```python
from sklearn import svm
from sklearn import datasets
from joblib import dump

iris = datasets.load_iris()
X, y = iris.data, iris.target

clf = svm.SVC(gamma='scale')
clf.fit(X, y)

dump(clf, 'model.joblib')
```

## Test the Model locally

Once you've got your model serialised `model.joblib`, we can then use [KServe Sklearn Server](https://github.com/kserve/kserve/tree/master/python/sklearnserver) to spin up a local server.

!!! Note
    This step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-with-inferenceservice).

### Using KServe SklearnServer

#### Pre-requisites

Firstly, to use KServe sklearn server locally, you will first need to install the `sklearnserver`
runtime package in your local environment.

1. Clone the KServe repository and navigate into the directory.
    ```bash
    git clone https://github.com/kserve/kserve
    ```
2. Install `sklearnserver` runtime. Kserve uses [Poetry](https://python-poetry.org/) as the dependency management tool. Make sure you have already [installed poetry](https://python-poetry.org/docs/#installation).
    ```bash
    cd python/sklearnserver
    poetry install 
    ```
#### Serving model locally

The `sklearnserver` package takes two arguments.

- `--model_dir`: The model directory path where the model is stored.
- `--model_name`: The name of the model deployed in the model server, the default value is `model`. This is optional. 

With the `sklearnserver` runtime package installed locally, you should now be ready to start our server as:

```bash
python3 sklearnserver --model_dir /path/to/model_dir --model_name sklearn-irisv2
```

## Deploy the Model with InferenceService 

Lastly, you will use KServe to deploy the trained model onto Kubernetes.
For this, you will just need to use **version `v1beta1`** of the
`InferenceService` CRD and set the **`protocolVersion` field to `v2`**.

=== "Yaml"
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-irisv2"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          protocolVersion: v2
          runtime: kserve-sklearnserver
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```

!!! Note
    For `V2 protocol (open inference protocol)` if `runtime` field is not provided then, by default `mlserver` runtime is used.

=== "kubectl"
    ```bash
    kubectl apply -f ./sklearn.yaml
    ```

## Test the Deployed Model

You can now test your deployed model by sending a sample request.

Note that this request **needs to follow the [Open Inference Protocol](https://github.com/kserve/open-inference-protocol)**.
You can see an example payload below:

```json
{
  "inputs": [
    {
      "name": "input-0",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [
        [6.8, 2.8, 4.8, 1.4],
        [6.0, 3.4, 4.5, 1.6]
      ]
    }
  ]
}
```

Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

You can use `curl` to send the inference request as:
 
```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-irisv2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d @./iris-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-irisv2/infer
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "id": "823248cc-d770-4a51-9606-16803395569c",
      "model_name": "sklearn-irisv2",
      "model_version": "v1.0.0",
      "outputs": [
        {
          "data": [1, 1],
          "datatype": "INT64",
          "name": "predict",
          "parameters": null,
          "shape": [2]
        }
      ]
    }
    ```
