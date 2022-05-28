
# Deploy InferenceService with a saved model on PVC

This doc shows how to store a model in PVC and create InferenceService with a saved model on PVC.

## Create PV and PVC

Refer to the [document](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) to create Persistent Volume (PV) and Persistent Volume Claim (PVC), the PVC will be used to store model. This document uses local PV.

=== "yaml"
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: task-pv-volume
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/home/ubuntu/mnt/data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: task-pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

=== "kubectl"
```bash
kubectl apply -f pv-and-pvc.yaml
```

### Copy model to PV

Run pod `model-store-pod` and login into container `model-store`.

=== "yaml"
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: model-store-pod
spec:
  volumes:
    - name: model-store
      persistentVolumeClaim:
        claimName: task-pv-claim
  containers:
    - name: model-store
      image: ubuntu
      command: [ "sleep" ]
      args: [ "infinity" ]
      volumeMounts:
        - mountPath: "/pv"
          name: model-store
      resources:
        limits:
          memory: "1Gi"
          cpu: "1"
```

=== "kubectl"
```bash
kubectl apply -f pv-model-store.yaml

kubectl exec -it model-store-pod -- bash
```

In different terminal, copy the model from local into PV.

=== "kubectl"
```bash
kubectl cp model.joblib model-store-pod:/pv/model.joblib -c model-store
```

## Deploy `InferenceService` with models on PVC

Update the ${PVC_NAME} to the created PVC name and create the InferenceService with the PVC `storageUri`.

=== "Old Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-pvc"
    spec:
      predictor:
        sklearn:
          storageUri: "pvc://${PVC_NAME}/model.joblib"
    ```

=== "New Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-pvc"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "pvc://${PVC_NAME}/model.joblib"
    ```

Apply the `autoscale-gpu.yaml`.

=== "kubectl"
```bash
kubectl apply -f sklearn-pvc.yaml
```

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-pvc -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=sklearn-pvc
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

==** Expected Output **==

```
*   Trying 127.0.0.1:8080...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /v1/models/sklearn-pvc:predict HTTP/1.1
> Host: sklearn-pvc.default.example.com
> User-Agent: curl/7.68.0
> Accept: */*
> Content-Length: 84
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 84 out of 84 bytes
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< content-length: 23
< content-type: application/json; charset=UTF-8
< date: Mon, 20 Sep 2021 04:55:50 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 6
<
* Connection #0 to host localhost left intact
{"predictions": [1, 1]}
```
