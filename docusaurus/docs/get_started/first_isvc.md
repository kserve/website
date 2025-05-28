# Run your first InferenceService

In this tutorial, you will deploy an InferenceService with a predictor that will load a scikit-learn model trained with
the [iris](https://archive.ics.uci.edu/ml/datasets/iris) dataset. This dataset has three output classes: Iris Setosa, Iris Versicolour, and Iris Virginica.

You will then send an inference request to your deployed model in order to get a prediction for the class of iris plant your request corresponds to.

Since your model is being deployed as an InferenceService, not a raw Kubernetes Service, you just need to provide the storage location of the model and
it gets some **super powers out of the box** 🚀.

## 1. Create a namespace

First, create a namespace to use for deploying KServe resources:

```shell
kubectl create namespace kserve-test
```

## 2. Create an `InferenceService`

Next, define a new InferenceService YAML for the model and apply it to the cluster.

A new predictor schema was introduced in `v0.8.0`. New `InferenceServices` should be deployed using the new schema. The old schema
is provided as reference.

### New Schema

```yaml
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

### Old Schema (Reference)

```yaml
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    sklearn:
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

## 3. Check InferenceService status

```shell
kubectl get inferenceservices sklearn-iris -n kserve-test
```

You should see the InferenceService status with URL similar to following:

```
NAME           URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                    AGE
sklearn-iris   http://sklearn-iris.kserve-test.example.com/v1/models/sklearn-iris   True           100                              sklearn-iris-predictor-default-00001   7m32s
```

## 4. Determine the ingress IP and ports

The commands to determine the ingress IP and port depend on whether you installed KServe with Istio, Kourier, or Ambassador ingress.

### With Istio Ingress Gateway

```shell
export INGRESS_GATEWAY_SERVICE=$(kubectl get svc --namespace istio-system --selector="app=istio-proxy" --output jsonpath='{.items[0].metadata.name}')
kubectl port-forward --namespace istio-system svc/${INGRESS_GATEWAY_SERVICE} 8080:80
# Open another terminal and export
export INGRESS_HOST=localhost
export INGRESS_PORT=8080
```

### With Kourier Ingress

```shell
kubectl port-forward --namespace kourier-system svc/kourier 8080:80
# Open another terminal and export
export INGRESS_HOST=localhost
export INGRESS_PORT=8080
```

## 5. Perform inference

Now, the service should be accessible through the ingress gateway. The first step is to [determine the ingress IP and port](#4-determine-the-ingress-ip-and-ports) and set the `INGRESS_HOST` and `INGRESS_PORT` variables.

```shell
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -n kserve-test -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/sklearn-iris:predict -d '{"instances": [[6.8,  2.8,  4.8,  1.4], [6.0,  3.4,  4.5,  1.6]]}'
```

Expected Output:

```
*   Trying 127.0.0.1:8080...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/sklearn-iris:predict HTTP/1.1
> Host: sklearn-iris.kserve-test.example.com
> User-Agent: curl/7.58.0
> Accept: */*
> Content-Length: 76
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 76 out of 76 bytes
< HTTP/1.1 200 OK
< content-length: 23
< content-type: application/json; charset=UTF-8
< date: Mon, 20 Jul 2020 20:35:02 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 13
<
* Connection #0 to host localhost left intact
{"predictions": [1, 1]}
```

**Congratulations!** 🎉 You just deployed your first InferenceService and made a prediction!

## What's next?

- Learn about [different model frameworks and formats](../modelserving/control_plane.md)
- Explore [advanced deployment strategies](../modelserving/v1beta1/rollout/canary.md)
- Set up [model monitoring and explainability](../modelserving/explainer/explainer.md)
- Join our [community](../community/adopters.md) and see who else is using KServe

1. Check that KServe is properly installed
2. Verify your Kubernetes cluster meets the requirements
3. Check the InferenceService logs: `kubectl logs -l serving.kserve.io/inferenceservice=sklearn-iris`

For more help, visit our [GitHub Issues](https://github.com/kserve/kserve/issues) or join our [Slack community](https://kubeflow.slack.com/).
