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
- **WVA controller** — install via Helm:
  ```bash
  helm install wva oci://ghcr.io/llm-d/workload-variant-autoscaler \
    --namespace kserve --create-namespace
  ```
- **Prometheus** — configured to scrape both inference pod metrics and the WVA controller metrics endpoint

### HPA actuator

- **Prometheus Adapter** — must be installed and configured with an external metric rule for `wva_desired_replicas`:
  ```bash
  helm install prometheus-adapter prometheus-community/prometheus-adapter \
    --set rules.external[0].seriesQuery='wva_desired_replicas' \
    --set 'rules.external[0].resources.overrides.exported_namespace.resource=namespace' \
    --set 'rules.external[0].metricsQuery=wva_desired_replicas{<<.LabelMatchers>>}'
  ```

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

### ScalingSpec

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `minReplicas` | int32 | No | `1` | Minimum replicas during active scaling. Must be >= 1. Cannot exceed `maxReplicas` |
| `maxReplicas` | int32 | Yes | — | Maximum replicas. Must be >= 1 |
| `wva` | WVASpec | Yes | — | WVA configuration. Required when `scaling` is set |

### WVASpec

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `variantCost` | string | No | `"10.0"` | Cost per replica for WVA saturation analysis. Must match `^\d+(\.\d+)?$` |
| `hpa` | HPAScalingSpec | No | — | HPA actuator configuration. Mutually exclusive with `keda` |
| `keda` | KEDAScalingSpec | No | — | KEDA actuator configuration. Mutually exclusive with `hpa` |

### HPAScalingSpec

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `behavior` | [HorizontalPodAutoscalerBehavior](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior) | No | Scale-up and scale-down behavior policies. Controls stabilization windows and rate limits |

