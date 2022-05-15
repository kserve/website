# Canary Rollout Example

## Setup

1. Your ~/.kube/config should point to a cluster with [KServe installed](https://kserve.github.io/website/master/admin/serverless/).
2. Your cluster's Istio Ingress gateway must
   be [network accessible](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/).

## Create the InferenceService

Complete steps 1-3 in the [First Inference Service](https://kserve.github.io/website/master/get_started/first_isvc/)
tutorial. Set up a namespace (if not already created), and create an InferenceService.

After rolling out the first model, 100% traffic goes to the initial model with service revision 1.

Run `kubectl get isvc sklearn-iris` in the command line to see the amount of traffic routing to the InferenceService
under the `LATEST` column.

```
NAME       URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                AGE
sklearn-iris   http://sklearn-iris.kserve-test.example.com   True           100                              sklearn-iris-predictor-default-00001   46s                               2m39s                             70s
```

## Update the InferenceService with the canary rollout strategy

Add the `canaryTrafficPercent` field to the predictor component and update the `storageUri` to use a new/updated model.

> **_NOTE:_** A new predictor schema was introduced in `v0.8.0`. New `InferenceServices` should be deployed using the new schema. The old schema is provided as reference.


=== "New Schema"

    ```bash
    kubectl apply -n kserve-test -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
    spec:
      predictor:
        canaryTrafficPercent: 10
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model-2"
    EOF
    ```

=== "Old Schema"

    ```bash
    kubectl apply -n kserve-test -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
    spec:
      predictor:
        canaryTrafficPercent: 10
        sklearn:
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model-2"
    EOF
    ```

After rolling out the canary model, traffic is split between the latest ready revision 2 and the previously rolled out
revision 1.

```bash
kubectl get isvc sklearn-iris

NAME       URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION              LATESTREADYREVISION                AGE
sklearn-iris   http://sklearn-iris.kserve-test.example.com   True    90     10       sklearn-iris-predictor-default-00001   sklearn-iris-predictor-default-00002   9m19s
```

Check the running pods, you should now see port two pods running for the old and new model and 10% traffic is routed to
the new model. Notice revision 1 contains `default-0001` in its name, while revision 2 contains `default-0002`.

```bash
kubectl get pods 

NAME                                                              READY   STATUS      RESTARTS   AGE
sklearn-iris-predictor-default-00001-deployment-66c5f5b8d5-gmfvj   2/2     Running     0          11m
sklearn-iris-predictor-default-00002-deployment-5bd9ff46f8-shtzd   2/2     Running     0          12m
```

## Run a prediction

Follow the next two
steps ([Determine the ingress IP and ports](https://kserve.github.io/website/0.8/get_started/first_isvc/#4-determine-the-ingress-ip-and-ports
) and [Perform inference](https://kserve.github.io/website/master/get_started/first_isvc/#5-perform-inference)) in
the [First Inference Service](https://kserve.github.io/website/0.8/get_started/first_isvc/) tutorial.

Send more requests to the `InferenceService` to observe the 10% of traffic that routes to the new revision.

## Promote the canary model

If the canary model is healthy/passes your tests, you can promote it by removing the `canaryTrafficPercent` field and
re-applying the `InferenceService` custom resource.

```
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model-2"
EOF
```

Now all traffic goes to the revision 2 for the new model.

```
kubectl get isvc sklearn-iris
NAME       URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                AGE
sklearn-iris   http://sklearn-iris.kserve-test.example.com   True           100                              sklearn-iris-predictor-default-00002   17m
```

The pods for revision generation 1 automatically scales down to 0 as it is no longer getting the traffic.

```bash
kubectl get pods -l serving.kserve.io/inferenceservice=sklearn-iris
NAME                                                           READY   STATUS        RESTARTS   AGE
sklearn-iris-predictor-default-00001-deployment-66c5f5b8d5-gmfvj   1/2     Terminating   0          17m
sklearn-iris-predictor-default-00002-deployment-5bd9ff46f8-shtzd   2/2     Running       0          15m
```

## Rollback and pin the previous model

You can pin the previous model (model v1, for example) by setting the `canaryTrafficPercent` to 0 for the current
model (model v2, for example). This rolls back from model v2 to model v1 and decreases model v2's traffic to zero.

Apply the custom resource to set model v2's traffic to 0%.

```bash
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    canaryTrafficPercent: 0
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model-2"
EOF
```

Check the traffic split, now 100% traffic goes to the previous good model (model v1) for revision generation 1.

```bash
kubectl get isvc sklearn-iris
NAME       URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION              LATESTREADYREVISION                AGE
sklearn-iris   http://sklearn-iris.kserve-test.example.com   True    100    0        sklearn-iris-predictor-default-00001   sklearn-iris-predictor-default-00002   18m
```

The pods for previous revision (model v1) now routes 100% of the traffic to its pods while the new
model (model v2) routes 0% traffic to its pods.

```bash
kubectl get pods -l serving.kserve.io/inferenceservice=sklearn-iris

NAME                                                           READY   STATUS            RESTARTS   AGE
sklearn-iris-predictor-default-00001-deployment-66c5f5b8d5-gmfvj   1/2     Running       0          35s
sklearn-iris-predictor-default-00002-deployment-5bd9ff46f8-shtzd   2/2     Running       0          16m
```

## Route traffic using a tag

You can enable tag based routing by adding the annotation `serving.kserve.io/enable-tag-routing`, so traffic can be
explicitly routed to the canary model (model v2) or the old model (model v1) via a tag in the request URL.

Apply model v2 with `canaryTrafficPercent: 10` and `serving.kserve.io/enable-tag-routing: "true"`.

```bash
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  annotations:
    serving.kserve.io/enable-tag-routing: "true"
spec:
  predictor:
    canaryTrafficPercent: 10
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model-2"
EOF
```

Check the InferenceService status to get the canary and previous model URL.

```bash
kubectl get isvc sklearn-iris -ojsonpath="{.status.components.predictor}"  | jq
```

The output should look like

```bash
{
  "address": {
    "url": "http://sklearn-iris-predictor-default.kserve-test.svc.cluster.local"
  },
  "latestCreatedRevision": "sklearn-iris-predictor-default-00003",
  "latestReadyRevision": "sklearn-iris-predictor-default-00003",
  "latestRolledoutRevision": "sklearn-iris-predictor-default-00001",
  "previousRolledoutRevision": "sklearn-iris-predictor-default-00001",
  "traffic": [
    {
      "latestRevision": true,
      "percent": 10,
      "revisionName": "sklearn-iris-predictor-default-00003",
      "tag": "latest",
      "url": "http://latest-sklearn-iris-predictor-default.kserve-test.example.com"
    },
    {
      "latestRevision": false,
      "percent": 90,
      "revisionName": "sklearn-iris-predictor-default-00001",
      "tag": "prev",
      "url": "http://prev-sklearn-iris-predictor-default.kserve-test.example.com"
    }
  ],
  "url": "http://sklearn-iris-predictor-default.kserve-test.example.com"
}
```

Since we updated the annotation on the `InferenceService`, model v2 now corresponds to `sklearn-iris-predictor-default-00003`.

You can now send the request explicitly to the new model or the previous model by using the tag in the request URL. Use
the curl command
from [Perform inference](https://kserve.github.io/website/master/get_started/first_isvc/#5-perform-inference) and
add `latest-` or `prev-` to the model name to send a tag based request.

For example, set the model name and use the following commands to send traffic to each service based on the `latest` or `prev` tag.

```bash
MODEL_NAME=sklearn-iris
```

curl the latest revision

```bash
curl -v -H "Host: latest-${MODEL_NAME}-predictor-default.kserve-test.example.com" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d @./iris-input.json

```

or curl the previous revision

```bash
curl -v -H "Host: prev-${MODEL_NAME}-predictor-default.kserve-test.example.com" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d @./iris-input.json

```
