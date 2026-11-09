---
title: Kernel Cache Node Groups
description: Select nodes for Kernel Cache preparation and consumption
---

# Node groups

`KernelCacheNodeGroup` defines the nodes on which a cache artifact is prepared. It is a cluster-scoped resource, so its name can be referenced by namespaced `KernelCache` resources.

## Minimal configuration

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheNodeGroup
metadata:
  name: gpu-workers
spec:
  nodeSelector:
    accelerator: nvidia
```

`spec.nodeSelector` is required and must contain at least one label. A node belongs to the group only when it has every listed label.

## Tolerations

Tolerations are applied to the Kernel Cache node agent and controller-managed workloads that run on selected nodes, such as node-local preparation jobs.

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheNodeGroup
metadata:
  name: tainted-gpu-workers
spec:
  nodeSelector:
    accelerator: nvidia
    pool: kernel-cache
  tolerations:
    - key: dedicated
      operator: Equal
      value: kernel-cache
      effect: NoSchedule
```

Tolerations do not add a node to a group. The node must still satisfy the selector.

## Node membership and `KernelCacheNode`

The controller watches node labels and maintains a `KernelCacheNode` for matching nodes. Use these commands to inspect membership:

```bash
kubectl get kernelcachenodegroups
kubectl get nodes -l accelerator=nvidia --show-labels
kubectl get kernelcachenodes -o wide
kubectl get kernelcachenode <node-name> -o yaml
```

`KernelCacheNode.status.cacheStatus` contains the node-local state for the caches prepared on that node. A cache is considered ready for admission only when the node-local entry is ready and its artifact identity matches the requested workload.

## Node group selection for a captured cache

When a completed capture is converted into a `KernelCache`, the controller selects a node group using this order:

1. A node group explicitly requested by the producer workload with the `serving.kserve.io/kernelcache-nodegroup` annotation.
2. The single node group whose selector matches the producer node.
3. The `kernelcache.defaultNodeGroup` configuration value.

If multiple groups match a producer node, the selection is ambiguous and the producer must request a group. If no group matches and no default group is configured, the controller cannot create the cache.

The annotation is copied to the active capture session from the producer Pod. Inspect the generated workload Pod and controller events when troubleshooting node group selection.

## OCI delivery

`KernelCacheNodeGroup` selects nodes and configures tolerations. Cache delivery is controlled by `KernelCache.spec.mountType`, which currently accepts only `oci`. The artifact itself is an immutable OCI image reference with a digest. Node-local preparation uses the OCI artifact and records the result in `KernelCacheNode`.

## Multiple node groups

Use distinct selectors for separate node pools. For example:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheNodeGroup
metadata:
  name: h100-workers
spec:
  nodeSelector:
    accelerator: nvidia-h100
---
apiVersion: serving.kserve.io/v1alpha1
kind: KernelCacheNodeGroup
metadata:
  name: a100-workers
spec:
  nodeSelector:
    accelerator: nvidia-a100
```

Avoid overlapping selectors unless the workload explicitly selects the intended group. Overlapping groups can produce an `AmbiguousNodeGroup` event when the controller chooses a group for a captured artifact.

## Operational checklist

- Confirm the selector labels are present on the intended nodes.
- Confirm taints are covered by `spec.tolerations`.
- Check that `KernelCacheNode` objects exist for the matching nodes.
- Check the Kernel Cache node agent DaemonSet when node-local state is not being reported.
- Check `KernelCacheNode.status.cacheStatus` before debugging the admission webhook.
- Check registry pull permissions for node preparation jobs.
- Use the `KernelCache` status and conditions for aggregate preparation state.
