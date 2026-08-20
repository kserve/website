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

## Per-Component Autoscaling

KServe supports independent HPA configuration for each InferenceService component — **predictor**, **transformer**, and **explainer**. Each component gets its own `HorizontalPodAutoscaler` resource, allowing them to scale independently based on their own load characteristics.

### Default HPA Behavior

When using HPA as the autoscaler class, KServe automatically creates an HPA resource for **every component** defined in the InferenceService spec. If a component does not specify its own `autoScaling` configuration, KServe applies the following defaults:

| Parameter | Default Value |
|-----------|---------------|
| `minReplicas` | `1` |
| `maxReplicas` | `1` |
| `scaleMetric` | `cpu` |
| `scaleTarget` | `80` (Utilization) |

This means that even if you only configure scaling for the predictor, KServe will still create HPA resources for the transformer and explainer (if they are defined in the spec) using the default values above.

### Configure Independent Scaling per Component

You can set `minReplicas`, `maxReplicas`, and `autoScaling` independently on each component. This is useful when different components have different resource profiles — for example, a transformer performing heavy pre-processing may need to scale more aggressively than the predictor.

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "custom-model-hpa"
  annotations:
    serving.kserve.io/deploymentMode: Standard
    serving.kserve.io/autoscalerClass: hpa
spec:
  predictor:
    minReplicas: 1
    maxReplicas: 5
    autoScaling:
      metrics:
        - type: Resource
          resource:
            name: cpu
            target:
              type: Utilization
              averageUtilization: 80
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
  transformer:
    minReplicas: 2
    maxReplicas: 10
    autoScaling:
      metrics:
        - type: Resource
          resource:
            name: cpu
            target:
              type: Utilization
              averageUtilization: 60
    containers:
      - image: my-custom-transformer:latest
        name: transformer-container
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "2"
            memory: "2Gi"
```

Apply the InferenceService:

```bash
kubectl apply -f custom-model-hpa.yaml
```

### Verify Independent HPA Resources

After the InferenceService is created, verify that separate HPA resources exist for each component:

```bash
kubectl get hpa
```

:::tip[Expected Output]

```
NAME                                REFERENCE                                 TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
custom-model-hpa-predictor          Deployment/custom-model-hpa-predictor     10%/80%   1         5         1          2m
custom-model-hpa-transformer        Deployment/custom-model-hpa-transformer   15%/60%   2         10        2          2m
```

:::

Each HPA targets the deployment for its respective component and uses the scaling parameters configured in the InferenceService spec. The predictor and transformer scale independently — load on the transformer will not affect the predictor's replica count, and vice versa.

:::note
If only the predictor is specified in the InferenceService spec and no transformer or explainer is defined, only a single HPA for the predictor is created. HPA resources are only created for components that are present in the spec.
:::
