# Predict on an InferenceService with a saved model from a URI

This doc guides to specify a model object via the URI (Uniform Resource Identifier) of the model object exposed via an `http` or `https` endpoint. 

This `storageUri` option supports single file models, like `sklearn` which is specified by a [joblib](https://joblib.readthedocs.io/en/latest/) file, or artifacts (e.g. `tar` or `zip`) which contain all the necessary dependencies for other model types (e.g. `tensorflow` or `pytorch`). Here, we'll show examples from both of the above.

## Create HTTP/HTTPS header Secret and attach to Service account

The HTTP/HTTPS service request headers can be defined as secret and attached to service account. This is optional.

=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  https-host: ZXhhbXBsZS5jb20=
  headers: |-
    ewoiYWNjb3VudC1uYW1lIjogInNvbWVfYWNjb3VudF9uYW1lIiwKInNlY3JldC1rZXkiOiAic29tZV9zZWNyZXRfa2V5Igp9
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
secrets:
  - name: mysecret
```

=== "kubectl"
```bash
kubectl apply -f create-uri-secret.yaml
```

!!! note
  The serviceAccountName specified in your predictor in your inference service. These headers will be applied to any http/https requests that have the same host.


The header and host should be base64 encoded format.
```text
example.com
# echo -n "example.com" | base64
ZXhhbXBsZS5jb20=
---
{
  "account-name": "some_account_name",
  "secret-key": "some_secret_key"
}
# echo -n '{\n"account-name": "some_account_name",\n"secret-key": "some_secret_key"\n}' | base64
ewoiYWNjb3VudC1uYW1lIjogInNvbWVfYWNjb3VudF9uYW1lIiwKInNlY3JldC1rZXkiOiAic29tZV9zZWNyZXRfa2V5Igp9
```

## Sklearn

### Train and freeze the model

Here, we'll train a simple iris model. Please note that `KServe` requires `sklearn==0.20.3`. 

=== "python"
```python
from sklearn import svm
from sklearn import datasets
import joblib

def train(X, y):
    clf = svm.SVC(gamma='auto')
    clf.fit(X, y)
    return clf

def freeze(clf, path='../frozen'):
    joblib.dump(clf, f'{path}/model.joblib')
    return True

if __name__ == '__main__':
    iris = datasets.load_iris()
    X, y = iris.data, iris.target
    clf = train(X, y)
    freeze(clf)
```

Now, the frozen model object can be put it somewhere on the web to expose it. For instance, pushing the `model.joblib` file to some repo on GitHub.

### Specify and create the `InferenceService`

=== "yaml"
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-from-uri
spec:
  predictor:
    sklearn:
      storageUri: https://github.com/tduffy000/kfserving-uri-examples/blob/master/sklearn/frozen/model.joblib?raw=true

```

=== "kubectl"
```bash
kubectl apply -f sklearn-from-uri.yaml
```

### Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../get_started/first_isvc.md#3-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

An example payload below:
```json
{
  "instances": [
    [6.8,  2.8,  4.8,  1.4],
    [6.0,  3.4,  4.5,  1.6]
  ]
}
```

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-from-uri -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=sklearn-from-uri
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

==** Expected Output **==

```
$ *   Trying 127.0.0.1:8080...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/sklearn-from-uri:predict HTTP/1.1
> Host: sklearn-from-uri.default.example.com
> User-Agent: curl/7.68.0
> Accept: */*
> Content-Length: 76
> Content-Type: application/x-www-form-urlencoded
> 
* upload completely sent off: 76 out of 76 bytes
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 23
< content-type: application/json; charset=UTF-8
< date: Mon, 06 Sep 2021 15:52:55 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 7
< 
* Connection #0 to host localhost left intact
{"predictions": [1, 1]}
```

## Tensorflow

This will serve as an example of the ability to also pull in a tarball containing all of the 
required model dependencies, for instance `tensorflow` requires multiple files in a strict directory structure in order to be servable. 

### Train and freeze the model

=== "python"
```python
from sklearn import datasets
import numpy as np
import tensorflow as tf

def _ohe(targets):
    y = np.zeros((150, 3))
    for i, label in enumerate(targets):
        y[i, label] = 1.0
    return y

def train(X, y, epochs, batch_size=16):
    model = tf.keras.Sequential([
        tf.keras.layers.InputLayer(input_shape=(4,)),
        tf.keras.layers.Dense(16, activation=tf.nn.relu),
        tf.keras.layers.Dense(16, activation=tf.nn.relu),
        tf.keras.layers.Dense(3, activation='softmax')
    ])
    model.compile(tf.keras.optimizers.RMSprop(learning_rate=0.001), loss='categorical_crossentropy', metrics=['accuracy'])
    model.fit(X, y, epochs=epochs)
    return model

def freeze(model, path='../frozen'):
    model.save(f'{path}/0001')
    return True

if __name__ == '__main__':
    iris = datasets.load_iris()
    X, targets = iris.data, iris.target
    y = _ohe(targets)
    model = train(X, y, epochs=50)
    freeze(model)
```

Now, the frozen model object need to package as tarball and pushing it somewhere on the web to expose it. For instance, pushing the `model.joblib` file to some repo on GitHub.

```bash
cd ../frozen
tar -cvf artifacts.tar 0001/
gzip < artifacts.tar > artifacts.tgz
```
Where we assume the `0001/` directory has the structure:
```
|-- 0001/
|-- saved_model.pb
|-- variables/
|--- variables.data-00000-of-00001
|--- variables.index
```
Note that building the tarball from the directory specifying a version number is required for `tensorflow`.

### Specify and create the `InferenceService`
And again, if everything went to plan we should be able to pull down the tarball and expose the endpoint.

=== "yaml"
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: tensorflow-from-uri-gzip
spec:
  predictor:
    tensorflow:
      storageUri: https://raw.githubusercontent.com/tduffy000/kfserving-uri-examples/master/tensorflow/frozen/model_artifacts.tar.gz
```

=== "kubectl"
```bash
kubectl apply -f tensorflow-from-uri-gzip.yaml
```

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../get_started/first_isvc.md#3-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

An example payload below:
```json
{
  "instances": [
    [6.8,  2.8,  4.8,  1.4],
    [6.0,  3.4,  4.5,  1.6]
  ]
}
```

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-from-uri -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=tensorflow-from-uri
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

==** Expected Output **==

```
$ *   Trying 10.0.1.16...
* TCP_NODELAY set
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0* Connected to 10.0.1.16 (10.0.1.16) port 30749 (#0)
> POST /v1/models/tensorflow-from-uri:predict HTTP/1.1
> Host: tensorflow-from-uri.default.example.com
> User-Agent: curl/7.58.0
> Accept: */*
> Content-Length: 86
> Content-Type: application/x-www-form-urlencoded
> 
} [86 bytes data]
* upload completely sent off: 86 out of 86 bytes
< HTTP/1.1 200 OK
< content-length: 112
< content-type: application/json
< date: Thu, 06 Aug 2020 23:21:19 GMT
< x-envoy-upstream-service-time: 151
< server: istio-envoy
< 
{ [112 bytes data]
100   198  100   112  100    86    722    554 --:--:-- --:--:-- --:--:--  1285
* Connection #0 to host 10.0.1.16 left intact
{
  "predictions": [
    [
      0.0204100646,
      0.680984616,
      0.298605353
    ],
    [
      0.0296604875,
      0.658412039,
      0.311927497
    ]
  ]
}
```
