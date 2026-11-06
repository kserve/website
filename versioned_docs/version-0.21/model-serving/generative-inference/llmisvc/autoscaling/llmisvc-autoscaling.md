---
sidebar_label: "Autoscaling"
sidebar_position: 7
title: "Autoscaling LLMInferenceService with WVA"
---

# Autoscaling LLMInferenceService with WVA

## Overview

**WVA (Workload Variant Autoscaler)** is an intelligent autoscaling system designed specifically for LLM inference workloads. Unlike traditional CPU/memory-based autoscaling, WVA makes scaling decisions based on inference-specific metrics such as KV cache utilization, queue depth, and request saturation — signals that better reflect real LLM serving pressure.

LLMInferenceService integrates with WVA through the `spec.scaling` field. When configured, the KServe controller automatically creates and manages:

- A **VariantAutoscaling** CR (from the [llm-d/workload-variant-autoscaler](https://github.com/llm-d/llm-d-workload-variant-autoscaler) project) that tells WVA to monitor this workload
- An **actuator** (HPA or KEDA ScaledObject) that enforces WVA's scaling decisions on the Deployment or LeaderWorkerSet

WVA is the sole source of scaling decisions — the actuator (HPA or KEDA) acts as a pass-through that directly applies the replica count computed by WVA.

:::note
WVA autoscaling is exclusive to `LLMInferenceService`. For `InferenceService`-based autoscaling with KEDA, see the [InferenceService Autoscaling Guide](../../autoscaling/autoscaling.md).
:::

:::tip
`spec.scaling` and `spec.replicas` are **mutually exclusive**. When `spec.scaling` is configured, replica count is managed dynamically by WVA. When `spec.replicas` is set, the deployment uses a fixed replica count.
:::

---

## Architecture

WVA autoscaling involves four components working together:

```
Inference Pods ──(scrape metrics)──> Prometheus
                                         │
                                         ▼
                               WVA Controller
                          (reads inference metrics,
                           computes optimal replicas)
                                         │
                                         ▼
                              wva_desired_replicas
                                (Prometheus metric)
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                  ▼
              HPA (via Prometheus Adapter)       KEDA (direct PromQL query)
                        │                                  │
                        └────────────────┬─────────────────┘
                                         ▼
                            Deployment / LeaderWorkerSet
                                    (scaled)
```

| Component | Role |
|-----------|------|
| **WVA controller** | Watches `VariantAutoscaling` CRs, reads inference metrics from Prometheus, computes optimal replica count, and publishes `wva_desired_replicas` metric |
| **VariantAutoscaling CR** | Created by KServe; tells WVA which workload to monitor and its scaling bounds |
| **Actuator (HPA or KEDA)** | Reads `wva_desired_replicas` and applies it to the target workload. Configured with `target=1` so it acts as a direct pass-through for WVA's decisions |
| **Prometheus** | Collects inference metrics from pods (for WVA to analyze) and serves `wva_desired_replicas` (for the actuator to consume) |

---

## Prerequisites

### Common (both actuator backends)

- Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md)
- **WVA controller** — see the [WVA installation guide](https://llm-d.ai/docs/guides/workload-autoscaling) for the latest install instructions
- **Prometheus** — configured to scrape both inference pod metrics and the WVA controller metrics endpoint

### HPA actuator

- **Prometheus Adapter** — must be installed and configured with an external metric rule for `wva_desired_replicas`. See the [Prometheus Adapter documentation](https://github.com/kubernetes-sigs/prometheus-adapter#installation) for installation instructions and [custom metrics configuration](https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md) for setting up external metric rules

### KEDA actuator

- **KEDA** — [installed](https://keda.sh/docs/latest/deploy/#install) for event-driven autoscaling
- **Cluster-wide Prometheus configuration** — the `inferenceservice-config` ConfigMap must contain the `autoscaling-wva-controller-config` key (see [Cluster-wide Configuration](#cluster-wide-configuration-keda-only))

---

## Configuration

### Choosing an Actuator Backend

You must choose exactly one actuator backend — **HPA** or **KEDA**. They are mutually exclusive.

| Aspect | HPA | KEDA |
|--------|-----|------|
| **Infrastructure** | Requires Prometheus Adapter | Requires KEDA operator |
| **Prometheus access** | Indirect (via external metrics API) | Direct PromQL query |
| **Idle scale-down** | Not supported (min 1 replica) | Supported via `idleReplicaCount` |
| **Fallback on metric outage** | HPA enters Unknown state | Configurable fallback replica count |
| **Initial cooldown** | Not available | `initialCooldownPeriod` for model load time |
| **Configuration complexity** | Simpler (fewer knobs) | More options (polling, cooldown, fallback) |

---

### HPA Actuator

Use the HPA actuator when you want a simpler setup and your cluster already has a Prometheus Adapter.

**Minimal configuration:**

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-llm
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      hpa: {}

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**With custom scaling behavior:**

```yaml
  scaling:
    minReplicas: 2
    maxReplicas: 10
    wva:
      variantCost: "15.0"
      hpa:
        behavior:
          scaleUp:
            stabilizationWindowSeconds: 0
            policies:
              - type: Percent
                value: 100
                periodSeconds: 60
          scaleDown:
            stabilizationWindowSeconds: 300
            policies:
              - type: Pods
                value: 1
                periodSeconds: 120
```

The `behavior` field accepts the standard Kubernetes [HorizontalPodAutoscalerBehavior](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior) spec, giving you fine-grained control over scale-up and scale-down rates.

---

### KEDA Actuator

Use the KEDA actuator when you need advanced features like idle scale-down, metric fallback, or initial cooldown during model loading.

**Minimal configuration:**

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-llm
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      keda: {}

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**With advanced KEDA options:**

```yaml
  scaling:
    minReplicas: 2
    maxReplicas: 8
    wva:
      variantCost: "10.0"
      keda:
        pollingInterval: 5
        cooldownPeriod: 120
        initialCooldownPeriod: 60
        idleReplicaCount: 1
        fallback:
          failureThreshold: 3
          replicas: 2
```

- **`initialCooldownPeriod`** is particularly useful for LLM deployments where the model takes time to load before it can serve traffic, preventing premature scale-up decisions during startup.
- **`idleReplicaCount`** allows scaling below `minReplicas` when no triggers are active. It must be less than `minReplicas`.

---

## Cluster-wide Configuration (KEDA only)

When using the KEDA actuator, the KServe controller needs to know how to connect to Prometheus. This is configured via the `autoscaling-wva-controller-config` key in the `inferenceservice-config` ConfigMap in the `kserve` namespace.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  autoscaling-wva-controller-config: |
    {
      "prometheus": {
        "url": "https://prometheus-kube-prometheus-prometheus.monitoring:9090",
        "tlsInsecureSkipVerify": true,
        "authModes": "bearer",
        "triggerAuthName": "prometheus-auth",
        "triggerAuthKind": "ClusterTriggerAuthentication"
      }
    }
```

### Prometheus Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `prometheus.url` | Yes | URL of the Prometheus server. Used by KEDA to query `wva_desired_replicas` |
| `prometheus.tlsInsecureSkipVerify` | No | Skip TLS certificate verification. Default: `false` |
| `prometheus.authModes` | No | KEDA authentication mode (e.g., `bearer`, `basic`, `tls`). Must be set together with `triggerAuthName` or both left empty |
| `prometheus.triggerAuthName` | No | Name of a pre-existing `TriggerAuthentication` or `ClusterTriggerAuthentication` CR. Must be set together with `authModes` or both left empty |
| `prometheus.triggerAuthKind` | No | Kind of the authentication CR: `TriggerAuthentication` (namespaced) or `ClusterTriggerAuthentication` (cluster-scoped). Default: `TriggerAuthentication` |

:::note
This configuration is not needed when using the HPA actuator. HPA reads metrics via the Kubernetes external metrics API, and the Prometheus Adapter handles the Prometheus connection.
:::

---

## Field Reference

For the complete field definitions of the autoscaling spec types, see the [Control Plane API Reference](../../../../reference/crd-api):

- [`ScalingSpec`](../../../../reference/crd-api#scalingspec) — top-level scaling configuration (`minReplicas`, `maxReplicas`, `wva`)
- [`WVASpec`](../../../../reference/crd-api#wvaspec) — WVA configuration (`variantCost`, `hpa`, `keda`)
- [`HPAScalingSpec`](../../../../reference/crd-api#hpascalingspec) — HPA actuator behavior configuration
- [`KEDAScalingSpec`](../../../../reference/crd-api#kedascalingspec) — KEDA actuator configuration (`pollingInterval`, `cooldownPeriod`, `fallback`, etc.)

---

## Prefill Scaling

For disaggregated prefill-decode deployments, the prefill workload can be independently autoscaled using `spec.prefill.scaling`. Both workloads (decode and prefill) must use the same actuator backend — you cannot mix HPA for decode and KEDA for prefill, or vice versa.

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-llm-disaggregated
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  # Decode workload scaling
  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      hpa: {}

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"

  # Prefill workload scaling (independent bounds)
  prefill:
    scaling:
      minReplicas: 2
      maxReplicas: 8
      wva:
        variantCost: "15.0"
        hpa:
          behavior:
            scaleUp:
              stabilizationWindowSeconds: 0

    template:
      containers:
        - name: main
          image: vllm/vllm-openai:latest
          resources:
            limits:
              nvidia.com/gpu: "2"

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

The controller creates separate `VariantAutoscaling` and actuator resources for each workload. For the full naming conventions and validation rules enforced by the admission webhook, see the [Control Plane API Reference](../../../../reference/crd-api#scalingspec).

---

## Status Conditions

The LLMInferenceService reports autoscaling health through `ScalingReady` (and `PrefillScalingReady` for prefill-decode deployments) status conditions that roll up into `WorkloadsReady` and `Ready`. For the full list of conditions, reason codes, and how they compose, see the [Status Reference](../llmisvc-status.md).

**Check scaling status:**

```bash
kubectl get llminferenceservice my-llm -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}' | jq .
```

---

## Complete Examples

For complete, ready-to-use YAML manifests covering single-node and multi-node deployments with both HPA and KEDA backends, see the [Autoscaling Examples](./llmisvc-autoscaling-examples.md).

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `ScalingReady=False` with `FailedGetExternalMetric` | Prometheus Adapter missing or misconfigured | Install Prometheus Adapter with `wva_desired_replicas` external metric rule. See [Prerequisites](#hpa-actuator) |
| `ScalingReady=False` with `ScaledObjectProgressing` | KEDA ScaledObject cannot connect to Prometheus | Verify `autoscaling-wva-controller-config.prometheus.url` in the `inferenceservice-config` ConfigMap |
| VariantAutoscaling not created | WVA CRD not installed in the cluster | Install the WVA controller — see the [WVA installation guide](https://llm-d.ai/docs/guides/workload-autoscaling) |
| Replicas stuck at `minReplicas` | WVA not receiving inference metrics | Ensure Prometheus is scraping inference pod metrics (check `prometheus.io/scrape` annotations on pods) |
| Validation error: "wva is required" | `spec.scaling` set without `spec.scaling.wva` | Add `wva` with either `hpa: {}` or `keda: {}` |
| Validation error: "scaling and replicas are mutually exclusive" | Both `spec.scaling` and `spec.replicas` set | Remove one — use `scaling` for dynamic autoscaling or `replicas` for fixed count |
| Validation error: "decode and prefill must use the same actuator" | Mixed HPA and KEDA across workloads | Use the same actuator backend for both `spec.scaling` and `spec.prefill.scaling` |
| KEDA error: `prometheus.url is required` | Missing cluster-wide config | Add the `autoscaling-wva-controller-config` key to the `inferenceservice-config` ConfigMap |

### Force Stop Behavior

When the `serving.kserve.io/stop` annotation is set on the LLMInferenceService, the controller deletes all autoscaling resources (VariantAutoscaling, HPA, and KEDA ScaledObject) and clears the scaling status conditions. Resources are recreated when the annotation is removed.

---

## Related Documentation

- **[Autoscaling Examples](./llmisvc-autoscaling-examples.md)**: Complete YAML manifests for HPA, KEDA, single-node, and multi-node deployments
- **[Configuration Guide](../llmisvc-configuration.md)**: Full LLMInferenceService spec reference
- **[Status Reference](../llmisvc-status.md)**: Complete status conditions and troubleshooting
- **[Dependencies](../llmisvc-dependencies.md)**: Required infrastructure components
- **[InferenceService Autoscaling](../../autoscaling/autoscaling.md)**: KEDA-based autoscaling for InferenceService (v1beta1)
- **[WVA Project](https://github.com/llm-d/llm-d-workload-variant-autoscaler)**: Upstream Workload Variant Autoscaler documentation

---

## Summary

WVA autoscaling for LLMInferenceService provides:

- **Inference-aware scaling**: Decisions based on KV cache utilization, queue depth, and saturation rather than generic CPU/memory
- **Two actuator backends**: HPA (simpler, requires Prometheus Adapter) or KEDA (more features, direct Prometheus access)
- **Independent prefill scaling**: Disaggregated prefill-decode deployments can have separate scaling bounds
- **Multi-node support**: Scales LeaderWorkerSet resources for distributed inference workloads
- **Production-ready**: Metric fallback, idle scale-down, initial cooldown for model loading, and configurable scaling behavior
- **Status visibility**: `ScalingReady` and `PrefillScalingReady` conditions for monitoring autoscaling health
