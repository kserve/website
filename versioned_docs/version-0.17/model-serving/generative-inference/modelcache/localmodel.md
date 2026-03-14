---
title: Model Cache
description: Improve InferenceService startup time by caching models locally on Kubernetes nodes
---

# KServe Local Model Cache

## Overview

By caching LLM models locally, the `InferenceService` startup time can be greatly improved. For deployments with more than one replica,
the local persistent volume can serve multiple pods with the warmed up model cache.

This feature introduces the following custom resources:

- `LocalModelCache` - Specifies which model from persistent storage to cache on local storage of the Kubernetes node
- `LocalModelNodeGroup` - Manages the node group for caching the models and the local persistent storage
- `LocalModelNode` - Tracks the status of the models cached on a given local node

In this guide, we demonstrate how you can cache models using Kubernetes nodes' local disk NVMe volumes from the Hugging Face hub.

## Prerequisites

- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md)
- Administrator access to the cluster
- Nodes with NVMe storage available
- Access to [Hugging Face hub](https://huggingface.co/) (and a token if working with gated models)
- [Storage class](https://kubernetes.io/docs/concepts/storage/storage-classes/) that supports local volumes (`local-storage`)
- Sufficient disk space for model caching on nodes

## Enable Local Model Cache

By default, model caching is disabled in KServe. To enable it, you need to set the `enabled` field to `true` in the `localModel` section of the `inferenceservice-config` ConfigMap.

```bash
kubectl edit configmap inferenceservice-config -n kserve
```

```yaml title="inferenceservice-config.yaml" {3}
localModel: |-
  {
    "enabled": true,
    "jobNamespace": "kserve-localmodel-jobs",
    "defaultJobImage" : "kserve/storage-initializer:latest",
    "fsGroup": 1000,
    "localModelAgentImage": "kserve/kserve-localmodelnode-agent:latest",
    "localModelAgentCpuRequest": "100m",
    "localModelAgentMemoryRequest": "200Mi",
    "localModelAgentCpuLimit": "100m",
    "localModelAgentMemoryLimit": "300Mi"
  }
```

## Configure Local Model Download Job Namespace

Before creating the `LocalModelCache` resource to cache the models, you need to ensure credentials are configured in the download job namespace.
The download jobs are created in the configured namespace `kserve-localmodel-jobs`. In this example, we're caching models from the Hugging Face Hub, so the HF token secret should be created in advance in the same namespace
along with the storage container configurations.

### Create the HF Hub token secret

```yaml title="hf-secret.yaml"
apiVersion: v1
kind: Secret
metadata:
  name: hf-secret
  namespace: kserve-localmodel-jobs
type: Opaque
stringData:
  HF_TOKEN: xxxx # fill in the hf hub token
```

:::tip
Model download job namespace can be configured in the `inferenceservice-config` ConfigMap by editing the `jobNamespace` value in the `localModel` section.
The default namespace is `kserve-localmodel-jobs`.
:::


### Create the HF Hub cluster storage container

Create the HF Hub cluster storage container to reference the HF Hub secret:

```yaml title="hf-cluster-storage-container.yaml"
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    name: storage-initializer
    image: kserve/storage-initializer:latest
    env:
    - name: HF_TOKEN  # Option 2 for authenticating with HF_TOKEN
      valueFrom:
        secretKeyRef:
          name: hf-secret
          key: HF_TOKEN
          optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: hf://
  workloadType: localModelDownloadJob
```

## Create the LocalModelNodeGroup

Create the `LocalModelNodeGroup` using a local persistent volume with the specified local NVMe volume path:

- Set the `storageClassName` to `local-storage`
- Specify `nodeAffinity` to select which nodes to use for model caching
- Specify the local path on PV for model caching

:::warning[Critical: `local.path` must match the agent DaemonSet `hostPath`]
The `local.path` in the `persistentVolumeSpec` below specifies the **host directory** where models are stored.
This path **must match** the `hostPath` configured in the `kserve-localmodelnode-agent` DaemonSet.

- **Helm installs**: The default DaemonSet `hostPath` is `/mnt/models` (configured via the `kserve.localmodel.agent.hostPath` Helm value).
- **Kustomize installs**: The default DaemonSet `hostPath` is `/models` (hard-coded in `config/localmodelnodes/manager.yaml`).

If these paths do not match, the agent will not detect downloaded models and will repeatedly create duplicate download jobs.
You can check the current DaemonSet `hostPath` with:

```bash
kubectl get daemonset kserve-localmodelnode-agent -n kserve -o jsonpath='{.spec.template.spec.volumes[?(@.name=="models")].hostPath.path}'
```
:::

```yaml title="local-model-node-group.yaml"
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelNodeGroup
metadata:
  name: workers
spec:
  storageLimit: 1.7T
  persistentVolumeClaimSpec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 1700G
    storageClassName: local-storage
    volumeMode: Filesystem
  persistentVolumeSpec:
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    capacity:
      storage: 1700G
    local:
      path: /mnt/models  # Must match the agent DaemonSet hostPath (default: /mnt/models for Helm installs)
    storageClassName: local-storage
    nodeAffinity:
      required:
        nodeSelectorTerms:
          - matchExpressions:
              - key: nvidia.com/gpu-product
                operator: In
                values:
                  - NVIDIA-A100-SXM4-80GB
```

:::tip[Using a custom path (e.g., a fast NVMe disk)]
If your fast storage is mounted at a different host path (e.g., `/mnt/nvme/models`), you must update **both**:

1. The `local.path` in your `LocalModelNodeGroup` (shown above)
2. The DaemonSet `hostPath` -- for Helm installs, set `kserve.localmodel.agent.hostPath` in your Helm values; for Kustomize installs, edit `config/localmodelnodes/manager.yaml`

Additionally, because Kubernetes `hostPath` volumes do **not** honor `fsGroup`, you must ensure the host directory is owned by UID/GID 1000 (the user the agent and storage-initializer run as):

```bash
# On each worker node where models will be cached:
sudo chown -R 1000:1000 /mnt/nvme/models
```

Without this, the download jobs and storage-initializer will fail with permission errors.
:::

After the `LocalModelNodeGroup` is created, KServe creates an agent DaemonSet on each node (nodes matching the `nodeAffinity` specified in LocalModelNodeGroup) in the `kserve` namespace to monitor the local model cache lifecycle.

:::info[DaemonSet scheduling]
The agent DaemonSet determines **which nodes** it runs on based on its `nodeSelector` and/or `affinity` settings, which are separate from the `nodeAffinity` in the `LocalModelNodeGroup` PV spec:

- **Helm installs**: By default, `nodeSelector` is empty (`{}`), so the DaemonSet will schedule on **all nodes**. To restrict it, set `kserve.localmodel.agent.nodeSelector` or `kserve.localmodel.agent.affinity` in your Helm values.
- **Kustomize installs**: The DaemonSet has a hard-coded `nodeSelector: kserve/localmodel: worker`. You must label your target nodes explicitly:
  ```bash
  kubectl label node <node-name> kserve/localmodel=worker
  ```

The `nodeAffinity` in the `LocalModelNodeGroup` PV spec controls which nodes the **controller** creates `LocalModelNode` resources for, but the agent DaemonSet must also be running on those nodes to process them.
:::

```bash
kubectl get daemonset -n kserve kserve-localmodelnode-agent
```


:::tip[Expected Output]

```bash
NAME                           DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR        AGE
kserve-localmodelnode-agent    1         1         1       1            1           <none>               5d17h
```
:::

## Create the LocalModelCache

Create the `LocalModelCache` to specify the source model storage URI to pre-download the models to local NVMe volumes for warming up the cache:

- `sourceModelUri` - The model persistent storage location where to download the model for local cache 
- `nodeGroups` - Specify which nodes to cache the model

```yaml title="local-model-cache.yaml"
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelCache
metadata:
  name: meta-llama3-8b-instruct
spec:
  sourceModelUri: 'hf://meta-llama/meta-llama-3-8b-instruct'
  modelSize: 10Gi
  nodeGroups:
    - workers
```

After the `LocalModelCache` is created, KServe creates download jobs on each node in the group to cache the model in local storage.

```bash
kubectl get jobs meta-llama3-8b-instruct-kind-worker -n kserve-localmodel-jobs
```

:::tip[Expected Output]

```bash
NAME                                       STATUS     COMPLETIONS   DURATION   AGE
meta-llama3-8b-instruct-gptq-kind-worker   Complete   1/1           4m21s      5d17h
```
:::

The download job is created using the provisioned PV/PVC:
```bash
kubectl get pvc meta-llama3-8b-instruct -n kserve-localmodel-jobs 
```

:::tip[Expected Output]

```bash
NAME                      STATUS   VOLUME                             CAPACITY   ACCESS MODES   STORAGECLASS    VOLUMEATTRIBUTESCLASS   AGE
meta-llama3-8b-instruct   Bound    meta-llama3-8b-instruct-download   10Gi       RWO            local-storage   <unset>                 9h
```
:::

## Check the LocalModelCache Status

`LocalModelCache` shows the model download status for each node in the group:

```bash
kubectl get localmodelcache meta-llama3-8b-instruct -oyaml
```

```yaml title="LocalModelCache Status"
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelCache
metadata:
  name: meta-llama3-8b-instruct-gptq
spec:
  modelSize: 10Gi
  nodeGroup: workers
  sourceModelUri: hf://meta-llama/meta-llama-3-8b-instruct
status:
  copies:
    available: 1
    total: 1
  nodeStatus:
    kind-worker: NodeDownloaded
```

`LocalModelNode` shows the model download status of each model expected to cache on the given node:

```bash
kubectl get localmodelnode kind-worker -oyaml
```

:::tip[Expected Output]

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelNode
metadata:
  name: kind-worker
spec:
  localModels:
    - modelName: meta-llama3-8b-instruct
      sourceModelUri: hf://meta-llama/meta-llama-3-8b-instruct
status:
  modelStatus:
    meta-llama3-8b-instruct: ModelDownloaded
```
:::

## Deploy InferenceService using the LocalModelCache

Finally, you can deploy LLMs with an `InferenceService` using the local model cache if the model has been previously cached
using the `LocalModelCache` resource. The key is to match the model storage URI between your `InferenceService` and `LocalModelCache` resource.

```yaml title="inferenceservice.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3
      storageUri: hf://meta-llama/meta-llama-3-8b-instruct
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
```

You can deploy the InferenceService with:

```bash
kubectl apply -f inferenceservice.yaml
```

## Troubleshooting
If you encounter issues with the model cache or download jobs, check the following:
- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.
- Ensure the `LocalModelNodeGroup` is correctly configured and nodes are labeled as expected.
- Verify the `LocalModelCache` status to see if the model was downloaded successfully.
- Check the logs of the download job for any errors:
```bash
kubectl logs job/<job-name> -n kserve-localmodel-jobs
```
- Ensure PVCs are bound correctly and have sufficient storage capacity.
- **Duplicate download jobs**: If the download job completes but a new one keeps getting created, the `local.path` in your `LocalModelNodeGroup` likely does not match the DaemonSet's `hostPath`. The agent checks for models at its own `hostPath` mount and will keep scheduling new jobs if it cannot find the downloaded files. See the [warning above](#create-the-localmodelnodegroup) for how to verify and align these paths.
- **Permission denied errors**: If download jobs or the storage-initializer fail with permission errors (e.g., `mkdir: permission denied` or `group is not 1000`), your host directory likely has incorrect ownership. Kubernetes `hostPath` volumes do not respect `fsGroup` settings. Ensure the target directory on the host is owned by UID/GID 1000:
  ```bash
  sudo chown -R 1000:1000 /mnt/models
  ```
- **DaemonSet not running on expected nodes**: For Kustomize installs, the DaemonSet requires nodes to be labeled with `kserve/localmodel=worker`. For Helm installs, the DaemonSet runs on all nodes by default unless `kserve.localmodel.agent.nodeSelector` is configured.

## Summary

In this guide, you've learned how to:

1. Enable the Local Model Cache feature in KServe
2. Configure credentials for accessing models on Hugging Face Hub
3. Create a LocalModelNodeGroup to define where models will be cached
4. Create a LocalModelCache to specify which models to download and cache locally
5. Check the status of cached models
6. Deploy an InferenceService that uses the locally cached model

This approach significantly improves startup time for `InferenceService` by having models pre-downloaded and cached on local node storage, especially beneficial for large language models where download times can be substantial.
