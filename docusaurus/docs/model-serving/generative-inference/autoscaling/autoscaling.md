---
title: Autoscaler
description: Learn how to autoscale InferenceService in Kubernetes using KEDA with LLM metrics from Prometheus or OpenTelemetry.
---

# Autoscale InferenceService with LLM metrics

[KEDA (Kubernetes Event-driven Autoscaler)](https://keda.sh) is a lightweight, open-source component that extends Kubernetes' scaling capabilities by enabling event-driven scaling for any container workload, allowing applications to scale based on external metrics such as [vLLM metrics](https://docs.vllm.ai/en/latest/serving/metrics.html) for the number of waiting requests or KV Cache usage.

:::note
Autoscaling using KEDA is only available in RawDeployment mode.
:::

## Scale using the Metrics

InferenceService scaling can be achieved in two ways:

- **Using Metrics via Prometheus**: Scale based on Large Language Model (LLM) metrics collected in Prometheus.

- **Using Metrics via OpenTelemetry**: Collect pod-level metrics (including LLM metrics) using OpenTelemetry, export them to the keda-otel-add-on gRPC endpoint, and use KEDA's external scaler for autoscaling.

## Create a Hugging Face Secret (Optional)
If you plan to use private models from Hugging Face, you need to create a Kubernetes secret containing your Hugging Face API token. This step is optional for public models.
```bash
kubectl create secret generic hf-secret \
  --from-literal=HF_TOKEN=<your_huggingface_token>
```

## Create a StorageContainer (Optional)

For models that require authentication, you might need to create a `ClusterStorageContainer`. While the model in this example is public, for private models you would need to configure access:

```yaml title="huggingface-storage.yaml"
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    name: storage-initializer
    image: kserve/storage-initializer:latest
    env:
    - name: HF_TOKEN
      valueFrom:
        secretKeyRef:
          name: hf-secret
          key: HF_TOKEN
          optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: hf://
```
<!-- TODO: FIX DOC LINK -->
To know more about storage containers, refer to the [Storage Containers documentation](../../../concepts/storage_containers.md).

## Autoscale based on metrics from Prometheus

Scale an InferenceService in Kubernetes using LLM (Large Language Model) metrics collected in Prometheus. 
The setup leverages KServe with KEDA for autoscaling based on custom Prometheus metrics.

### Prerequisites

- Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- [KEDA installed](https://keda.sh/docs/latest/deploy/#install) for event-driven autoscaling.
- Prometheus configured to collect metrics from KServe.

### Create `InferenceService`

In this example, we'll demonstrate how to set up an InferenceService that automatically scales based on real-time LLM workload. Using the `serving.kserve.io/autoscalerClass: "keda"` annotation, our example shows how to configure KServe to use KEDA instead of the standard HPA autoscaler. 

We've set scaling boundaries from 1 to 5 replicas and configured Prometheus to track the `vllm:num_requests_running` metric for our LLM server. This example uses a target value of 2 concurrent requests per pod—when this threshold is exceeded, the system automatically scales. 

To illustrate how scaling works: if our LLM receives 6 concurrent requests with our target of 2 requests per pod, the system will scale to 3 replicas to handle the load efficiently.

Let's create an InferenceService using this YAML example:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-qwen
  annotations:
    serving.kserve.io/deploymentMode: "RawDeployment"
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
        - --model_name=qwen
      storageUri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
      resources:
        limits:
          cpu: "2"
          memory: 6Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
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

:::tip[Expected Output]
```bash
$ inferenceservice.serving.kserve.io/huggingface-qwen created
```
:::

Check KEDA `ScaledObject`:

```bash
kubectl get scaledobjects huggingface-qwen-predictor
```

:::tip[Expected Output]
```bash
NAME                          SCALETARGETKIND      SCALETARGETNAME               MIN   MAX   TRIGGERS     AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
huggingface-qwen-predictor   apps/v1.Deployment   huggingface-qwen-predictor   1     5     prometheus                    True    False    False      Unknown   32m
```
:::

### Autoscale `InferenceService` with Concurrent Requests

The first step is to [determine the ingress IP and ports](../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

Send traffic in 30 seconds spurts maintaining 5 in-flight requests.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-qwen -o jsonpath='{.status.url}' | cut -d "/" -f 3)

hey -z 30s -c 5 -m POST -host ${SERVICE_HOSTNAME} \
-H "Content-Type: application/json" \
-d '{"model": "qwen", "messages": [{"role": "system", "content": "You are a helpful assistant that speaks like Shakespeare."},{"role": "user", "content": "Write a poem about colors"}], "stream": false, "max_tokens": 100}' \
http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions
```

:::tip[Expected Output]
```bash
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
  11.515 [5]	|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■


Latency distribution:
  10% in 3.1980 secs
  0% in 0.0000 secs

Details (average, fastest, slowest):
  DNS+dialup:	0.0002 secs, 0.3014 secs, 11.5146 secs
  resp read:	0.0017 secs, 0.0001 secs, 0.0078 secs

Status code distribution:
  [200]	23 responses
```
:::

Check the number of running pods now, as the scaling target threshold is set to 2 and the `vllm:num_requests_running` metric is monitored, the autoscaler triggers when the number of running requests exceeds 2. The Prometheus server, running at `http://prometheus.istio-system.svc.cluster.local:9090`, provides near real-time metrics for scaling decisions. For instance, when the service handles more than 2 concurrent requests, KEDA scales up the number of pods to manage the increased load.

The period to wait after the last trigger reports active before scaling the resource back to 0 in 5 minutes (300 seconds) by default.

```bash
$ kubectl get pods -lserving.kserve.io/inferenceservice=huggingface-qwen
```

:::tip[Expected Output]
```bash
NAME                                                       READY        STATUS            RESTARTS   AGE
huggingface-qwen-predictor-58f9c58b85-l69f7               1/1          Running           0          2m
huggingface-qwen-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
huggingface-qwen-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
huggingface-qwen-predictor-58f9c58b85-l69f7               1/1          Running           0          51s
```
:::

## Autoscale by using OpenTelemetry Collector

[KEDA (Kubernetes Event-driven Autoscaler)](https://keda.sh) traditionally uses a polling mechanism to monitor trigger sources like Prometheus, Kubernetes API, and external event sources. While effective, polling can introduce latency and additional load on the cluster. The [otel-add-on](https://github.com/kedify/otel-add-on) enables OpenTelemetry-based push metrics for more efficient and real-time autoscaling, reducing the overhead associated with frequent polling.

### Prerequisites

- Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- [KEDA installed](https://keda.sh/docs/latest/deploy/#install) for event-driven autoscaling.
- [OpenTelemetry Operator](https://github.com/open-telemetry/opentelemetry-operator) installed.
- [kedify-otel-add-on](https://github.com/kedify/otel-add-on?tab=readme-ov-file): Install the otel-add-on with the validation webhook disabled. Certain metrics, including the vLLM pattern (e.g., vllm:num_requests_running), fail to comply with the validation constraints enforced by the webhook.

```bash
helm upgrade -i kedify-otel oci://ghcr.io/kedify/charts/otel-add-on --version=v0.0.6 --namespace keda --wait --set validatingAdmissionPolicy.enabled=false
```

### Create `InferenceService`

In this example, we'll demonstrate a more advanced autoscaling approach for LLM services using OpenTelemetry. This configuration provides near real-time scaling capabilities, making it ideal for LLM workloads with rapidly changing traffic patterns. 

We'll use the same `serving.kserve.io/autoscalerClass: "keda"` annotation as before but add the `sidecar.opentelemetry.io/inject` annotation which injects an OpenTelemetry collector sidecar. This gives us more immediate metric collection compared to the polling approach used with Prometheus. 

Our example uses a higher target value of 4 concurrent requests per pod, allowing for more efficient resource utilization with the improved reaction time that OpenTelemetry provides. For instance, if the workload suddenly increases to 12 concurrent requests, the system will quickly scale to 3 replicas to maintain optimal performance.

Let's create an InferenceService with OpenTelemetry-based autoscaling:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-qwen
  annotations:
    serving.kserve.io/deploymentMode: "RawDeployment"
    serving.kserve.io/autoscalerClass: "keda"
    sidecar.opentelemetry.io/inject: "huggingface-qwen-predictor"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
      storageUri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
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
        - type: PodMetric
          podmetric:
            metric:
              backend: "opentelemetry"
              metricNames: 
                - vllm:num_requests_running
              query: "vllm:num_requests_running"
            target:
              type: Value
              value: "4"
```

Check KEDA `ScaledObject`:

```bash
kubectl get scaledobjects huggingface-qwen-predictor
```

:::tip[Expected Output]
```bash
NAME                          SCALETARGETKIND      SCALETARGETNAME               MIN   MAX   TRIGGERS     AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED
huggingface-qwen-predictor   apps/v1.Deployment   huggingface-qwen-predictor   1     5     opentelemetry                   True    False    False      Unknown
```
:::

Check `OpenTelemetryCollector`:

```bash
kubectl get opentelemetrycollector huggingface-qwen-predictor
```

:::tip[Expected Output]
```bash
NAME                          READY   STATUS    RESTARTS   AGE
huggingface-qwen-predictor   True    Running   0          2m
```
:::

Now, you can send [traffic to the InferenceService](#autoscale-inferenceservice-with-concurrent-requests) and observe the autoscaling behavior based on the number of requests running.

## Troubleshooting
If you encounter issues with your autoscaling setup, consider the following:
- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.
