---
sidebar_label: "Configuration"
sidebar_position: 3
title: "LLMInferenceService Configuration Guide"
---

# LLMInferenceService Configuration Guide

This guide provides detailed reference for configuring LLMInferenceService resources, including model specifications, workload patterns, router settings, and parallelism strategies.

> **Prerequisites**: Before configuring LLMInferenceService, ensure you understand the [core concepts](./llmisvc-overview.md) and have installed [required dependencies](./llmisvc-dependencies.md).

---

## Configuration Composition Model

:::tip Deep Dive
For a detailed look at how config composition works internally - including the well-known config catalog, injection decision logic, and field provenance examples - see the [Config Composition Deep Dive](./llmisvc-config-composition.md).
:::

### LLMInferenceService vs LLMInferenceServiceConfig

Similar to the relationship between `InferenceService` and `ServingRuntime`, KServe introduces **LLMInferenceServiceConfig** to separate configuration templates from service instances. However, the relationship and purpose differ significantly:

### Comparison with InferenceService & ServingRuntime

<img src={require('./imgs/comparison_Isvc_llmisvc.png').default} alt="Comparison with InferenceService & ServingRuntime" style={{width: '700px', maxWidth: '100%'}} />


### Key Differences

| Aspect | ServingRuntime → InferenceService | LLMISVCConfig → LLMInferenceService |
|--------|-----------------------------------|-------------------------------------|
| **Relationship** | 1:N (One runtime, many services) | M:1 (Many configs, one service via composition) |
| **Purpose** | Runtime environment definition | Composable configuration fragments |
| **Scope** | Container, protocol, runtime settings | Model, workload, router, scheduler configs |
| **Composition** | Single runtime reference | Multiple baseRefs composition |
| **Override** | Limited (model URI, resources) | Flexible (any field can be overridden) |
| **Granularity** | Monolithic runtime definition | Modular, category-based configs |

---

## Configuration Composition Example

```yaml
# Config 1: Model configuration
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceServiceConfig
metadata:
  name: model-llama-3-8b
  namespace: kserve
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

---
# Config 2: Workload configuration
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceServiceConfig
metadata:
  name: workload-single-gpu
  namespace: kserve
spec:
  replicas: 3
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: "1"

---
# Config 3: Router configuration
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceServiceConfig
metadata:
  name: router-managed
  namespace: kserve
spec:
  router:
    route: {}
    gateway: {}
    scheduler: {}

---
# LLMInferenceService: Compose all configs
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llama-service
  namespace: default
spec:
  baseRefs:
    - name: model-llama-3-8b
    - name: workload-single-gpu
    - name: router-managed
  # Optional: Override specific fields
  replicas: 5  # Override workload-single-gpu replicas
```

---

---

## Model Specification

### Basic Configuration

```yaml
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct  # Model source
    name: meta-llama/Llama-3.1-8B-Instruct      # Model name for API
```

### Key Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **`uri`** | string | Model location | `hf://meta-llama/Llama-3.1-8B-Instruct`<br/>`s3://my-bucket/models/llama-3`<br/>`pvc://model-pvc/llama-3` |
| **`name`** | string | Model identifier for inference requests | `meta-llama/Llama-3.1-8B-Instruct`<br/>(defaults to metadata.name) |

---

## LoRA Adapter Configuration

LLMInferenceService supports Low-Rank Adaptation (LoRA) adapters for task-specific model fine-tuning. LoRA allows you to serve multiple adapted versions of a base model efficiently, reducing storage and memory requirements while enabling multi-tenant deployments.

### Quick Example

```yaml
spec:
  model:
    uri: hf://Qwen/Qwen2.5-7B-Instruct
    name: Qwen/Qwen2.5-7B-Instruct
    lora:
      adapters:
        - name: sql-adapter
          uri: hf://my-org/qwen-sql-lora
        - name: code-adapter
          uri: s3://my-bucket/adapters/code-lora
        - name: domain-adapter
          uri: pvc://adapter-pvc/domain-lora
```

### Supported URI Schemes

