---
title: "Autoscaling with Kubernetes HPA"
description: "Learn how to autoscale InferenceServices with Kubernetes Horizontal Pod Autoscaler (HPA) in raw deployment mode"
---

# Autoscaling with Kubernetes HPA

KServe supports `Standard` mode to enable `InferenceService` deployment with the following Kubernetes resources:

- [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment)
- [`Service`](https://kubernetes.io/docs/concepts/services-networking/service)
- [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress)
- [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale)

Compared to Knative deployment, Raw deployment mode unlocks Knative limitations such as mounting multiple volumes. However, "Scale down to zero" is not supported in `Standard` mode.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- The `kubectl` command-line tool installed and configured.
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) installed on your Kubernetes cluster for HPA to function properly.
- Basic understanding of Kubernetes [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) concepts.

## HPA in Standard Deployment

When using KServe with the `Standard` mode, Knative is not required. In this mode, if you deploy an `InferenceService`, KServe uses **Kubernetes' Horizontal Pod Autoscaler (HPA)** for autoscaling instead of **Knative Pod Autoscaler (KPA)**. For information on using Knative Autoscaler in KServe, you can refer to the [Knative Autoscaler](./kpa-autoscaler.md) documentation.

Here's an example of creating an InferenceService that uses HPA:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris-hpa"
  annotations:
    serving.kserve.io/deploymentMode: Standard
    serving.kserve.io/autoscalerClass: hpa
spec:
  predictor:
    scaleTarget: 80
    scaleMetric: cpu
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
```

Apply the InferenceService:

```bash
kubectl apply -f sklearn-iris-hpa.yaml
```

`scaleTarget` specifies the integer target value of the metric type the Autoscaler watches for. `scaleMetric` defines the scaling metric type watched by the autoscaler. In raw deployment mode, possible values are:

- `cpu` - CPU utilization percentage
- `memory` - Memory utilization percentage

Concurrency and RPS metrics are only supported via Knative Pod Autoscaler. You can refer to [Knative Autoscaler Metrics](./kpa-autoscaler.md) documentation for more information on those metrics.

## Disable HPA in Standard Deployment

If you want to use external autoscaler tools or manage scaling manually, you can disable the Horizontal Pod Autoscaler (HPA) that KServe creates.

KServe supports two values for the `serving.kserve.io/autoscalerClass` annotation for disabling HPA:

- **`none`**: This is the recommended value if you want to **completely disable** HPA creation. KServe will neither create nor manage any HPA object for the deployment.
- **`external`**: This value indicates that you are using an external autoscaler. KServe will delete the HPA it created (if any), but it may still allow external HPA objects to be managed separately.

### Example: Disable HPA completely

```yaml
metadata:
  annotations:
    serving.kserve.io/autoscalerClass: none
```

### Example: Use an external autoscaler tool

```yaml
metadata:
  annotations:
    serving.kserve.io/autoscalerClass: external
```

:::tip
**Recommendation**: Prefer `"none"` when disabling KServe-managed autoscaling entirely. Use `"external"` only when another controller will manage the HPA.
:::
