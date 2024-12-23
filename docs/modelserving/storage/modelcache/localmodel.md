# KServe Local Model Cache

By caching LLM models locally, the `InferenceService` startup time is improved. For deployments with more than one replica,
the persistent volume can serve multiple pods with the warmed up model cache.

- `LocalModelCache` is a KServe custom resource to manage local model cache on Kubernetes clusters. 
- `LocalModelNodeGroup` is a KServe custom resource to manage the node group for caching the models and the persistent storage class.
- `LocalModelNode` is a KServe custom resource to track the status of the models cached on the local node.

In this example, we demonstrate how you can cache the models using Kubernetes nodes' local disk NVMe volumes from remote
S3 or model registry.

## Create the LocalModelNodeGroup

Create the `LocalModelNodeGroup` using the local persistent volume with specified local NVMe volume path.
```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelNodeGroup
metadata:
  name: a100
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
    volumeName: a100
  persistentVolumeSpec:
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    capacity:
      storage: 1700G
    local:
      path: /mnt/models
    nodeAffinity:
       required:
         nodeSelectorTerms:
           - key: nvidia.com/gpu-product
             values:
               - NVIDIA-A100-SXM4-80GB
```

## Create the LocalModelCache

Create the `LocalModelCache` to specify the source model storage URI to pre-download the models to local NVMe volumes for warming up the cache local to the `InferenceService` pods.
```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelCache
metadata:
  name: meta-llama3-8b-instruct
spec:
  sourceModelUri: hf://meta-llama/meta-llama-3-8b-instruct
  modelSize: 10Gi
  nodeGroup: a100
```

After `LocalModelCache` is created, KServe creates the download jobs on each node in the group to cache the model locally in the configured namespace.
```bash
kubectl get jobs meta-llama3-8b-instruct-kind-worker  -n kserve-localmodel-jobs
NAME                                       STATUS     COMPLETIONS   DURATION   AGE
meta-llama3-8b-instruct-gptq-kind-worker   Complete   1/1           4m21s      5d17h
```

The download job is created using the provisioned PV/PVC.
```bash
kubectl get pvc meta-llama3-8b-instruct  -n kserve-localmodel-jobs 
NAME                      STATUS   VOLUME                             CAPACITY   ACCESS MODES   STORAGECLASS    VOLUMEATTRIBUTESCLASS   AGE
meta-llama3-8b-instruct   Bound    meta-llama3-8b-instruct-download   10Gi       RWO            local-storage   <unset>                 9h
```

## Check the LocalModelCache Status
```bash
kubectl get localmodelcache meta-llama3-8b-instruct -oyaml
```
`LocalModelCache` shows the model download status for each node in the group.
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

`LocalModelNode` shows the model download status for each model expected to cache on the given node.
```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LocalModelNode
metadata:
  creationTimestamp: "2024-12-02T03:19:56Z"
  generation: 6
  name: kind-worker
spec:
  localModels:
    - modelName: meta-llama3-8b-instruct
      sourceModelUri: hf://meta-llama/meta-llama-3-8b-instruct
status:
  modelStatus:
    meta-llama3-8b-instruct: ModelDownloaded
```

## Deploy InferenceService to use the LocalModelCache

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-llama3
      annotations:
        serving.kserve.io/nodegroup: a100
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
            - --model_name=llama3
            - --model_id=meta-llama/meta-llama-3-8b-instruct
          env:
            - name: HF_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-secret
                  key: HF_TOKEN
                  optional: false
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