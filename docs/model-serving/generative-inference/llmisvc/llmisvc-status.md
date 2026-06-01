---
sidebar_label: "Status Reference"
sidebar_position: 6
title: "LLMInferenceService Status Reference"
---

# LLMInferenceService Status Reference

This page documents the full status contract for `LLMInferenceService` (v1alpha2) - conditions, reason codes, and observed status fields. It is designed as a reference for consumers of this API - dashboards, CLIs, GitOps pipelines, or any tooling that reads LLMInferenceService status programmatically.

For background on the resource itself, see the [LLMInferenceService overview](./llmisvc-overview.md). For spec configuration, see the [configuration guide](./llmisvc-configuration.md).

---

## Condition Hierarchy

LLMInferenceService uses status conditions to represent readiness. The top-level `Ready` condition aggregates `WorkloadsReady` and `RouterReady` via the Knative `LivingConditionSet` - it is True only when both are True.

`PresetsCombined` is **not** part of the `Ready` rollup. It is a separate gate: when config resolution fails, the reconciler short-circuits before reaching workload or router reconciliation, so `WorkloadsReady` and `RouterReady` stay at their previous values (or `Unknown` on a new service). Consumers should check `PresetsCombined` independently.

Optional conditions (marked below) are only present when the corresponding feature is enabled - missing conditions do not block readiness.

```
Ready (= WorkloadsReady ∧ RouterReady)
 ├── WorkloadsReady                               (aggregate)
 │    ├── MainWorkloadReady                       (single-node only)
 │    ├── WorkerWorkloadReady                     (multi-node only)
 │    ├── PrefillWorkloadReady                    (prefill-decode only)
 │    ├── PrefillWorkerWorkloadReady              (multi-node prefill-decode only)
 │    ├── ScalingReady                            (autoscaling only)
 │    └── PrefillScalingReady                     (prefill-decode autoscaling only)
 └── RouterReady                                  (aggregate)
      ├── GatewaysReady                           (when gateway refs configured)
      ├── HTTPRoutesReady                         (when HTTP route configured)
      ├── InferencePoolReady                      (managed scheduler only)
      └── SchedulerWorkloadReady                  (managed scheduler only)

PresetsCombined                                   (independent gate, not part of Ready rollup)
```

---

## Identifying the Deployment Topology

The set of conditions and status fields that appear tells you what kind of deployment you're looking at. A consumer can determine the topology without inspecting the spec - just read the status.

