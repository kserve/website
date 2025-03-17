## Kubernetes Autoscaler

KServe supports `RawDeployment` mode to enable `InferenceService` deployment with following Kubernetes resources:

- [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment)
- [`Service`](https://kubernetes.io/docs/concepts/services-networking/service)
- [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress)
- [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale)

Compared to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

### HPA in Raw Deployment

When using KServe with the `RawDeployment` mode, Knative is not required. In this mode, if you deploy an `InferenceService`, KServe uses **Kubernetes’ Horizontal Pod Autoscaler (HPA)** for autoscaling instead of **Knative Pod Autoscaler (KPA)**. For how to use Knative Autoscaler in KServe, you can refer to the [Knative Autoscaler](https://kserve.github.io/website/master/modelserving/autoscaling/autoscaling) documentation.


=== "YAML"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris-hpa"
      annotations:
        serving.kserve.io/deploymentMode: RawDeployment
        serving.kserve.io/autoscalerClass: hpa
    spec:
      predictor:
        scaleTarget: 80
        scaleMetric: cpu
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    EOF
    ```

`ScaleTarget` specifies the integer target value of the metric type the Autoscaler watches for. `ScaleMetric` defines the scaling metric type watched by autoscaler, possible values for raw deployment are:

- cpu
- memory 

Concurrency and RPS are supported via Knative Pod Autoscaler, you can refer to [Knative Autoscaler Metrics](https://knative.dev/docs/serving/autoscaling/autoscaling-metrics) documentation.


### Disable HPA in Raw Deployment

If you want to control the scaling of the deployment created by KServe inference service with an external tool like [`KEDA`](https://keda.sh/), you can disable KServe's creation of the **HPA** by replacing **external** value with autoscaler class annotation which should disable the creation of HPA.

=== "New Schema"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      annotations:
        serving.kserve.io/deploymentMode: RawDeployment
        serving.kserve.io/autoscalerClass: external
      name: "sklearn-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    EOF
    ```

