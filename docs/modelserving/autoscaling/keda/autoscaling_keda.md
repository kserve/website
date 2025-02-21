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
    serving.kserve.io/autoscalerClass: "keda"
    serving.kserve.io/enable-prometheus-scraping: "true"
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "8080"
    prometheus.io/scheme: "http"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=fbopt
        - --model_id=facebook/opt-125m
      resources:
        limits:
          cpu: "1"
          memory: 4Gi
        requests:
          cpu: "1"
          memory: 4Gi
    minReplicas: 1
    maxReplicas: 5
    autoScaling:
      metrics:
        - type: External
          external:
            metric:
              backend: "prometheus"
              serverAddress: "http://prometheus.istio-system.svc.cluster.local:9090"
              query: vllm:num_requests_running
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
    NAME                          SCALETARGETKIND      SCALETARGETNAME               MIN   MAX   TRIGGERS     AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
    huggingface-fbopt-predictor   apps/v1.Deployment   huggingface-fbopt-predictor   1     5     prometheus                    True    False    False      Unknown   32m
    ```

### Predict `InferenceService` with concurrent requests

The first step is to [determine the ingress IP and ports](../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

Send traffic in 30 seconds spurts maintaining 5 in-flight requests.

```
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-fbopt -o jsonpath='{.status.url}' | cut -d "/" -f 3)

hey -z 30s -c 5 -m POST -host ${SERVICE_HOSTNAME} \
-H "Content-Type: application/json" \
-d '{"model": "fbopt", "prompt": "Write a poem about colors", "stream": false, "max_tokens": 100}' \
http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions
```

!!! success "Expected Output"

```{ .bash .no-copy }
Summary:
  Total:	33.2111 secs
  Slowest:	11.5146 secs
  Fastest:	0.3014 secs
  Average:	6.8919 secs
  Requests/sec:	0.6925
  
  Total data:	12893 bytes
  Size/request:	560 bytes

Response time histogram:
  0.301 [1]	|■■■■■■■■
  1.423 [1]	|■■■■■■■■
  2.544 [1]	|■■■■■■■■
  3.665 [2]	|■■■■■■■■■■■■■■■■
  4.787 [2]	|■■■■■■■■■■■■■■■■
  5.908 [3]	|■■■■■■■■■■■■■■■■■■■■■■■■
  7.029 [2]	|■■■■■■■■■■■■■■■■
  8.151 [3]	|■■■■■■■■■■■■■■■■■■■■■■■■
  9.272 [0]	|
  10.393 [3]	|■■■■■■■■■■■■■■■■■■■■■■■■
  11.515 [5]	|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■


Latency distribution:
  10% in 3.1980 secs
  25% in 4.7160 secs
  50% in 7.4213 secs
  75% in 10.8935 secs
  90% in 11.2992 secs
  95% in 11.5146 secs
  0% in 0.0000 secs

Details (average, fastest, slowest):
  DNS+dialup:	0.0002 secs, 0.3014 secs, 11.5146 secs
  DNS-lookup:	0.0001 secs, 0.0000 secs, 0.0006 secs
  req write:	0.0001 secs, 0.0000 secs, 0.0003 secs
  resp wait:	6.8898 secs, 0.3012 secs, 11.5119 secs
  resp read:	0.0017 secs, 0.0001 secs, 0.0078 secs

Status code distribution:
  [200]	23 responses
```

Check the number of running pods now, As the scaling target threshold is set to 2 and the `vllm:num_requests_running` metric is monitored, the autoscaler triggers when the number of running requests exceeds 2. The Prometheus server, running at `http://prometheus.istio-system.svc.cluster.local:9090`, provides near real-time metrics for scaling decisions. For instance, when the service handles more than 2 concurrent requests, KEDA scales up the number of pods to manage the increased load.

The period to wait after the last trigger reports active before scaling the resource back to 0 in 5 minutes (300 seconds) by default.

```bash
$ kubectl get pods
NAME                                                       READY        STATUS            RESTARTS   AGE
huggingface-fbopt-predictor-58f9c58b85-l69f7               1/1          Running           0          2m
huggingface-fbopt-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
huggingface-fbopt-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
huggingface-fbopt-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
```

