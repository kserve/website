---
title: KV Cache Offloading with the LMCache Operator
description: Learn how to set up KV cache offloading using the LMCache Kubernetes Operator in KServe
---

# KV Cache Offloading with the LMCache Operator

See [KV Cache Offloading](./kvcache-offloading.md) for background on what KV cache offloading is and why it's useful, or the [Manual Setup](./kvcache-offloading-manual.md) page if you only need to wire up a single `InferenceService` by hand.

This page covers setting up [LMCache](https://docs.lmcache.ai/) KV cache offloading using the **LMCache Kubernetes Operator** — a CRD-based, cluster-level way to run and manage LMCache that's independent of any single `InferenceService`.

## How it works

- Install a cluster-level **LMCache Operator**, which manages LMCache servers via a `LMCacheEngine` custom resource.
- Create an `LMCacheEngine`, which runs as a DaemonSet — one cache server per matching node.
- Label and annotate your `InferenceService`'s predictor — a mutating admission webhook injects the connector config into the pod automatically.

## Prerequisites

- Kubernetes 1.20+
- `kubectl` configured to access your cluster
- [KServe](../../../getting-started/quickstart-guide.md) installed
- [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html) on NVIDIA clusters (default). Classic installs register RuntimeClass `nvidia`. CDI+NRI installs often have no RuntimeClass objects — see [LMCache Operator Prerequisites](https://docs.lmcache.ai/mp/operator.html#prerequisites) for the CDI+NRI alternative.
- [cert-manager](https://cert-manager.io/) installed — provisions the TLS certificate the LMCache Operator's mutating webhook needs.

## 1. Install the LMCache Operator

```sh
kubectl apply -f https://github.com/LMCache/LMCache/releases/download/operator-latest/install.yaml
```

This installs the `LMCacheEngine`, `CacheBlendEngine`, and `LMCacheCoordinator` CRDs, the operator's controller manager, and its mutating webhook. See the [LMCache Operator docs](https://docs.lmcache.ai/mp/operator.html) for the full list of what gets created and how to verify it.

:::tip[Expected Output]

```sh
kubectl get pods -n lmcache-operator-system
```

```sh
NAME                                                   READY   STATUS    RESTARTS   AGE
lmcache-operator-controller-manager-5f8c96c846-f7t6w   1/1     Running   0          1m
```

:::

## 2. Create an LMCacheEngine

```yaml title="lmcache-engine.yaml"
apiVersion: lmcache.lmcache.ai/v1alpha1
kind: LMCacheEngine
metadata:
  name: lmcache-engine
  # Must be the same namespace as the InferenceServices that will use it.
  namespace: default
spec:
  l1:
    sizeGB: 10 # Host RAM budget for the L1 cache; size for your workload.
```

```sh
kubectl apply -f lmcache-engine.yaml
```

`LMCacheEngine` runs as a DaemonSet — one cache server per matching node. `spec.l1.sizeGB` is the only required field; see [`kubectl explain lmcacheengine.spec`](https://docs.lmcache.ai/mp/operator.html) for the rest, including `nodeSelector`/`tolerations` and `resourceOverrides`.

For persistent or shared storage beyond host RAM, see `spec.l2Backend` in the [LMCache Operator docs](https://docs.lmcache.ai/mp/operator.html) (Redis/Valkey, S3, and others).

:::tip[Expected Output]

```sh
kubectl get lmcacheengine lmcache-engine
```

```sh
NAME             PHASE     READY   DESIRED   AGE
lmcache-engine   Running   1       1         1m49s
```

:::

## 3. Connect a vLLM-backed InferenceService

The Operator's mutating webhook injects the LMCache connector configuration into any pod carrying **both**:

- the label `lmcache.ai/lmcache-inject: "true"`
- the annotation `lmcache.ai/lmcache-engine: "<engine-name>"`

`InferenceService`'s `spec.predictor.labels`/`spec.predictor.annotations` propagate to the predictor pod template:

```yaml title="lmcache_operator_isvc.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-qwen
spec:
  predictor:
    labels:
      lmcache.ai/lmcache-inject: "true"
    annotations:
      lmcache.ai/lmcache-engine: "lmcache-engine"
    minReplicas: 1
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
        - --model_id=Qwen/Qwen2.5-0.5B-Instruct
      resources:
        limits:
          cpu: "2"
          memory: 8Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "2"
          memory: 8Gi
          nvidia.com/gpu: "1"
```

```sh
kubectl apply -f lmcache_operator_isvc.yaml
```

:::tip[Expected Output]
```sh
kubectl get isvc huggingface-qwen
```

```sh
NAME               URL                                             READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                AGE
huggingface-qwen   http://huggingface-qwen.default.example.com     True           100                              huggingface-qwen-predictor-00001   2m
```

:::

The webhook injects `--kv-transfer-config`, `PYTHONHASHSEED=0`, and a shared-memory volume mount at pod creation — you don't set these yourself.

## 4. Verify

Confirm the webhook mutated the pod — its args should now include `--kv-transfer-config`:

:::tip[Expected Output]
```sh
kubectl get pod <predictor-pod> -o jsonpath='{.spec.containers[?(@.name=="kserve-container")].args}'
```

```sh
["--model_name=qwen","--model_id=Qwen/Qwen2.5-0.5B-Instruct","--backend=vllm","--enable_grpc=false","--kv-transfer-config","{\n  \"kv_connector\": \"LMCacheMPConnector\",\n  \"kv_connector_extra_config\": {\n    \"lmcache.mp.host\": \"tcp://lmcache-engine.default.svc.cluster.local\",\n    \"lmcache.mp.isolated_ipc\": true,\n    \"lmcache.mp.port\": \"5555\"\n  },\n  \"kv_connector_module_path\": \"lmcache.integration.vllm.lmcache_mp_connector\",\n  \"kv_role\": \"kv_both\"\n}"]%
```

Then send the same prompt twice and check vLLM's stats log, same as the [manual setup's verification step](./kvcache-offloading-manual.md#verify-the-setup-with-an-inference-request):

```sh
kubectl logs <predictor-pod> -c kserve-container | grep "External prefix cache hit rate"
```

A nonzero `External prefix cache hit rate` confirms LMCache served the cache instead of vLLM recomputing it.

## Troubleshooting & Tips

- **`LMCacheEngine` must be in the same namespace as the `InferenceService`.** The webhook only looks for the engine's connection ConfigMap in the pod's own namespace — no cross-namespace lookup exists. If the engine isn't found, injection is skipped silently: check for `lmcache.ai/lmcache-skip-reason` on the pod and the operator's logs (`kubectl logs -n lmcache-operator-system deploy/lmcache-operator-controller-manager`).
- **Short prompts never engage the cache.** LMCache only operates on whole `chunk_size`-token chunks (default 256) — shorter prompts never touch the cache.
- **Webhook doing nothing?** Check `failurePolicy: Ignore` on the `MutatingWebhookConfiguration` — if the API server can't reach the webhook (e.g. pod overlay IPs aren't routable from the control plane), it skips mutation silently instead of erroring. `hostNetwork: true` on the operator deployment is one fix.
- **`LMCacheEngine`'s DaemonSet stuck at `DESIRED=0` with no explanation.** The CR's own `status.conditions` won't surface this — check `kubectl get daemonset -A | grep <engine-name>`. If `DESIRED` is `0` despite a node matching your `nodeSelector`, the node is likely tainted (dedicated GPU nodegroups commonly carry `nvidia.com/gpu=true:NoSchedule`) and the generated pod has no matching toleration. Check `kubectl describe node <node> | grep -A3 Taints` and add a matching entry under `spec.tolerations` on the `LMCacheEngine`.
- See also the [LMCache Troubleshoot Guide](https://docs.lmcache.ai/getting_started/troubleshoot.html) and [FAQ](https://docs.lmcache.ai/getting_started/faq.html).

## Next Steps

- [LMCache Operator reference](https://docs.lmcache.ai/mp/operator.html) — full `LMCacheEngine`/`CacheBlendEngine`/`LMCacheCoordinator` field reference.
- `LMCacheCoordinator` — needed if you run multiple `InferenceService` replicas across different nodes and want them to share a cache instead of maintaining independent per-node caches.
- [CacheBlendEngine](https://docs.lmcache.ai/mp/operator.html) — a different cache-reuse mechanism better suited to RAG/multi-branch workloads with poor prefix locality than straight prefix caching.
