
# Predict on an InferenceService with a saved model on PVC

This doc shows how to train model and create InferenceService for the trained model for on-prem cluster.

## Prerequisites

Refer to the [document](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) to create Persistent Volume (PV) and Persistent Volume Claim (PVC), the PVC will be used to store model.

## Training model

Follow the mnist example [guide](https://github.com/kubeflow/fairing/blob/master/examples/mnist/mnist_e2e_on_prem.ipynb) to train a mnist model and store it to PVC.

## Specify and create the `InferenceService`

Update the ${PVC_NAME} to the created PVC name and create the InferenceService with the PVC `storageUri`. 

=== "yaml"
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "mnist-pvc"
spec:
  predictor:
    tensorflow:
      storageUri: "pvc://${PVC_NAME}/export"
```

=== "kubectl"
```bash
kubectl apply -f mnist-pvc.yaml
```

## Check the InferenceService

=== "kubectl"
```bash
$ kubectl get inferenceservice
NAME               URL                                           READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                        AGE
mnist-pvc   http://mnist-pvc.default.example.com                  True           100                              mnist-pvc-predictor-default-00001   1m
```
