---
sidebar_label: "Label & Annotation Propagation"
sidebar_position: 5
title: "Label and Annotation Propagation"
description: "How to propagate Kubernetes labels and annotations from LLMInferenceService to workload pods"
keywords: [LLMInferenceService, labels, annotations, propagation, Kueue, Prometheus, Multus]
---

# Label and Annotation Propagation

LLMInferenceService supports propagating Kubernetes labels and annotations from the CR to the pods it manages. This lets you attach operational metadata — such as Kueue queue assignments, Prometheus scraping config, Multus network attachments, or custom platform labels — without patching controller templates directly.

Propagation works across all deployment modes: single-node Deployments, multi-node LeaderWorkerSets, disaggregated prefill-decode workloads, and the scheduler (EPP) Deployment.

---

## Two Layers of Propagation

LLMInferenceService distinguishes between two propagation layers:

| Layer | Source | Target | Filtering |
|-------|--------|--------|-----------|
| **Top-level metadata** | `.metadata.labels` / `.metadata.annotations` | Deployment or LWS object **and** pod templates | Prefix allowlist (only approved prefixes propagate) |
| **Spec-level fields** | `spec.labels` / `spec.annotations` and per-component equivalents | Pod templates only | None — all keys propagate |

Spec-level fields are applied **after** top-level metadata, so when both set the same key the spec-level value takes precedence on the pod template.

---

## Top-Level Metadata Propagation

Labels and annotations placed on `.metadata` are filtered through an approved-prefix allowlist before propagating to child resources.

### Approved Annotation Prefixes

| Prefix | Use Case |
|--------|----------|
| `k8s.v1.cni.cncf.io` | Multus CNI network attachments (e.g., RDMA/InfiniBand) |
| `kueue.x-k8s.io` | Kueue batch scheduling |
| `prometheus.io` | Prometheus scraping configuration |

### Approved Label Prefixes

| Prefix | Use Case |
|--------|----------|
| `kueue.x-k8s.io` | Kueue queue assignments |

Annotations and labels that do not match an approved prefix — including internal annotations like `internal.serving.kserve.io/*` and `kubectl.kubernetes.io/last-applied-configuration` — are **not** propagated.

### Example: Prometheus Scraping via Top-Level Annotations

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llm
  namespace: default
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct
```

The three `prometheus.io/*` annotations propagate to the pod template. Any annotations without an approved prefix (for example, a user-facing annotation like `my-team.example.com/owner`) are silently dropped from propagation.

### Example: Kueue Queue via Top-Level Labels

```yaml
metadata:
  labels:
    kueue.x-k8s.io/queue-name: gpu-queue
```

The `kueue.x-k8s.io/queue-name` label propagates to the Deployment or LeaderWorkerSet **and** its pod template.

---

## Spec-Level Propagation

For metadata that does not fall under an approved prefix — or when you need fine-grained, per-component control — use the spec-level fields. These propagate **all** keys without filtering, directly to the pod templates of the respective component.

### Available Spec-Level Fields

| Field | Applies to |
|-------|------------|
| `spec.labels` / `spec.annotations` | Decode (main) workload pod templates. Also serves as the base for prefill pods when `spec.prefill` is set. |
| `spec.prefill.labels` / `spec.prefill.annotations` | Prefill workload pod templates (additive; overrides `spec.labels`/`spec.annotations` for the same key) |
| `spec.router.scheduler.labels` / `spec.router.scheduler.annotations` | Scheduler (EPP) pod template only |

### Example: Per-Component Custom Labels

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llm
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  labels:
    platform.example.com/cost-center: "ai-infra"
    platform.example.com/team: "ml-platform"
  annotations:
    platform.example.com/monitored: "true"

  prefill:
    replicas: 2
    labels:
      platform.example.com/role: "prefill"
    annotations:
      platform.example.com/slo: "latency-sensitive"
    template:
      containers:
        - name: main
          image: vllm/vllm-openai:latest

  router:
    scheduler:
      labels:
        platform.example.com/role: "scheduler"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
```

In this example:

- **Decode pods** receive `platform.example.com/cost-center`, `platform.example.com/team`, and `platform.example.com/monitored`.
- **Prefill pods** receive the same base labels/annotations from `spec.labels`/`spec.annotations`, plus `platform.example.com/role: prefill` and `platform.example.com/slo: latency-sensitive` from `spec.prefill`.
- **Scheduler pods** receive only `platform.example.com/role: scheduler`, `prometheus.io/scrape: true`, and `prometheus.io/port: 9090` from `spec.router.scheduler`.

---

## Multi-Node Workloads

For multi-node deployments using LeaderWorkerSet, spec-level labels and annotations propagate to **both** the leader and worker pod templates. This applies to:

- `spec.labels` / `spec.annotations` → leader and worker pods of the decode LWS.
- `spec.prefill.labels` / `spec.prefill.annotations` → leader and worker pods of the prefill LWS.

Top-level metadata with approved prefixes also propagates to the LWS object and both pod templates.

---

## Propagation Summary

| Source Field | Target(s) | Filtering |
|---|---|---|
| `.metadata.annotations` with approved prefix | Deployment/LWS + pod template | Prefix allowlist (`k8s.v1.cni.cncf.io`, `kueue.x-k8s.io`, `prometheus.io`) |
| `.metadata.labels` with approved prefix | Deployment/LWS + pod template | Prefix allowlist (`kueue.x-k8s.io`) |
| `spec.labels` | Decode pod template | None |
| `spec.annotations` | Decode pod template | None |
| `spec.prefill.labels` | Prefill pod template | None |
| `spec.prefill.annotations` | Prefill pod template | None |
| `spec.router.scheduler.labels` | Scheduler pod template only | None |
| `spec.router.scheduler.annotations` | Scheduler pod template only | None |

### Precedence

When the same key appears in both top-level metadata and spec-level fields, the **spec-level value wins** on the pod template because it is applied last.

---

## Common Use Cases

### Kueue Batch Scheduling for GPU Workloads

Assign pods to a Kueue queue so the batch scheduler manages GPU allocation:

```yaml
metadata:
  labels:
    kueue.x-k8s.io/queue-name: gpu-queue
```

### Multus CNI Network Attachments

Attach high-bandwidth network interfaces (e.g., RDMA/InfiniBand) to pods:

```yaml
metadata:
  annotations:
    k8s.v1.cni.cncf.io/networks: rdma-net
```

### Prometheus Metrics Collection

Enable Prometheus to scrape metrics from workload pods:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
```

### Cost Allocation and Observability Labels

Attach arbitrary platform labels for cost tracking or internal tooling — use spec-level fields since custom prefixes are not on the approved list:

```yaml
spec:
  labels:
    billing.example.com/department: "research"
    billing.example.com/project: "llm-serving"
  annotations:
    observability.example.com/dashboard: "llm-metrics"
```

---

## Next Steps

- **[Configuration Guide](./llmisvc-configuration.md)**: Full reference for LLMInferenceService spec fields
- **[Architecture Guide](../../../concepts/architecture/control-plane-llmisvc.md)**: Understand how the controller manages workloads
- **[Multi-Node Deployment](../multi-node/multi-node.md)**: LeaderWorkerSet-based distributed inference