- **`hf://`** - HuggingFace Hub adapters
- **`s3://`** - S3-compatible storage (AWS S3, MinIO, Ceph)
- **`pvc://`** - PersistentVolumeClaim (pre-downloaded, air-gapped)

### Key Benefits

- **Storage Efficiency**: 50-500MB per adapter vs 10-100GB for full models
- **Multi-Tenancy**: Multiple task-specific models from a single deployment
- **Dynamic Switching**: Per-request adapter selection with ~1-5ms overhead
- **Automatic Integration**: Controller handles downloads, mounts, and vLLM configuration

For detailed configuration, examples, and troubleshooting, see the **[LoRA Adapters Guide](./lora-adapters.md)**.

---

## Autoscaling Configuration

LLMInferenceService supports intelligent autoscaling through the **Workload Variant Autoscaler (WVA)**, which scales based on inference-specific metrics like KV cache utilization and queue depth rather than generic CPU/memory metrics.

### Quick Example

```yaml
spec:
  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      variantCost: "10.0"
      hpa: {}    # or keda: {}
```

### Key Features

- **Two actuator backends**: HPA (simpler, requires Prometheus Adapter) or KEDA (supports idle scale-down, metric fallback, initial cooldown)
- **Independent prefill scaling**: Disaggregated deployments can autoscale prefill and decode workloads independently via `spec.prefill.scaling`
- **Multi-node support**: Automatically targets LeaderWorkerSet for distributed inference workloads

:::tip
`spec.scaling` and `spec.replicas` are mutually exclusive. Use `scaling` for dynamic WVA-based autoscaling or `replicas` for a fixed replica count.
:::

For detailed configuration, prerequisites, field reference, and examples, see the **[Autoscaling Guide](./autoscaling/llmisvc-autoscaling.md)**.

---

## Workload Specification

### Workload Types Overview

<img src={require('./imgs/workload_types.png').default} alt="Workload Types" style={{width: '600px', maxWidth: '100%'}} />

### Workload Selection Logic

- **`spec.worker` present?** → Multi-Node (LeaderWorkerSet)
- **`spec.prefill` present?** → Disaggregated (Prefill/Decode separation)
- **Neither present?** → Single-Node (Deployment)

---

### Single-Node Configuration

```yaml
spec:
  replicas: 3
  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "4"
            memory: 32Gi
```
---

### Multi-Node Configuration

```yaml
spec:
  replicas: 2  # Number of LeaderWorkerSet replicas

  parallelism:
    tensor: 4   # Tensor parallelism degree
    data: 8     # Total data parallel instances
    dataLocal: 4  # GPUs per node
    # Result: 8 / 4 = 2 LWS replicas (overrides replicas: 2 if different)

  template:     # Leader pod spec
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

  worker:       # Worker pod spec (triggers multi-node)
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
```

---

### Prefill-Decode Separation Configuration

```yaml
spec:
  # Decode workload (main)
  replicas: 1
  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--enforce-eager"  # Decode optimization
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 64Gi

  # Prefill workload (separate pool)
  prefill:
    replicas: 2
    template:
      containers:
        - name: main
          image: vllm/vllm-openai:latest
          args:
            - "--model"
            - "/mnt/models"
            - "--enable-chunked-prefill"  # Prefill optimization
          resources:
            limits:
              nvidia.com/gpu: "2"
              cpu: "16"
              memory: 128Gi
```

**Use case**: Cost optimization, high throughput requirements

---

## Router Specification

The router configuration defines how the service is exposed and how traffic is routed.

### Complete Router Configuration

```yaml
spec:
  router:
    gateway: {}     # Gateway configuration
    route: {}       # HTTPRoute configuration
    scheduler: {}   # Scheduler configuration
```

### Gateway Configuration

#### Managed Gateway (Default)

```yaml
spec:
  router:
    gateway: {}  # Empty object = use default gateway
```

KServe creates a Gateway resource automatically.

#### Referenced Gateway

```yaml
spec:
  router:
    gateway:
      refs:
        - name: my-custom-gateway
          namespace: istio-system
```

Use an existing Gateway instead of creating a new one.

---

### HTTPRoute Configuration

