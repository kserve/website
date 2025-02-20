# Autoscale InferenceService with KEDA

## Scale using the CPU utilization

### Prerequisites

1. Kubernetes cluster with KServe installed

2. [KEDA installed](https://keda.sh/docs/2.9/deploy/#install) for event-driven autoscaling

### Create `InferenceService`

Apply the sklearnserver example and set Annotation `serving.kserve.io/autoscalerClass: "keda"` for autoscaling with keda scaledobject


```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-v2-iris"
  annotations:
    serving.kserve.io/autoscalerClass: "keda"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      protocolVersion: v2
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    minReplicas: 1
    maxReplicas: 5
    autoScaling:
      metrics:
        - type: Resource
          resource:
            name: cpu
            target:
              type: "Utilization"
              averageUtilization: 50
```

The `metrics` section in the InferenceService specification defines the scaling criteria for `autoscaling` the inferenceservice based on various metrics. It supports Resource-based scaling (CPU/Memory) and External metrics (Prometheus, Graphite, etc.) when using KEDA as the autoscaler.


`type`: Specifies the metric type:

- set to `Resource` for CPU/Memory-based scaling.

- set to `External` for custom metrics from monitoring systems.

**`Resource` Metrics:**

- `resource.name`: Defines the resource type, either cpu or memory.
- `resource.target.type:` Determines the scaling target type. Options: "Utilization" or "AverageValue".
- `resource.target.averageUtilization`: Specifies the target CPU utilization percentage for scaling. Example: 50 means pods will scale if CPU usage is above 50%.
- `resource.target.averageValue`: Specifies the memory consumption threshold (e.g., 50 means pods will scale when memory usage exceeds 50Mi).

**`External` Metrics:**

- `external.metric.backend`: Defines the external metric source, such as "prometheus" or "graphite".
- `external.metric.serverAddress`: Specifies the monitoring server URL (e.g., http://<prometheus-host>:9090).
- `external.metric.query`: Defines the query to fetch the required metric from the monitoring system (e.g., PromQL query for Prometheus).
- `external.target.value`: Specifies the threshold value that triggers autoscaling (e.g., 100.50 requests per second).


Apply the `autoscale.yaml` to create the Autoscale InferenceService.

=== "kubectl"
```
kubectl apply -f autoscale.yaml
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/sklearn-v2-iris created
    ```

Check KEDA scaledobject

=== "kubectl"
```
kubectl get scaledobjects
```


!!! success "Expected Output"

    ```{ .bash .no-copy }
    NAME                        SCALETARGETKIND      SCALETARGETNAME             MIN   MAX   TRIGGERS   AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
    sklearn-v2-iris-predictor   apps/v1.Deployment   sklearn-v2-iris-predictor   1     5     cpu                         True    True     Unknown    Unknown   2m22s
    ```

Check triggers

=== "kubectl"
```
kubectl describe scaledobject sklearn-v2-iris-predictor
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    ...

    Spec:
      Max Replica Count:  5
      Min Replica Count:  1
      Scale Target Ref:
        Name:  sklearn-v2-iris-predictor
      Triggers:
        Metadata:
          Value:      50
        Metric Type:  Utilization
        Type:         cpu

    ...
    ```

## Scale using the LLM Metrics

scaling an InferenceService in Kubernetes using LLM (Large Language Model) metrics collected in Prometheus. 
The setup leverages KServe with KEDA for autoscaling based on custom [Prometheus metrics](../../../modelserving/observability/prometheus_metrics.md).

### Prerequisites

1. Kubernetes cluster with KServe installed

2. [KEDA installed](https://keda.sh/docs/2.9/deploy/#install) for event-driven autoscaling

3. Prometheus configured to collect metrics from KServe

### Create `InferenceService`


``` yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-fbopt
  annotations:
    serving.kserve.io/enable-prometheus-scraping: "true"
    serving.kserve.io/autoscalerClass: "keda"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=fbopt
        - --model_id=facebook/opt-125m
    minReplicas: 1
    maxReplicas: 5
    autoScaling:
      metrics:
        - type: External
          external:
            metric:
              backend: "prometheus"
              serverAddress: "http://prometheus.istio-system.svc.cluster.local:9090"
              query: sum(time_in_queue_requests)
            target:
              type: Value
              value: "2"
```

Apply the `autoscale.yaml` to create the Autoscale InferenceService.

=== "kubectl"
```
kubectl apply -f autoscale.yaml
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    $ inferenceservice.serving.kserve.io/huggingface-fbopt created
    ```

Check KEDA scaledobject

=== "kubectl"
```
kubectl get scaledobjects
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    NAME                          SCALETARGETKIND      SCALETARGETNAME              MIN   MAX   TRIGGERS   AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
    huggingface-fbopt-predictor   apps/v1.Deployment   huggingface-fbopt-predictor   1     5     prometheus                         True    True     Unknown    Unknown   2m22s
    ```
