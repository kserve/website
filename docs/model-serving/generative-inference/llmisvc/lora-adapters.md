---
sidebar_label: "LoRA Adapters"
sidebar_position: 2
title: "LoRA Adapters for LLMInferenceService"
---

# LoRA Adapters for LLMInferenceService

## Overview

**LoRA (Low-Rank Adaptation)** is a parameter-efficient fine-tuning technique that allows you to adapt large language models to specific tasks without modifying the base model weights. LLMInferenceService provides native support for serving multiple LoRA adapters alongside a base model, enabling efficient multi-tenant deployments and task-specific model specialization.

### Why Use LoRA Adapters?

- **Storage Efficiency**: Share a single base model across multiple task-specific adaptations (typically 50-500MB per adapter vs 10-100GB for full models)
- **Multi-Tenancy**: Serve multiple specialized versions of the same model from a single deployment
- **Fast Iteration**: Update task-specific adapters without redeploying the base model
- **Cost Optimization**: Reduce GPU memory and storage costs compared to deploying multiple full models

:::tip
LoRA adapters are loaded at service startup and vLLM can switch between them dynamically per request with minimal overhead (~1-5ms).
:::

---

## Prerequisites

Before configuring LoRA adapters, ensure:

- **vLLM Runtime**: LoRA support requires vLLM (default runtime for LLMInferenceService)
- **Storage Initializer**: Enabled for `hf://` and `s3://` adapters (enabled by default)
- **Base Model Compatibility**: Your base model must be trained with the same architecture as the adapters
- **Kubernetes Resources**: Sufficient GPU memory to load base model + all adapters

> **Note**: Each adapter typically requires 50-500MB of GPU memory depending on rank and model size.

---

## Configuration

### Basic LoRA Configuration

Add LoRA adapters to your LLMInferenceService using the `spec.model.lora.adapters` field:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llm-service
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
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `spec.model.lora.adapters` | array | No | List of LoRA adapters to attach to the base model |
| `spec.model.lora.adapters[].name` | string | Yes | Unique adapter name used for inference requests |
| `spec.model.lora.adapters[].uri` | string | Yes | Adapter source URI (must use `hf://`, `s3://`, or `pvc://` scheme) |

### Constraints

- Adapter names must be unique within a service
- Adapter names must differ from the base model name
- Adapter names are case-sensitive
- All adapters are loaded at startup (no dynamic loading)

---

## Supported URI Schemes

### HuggingFace Hub (`hf://`)

Download adapters directly from HuggingFace Hub.

**Format**: `hf://organization/repository` or `hf://organization/repository/subdirectory`

```yaml
lora:
  adapters:
    - name: my-adapter
      uri: hf://edbeeching/opt-125m-lora
```

**Authentication** (for private repositories):

```yaml
template:
  containers:
    - name: storage-initializer
      env:
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: huggingface-secret
              key: token
```

:::note
HuggingFace adapters require the storage-initializer to be enabled (default behavior).
:::

---

### S3-Compatible Storage (`s3://`)

Use adapters from S3, MinIO, Ceph, or any S3-compatible object storage.

**Format**: `s3://bucket-name/path/to/adapter`

```yaml
lora:
  adapters:
    - name: my-adapter
      uri: s3://my-bucket/adapters/domain-lora
```

**S3 Configuration with Credentials**:

```yaml
template:
  containers:
    - name: storage-initializer
      env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: s3-config
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: s3-config
              key: AWS_SECRET_ACCESS_KEY
        - name: S3_ENDPOINT
          value: "https://minio.example.com"
        - name: S3_USE_HTTPS
          value: "1"
```

**Supported S3-Compatible Providers**:
- AWS S3
- MinIO
- Ceph Object Gateway
- Google Cloud Storage (S3 compatibility mode)
- Azure Blob Storage (S3 compatibility mode)

---

### PersistentVolumeClaim (`pvc://`)

Use pre-downloaded adapters from a Kubernetes PVC for fastest startup or air-gapped environments.

**Format**: `pvc://pvc-name/path/within/pvc`

```yaml
lora:
  adapters:
    - name: my-adapter
      uri: pvc://adapter-pvc/domain-lora
```

**PVC Requirements**:
- PVC must exist in the same namespace
- Access mode: `ReadOnlyMany` or `ReadWriteMany` (for multiple replicas)
- Contains adapter files in safetensors or PyTorch format

**Example PVC Setup**:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: adapter-pvc
spec:
  accessModes:
    - ReadOnlyMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: nfs-storage
```

:::tip
PVC adapters provide the fastest service startup time since no download phase is required. This is ideal for production deployments and air-gapped environments.
:::

---

## Complete Examples

### Example 1: Single HuggingFace Adapter

Simple deployment with one public adapter for SQL code generation:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: qwen-sql
spec:
  model:
    uri: hf://Qwen/Qwen2.5-7B-Instruct
    name: Qwen/Qwen2.5-7B-Instruct
    lora:
      adapters:
        - name: sql-adapter
          uri: hf://my-org/qwen-sql-lora

  replicas: 2

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi
```

---

### Example 2: Multiple Adapters from Different Sources

Multi-tenant deployment serving adapters for different tasks:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: qwen-multi-tenant
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

  replicas: 3

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi
      - name: storage-initializer
        env:
          - name: AWS_ACCESS_KEY_ID
            valueFrom:
              secretKeyRef:
                name: s3-config
                key: AWS_ACCESS_KEY_ID
          - name: AWS_SECRET_ACCESS_KEY
            valueFrom:
              secretKeyRef:
                name: s3-config
                key: AWS_SECRET_ACCESS_KEY
