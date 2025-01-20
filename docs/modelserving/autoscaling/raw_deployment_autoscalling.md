## Autoscaler for Kserve's Raw Deployment Mode

KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

### HPA in Raw Deployment

When using Kserve with the `RawDeployment` mode, Knative is not installed. In this mode, if you deploy an `InferenceService`, Kserve uses **Kubernetes’ Horizontal Pod Autoscaler (HPA)** for autoscaling instead of **Knative Pod Autoscaler (KPA)**. For more information about Kserve's autoscaler, you can refer [`this`](https://kserve.github.io/website/master/modelserving/v1beta1/torchserve/#knative-autoscaler)


=== "New Schema"

    ```yaml
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
    ```

=== "Old Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris-hpa"
      annotations:
        serving.kserve.io/deploymentMode: RawDeployment
        serving.kserve.io/autoscalerClass: hpa
        serving.kserve.io/metric: cpu
        serving.kserve.io/targetUtilizationPercentage: "80"
    spec:
      predictor:
        sklearn:
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```

`ScaleTarget` specifies the integer target value of the metric type the Autoscaler watches for. concurrency and rps targets are supported by Knative Pod Autoscaler. you can refer [`this`](https://knative.dev/docs/serving/autoscaling/autoscaling-targets/).

`ScaleMetric` defines the scaling metric type watched by autoscaler. Possible values are concurrency, rps, cpu, memory. concurrency, rps are supported via Knative Pod Autoscaler. you can refer [`this`](https://knative.dev/docs/serving/autoscaling/autoscaling-metrics).


### Disable HPA in Raw Deployment

If you want to control the scaling of the deployment created by KServe inference service with an external tool like [`KEDA`](https://keda.sh/). You can disable KServe's creation of the **HPA** by replacing **external** value with autoscaler class annotaion that should be disable the creation of HPA

=== "New Schema"

    ```yaml
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
    ```

=== "Old Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      annotations:
        serving.kserve.io/deploymentMode: RawDeployment
        serving.kserve.io/autoscalerClass: external
      name: "sklearn-iris"
    spec:
      predictor:
        sklearn:
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    ```
