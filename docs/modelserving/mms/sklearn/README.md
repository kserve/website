# Multi-Model Serving with scikit-learn

## Deploy InferenceService with scikit-learn Runtime
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris-example"
spec:
  predictor:
    minReplicas: 1
    sklearn:
      protocolVersion: v1
      name: "sklearn-iris-predictor"
      resources:
        limits:
          cpu: 100m
          memory: 512Mi
        requests:
          cpu: 100m
          memory: 512Mi
```

Create the InfrenceService:
=== "kubectl"
```bash
kubectl apply -f inferenceservice.yaml
```

Check if the InfrenceService is ready
=== "kubectl"
```bash
kubectl get isvc sklearn-iris-example
NAME                   URL                                               READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                            AGE
sklearn-iris-example   http://sklearn-iris-example.default.example.com   True           100                              sklearn-iris-example-predictor-default-kgtql   22s
```

## Deploy TrainedModel
```yaml
apiVersion: "serving.kserve.io/v1alpha1"
kind: "TrainedModel"
metadata:
  name: "model1-sklearn"
spec:
  inferenceService: "sklearn-iris-example"
  model:
    storageUri: "gs://kfserving-samples/models/sklearn/iris"
    framework: "sklearn"
    memory: "256Mi"
---
apiVersion: "serving.kserve.io/v1alpha1"
kind: "TrainedModel"
metadata:
  name: "model2-sklearn"
spec:
  inferenceService: "sklearn-iris-example"
  model:
    storageUri: "gs://kfserving-samples/models/sklearn/iris"
    framework: "sklearn"
    memory: "256Mi"
```


Create the trained models:
=== "kubectl"
```bash
kubectl apply -f trainedmodels.yaml
```

Check model agent logs to check if the models are properly loaded. You should get the similar output as below, wait a few minutes and try again if you do not see "Downloading model".

=== "kubectl"
```bash
kubectl logs <name-of-predictor-pod> -c agent
{"level":"info","ts":"2021-01-20T16:24:00.421Z","caller":"agent/puller.go:129","msg":"Downloading model from gs://kfserving-samples/models/sklearn/iris"}
{"level":"info","ts":"2021-01-20T16:24:00.421Z","caller":"agent/downloader.go:47","msg":"Downloading gs://kfserving-samples/models/sklearn/iris to model dir /mnt/models"}
{"level":"info","ts":"2021-01-20T16:24:00.424Z","caller":"agent/puller.go:121","msg":"Worker is started for model1-sklearn"}
{"level":"info","ts":"2021-01-20T16:24:00.424Z","caller":"agent/puller.go:129","msg":"Downloading model from gs://kfserving-samples/models/sklearn/iris"}
{"level":"info","ts":"2021-01-20T16:24:00.424Z","caller":"agent/downloader.go:47","msg":"Downloading gs://kfserving-samples/models/sklearn/iris to model dir /mnt/models"}
{"level":"info","ts":"2021-01-20T16:24:09.255Z","caller":"agent/puller.go:146","msg":"Successfully loaded model model2-sklearn"}
{"level":"info","ts":"2021-01-20T16:24:09.256Z","caller":"agent/puller.go:114","msg":"completion event for model model2-sklearn, in flight ops 0"}
{"level":"info","ts":"2021-01-20T16:24:09.260Z","caller":"agent/puller.go:146","msg":"Successfully loaded model model1-sklearn"}
{"level":"info","ts":"2021-01-20T16:24:09.260Z","caller":"agent/puller.go:114","msg":"completion event for model model1-sklearn, in flight ops 0"}
```

The models will be ready to serve once they are successfully loaded.

## Run Inference
Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../get_started/first_isvc.md#3-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/model1-sklearn:predict -d @./iris-input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/model2-sklearn:predict -d @./iris-input.json
```


The outputs should be
```json
{"predictions": [1, 1]}
```

## Delete the InferenceService
To remove the resources, run the command `kubectl delete inferenceservice sklearn-iris-example`.
This will delete the inference service and result in the trained models being deleted.