| Topology | Distinguishing signals in status |
|----------|----------------------------------|
| **Single-node vLLM** | `MainWorkloadReady` is present. `status.workloads.primary.kind` is `Deployment`. No `WorkerWorkloadReady`. |
| **[Multi-node](https://llm-d.ai/docs/guides/wide-expert-parallelism) (LeaderWorkerSet)** | `WorkerWorkloadReady` is present, `MainWorkloadReady` is absent. `status.workloads.primary.kind` is `LeaderWorkerSet`. |
| **[Prefill-decode disaggregated serving](https://llm-d.ai/docs/architecture/advanced/disaggregation)** | `PrefillWorkloadReady` is present. `status.workloads.prefill` is populated. |
| **Multi-node prefill-decode** | Both `WorkerWorkloadReady` and `PrefillWorkerWorkloadReady` are present. |
| **With [llm-d scheduler](https://llm-d.ai/docs/architecture/core/router/epp)** | `SchedulerWorkloadReady` and `InferencePoolReady` are present. `status.router.scheduler` and `status.workloads.scheduler` are populated. Only for managed schedulers (not external pool refs). |
| **With [autoscaling](https://llm-d.ai/docs/architecture/advanced/autoscaling)** | `ScalingReady` (and/or `PrefillScalingReady` for prefill-decode) is present. |

These signals compose - a multi-node deployment with scheduler will show `WorkerWorkloadReady`, `SchedulerWorkloadReady`, and `InferencePoolReady` all at once.

---

## Conditions

All conditions use positive polarity - `True` means healthy.

### Top-Level Conditions

| Condition | Set By | True | False | Presence |
|-----------|--------|------|-------|----------|
| `Ready` | Aggregated (Knative condition set) | Both `WorkloadsReady` and `RouterReady` are True; the service is accepting traffic | At least one of `WorkloadsReady` or `RouterReady` is not True | Always |
| `PresetsCombined` | Config reconciler | All referenced `LLMInferenceServiceConfig` resources found and merged | Config lookup or merge failed (see [Reason Codes](#reason-codes)). Blocks reconciliation but does not directly affect `Ready` | Always |
| `WorkloadsReady` | Aggregated by `DetermineWorkloadReadiness` | All workload sub-conditions that are present are True | At least one workload sub-condition is False | Always |
| `RouterReady` | Aggregated by `DetermineRouterReadiness` | All router sub-conditions that are present are True | At least one router sub-condition is False | Always |

### Workload Sub-Conditions

These roll up into `WorkloadsReady`. Optional conditions are cleared (removed) when the feature is not configured, so they never block readiness.

In single-node mode, `MainWorkloadReady` tracks the primary Deployment. In multi-node mode, `MainWorkloadReady` is cleared and the primary workload (a LeaderWorkerSet) is tracked by `WorkerWorkloadReady` instead.

| Condition | Set By | True | False | Presence |
|-----------|--------|------|-------|----------|
| `MainWorkloadReady` | Workload reconciler | Primary model-serving Deployment has desired replicas and passing readiness probes | Deployment not at desired state | Single-node only (cleared in multi-node) |
| `WorkerWorkloadReady` | Workload reconciler | LeaderWorkerSet workload is available (all groups ready) | LeaderWorkerSet not available | Only with multi-node (LeaderWorkerSet) |
| `PrefillWorkloadReady` | Workload reconciler | Prefill-phase workload is ready | Prefill workload not ready | Only with prefill-decode disaggregated serving |
| `PrefillWorkerWorkloadReady` | Workload reconciler | Multi-node LeaderWorkerSet for the prefill workload is available | Prefill LeaderWorkerSet not available | Only with multi-node prefill-decode |
| `ScalingReady` | Scaling reconciler | Autoscaler (HPA, KEDA ScaledObject, or VariantAutoscaling) for the primary workload is configured and operational | Autoscaler not ready (may surface propagated reasons from HPA/KEDA) | Only when autoscaling is configured |
| `PrefillScalingReady` | Scaling reconciler | Autoscaler for the prefill workload is configured and operational | Autoscaler not ready | Only with prefill-decode autoscaling |

### Router Sub-Conditions

These roll up into `RouterReady`. When no gateway or HTTP route configuration is present, the corresponding conditions are cleared rather than set to True.

| Condition | Set By | True | False | Presence |
|-----------|--------|------|-------|----------|
| `GatewaysReady` | Router reconciler | All referenced Gateway resources exist and report ready status | Gateway not found, not ready, or ref invalid | Only when gateway refs are configured |
| `HTTPRoutesReady` | Router reconciler | All HTTPRoute resources created and accepted by their parent Gateways | HTTPRoute not created, not accepted, or ref invalid | Only when HTTP route is configured |
| `InferencePoolReady` | Router reconciler | InferencePool resource created and ready | Pool not found, not ready, or waiting for Gateway | Only when managed scheduler is enabled |
| `SchedulerWorkloadReady` | Scheduler reconciler | Endpoint Picker (EPP) scheduler Deployment has desired replicas | Scheduler pods not ready | Only when managed scheduler is enabled |

---

## Reason Codes

When a condition is False, the `reason` field indicates what went wrong. The `message` field provides additional detail.

Workload and scaling conditions can also surface reasons propagated from underlying resources (Deployment, LeaderWorkerSet, HPA, KEDA ScaledObject). For example, `MainWorkloadReady` may show `DeploymentUnavailable` or `ProgressDeadlineExceeded` from the Deployment status, and `ScalingReady` may show `HPAProgressing`, `ScaledObjectProgressing`, `FailedGetExternalMetric`, or `TriggerError` from the autoscaler. The tables below list controller-defined reasons; propagated reasons use the originating resource's own reason strings.

### Config Reasons (PresetsCombined)

| Reason | Description | Action |
|--------|-------------|--------|
| `ConfigNotFound` | A referenced `LLMInferenceServiceConfig` does not exist in any searched namespace | Verify the config name and namespace. The controller watches for config creation and will recover automatically |
| `CombineBaseError` | Config merge failed due to a conflict or validation error | Check the condition message for details. Review `baseRefs` in the spec for conflicting fields |

### Workload Reasons

| Reason | Condition(s) | Description |
|--------|-------------|-------------|
| `Stopped` | Any workload condition | Service is force-stopped via annotation `serving.kserve.io/stop: "true"` |
| `ReconcileCertsError` | `MainWorkloadReady` | TLS certificate reconciliation failed |
| `ReconcileWorkloadPermissionsError` | `MainWorkloadReady` | ServiceAccount or RBAC reconciliation failed |
| `ReconcileSingleNodeWorkloadError` | `MainWorkloadReady` | Deployment creation or update failed |
| `ReconcileMultiNodeWorkloadError` | `WorkerWorkloadReady` | LeaderWorkerSet reconciliation failed (LWS may also surface its own reasons) |
| `ReconcileWorkloadServiceError` | `MainWorkloadReady` | Workload Service creation or update failed |
| `ScalingCRDNotFound` | `MainWorkloadReady` | The autoscaling CRD (e.g. HPA, KEDA ScaledObject) is not installed on the cluster |
| `ReconcileScalingError` | `MainWorkloadReady` | Autoscaler resource creation or update failed |

### Router Reasons

| Reason | Condition(s) | Description |
|--------|-------------|-------------|
| `Stopped` | Any router condition | Service is force-stopped via annotation `serving.kserve.io/stop: "true"` |
| `RefsInvalid` | `GatewaysReady`, `HTTPRoutesReady` | A gateway or route reference in the spec is malformed or references an unsupported kind |
| `GatewaysNotReady` | `GatewaysReady` | One or more referenced Gateways are not reporting ready status |
| `GatewayPreconditionNotMet` | `HTTPRoutesReady` | Gateway preconditions not met before HTTPRoute reconciliation |
| `HTTPRouteReconcileError` | `HTTPRoutesReady` | HTTPRoute creation or update failed |
| `HTTPRouteFetchError` | `HTTPRoutesReady` | Failed to fetch referenced HTTPRoute resources |
| `HTTPRoutesNotReady` | `HTTPRoutesReady` | One or more HTTPRoutes are not accepted by their parent Gateway |
| `PlatformNetworkingReconcileError` | `HTTPRoutesReady` | Platform-specific networking reconciliation failed |
| `InferencePoolNotReady` | `InferencePoolReady` | InferencePool exists but is not ready |
| `InferencePoolFetchError` | `InferencePoolReady` | Failed to fetch the InferencePool resource |
| `WaitingForGateway` | `InferencePoolReady` | InferencePool is waiting for its parent Gateway to become ready |
| `SchedulerReconcileError` | `SchedulerWorkloadReady` | EPP scheduler Deployment creation or update failed |

---

## Observed Status Fields

Beyond conditions, the status includes structured references to the resources the controller created during reconciliation. These fields are populated after a successful reconcile and cleared when the service is force-stopped (annotation `serving.kserve.io/stop: "true"`). Consumers should treat missing observed fields the same as "not yet reconciled" - don't assume an error if the fields are absent on a newly created or stopped service.

### `status.workloads`

Typed references to the Kubernetes resources backing the LLMInferenceService. Use these to navigate directly to the backing workload without guessing names.

| Field | Type | Description | Presence |
|-------|------|-------------|----------|
| `primary` | `TypedLocalObjectReference` | Deployment (single-node) or LeaderWorkerSet (multi-node) running the main model workload | Always (when reconciled) |
| `prefill` | `TypedLocalObjectReference` | Deployment or LeaderWorkerSet for the prefill phase | Only with prefill-decode disaggregation |
| `service` | `TypedLocalObjectReference` | ClusterIP Service for workload traffic | Always (when reconciled) |
| `scheduler` | `TypedLocalObjectReference` | EPP scheduler Deployment | Only with managed scheduler (not external pool refs) |

### `status.router`

The observed routing topology - the networking resources the controller found during reconciliation.

| Field | Type | Description | Presence |
|-------|------|-------------|----------|
| `gateways[]` | `ObservedGateway` | Gateways with matched listener names and bound HTTPRoutes | When routing is configured |
| `scheduler.inferencePool` | `ObjectReference` | InferencePool resource reference | Only with managed scheduler |
| `scheduler.service` | `ObjectReference` | EPP Service reference | Only with managed scheduler |

Each gateway entry includes:
- Gateway name, namespace, group, and kind
- `listeners[]` - names of the listeners that matched this service
- `httpRoutes[]` - HTTPRoute references bound through this gateway

### `status.addresses`

Each address carries an optional `origin` field (`ObjectReference`) identifying which Gateway produced it. This enables multi-gateway disambiguation - consumers can group endpoints by their source gateway.

Each address also carries a `models[]` list that surfaces the model names served through that endpoint. This lets consumers discover which model identifiers to use when sending inference requests to a given URL - without inspecting the spec or querying the model server.

| Field | Type | Description | Presence |
|-------|------|-------------|----------|
| `url` | `string` | Endpoint URL for inference requests | Always |
| `name` | `string` | Address type (see below) | Always |
| `origin` | `ObjectReference` | Gateway that produced this address | When routing is configured |
| `models[]` | `[]ModelSourcedAddressStatus` | Model names served through this address | Always (when reconciled) |

**Address types** - the `name` field indicates the kind of address:
- `gateway-external` - public address from a Gateway's status
- `gateway-internal` - cluster-local Gateway service URL
- `internal` - private IP or other internal hostname
- Addresses for model-based routing get a `-model-routing` suffix (e.g. `internal-model-routing`)

**Model name formats** differ by address type:

- **Model-routing addresses** list the fully-qualified routing name (`publishers/<namespace>/models/<model-name>`). LoRA adapter names also use this format.
- **Standard addresses** list both the fully-qualified name and the short model name. LoRA adapters are listed in both formats as well.

```yaml
addresses:
  - name: internal-model-routing
    models:
      - name: publishers/default/models/facebook/opt-125m
    origin:
      group: gateway.networking.k8s.io
      kind: Gateway
      name: kserve-ingress-gateway
      namespace: kserve
    url: http://172.18.0.3/
  - name: internal
    models:
      - name: publishers/default/models/facebook/opt-125m
      - name: facebook/opt-125m
    origin:
      group: gateway.networking.k8s.io
      kind: Gateway
      name: kserve-ingress-gateway
      namespace: kserve
    url: http://172.18.0.3/default/facebook-opt-125m-single
```

### `status.appliedConfigs`

An ordered list of `LLMInferenceServiceConfig` references that contributed to the merged configuration. Each entry carries a `source` field distinguishing auto-injected well-known configs (`Preset`) from user-specified configs (`UserRef`).

```yaml
appliedConfigs:
  - name: multi-node-defaults
    namespace: kserve-system
    source: Preset
  - name: team-overrides
    namespace: ml-team
    source: UserRef
```

---

## Sample Status

### Healthy service (single-node with scheduler)

```yaml
status:
  url: "https://my-llm.example.com"
  conditions:
    - type: Ready
      status: "True"
      lastTransitionTime: "2025-06-01T10:30:00Z"
      observedGeneration: 3
    - type: PresetsCombined
      status: "True"
      lastTransitionTime: "2025-06-01T10:28:00Z"
      observedGeneration: 3
    - type: WorkloadsReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:30:00Z"
      observedGeneration: 3
    - type: MainWorkloadReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:30:00Z"
      observedGeneration: 3
    - type: RouterReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:29:00Z"
      observedGeneration: 3
    - type: GatewaysReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:28:30Z"
      observedGeneration: 3
    - type: HTTPRoutesReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:28:45Z"
      observedGeneration: 3
    - type: InferencePoolReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:29:00Z"
      observedGeneration: 3
    - type: SchedulerWorkloadReady
      status: "True"
      lastTransitionTime: "2025-06-01T10:29:00Z"
      observedGeneration: 3
  appliedConfigs:
    - name: multi-node-defaults
      namespace: kserve-system
      source: Preset
    - name: team-overrides
      namespace: ml-team
      source: UserRef
  router:
    gateways:
      - name: inference-gateway
        namespace: istio-system
        listeners: [https]
        httpRoutes:
          - name: my-llm-kserve-route
            namespace: ml-team
    scheduler:
      inferencePool:
        name: my-llm-inference-pool
        namespace: ml-team
      service:
        name: my-llm-epp-service
        namespace: ml-team
  workloads:
    primary:
      apiGroup: apps
      kind: Deployment
      name: my-llm-kserve
    service:
      kind: Service
      name: my-llm-kserve-workload-svc
    scheduler:
      apiGroup: apps
      kind: Deployment
      name: my-llm-kserve-router-scheduler
  addresses:
    - name: gateway-external-model-routing
      models:
        - name: publishers/ml-team/models/my-llm
      url: "https://my-llm.example.com/"
      origin:
        group: gateway.networking.k8s.io
        kind: Gateway
        name: inference-gateway
        namespace: istio-system
    - name: gateway-external
      models:
        - name: publishers/ml-team/models/my-llm
        - name: my-llm
      url: "https://my-llm.example.com/ml-team/my-llm"
      origin:
        group: gateway.networking.k8s.io
        kind: Gateway
        name: inference-gateway
        namespace: istio-system
```

### Failing service (missing config)

In this example, a referenced `LLMInferenceServiceConfig` was deleted. The controller surfaces `ConfigNotFound` on `PresetsCombined` and short-circuits before workload or router reconciliation. Note that `Ready` stays at its previous value (or `Unknown` on a new service) because `PresetsCombined` is not part of the `Ready` rollup - consumers must check `PresetsCombined` independently.

```yaml
status:
  conditions:
    - type: Ready
      status: "Unknown"
      lastTransitionTime: "2025-06-02T14:05:00Z"
      observedGeneration: 4
    - type: PresetsCombined
      status: "False"
      reason: "ConfigNotFound"
      message: "LLMInferenceServiceConfig 'team-overrides' not found in namespaces [ml-team, kserve-system]"
      lastTransitionTime: "2025-06-02T14:05:00Z"
      observedGeneration: 4
    - type: WorkloadsReady
      status: "Unknown"
      lastTransitionTime: "2025-06-02T14:05:00Z"
      observedGeneration: 4
    - type: RouterReady
      status: "Unknown"
      lastTransitionTime: "2025-06-02T14:05:00Z"
      observedGeneration: 4
```

---

## Troubleshooting

Start by checking conditions. If `PresetsCombined` is False, that's a config issue - the reconciler won't proceed to workloads or routing. If `PresetsCombined` is True but `Ready` is not, drill into `WorkloadsReady` or `RouterReady`.

### Step 1: Check conditions

```bash
kubectl get llmisvc <name> -o jsonpath='{range .status.conditions[*]}{.type}={.status} {.reason} {.message}{"\n"}{end}'
```

### Step 2: Follow the False branch

**PresetsCombined=False:**
- `ConfigNotFound` - check that the referenced config exists: `kubectl get llminferenceserviceconfig <name> -n <namespace>`
- `CombineBaseError` - review the message for conflicting fields, check `spec.baseRefs`

**WorkloadsReady=False** - check which workload sub-condition is False, then use `status.workloads` to find the resource:
```bash
# Describe the primary workload, reading kind and name directly from status
kubectl describe $(kubectl get llmisvc <name> -o jsonpath='{.status.workloads.primary.kind}/{.status.workloads.primary.name}')

# List pods for the workload
kubectl get pods -l app.kubernetes.io/name=<name>,app.kubernetes.io/part-of=llminferenceservice --sort-by=.metadata.creationTimestamp
```

**RouterReady=False** - check which router sub-condition is False, then use `status.router` to find the resource:
```bash
# Check gateway status
kubectl get llmisvc <name> -o jsonpath='{range .status.router.gateways[*]}{.name}/{.namespace}{"\n"}{end}'
kubectl get gateway <name> -n <namespace>

# Check HTTPRoute status
kubectl get httproute -l app.kubernetes.io/name=<name>,app.kubernetes.io/component=llminferenceservice-router
```

### Step 3: Everything is True but not working

If all conditions are True but inference requests fail, the problem is usually at a layer the controller doesn't observe - the model server itself, the networking data plane, or the scheduler.

**Check connectivity, URLs, and model names:**
```bash
# Check the service URL
kubectl get llmisvc <name> -o jsonpath='{.status.url}'

# Check which gateway produced each address and which models are served
kubectl get llmisvc <name> -o jsonpath='{range .status.addresses[*]}{.name}: {.url} (via {.origin.name}){"\n"}  models: {.models[*].name}{"\n"}{end}'

# Test connectivity
curl -v <url>/v1/models
```

**Bypass the networking layer** to isolate whether the issue is in the model server or the routing:
```bash
# Port-forward directly to the workload service, reading the name from status
kubectl port-forward svc/$(kubectl get llmisvc <name> -o jsonpath='{.status.workloads.service.name}') 8000:8000
curl localhost:8000/v1/models
```

**Check model server logs** - the pod may be ready but the model could be failing at inference time (OOM, CUDA errors, corrupted weights). The model server container is named `main` in all well-known configs:
```bash
# Read the workload name from status, then get logs
# For single-node (Deployment):
kubectl logs deploy/$(kubectl get llmisvc <name> -o jsonpath='{.status.workloads.primary.name}') -c main --tail=100

# For multi-node (LeaderWorkerSet) - list pods by label instead:
kubectl logs -l app.kubernetes.io/name=<name>,app.kubernetes.io/part-of=llminferenceservice -c main --tail=100
```

**Check EPP/scheduler logs** if the scheduler is enabled - the Endpoint Picker may be rejecting or misrouting requests:
```bash
kubectl logs deploy/$(kubectl get llmisvc <name> -o jsonpath='{.status.workloads.scheduler.name}') -c main --tail=100
```

**Check namespace events** for issues that conditions don't capture:
```bash
kubectl get events -n <namespace> --sort-by=.lastTimestamp --field-selector involvedObject.name=<name>
```
