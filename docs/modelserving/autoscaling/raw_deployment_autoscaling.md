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

If you want to use external autoscaler tools or manage scaling manually, you can disable the Horizontal Pod Autoscaler (HPA) that KServe creates.

KServe supports two values for the `autoscaler.kserve.io/class` annotation for disabling HPA:

- **`none`**: This is the recommended value if you want to **completely disable** HPA creation. KServe will neither create nor manage any HPA object for the deployment.
- **`external`**: This value indicates that you are using an external autoscaler. KServe will delete the HPA it created (if any), but it may still allow external HPA objects to be managed separately.

#### Example: Disable HPA completely

```yaml
metadata:
  annotations:
    serving.kserve.io/autoscalerClass: none
```

#### Example: Use an external autoscaler tool

```yaml
metadata:
  annotations:
    serving.kserve.io/autoscalerClass: external
```

> ✅ **Recommendation**: Prefer `"none"` when disabling KServe-managed autoscaling entirely. Use `"external"` only when another controller will manage the HPA.
