---
sidebar_label: "Canary Rollout Observability"
sidebar_position: 10
title: "Observability for Canary Rollouts"
description: "Per-version metrics, tracing, and comparison queries for validating canary deployments"
---

import CanaryObservabilitySvg from './imgs/canary_observability_channels.svg';

You have two versions of your model running side by side and traffic is splitting between them. But how do you actually know if the canary is performing better, worse, or about the same as production?

This guide walks through setting up per-version observability for canary rollouts - from Prometheus scraping to PromQL queries that compare versions during a rollout.

## Prerequisites

- Two LLMInferenceServices in a routing group (e.g., `my-model-v1` at weight 9, `my-model-v2` at weight 1)
- Prometheus (kube-prometheus-stack or OpenShift monitoring)
- `kubectl` access

## What You Get Out of the Box

<CanaryObservabilitySvg />

Each version is a separate LLMInferenceService with its own pods, InferencePool, and scheduler. Metrics naturally carry version identity - you just need the right labels to filter by version.

| Channel | What it tells you | Per-version? | Setup needed |
|---|---|---|---|
| vLLM metrics | TTFT, throughput, error rate, KV cache, queue depth | Yes - via PodMonitor relabeling adds `llm_isvc_name` | PodMonitor |
| EPP scheduler metrics | Pool-level KV cache, queue size, ready endpoints | Yes - via job label = EPP service name | ServiceMonitor |
| Distributed traces | Per-request latency breakdown, version attribution | Yes - `llmisvc.name` resource attribute | [`spec.tracing`](#distributed-tracing) on LLMISVC |

---

## Setting Up Prometheus Scraping

### vLLM Metrics (PodMonitor)

vLLM exposes metrics on port 8000 with a `model_name` label - but that label is the same for both versions (they serve the same model). To tell versions apart, you need a PodMonitor that copies the pod's `app.kubernetes.io/name` label into a `llm_isvc_name` metric label.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: llmisvc-vllm
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      kserve.io/component: workload
  podMetricsEndpoints:
    - portNumber: 8000
      path: /metrics
      interval: 10s
      params:
        format:
          - prometheus
      relabelings:
        - sourceLabels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
          targetLabel: llm_isvc_name
```

The `relabelings` block is the key part. Without it, you get vLLM metrics but can't distinguish which version produced them.

### EPP Scheduler Metrics (ServiceMonitor)

The EPP (llm-d-router) exposes metrics on port 9090. Authentication may be enabled by default depending on the version - if so, the scraping ServiceAccount needs `get` access to the `/metrics` nonResourceURL.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: llmisvc-epp
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: llminferenceservice-router-scheduler
  endpoints:
    - port: metrics
      interval: 10s
```

:::note
If EPP has `--metrics-endpoint-auth=true` (the default in some versions), you'll need a ServiceAccount with a token Secret and a ClusterRole granting `get` on `/metrics`. The ServiceMonitor then references the token via `authorization.credentials`. If you're using kube-prometheus-stack, its Prometheus ServiceAccount may already have the required permissions.
:::

---

## Verifying Metrics Are Flowing

Before building dashboards, make sure Prometheus is scraping what you expect.

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
```

**vLLM metrics** (requires PodMonitor):

```promql
vllm:request_success_total{llm_isvc_name=~"my-model-.*"}
```

Look for distinct `llm_isvc_name` values. If the label is missing, the PodMonitor relabeling isn't working.

**EPP metrics** (requires ServiceMonitor):

```promql
inference_pool_ready_pods
```

If empty, check `kubectl get servicemonitor` and the Prometheus targets page for scrape errors.

---

## Comparing Versions During a Canary Rollout

### Traffic Split Verification

Is the actual distribution matching what you configured? Compare per-version request rates:

```promql
sum by (llm_isvc_name) (
  rate(vllm:request_success_total[5m])
)
```

### Time to First Token (TTFT)

The metric users feel most. Compare P95:

```promql
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:time_to_first_token_seconds_bucket[5m])
  )
)
```

If the canary's P95 TTFT is significantly higher, that's a signal to stop the rollout.

### E2E Request Latency

Full request latency including queue time:

```promql
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:e2e_request_latency_seconds_bucket[5m])
  )
)
```

### Generation Throughput

Tokens per second per version:

```promql
sum by (llm_isvc_name) (
  rate(vllm:generation_tokens_total[5m])
)
```

### Error Rate

Per-version HTTP error rate from the FastAPI instrumentator:

```promql
sum by (llm_isvc_name) (
  rate(http_requests_total{status!="2xx"}[5m])
)
/
sum by (llm_isvc_name) (
  rate(http_requests_total[5m])
)
```

### KV Cache Utilization

Per-version cache pressure:

```promql
avg by (llm_isvc_name) (
  vllm:kv_cache_usage_perc
) * 100
```

### Queue Depth

Per-version pending requests:

```promql
sum by (llm_isvc_name) (
  vllm:num_requests_waiting
)
```

### Queue Time vs Prefill/Decode Time

Tells you whether high latency is a capacity issue (need more pods) or an engine issue (model is slow):

```promql
# Queue time P95
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:request_queue_time_seconds_bucket[5m])
  )
)
```

```promql
# Prefill time P95
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:request_prefill_time_seconds_bucket[5m])
  )
)
```

```promql
# Decode time P95
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:request_decode_time_seconds_bucket[5m])
  )
)
```

Queue time >> prefill+decode time = need more replicas. Prefill or decode time high but queue time low = engine bottleneck.

---

## Distributed Tracing

LLMInferenceService has a declarative tracing API - add `spec.tracing` to enable OpenTelemetry instrumentation without manually wiring env vars. The same tracing config applies to both the inference server and the scheduler.

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model-v1
spec:
  tracing:
    exporterEndpoint: "http://otel-collector.kserve.svc:4317"
    sampler: "always_on"
  # ...
```

The controller auto-injects OTEL environment variables into both the vLLM container and the EPP scheduler with `llmisvc.name` as a resource attribute. Each version gets a distinct trace identity, so you can filter and compare per-request latency in Jaeger or Tempo.

### Tracing configuration

| Field | Default | Description |
|-------|---------|-------------|
| `exporterEndpoint` | `http://otel-collector:4317` | OTLP gRPC endpoint for trace export |
| `exporter` | `otlp` | Trace exporter type |
| `sampler` | `parentbased_traceidratio` | Sampling strategy - see below |
| `samplerArg` | `"0.05"` | Argument for ratio-based samplers (e.g. `"0.05"` for 5%) |

Defaults are provided by the well-known config during config merge. When `spec.tracing` is omitted entirely, no tracing instrumentation is injected.

**Samplers:**

| Sampler | When to use |
|---------|-------------|
| `always_on` | Canary validation - capture every request. High trace volume. |
| `parentbased_traceidratio` | Production steady state - sample a fraction of requests (set `samplerArg` to the rate) |
| `parentbased_always_off` | Disable tracing while keeping the config in place |

:::tip
For canary validation, set `sampler: "always_on"` temporarily on both versions. Switch back to `parentbased_traceidratio` for steady-state production.
:::

### Kubernetes resource attributes

When tracing is enabled, the controller automatically injects pod name, node name, and namespace as OTEL resource attributes via the downward API. No user configuration needed.