```

---

## Usage at Inference Time

### OpenAI-Compatible API

Once deployed, select adapters by specifying the adapter name in the `model` parameter:

**Using an Adapter**:

```bash
curl -k https://<service-url>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sql-adapter",
    "messages": [
      {"role": "user", "content": "Generate SQL to find all active users"}
    ]
  }'
```

**Using the Base Model** (no adapter):

```bash
curl -k https://<service-url>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [
      {"role": "user", "content": "What is Kubernetes?"}
    ]
  }'
```

:::tip
vLLM automatically switches between adapters per request with minimal latency overhead. No service restart is required to switch adapters.
:::

---

## How It Works

### Automatic Integration

When you configure LoRA adapters, the LLMInferenceService controller automatically:

1. **Download Phase** (`hf://` and `s3://` adapters):
   - Injects storage-initializer as an init container
   - Downloads all adapters in parallel
   - Mounts adapters to `/mnt/lora/<adapter-name>`

2. **Mount Phase** (`pvc://` adapters):
   - Creates volume mounts for each PVC adapter
   - Mounts to `/mnt/lora/<adapter-name>` (read-only)
   - No download required

3. **vLLM Configuration**:
   - Automatically adds `--enable-lora` flag
   - Sets `--max-lora-rank=64` (configurable)
   - Sets `--max-loras=<adapter-count>`
   - Adds `--lora-modules <name>=<path> <name2>=<path2> ...`

### Path Sanitization

Adapter names are sanitized for filesystem compatibility:
- Invalid characters (`/`, `:`, etc.) are replaced with `-`
- Example: `my/adapter:v1` becomes `my-adapter-v1`

### Resource Considerations

**GPU Memory Usage**:
- Each adapter typically requires 50-500MB GPU memory (rank=64)
- Formula: `adapter_memory ≈ rank × num_layers × hidden_dim × 2 × sizeof(fp16)`
- All adapters are loaded simultaneously into GPU memory

**Download Time**:
- Depends on adapter size and network bandwidth
- HuggingFace: typically 10-60 seconds per adapter
- S3: depends on endpoint proximity and bandwidth
- PVC: no download time (instant)

---

## Advanced Configuration

### Custom vLLM Arguments

Override the default `--max-lora-rank` if your adapters use a different rank:

```yaml
template:
  containers:
    - name: main
      env:
        - name: VLLM_ADDITIONAL_ARGS
          value: "--max-lora-rank=128"
```

### Manual LoRA Configuration

If you need full control, you can disable automatic configuration by including `--lora-modules` in your container args:

```yaml
template:
  containers:
    - name: main
      args:
        - "--model"
        - "/mnt/models"
        - "--enable-lora"
        - "--lora-modules"
        - "my-adapter=/custom/path"
```

:::warning
When you manually specify `--lora-modules`, the controller skips automatic LoRA configuration. You are responsible for ensuring adapters are downloaded and paths are correct.
:::

---

## Monitoring and Troubleshooting

### Verification

Check that adapters loaded successfully by viewing pod logs:

```bash
kubectl logs <pod-name> -c storage-initializer
# Look for: "Successfully downloaded adapter to /mnt/lora/<name>"

kubectl logs <pod-name> -c main
# Look for: "Loading LoRA adapters" and adapter names
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Download failure** | Invalid HF/S3 credentials | Verify `HF_TOKEN` or S3 credentials in environment variables |
| **PVC mount failure** | PVC doesn't exist or wrong namespace | Ensure PVC exists in same namespace as LLMInferenceService |
| **Adapter not found at inference** | Adapter name mismatch | Use exact adapter name from `spec.model.lora.adapters[].name` in `model` parameter |
| **OOM errors** | Too many adapters or insufficient GPU memory | Reduce number of adapters or increase GPU memory allocation |
| **Adapter name conflict** | Duplicate adapter names | Ensure all adapter names are unique |

### Storage Initializer Dependency

:::warning
If you disable the storage-initializer (`storageInitializer.enabled: false`), `hf://` and `s3://` adapters will fail to download. Only `pvc://` adapters will work.
:::

---

## Limitations

### Unsupported URI Schemes

**OCI Registries (`oci://`)**: Currently not supported for LoRA adapters.

**Workaround**: Download the adapter to a PVC manually and use `pvc://` scheme:

```yaml
# Pre-download job
apiVersion: batch/v1
kind: Job
metadata:
  name: download-adapter
spec:
  template:
    spec:
      containers:
        - name: downloader
          image: python:3.11
          command: ["sh", "-c"]
          args:
            - |
              pip install huggingface-hub
              python -c "from huggingface_hub import snapshot_download; snapshot_download('my-org/my-lora', local_dir='/mnt/adapter')"
          volumeMounts:
            - name: adapter-storage
              mountPath: /mnt/adapter
      volumes:
        - name: adapter-storage
          persistentVolumeClaim:
            claimName: adapter-pvc
      restartPolicy: Never
```

---

## Related Documentation

- **[Configuration Guide](./llmisvc-configuration.md)**: Detailed spec reference for LLMInferenceService
- **[Model Storage](../../storage/overview.md)**: Supported storage backends for base models
- **[Dependencies](./llmisvc-dependencies.md)**: Required infrastructure components

---

## Summary

LoRA adapters in LLMInferenceService provide:

- ✅ **Three URI schemes**: HuggingFace Hub, S3-compatible storage, and PVC
- ✅ **Automatic integration**: Controller handles downloads, mounts, and vLLM configuration
- ✅ **Dynamic switching**: Per-request adapter selection with minimal overhead
- ✅ **Multi-tenancy**: Serve multiple task-specific models from a single deployment
- ✅ **Production-ready**: Support for private repositories, custom endpoints, and air-gapped deployments

For complete working examples, see the [KServe samples repository](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/lora-adapters).
