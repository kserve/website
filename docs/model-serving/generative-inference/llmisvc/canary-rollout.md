---
sidebar_label: "Canary Rollout"
sidebar_position: 9
title: "Canary Rollout for LLMInferenceService"
description: "Progressive traffic shifting for safe model upgrades, runtime changes, and configuration updates"
---

import CanaryArchitectureSvg from './imgs/canary_routing_architecture.svg';
import CanaryProgressionSvg from './imgs/canary_traffic_progression.svg';

# Canary Rollout for LLMInferenceService

Runtime upgrades and model rotations on LLM inference workloads are all-or-nothing - a bad image or a model regression takes down the whole endpoint with no quick way back.

Canary rollout lets you run two versions side by side, shift traffic between them, and roll back instantly.

## How It Works

Each LLMInferenceService that participates in a canary rollout declares two fields in `spec.router.route`:

- **`group`** - a string identifying which versions belong together
- **`weight`** - an integer for this version's proportional traffic share

Weights are proportional, not percentages. v1 at 9 and v2 at 1 gives 90/10. v1 at 9 and v2 at 9 gives 50/50. To shift traffic, you only patch the version you're changing - no need to edit both resources.

The controller discovers all group members, creates weighted `backendRef` entries in each member's HTTPRoute, and maintains group status on every member.

There is no "primary" or "canary" distinction in the API - every member is symmetric. The semantics come from the weights you assign.

```yaml
spec:
  router:
    route:
      group: my-model
      weight: 9
    scheduler: {}
```

The webhook automatically sets the label `serving.kserve.io/routing-group` on each member resource, which the controller uses for group discovery.

<CanaryArchitectureSvg />

Each LLMInferenceService creates and owns its own HTTPRoute. Every route carries the same weighted backendRef set for all active (non-stopped) group members. Gateway API precedence rules pick one active route - the oldest route wins when matches are identical. That active route's weighted backendRef set determines how the gateway distributes traffic.

---

## Rollout Lifecycle

<CanaryProgressionSvg />

The typical canary rollout follows these steps:

1. **Deploy v2 alongside v1** with a small weight
2. **Wait for v2 to become Ready** and start receiving traffic
3. **Ramp v2's weight** while monitoring metrics - only patch the version you're changing, weights are proportional
4. **Promote v2** by force-stopping v1 (frees GPU, preserves the resource for rollback)
5. **Decommission v1** when confident

At any point, roll back by lowering v2's weight or restarting v1.

### Starting dark vs starting live

:::warning
Deploying a canary at `weight: 0` (a "dark deployment") may cause transient connection failures when you later increase the weight. The theory: when the weight is zero, the gateway may not warm the backend cluster. Changing to a non-zero weight then triggers both a cluster discovery (CDS) and route (RDS) update simultaneously, and the CDS update can briefly disrupt connections.

The safer pattern is to deploy at `weight: 1` so the backend is warmed from the start. In a 9:1 split, this means roughly 10% of traffic goes to v2 immediately - which is actually desirable for LLM inference since it validates the full vLLM/scheduler stack handles real requests before ramping up.
:::

---

## Step-by-Step Guide

### Prerequisites

- A running KServe installation with the LLMInferenceService controller
- A Gateway API implementation with support for weighted `backendRef`s
- `kubectl` configured with cluster access
- Familiarity with [LLMInferenceService basics](./llmisvc-overview.md)

### Step 1: Deploy the Production Version (v1)

Start by deploying v1 with `group` and `weight` set:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model-v1
  namespace: my-namespace
spec:
  model:
    name: my-model
    uri: hf://meta-llama/Llama-3-70B
  baseRefs:
    - name: model-config
    - name: workload-config
  router:
    route:
      group: my-model
      weight: 9
    scheduler: {}
```

```bash
kubectl apply -f my-model-v1.yaml
kubectl wait llmisvc my-model-v1 -n my-namespace --for=condition=Ready --timeout=300s
```

Verify the routing group label:

```bash
kubectl get llmisvc my-model-v1 -n my-namespace \
    -o jsonpath='{.metadata.labels.serving\.kserve\.io/routing-group}'
```

:::tip[Expected Output]
```
my-model
```
:::

At this point, v1 is the only group member and receives 100% of traffic.

### Step 2: Deploy the Canary Version (v2)

Deploy v2 with the same `group` but `weight: 1`. This gives a 9:1 split (~90% v1, ~10% v2) once v2 is Ready.

:::tip
Starting at `weight: 1` rather than `weight: 0` avoids transient connection issues that can occur when the gateway hasn't warmed the backend cluster. See [Starting dark vs starting live](#starting-dark-vs-starting-live) for details.
:::

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model-v2
  namespace: my-namespace
spec:
  model:
    name: my-model
    uri: hf://meta-llama/Llama-3.1-70B
  baseRefs:
    - name: model-config-v2
    - name: workload-config
  router:
    route:
      group: my-model      # same group as v1
      weight: 1
    scheduler: {}
```

