# KServe Local Model Cache

By caching LLM models locally, the `InferenceService` startup time can be greatly improved. For deployments with more than one replica,
the local persistent volume can serve multiple pods with the warmed up model cache.

- `LocalModelCache` is a KServe custom resource to specify which model from persistent storage to cache on local storage of the Kubernetes node. 
- `LocalModelNodeGroup` is a KServe custom resource to manage the node group for caching the models and the local persistent storage.
- `LocalModelNode` is a KServe custom resource to track the status of the models cached on given local node.

In this example, we demonstrate how you can cache the models using Kubernetes nodes' local disk NVMe volumes from HF hub.

## Enable Local Model Cache
By default, the model caching is disabled in KServe. To enable it, you need to set the `enabled` field to `true` in the `localModel` section of `inferenceservice-config` ConfigMap.

```bash
kubectl edit configmap inferenceservice-config -n kserve
```

```yaml hl_lines="3"
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
Before creating the `LocalModelCache` resource to cache the models, you need to make sure the credentials are configured in the download job namespace.
The download jobs are created in the configured namespace `kserve-localmodel-jobs`. In this example we are caching the models from HF hub, so the HF token secret should be created pre-hand in the same namespace
along with the storage container configurations.

Create the HF Hub token secret.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hf-secret
  namespace: kserve-localmodel-jobs
type: Opaque
stringData:
  HF_TOKEN: xxxx # fill in the hf hub token
```

!!! Tip
    Model download job namespace can be configured in the `inferenceservice-config` ConfigMap by editing the `jobNamespace` value in the `localModel` section.
    The default namespace is `kserve-localmodel-jobs`.


Create the HF Hub cluster storage container to refer to the HF Hub secret.

```yaml
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
        memory: 100Mi
        cpu: 100m
      limits:
        memory: 1Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: hf://
  workloadType: localModelDownloadJob
```

## Create the LocalModelNodeGroup

Create the `LocalModelNodeGroup` using the local persistent volume with specified local NVMe volume path.

- The `storageClassName` should be set to `local-storage`.
- The `nodeAffinity` should be specified which nodes to cache the model using node selector.
- Local path should be specified on PV as the local storage to cache the models.

```yaml
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
    volumeName: models
  persistentVolumeSpec:
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    capacity:
      storage: 1700G
    local:
      path: /models
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

After the `LocalModelNodeGroup` is created, KServe creates an agent DaemonSet on each node (nodes matching the `nodeAffinity` specified in LocalModelNodeGroup) in the `kserve` namespace to monitor the local model cache lifecycle.

```bash
kubectl get daemonset -n kserve workers-agent
```

!!! success Expected Output
    ```bash
    NAME            DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR        AGE
    workers-agent   1         1         1       1            1           <none>               5d17h
    ```

## Create the LocalModelCache

Create the `LocalModelCache` to specify the source model storage URI to pre-download the models to local NVMe volumes for warming up the cache.

- `sourceModelUri` is the model persistent storage location where to download the model for local cache. 
- `nodeGroups` is specified to indicate which nodes to cache the model.


```yaml
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

After `LocalModelCache` is created, KServe creates the download jobs on each node in the group to cache the model in local storage.

```bash
kubectl get jobs meta-llama3-8b-instruct-kind-worker  -n kserve-localmodel-jobs
```

!!! success Expected Output
    ```bash
       NAME                                       STATUS     COMPLETIONS   DURATION   AGE
       meta-llama3-8b-instruct-gptq-kind-worker   Complete   1/1           4m21s      5d17h
    ```

The download job is created using the provisioned PV/PVC.
```bash
kubectl get pvc meta-llama3-8b-instruct  -n kserve-localmodel-jobs 
```

!!! success Expected Output
    ```
    NAME                      STATUS   VOLUME                             CAPACITY   ACCESS MODES   STORAGECLASS    VOLUMEATTRIBUTESCLASS   AGE
    meta-llama3-8b-instruct   Bound    meta-llama3-8b-instruct-download   10Gi       RWO            local-storage   <unset>                 9h
    ```

## Check the LocalModelCache Status

`LocalModelCache` shows the model download status for each node in the group.

```bash
kubectl get localmodelcache meta-llama3-8b-instruct -oyaml
```
```yaml
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

`LocalModelNode` shows the model download status of each model expected to cache on the given node.

```bash
kubectl get localmodelnode kind-worker -oyaml
```
!!! success Expected Output
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

## Deploy InferenceService using the LocalModelCache

Finally you can deploy the LLMs with `InferenceService` using the local model cache if the model has been previously cached
using the `LocalModelCache` resource by matching the model storage URI.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
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
    EOF
    ```