#### Managed HTTPRoute (Default)

```yaml
spec:
  router:
    route: {}  # Auto-generated routing rules
```

#### Referenced HTTPRoute

```yaml
spec:
  router:
    route:
      http:
        refs:
          - name: my-custom-http-route
```

Use an existing, user-managed HTTPRoute instead of having the controller create one. The controller validates that the referenced HTTPRoute exists but does not modify it. This is useful for advanced routing setups like canary deployments or custom traffic splitting.

#### Custom HTTPRoute Spec

```yaml
spec:
  router:
    route:
      http:
        spec:
          parentRefs:
            - name: my-gateway
          rules:
            - backendRefs:
                - name: my-backend-service
                  port: 8000
```

:::tip
`spec` and `refs` are mutually exclusive - use `refs` to bring your own HTTPRoute, or `spec` to have the controller create one with your custom rules.
:::

`router.route.http.spec` is merged with the well-known router-route preset using the same [strategic merge](./llmisvc-config-composition.md#strategic-merge-patch-behavior) as other `LLMInferenceService` fields:

| What you set in `spec` | Result |
|------------------------|--------|
| Top-level fields only (for example `hostnames`, `parentRefs`) | Preset rules and backendRefs are preserved; your fields are added/overlaid |
| `ruleDefaults` on `router.route.http` | Defaults such as `timeouts` and `retry` overlay onto every preset rule |
| Any non-empty `rules` list | **Replaces** the entire preset Rules list — provide a complete list |

:::warning
Supplying a partial `rules` list that includes matches, filters, or backendRefs replaces all auto-generated routes. If you only need hostnames or inherited per-rule defaults, do **not** copy a full-spec example and delete fields — use the patterns below.
:::

#### Real-world Use Cases

**1. Add hostnames** (keep auto-generated routes):

```yaml
spec:
  router:
    route:
      http:
        spec:
          hostnames:
            - my-svc.example.com
```

**2. Rule defaults** (for long-running LLM inference; overlays preset rules):

```yaml
spec:
  router:
    route:
      http:
        ruleDefaults:
          timeouts:
            request: "300s"
            backendRequest: "300s"
          retry:
            attempts: 3
```

**3. Full custom Rules** (replaces auto-generated routes — include every match/backend you need):

```yaml
spec:
  router:
    route:
      http:
        spec:
          rules:
            - matches:
                - path:
                    type: PathPrefix
                    value: /my-tenant/my-model/v1/completions
              filters:
                - type: URLRewrite
                  urlRewrite:
                    path:
                      type: ReplacePrefixMatch
                      replacePrefixMatch: /v1/completions
              backendRefs:
                - group: inference.networking.k8s.io
                  kind: InferencePool
                  name: my-svc-inference-pool
                  port: 8000
            - backendRefs:
                - group: ""
                  kind: Service
                  name: my-custom-backend
                  port: 8000
```

---

### Traffic Splitting (Canary Rollout)

Traffic splitting lets you run two or more versions of an LLMInferenceService side by side and shift live traffic between them. See the [Canary Rollout guide](./canary-rollout.md) for a full walkthrough.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `group` | `string` | No | Routing group name. All LLMISVCs with the same group participate in weighted traffic splitting. Members sharing the same `model.name` and LoRA adapter set participate in the same weighted split. |
| `weight` | `int32` | No | Relative traffic share within the group (0-1,000,000). Traffic is distributed proportionally across all members' weights. A weight of `0` means the member is in the group but receives no traffic through shared model-routing paths. |

```yaml
spec:
  router:
    route:
      group: my-model
      weight: 9
    scheduler: {}
```

**Validation rules:**

| Spec | Valid? | Why |
|------|--------|-----|
| No `group`, no `weight` | Yes | Standard LLMISVC, no traffic splitting |
| `weight` without `group` | No | Weight requires group |
| `group` without `weight` | No | Group requires weight |
| `group` + `weight` | Yes | Member joins the named group. Controller creates the HTTPRoute. |
| `group` + `weight` + `route.http.refs` | No | Traffic splitting needs controller-managed routes, not user-managed refs |

When `group` is set, the mutating webhook automatically adds a `serving.kserve.io/routing-group` label for discovery:

```bash
kubectl get llmisvc -l serving.kserve.io/routing-group=my-model
```

---

### Scheduler Configuration

#### Managed Scheduler (Default)

```yaml
spec:
  router:
    scheduler: {}  # Auto-configured scheduler
```

KServe creates:
- InferencePool
- InferenceModel
- Scheduler Deployment (EPP)
- Scheduler Service

#### Referenced InferencePool

```yaml
spec:
  router:
    scheduler:
      pool:
        ref:
          name: my-existing-pool
```

Use an existing, user-managed InferencePool instead of having the controller create one. When a pool `ref` is provided, the controller does not create an EPP deployment or InferencePool - it only creates an InferenceModel pointing to the referenced pool.

#### Custom Scheduler with Pool

```yaml
spec:
  router:
    scheduler:
      pool:
        spec:
          selector:
            matchLabels:
              app: workload
          targetPort: 8000
```

:::tip
`pool.spec` and `pool.ref` are mutually exclusive - use `ref` to bring your own InferencePool, or `spec` to have the controller create one with custom settings.
:::

#### EndpointPickerConfig

By default the controller generates an `EndpointPickerConfig` for you, picking a plugin set that matches your topology (P/D disaggregation, LoRA adapters, and so on). When you need something else - a different scorer mix, custom scheduling profiles, flow control - supply the document yourself under `scheduler.config`.

There are two ways to do that, and they are mutually exclusive.

**Inline** - the document lives in the LLMInferenceService:

```yaml
spec:
  router:
    scheduler:
      config:
        inline:
          apiVersion: llm-d.ai/v1alpha1
          kind: EndpointPickerConfig
          plugins:
            - type: single-profile-handler
            - type: prefix-cache-scorer
            - type: load-aware-scorer
              parameters:
                threshold: 100
            - type: max-score-picker
          schedulingProfiles:
            - name: default
              plugins:
                - pluginRef: prefix-cache-scorer
                  weight: 2.0
                - pluginRef: load-aware-scorer
                  weight: 1.0
                - pluginRef: max-score-picker
```

**ConfigMap reference** - the document lives in a ConfigMap, and the service points at it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-epp-config
  namespace: my-namespace
data:
  epp: |
    apiVersion: llm-d.ai/v1alpha1
    kind: EndpointPickerConfig
    plugins:
      - type: single-profile-handler
      - type: prefix-cache-scorer
      - type: max-score-picker
    schedulingProfiles:
      - name: default
        plugins:
          - pluginRef: prefix-cache-scorer
            weight: 2.0
          - pluginRef: max-score-picker
---
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llm
  namespace: my-namespace
spec:
  router:
    scheduler:
      config:
        ref:
          name: my-epp-config
          key: epp
```

Both forms end up in the same place. The controller resolves `ref` into the inline document during config merge and passes the result to the EPP as `--config-text`. It also applies a few compatibility rewrites on the way through, gated on the EPP image version - deprecated plugin fields are dropped and the older `inference.networking.x-k8s.io/v1alpha1` apiVersion is rewritten to `llm-d.ai/v1alpha1` - so the config the EPP receives is not always byte-for-byte what you wrote.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config.inline` | object | No | The `EndpointPickerConfig` document, embedded in the service spec. |
| `config.ref.name` | `string` | Yes (with `ref`) | Name of a ConfigMap holding the document. Looked up in the LLMInferenceService's namespace. |
| `config.ref.key` | `string` | Yes (with `ref`) | Key within the ConfigMap's `data` that holds the document. |

**Things worth knowing:**

- `inline` and `ref` are mutually exclusive. Setting both, or setting `config` with neither, is rejected by the validating webhook.
- `ref.key` is required - the field is a standard `ConfigMapKeySelector` and the schema mandates it. Point it at whatever your `data` key is called; get it wrong and reconcile fails with `ConfigMap ... doesn't have key "<key>" in data`.
- `ref.optional` exists on the selector because `ConfigMapKeySelector` carries it, but the controller ignores it. A ConfigMap that isn't there fails reconciliation either way.
- The ConfigMap has to live in the same namespace as the LLMInferenceService. The one exception is names prefixed with `config-scheduler-`, which fall back to the KServe namespace when they aren't found locally.
- Editing the referenced ConfigMap re-triggers reconciliation and rolls the EPP deployment. No need to touch the service.

:::tip
Prefer `ref` when the same scheduler config is shared across services or managed by a different team - it keeps the EPP document under its own review cycle instead of duplicating it into every LLMInferenceService.
:::

**Configuration precedence**

If more than one source supplies a config, the first match wins:

1. `scheduler.config` (`inline`, or `ref` after resolution).
2. A `--config-text` or `--config-file` argument you set on the `main` container in `scheduler.template`.
3. The config flag already present on the running EPP deployment - preserved so upgrades don't clobber a hand-edited config.
4. The controller-generated default.

:::warning
Some plugins currently need `inline` and do not work through `ref`: `predicted-latency-producer` (latency-predictor sidecar injection), and `token-producer` or the legacy `precise-prefix-cache-scorer` (standalone tokenizer deployment). Plugin detection runs before ref resolution, so with `ref` the supporting preset is never merged in - the latency predictor logs a warning event and skips the sidecar, and the tokenizer fails to deploy with no diagnostic at all. Use `inline` when your config names any of them.
:::

---

## Parallelism Specification

Defines distributed inference parallelism strategies for multi-node workloads.

### Complete Configuration

```yaml
spec:
  parallelism:
    tensor: 4        # Tensor parallelism (TP)
    data: 8          # Data parallelism (DP)
    dataLocal: 2     # Data-local parallelism (DP-local)
    expert: true     # Expert parallelism (EP)
    dataRPCPort: 8001
```

### Parallelism Types

#### Tensor Parallelism (TP)
<img src={require('./imgs/tensor_parallelism.png').default} alt="Tensor Parallelism (TP)" style={{width: '300px', maxWidth: '100%'}} />

**Use case**: Model too large for single GPU

```yaml
spec:
  parallelism:
    tensor: 4  # Split model across 4 GPUs
```

---

#### Data Parallelism (DP)
<img src={require('./imgs/data_parallelism.png').default} alt="Data Parallelism (DP)" style={{width: '300px', maxWidth: '100%'}} />

**Use case**: Increase throughput

```yaml
spec:
  parallelism:
    data: 16        # 16 total replicas
    dataLocal: 8    # 8 GPUs per node
    # Result: 16/8 = 2 nodes
```

---

#### Expert Parallelism (EP)

<img src={require('./imgs/expert_parallelism.png').default} alt="Expert Parallelism (EP)" style={{width: '300px', maxWidth: '100%'}} />

**Use case**: MoE models (Mixtral, DeepSeek-R1)

```yaml
spec:
  parallelism:
    expert: true
    data: 16
    dataLocal: 8
```

---

### LeaderWorkerSet Size Calculation

```
Multi-Node Size = data / dataLocal

Example:
  parallelism:
    data: 16
    dataLocal: 8

  Result: LeaderWorkerSet.Size = 16 / 8 = 2
          (1 leader + 1 worker per replica)
```

---

## Complete Configuration Example

Combining all specifications:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: llama-70b-production
  namespace: production
spec:
  # Model specification
  model:
    uri: hf://meta-llama/Llama-2-70b-hf
    name: meta-llama/Llama-2-70b-hf
    criticality: High

  # Multi-node workload with data parallelism
  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4

  # Decode workload (main)
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
            rdma/roce: "1"

  # Worker pods
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
            rdma/roce: "1"

  # Router configuration
  router:
    gateway: {}
    route:
      http:
        ruleDefaults:
          timeouts:
            request: "300s"
            backendRequest: "300s"
    scheduler: {}
```

---

## Next Steps

- **[Architecture Guide](../../../concepts/architecture/control-plane-llmisvc.md)**: Understand how components interact
- **[Dependencies](./llmisvc-dependencies.md)**: Install required infrastructure