### KEDAScalingSpec

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pollingInterval` | int32 | No | KEDA default | Seconds between trigger evaluations. Must be >= 1 |
| `cooldownPeriod` | int32 | No | KEDA default | Seconds to wait after last active trigger before scaling to `minReplicas`. 0 means scale down immediately |
| `initialCooldownPeriod` | int32 | No | `0` | Seconds to wait after ScaledObject creation before KEDA starts evaluating triggers. Useful for LLM model loading time |
| `idleReplicaCount` | int32 | No | unset | Replicas when no triggers are active. Must be < `minReplicas`. Requires `minReplicas` to be set |
| `fallback` | [Fallback](https://keda.sh/docs/latest/concepts/scaling-deployments/#fallback) | No | unset | Safe replica count during metric outages |
| `advanced` | [AdvancedConfig](https://keda.sh/docs/latest/concepts/scaling-deployments/#advanced) | No | unset | Advanced KEDA configuration including HPA behavior. `scalingModifiers` is forbidden (WVA controls the metric formula) |

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

The controller creates separate `VariantAutoscaling` and actuator resources for each workload:

| Resource | Decode (main) | Prefill |
|----------|---------------|---------|
| VariantAutoscaling | `{name}-kserve-va` | `{name}-kserve-prefill-va` |
| HPA | `{name}-kserve-hpa` | `{name}-kserve-prefill-hpa` |
| KEDA ScaledObject | `{name}-kserve-keda` | `{name}-kserve-prefill-keda` |

---

## Validation Rules

The following validation rules are enforced by the admission webhook:

| Rule | Description |
|------|-------------|
| `scaling` and `replicas` are mutually exclusive | You cannot set both `spec.scaling` and `spec.replicas` on the same workload |
| `wva` is required when `scaling` is set | The `spec.scaling.wva` field must be present whenever `spec.scaling` is configured |
| Exactly one actuator | Either `wva.hpa` or `wva.keda` must be specified, but not both |
| Same actuator for decode and prefill | When both `spec.scaling` and `spec.prefill.scaling` are set, they must use the same actuator backend |
| `minReplicas` must not exceed `maxReplicas` | The minimum cannot exceed the maximum |
| `idleReplicaCount` must be less than `minReplicas` | KEDA's idle replica count must be strictly less than `minReplicas`, and `minReplicas` must be set when `idleReplicaCount` is used |
| `scalingModifiers` forbidden | KEDA `advanced.scalingModifiers` must not be set — WVA owns the metric formula |
| `variantCost` pattern | Must be a non-negative numeric string matching `^\d+(\.\d+)?$` |

---

## Status Conditions

The LLMInferenceService reports autoscaling health through two status conditions:

| Condition | Scope | Description |
|-----------|-------|-------------|
| `ScalingReady` | Decode (main) workload | Reflects HPA or KEDA ScaledObject health for the main workload |
| `PrefillScalingReady` | Prefill workload | Reflects HPA or KEDA ScaledObject health for the prefill workload |

Both conditions roll up into `WorkloadsReady` and `Ready`.

**Check scaling status:**

```bash
kubectl get llminferenceservice my-llm -o jsonpath='{.status.conditions}' | jq .
```

**Common status reasons:**

| Reason | Meaning |
|--------|---------|
| `HPAProgressing` | HPA not yet visible or conditions not yet available |
| `ScaledObjectProgressing` | KEDA ScaledObject not yet ready |
| `FailedGetExternalMetric` | HPA cannot read `wva_desired_replicas` — check Prometheus Adapter configuration |
| Specific KEDA reasons | Trigger or configuration issues reported by KEDA |

---

## Complete Examples

### Example 1: HPA with Deployment

Single-node deployment with HPA-based autoscaling and custom scaling behavior:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-hpa
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      variantCost: "10.0"
      hpa:
        behavior:
          scaleUp:
            stabilizationWindowSeconds: 0
          scaleDown:
            stabilizationWindowSeconds: 300

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

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-hpa-kserve-va

# Check HPA
kubectl get hpa llama-hpa-kserve-hpa

# Check scaling status
kubectl get llminferenceservice llama-hpa -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

---

### Example 2: KEDA with Deployment

Single-node deployment with KEDA-based autoscaling, including idle scale-down and metric fallback:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-keda
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

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

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-keda-kserve-va

# Check KEDA ScaledObject
kubectl get scaledobjects llama-keda-kserve-keda

# Check scaling status
kubectl get llminferenceservice llama-keda -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

---

### Example 3: Multi-Node (LeaderWorkerSet) with HPA

For multi-node deployments using LeaderWorkerSet, WVA scales the LWS resource directly:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-70b-multinode
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-2-70b-hf
    name: meta-llama/Llama-2-70b-hf

  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4

  scaling:
    minReplicas: 1
    maxReplicas: 4
    wva:
      hpa: {}

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  worker:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

:::note
When `spec.worker` is present, WVA targets the `LeaderWorkerSet` resource instead of a `Deployment`.
:::

---

### Example 4: Multi-Node (LeaderWorkerSet) with KEDA

Multi-node deployment with KEDA-based autoscaling, leveraging idle scale-down and initial cooldown for large model loading:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-70b-multinode-keda
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-2-70b-hf
    name: meta-llama/Llama-2-70b-hf

  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4

  scaling:
    minReplicas: 2
    maxReplicas: 6
    wva:
      variantCost: "20.0"
      keda:
        pollingInterval: 10
        cooldownPeriod: 300
        initialCooldownPeriod: 120
        idleReplicaCount: 1
        fallback:
          failureThreshold: 3
          replicas: 2

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  worker:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-70b-multinode-keda-kserve-va

# Check KEDA ScaledObject (targets LeaderWorkerSet)
kubectl get scaledobjects llama-70b-multinode-keda-kserve-keda

# Check scaling status
kubectl get llminferenceservice llama-70b-multinode-keda -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

:::tip
For large multi-node models, set `initialCooldownPeriod` to account for model loading time across all nodes. This prevents KEDA from making premature scaling decisions before the model is ready to serve traffic.
:::

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `ScalingReady=False` with `FailedGetExternalMetric` | Prometheus Adapter missing or misconfigured | Install Prometheus Adapter with `wva_desired_replicas` external metric rule. See [Prerequisites](#hpa-actuator) |
| `ScalingReady=False` with `ScaledObjectProgressing` | KEDA ScaledObject cannot connect to Prometheus | Verify `autoscaling-wva-controller-config.prometheus.url` in the `inferenceservice-config` ConfigMap |
| VariantAutoscaling not created | WVA CRD not installed in the cluster | Install the WVA controller (`helm install wva oci://ghcr.io/llm-d/workload-variant-autoscaler`) |
| Replicas stuck at `minReplicas` | WVA not receiving inference metrics | Ensure Prometheus is scraping inference pod metrics (check `prometheus.io/scrape` annotations on pods) |
| Validation error: "wva is required" | `spec.scaling` set without `spec.scaling.wva` | Add `wva` with either `hpa: {}` or `keda: {}` |
| Validation error: "scaling and replicas are mutually exclusive" | Both `spec.scaling` and `spec.replicas` set | Remove one — use `scaling` for dynamic autoscaling or `replicas` for fixed count |
| Validation error: "decode and prefill must use the same actuator" | Mixed HPA and KEDA across workloads | Use the same actuator backend for both `spec.scaling` and `spec.prefill.scaling` |
| KEDA error: `prometheus.url is required` | Missing cluster-wide config | Add the `autoscaling-wva-controller-config` key to the `inferenceservice-config` ConfigMap |

### Force Stop Behavior

When the `serving.kserve.io/stop` annotation is set on the LLMInferenceService, the controller deletes all autoscaling resources (VariantAutoscaling, HPA, and KEDA ScaledObject) and clears the scaling status conditions. Resources are recreated when the annotation is removed.

---

## Related Documentation

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
