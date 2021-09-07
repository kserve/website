# Serve SKLearn models with InferenceService

This example walks you through how to deploy a `scikit-learn` model leveraging
the `v1beta1` version of the `InferenceService` CRD.
Note that, by default the `v1beta1` version will expose your model through an
API compatible with the existing V1 Dataplane.
However, this example will show you how to serve a model through an API
compatible with the new [V2 Dataplane](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2).

## Training

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

## Testing locally

Once you've got your model serialised `model.joblib`, we can then use
[MLServer](https://github.com/SeldonIO/MLServer) to spin up a local server.
For more details on MLServer, feel free to check the [SKLearn example doc](https://github.com/SeldonIO/MLServer/blob/master/docs/examples/sklearn/README.md).

!!! Note
    this step is optional and just meant for testing, feel free to jump straight to [deploying with InferenceService](#deploy-with-inferenceservice).

### Pre-requisites

Firstly, to use MLServer locally, you will first need to install the `mlserver`
package in your local environment, as well as the SKLearn runtime.

```bash
pip install mlserver mlserver-sklearn
```

### Model settings

The next step will be providing some model settings so that
MLServer knows:

- The inference runtime to serve your model (i.e. `mlserver_sklearn.SKLearnModel`)
- The model's name and version

These can be specified through environment variables or by creating a local
`model-settings.json` file:

```json
{
  "name": "sklearn-iris",
  "version": "v1.0.0",
  "implementation": "mlserver_sklearn.SKLearnModel"
}
```

Note that, when you [deploy your model](#deployment), **KServe will already
inject some sensible defaults** so that it runs out-of-the-box without any
further configuration.
However, you can still override these defaults by providing a
`model-settings.json` file similar to your local one.
You can even provide a [set of `model-settings.json` files to load multiple
models](https://github.com/SeldonIO/MLServer/tree/master/docs/examples/mms).

### Serving our model locally

With the `mlserver` package installed locally and a local `model-settings.json`
file, you should now be ready to start our server as:

```bash
mlserver start .
```

## Deploy with InferenceService 

Lastly, you will use KServe to deploy the trained model.
For this, you will just need to use **version `v1beta1`** of the
`InferenceService` CRD and set the **`protocolVersion` field to `v2`**.

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-irisv2"
spec:
  predictor:
    sklearn:
      protocolVersion: "v2"
      storageUri: "gs://seldon-models/sklearn/iris"
```

Note that this makes the following assumptions:

- Your model weights (i.e. your `model.joblib` file) have already been uploaded
  to a "model repository" (GCS in this example) and can be accessed as
  `gs://seldon-models/sklearn/iris`.
- There is a K8s cluster available, accessible through `kubectl`.
- KServe has already been [installed in your cluster](../../../../get_started/README.md).


=== "kubectl"
    ```
    kubectl apply -f ./sklearn.yaml
    ```

## Testing deployed model

You can now test your deployed model by sending a sample request.

Note that this request **needs to follow the [V2 Dataplane
protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2)**.
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
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../../get_started/first_isvc.md#3-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

you can use `curl` to send the inference request as:
 
```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-irisv2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -d @./iris-input.json \
  http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/sklearn-irisv2/infer
```

==** Expected Output **==

```json
{
  "id": "823248cc-d770-4a51-9606-16803395569c",
  "model_name": "iris-classifier",
  "model_version": "v1.0.0",
  "outputs": [
    {
      "data": [1, 2],
      "datatype": "FP32",
      "name": "predict",
      "parameters": null,
      "shape": [2]
    }
  ]
}
```
