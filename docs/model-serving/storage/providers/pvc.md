---
title: PVC
description: Deploy models to KServe InferenceService from Persistent Volume Claims (PVC), including setup and configuration.
---

# Deploy InferenceService with a saved model on PVC

In this guide, you'll learn how to store machine learning models on Persistent Volume Claims (PVC) and deploy them as KServe InferenceServices. By following these steps, you'll be able to leverage Kubernetes storage for your model serving needs, which is especially useful when working with models that need to be persisted across pod restarts or shared between different components.

## Create PV and PVC

Refer to the [document](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) to create Persistent Volume (PV) and Persistent Volume Claim (PVC), the PVC will be used to store model. This document uses local PV.

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

```bash
kubectl apply -f pv-and-pvc.yaml
```

### Copy model to PV

Run pod `model-store-pod` and login into container `model-store`.

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

```bash
kubectl apply -f pv-model-store.yaml

kubectl exec -it model-store-pod -- bash
```

In different terminal, copy the model from local into PV, then delete `model-store-pod`.

```bash
kubectl cp model.joblib model-store-pod:/pv/model.joblib -c model-store

kubectl delete pod model-store-pod
```

## Deploy `InferenceService` with models on PVC

Update the `${PVC_NAME}` to the created PVC name and create the InferenceService with the PVC `storageUri`.

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
      storageUri: "pvc://${PVC_NAME}/${MODEL_NAME}/"
```

Apply the `sklearn-pvc.yaml`.

```bash
kubectl apply -f sklearn-pvc.yaml
```

Note that inside the folder `${PVC_NAME}/${MODEL_NAME}/` you should have your
model `model.joblib`.

Note also that `${MODEL_NAME}` is just a folder, but a good convention to keep
the same name.

### PVC Read-Write Configuration

By default, PVC volumes are mounted in read-only mode. If you need read-write access, you can add an annotation to the InferenceService:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-pvc"
  annotations:
    # highlight-next-line
    storage.kserve.io/readonly: "false"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "pvc://${PVC_NAME}/${MODEL_NAME}/"
```

### PVC Volume Mount Configuration

KServe supports direct PVC volume mounting, which is controlled by the `enableDirectPvcVolumeMount` configuration parameter. When enabled (default behavior), the PVC volume is directly mounted to `/mnt/models` in the user container rather than creating a symlink from `/mnt/models` to a shared volume.

This can be configured in KServe's `inferenceservice-config` ConfigMap under the `storageInitializer` section:

```json
storageInitializer: |-
    {
        "image" : "kserve/storage-initializer:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1",
        "caBundleConfigMapName": "",
        "caBundleVolumeMountPath": "/etc/ssl/custom-certs",
        # highlight-next-line
        "enableDirectPvcVolumeMount": true,
        "enableModelcar": true,
        "cpuModelcar": "10m",
        "memoryModelcar": "15Mi",
        "uidModelcar": 1010
    }
```

When `enableDirectPvcVolumeMount` is set to `true`, KServe will directly mount the PVC volume to the container, which can improve performance and simplify the storage architecture.

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

### Sample Input

Here's the sample input to test the model:

```json title="input.json"
{
    "instances": [
      [6.8,  2.8,  4.8,  1.4],
      [6.0,  3.4,  4.5,  1.6]
    ]
}
```

### Making the request

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-pvc -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=sklearn-pvc
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip Expected Output

```bash
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

:::
