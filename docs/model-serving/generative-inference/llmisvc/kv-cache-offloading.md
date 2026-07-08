---
title: KV Cache Offloading
description: Configure GPU-to-CPU and CPU-to-disk KV cache offloading for LLMInferenceService
---

# KV Cache Offloading

KV cache offloading extends GPU memory by cascading evicted KV cache blocks to
cheaper tiers: **GPU → CPU RAM → disk**. This allows serving longer contexts or
more concurrent requests without increasing GPU count.

vLLM's `OffloadingConnector` manages the cascade automatically. When GPU KV
cache is full, blocks are evicted to CPU RAM; when CPU RAM is full, they spill
to disk. On a cache hit, blocks are promoted back up the chain.

## Prerequisites

- `LLMInferenceService` with a vLLM-compatible model
- For `pvc.spec` / `pvc.ref` disk tiers: a StorageClass or pre-existing PVC available in the namespace

## Configuration

KV cache offloading is configured under `spec.workload.kvCacheOffloading`:

```yaml
spec:
  workload:
    kvCacheOffloading:
      cpu: "10Gi"           # CPU RAM tier size
      evictionPolicy: lru   # eviction policy (lru)
      secondary:            # optional disk tiers
        - fileSystem:
            emptyDir:
              size: "100Gi"
```

### Fields

| Field | Type | Description |
|---|---|---|
| `cpu` | quantity | Size of the CPU RAM tier. Required to enable offloading. |
| `evictionPolicy` | string | Eviction policy. Currently only `lru` is supported. |
| `secondary` | list | Ordered list of disk tiers. Consulted in order after the CPU tier is full. |

## Disk tiers

Each entry in `secondary` must have a `fileSystem` key with exactly one of
`emptyDir`, `pvc.spec`, or `pvc.ref`.

Mount paths are assigned automatically as `/mnt/kv-cache-0`, `/mnt/kv-cache-1`,
etc. based on position in the list.

### emptyDir

Node-local ephemeral disk. No StorageClass or PVC required. The cache exists
only for the lifetime of the pod.

The controller automatically adds an `ephemeral-storage` resource request equal
to `size` so the scheduler only places the pod on a node with sufficient local
disk.

```yaml
secondary:
  - fileSystem:
      emptyDir:
        size: "100Gi"
```

### pvc.spec — controller-managed ephemeral PVC

The controller creates one ephemeral PVC per pod using the provided spec. The
PVC is deleted automatically when the pod terminates. Useful when you need a
dedicated StorageClass (e.g., NVMe-backed local volumes) without managing PVCs
yourself.

```yaml
secondary:
  - fileSystem:
      pvc:
        spec:
          storageClassName: fast-local-nvme
          resources:
            requests:
              storage: 100Gi
```

`pvc.spec` accepts any field from [`PersistentVolumeClaimSpec`](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/#PersistentVolumeClaimSpec).

### pvc.ref — pre-existing PVC

References a PVC you have already provisioned. The PVC must exist before the
`LLMInferenceService` is created. Use this when you need the cache to survive
pod restarts, or when sharing a cache across replicas with an RWX PVC.

```yaml
secondary:
  - fileSystem:
      pvc:
        ref:
          name: my-kv-cache-pvc   # PVC must already exist
          path: kv-cache/          # optional subdirectory within the PVC
```

## Choosing a disk tier

| Situation | Recommended tier |
|---|---|
| Single replica, cache loss on restart is acceptable | `emptyDir` |
| Dedicated StorageClass (e.g., local NVMe) without managing PVCs | `pvc.spec` |
| Cache must survive pod restarts | `pvc.ref` with a per-pod PVC |
| Multi-replica deployment sharing a cache | `pvc.ref` with an RWX PVC (e.g., CephFS) |

## Mixing tiers

Multiple entries in `secondary` are allowed. vLLM consults them in order after
the CPU tier is full. You can mix backends freely:

```yaml
secondary:
  - fileSystem:
      pvc:
        ref:
          name: shared-cephfs-pvc   # tier 0: shared across replicas
  - fileSystem:
      emptyDir:
        size: "200Gi"               # tier 1: fast node-local spill
```

## Full example

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: qwen2-7b-kv-cache-offloading
spec:
  model:
    uri: hf://Qwen/Qwen2.5-7B-Instruct
    name: Qwen/Qwen2.5-7B-Instruct
  router:
    scheduler: {}
    route: {}
    gateway: {}
  template:
    containers:
      - name: main
        resources:
          limits:
            cpu: '8'
            memory: 64Gi
            nvidia.com/gpu: "1"
          requests:
            cpu: '4'
            memory: 32Gi
            nvidia.com/gpu: "1"
  workload:
    kvCacheOffloading:
      cpu: "10Gi"
      evictionPolicy: lru
      secondary:
        - fileSystem:
            emptyDir:
              size: "100Gi"
```

Apply the manifest:

```sh
kubectl apply -f llm-inference-service-kv-cache-offloading.yaml
```

Verify the service is ready:

```sh
kubectl get llminferenceservice qwen2-7b-kv-cache-offloading
```

:::tip[Expected Output]

```
NAME                           READY   URL
qwen2-7b-kv-cache-offloading  True    http://qwen2-7b-kv-cache-offloading.default.example.com
```

:::