Note that `group` and `model.name` match v1 - that's what makes them part of the same traffic split.

:::warning
Group members must share the same model name and LoRA adapter set. Members that differ on either form independent sub-groups and get `GroupDegraded=True` with reason `MemberDivergence`.
:::

Wait for v2, then check group status:

```bash
kubectl wait llmisvc my-model-v2 -n my-namespace --for=condition=Ready --timeout=300s
kubectl get llmisvc my-model-v1 -n my-namespace \
    -o jsonpath='{.status.router.group}' | python3 -m json.tool
```

:::tip[Expected Output]
```json
{
    "name": "my-model",
    "members": [
        {"name": "my-model-v1", "weight": 9},
        {"name": "my-model-v2", "weight": 1}
    ]
}
```
:::

Traffic is now splitting ~90% to v1, ~10% to v2.

### Step 3: Validate the Canary

Before ramping traffic, verify the canary is healthy. Compare P95 time-to-first-token between versions:

```promql
histogram_quantile(0.95,
  sum by (le, llm_isvc_name) (
    rate(vllm:time_to_first_token_seconds_bucket[5m])
  )
)
```

If the canary's TTFT is significantly higher, that's a signal to investigate before ramping.

:::note
This query requires a PodMonitor with `llm_isvc_name` relabeling. See [Observability for Canary Rollouts](./canary-rollout-observability.md) for setup instructions, traffic split verification queries, and more comparison metrics.
:::

### Step 4: Ramp Traffic

If the canary looks good, ramp v2's weight to get a 50/50 split. Weights are proportional - you only need to patch the version you're changing:

```bash
kubectl patch llmisvc my-model-v2 -n my-namespace --type merge \
    -p '{"spec":{"router":{"route":{"weight":9}}}}'
```

With v1 at 9 and v2 at 9, traffic splits evenly. No need to touch v1.

The controller updates HTTPRoute backendRef weights on all group members. Traffic shifts within seconds - no pod restarts.

### Step 5: Promote

When confident, promote v2 to full traffic by force-stopping v1:

```bash
kubectl annotate llmisvc my-model-v1 -n my-namespace \
    serving.kserve.io/stop=true
```

v1's pods scale to zero - GPU resources are released. All traffic flows to v2. v1 stays visible in group status with `stopped: true` and its declared weight preserved for rollback.

Check the group status:

```bash
kubectl get llmisvc my-model-v2 -n my-namespace \
    -o jsonpath='{.status.router.group}' | python3 -m json.tool
```

:::tip[Expected Output]
```json
{
    "name": "my-model",
    "members": [
        {"name": "my-model-v1", "weight": 9, "stopped": true},
        {"name": "my-model-v2", "weight": 9}
    ]
}
```
:::

### Step 6: Rollback (if needed)

At any point during the rollout, you can shift traffic back to v1. If v1 is still running, just lower v2's weight:

```bash
kubectl patch llmisvc my-model-v2 -n my-namespace --type merge \
    -p '{"spec":{"router":{"route":{"weight":1}}}}'
```

If v1 was force-stopped, remove the annotation to restart it:

```bash
kubectl annotate llmisvc my-model-v1 -n my-namespace serving.kserve.io/stop-
kubectl wait llmisvc my-model-v1 -n my-namespace --for=condition=Ready --timeout=300s
```

Once Ready, v1 rejoins weighted routing with its preserved weight.

### Step 7: Decommission

When the old version is no longer needed:

```bash
kubectl delete llmisvc my-model-v1 -n my-namespace
```

The controller removes v1's backendRef from v2's HTTPRoute and updates group status. v2 continues serving as a standalone group member.

---

## Direct Version Access

Regardless of weights, you can reach a specific running version via its per-participant path:

```bash
# Always hits v1
curl http://<gateway-address>/my-namespace/my-model-v1/v1/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"my-model","prompt":"Hello","max_tokens":5}'

# Always hits v2
curl http://<gateway-address>/my-namespace/my-model-v2/v1/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"my-model","prompt":"Hello","max_tokens":5}'
```

Direct access paths bypass weighted routing entirely. Useful for debugging, testing, or running comparison benchmarks. Force-stopped services have no HTTPRoute and are not directly reachable until restarted.

## Stable Model URL (Publisher Path)

For production clients that should not be aware of specific version names, use the publisher path:

```
/publishers/<namespace>/models/<model-name>/v1/completions
```

This URL is version-agnostic - requests route according to the current weight distribution. The model-routing addresses in `status.addresses` carry the publisher-qualified model name:

```bash
kubectl get llmisvc my-model-v1 -n my-namespace \
    -o jsonpath='{.status.addresses[?(@.name=="internal-model-routing")].url}'
```

---

## What's Next

- [Observability for Canary Rollouts](./canary-rollout-observability.md) - metrics setup and comparison queries
- [Configuration Reference](./llmisvc-configuration.md) - traffic splitting field details
- [Status Reference](./llmisvc-status.md#group-conditions-traffic-splitting) - group conditions and status structure
