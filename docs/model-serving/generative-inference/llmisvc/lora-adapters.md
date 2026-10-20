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

- **vLLM Runtime**: LoRA support requires vLLM (default runtime for LLMInferenceService). See the [vLLM LoRA documentation](https://docs.vllm.ai/en/latest/features/lora.html) for details.
- **Storage Initializer**: Enabled for `hf://` and `s3://` adapters (enabled by default)
- **Base Model Compatibility**: Your base model must be trained with the same architecture as the adapters
- **Kubernetes Resources**: Sufficient GPU memory to load base model + all adapters

> **Note**: Each adapter typically requires 50-500MB of GPU memory depending on rank and model size. As a rule of thumb, keep total adapter memory to roughly 1% of the model's GPU memory footprint to avoid impacting base model performance.

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
| `spec.model.lora.maxRank` | integer | No | Maximum LoRA rank supported by the runtime (maps to vLLM `--max-lora-rank`). If not set, vLLM's default applies (16). |
| `spec.model.lora.maxAdapters` | integer | No | Maximum number of LoRA adapters in GPU memory simultaneously (maps to vLLM `--max-loras`). If not set, vLLM's default applies (1). |
| `spec.model.lora.maxCpuAdapters` | integer | No | Maximum number of LoRA adapters cached in CPU memory (maps to vLLM `--max-cpu-loras`). If not set, vLLM defaults this to `maxAdapters`. |

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

The controller injects credentials into the storage-initializer via the Kubernetes service account.
Create a secret with an `HF_TOKEN` key and attach it to the service account used by the
LLMInferenceService (defaults to `default`):

```bash
kubectl create secret generic hf-token \
  --from-literal=HF_TOKEN=<your-huggingface-token>

kubectl patch serviceaccount default \
  -p '{"secrets": [{"name": "hf-token"}]}'
```

The controller discovers the secret from the service account and automatically injects `HF_TOKEN`
into the storage-initializer.

:::note
HuggingFace adapters require the storage-initializer to be enabled (default behavior). Env vars
cannot be added to the storage-initializer via `spec.template` — credentials must be provided
through the service account secret mechanism described above.
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

The controller injects S3 credentials into the storage-initializer via the Kubernetes service
account. Create a secret using the key names the credential builder recognizes, then attach it to
the service account:

```bash
kubectl create secret generic s3-credentials \
  --from-literal=awsAccessKeyID=<your-access-key-id> \
  --from-literal=awsSecretAccessKey=<your-secret-access-key>

kubectl patch serviceaccount default \
  -p '{"secrets": [{"name": "s3-credentials"}]}'
```

For custom S3 endpoints (MinIO, Ceph, etc.) or additional S3 configuration, see the
[KServe storage credentials documentation](https://kserve.github.io/website/latest/modelserving/storage/s3/s3/).

:::note
Env vars cannot be added to the storage-initializer via `spec.template` — credentials must be
provided through the service account secret mechanism described above.
:::

In general, all storage schemes supported by KServe's storage-initializer work for LoRA adapters, with the exception of OCI (see [Limitations](#limitations)). S3-compatible providers include:
- AWS S3
- MinIO
- Ceph Object Gateway
- Google Cloud Storage (S3 compatibility mode)
- Azure Blob Storage (S3 compatibility mode)

:::note
Only `hf://` has been specifically tested with LoRA adapters. S3-compatible providers are expected to work via the existing KServe storage-initializer S3 support but have not been individually validated with LoRA adapters.
:::

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
- Access mode: `ReadOnlyMany` (recommended — adapters are read-only at runtime)
- The path specified in the URI must contain the adapter files directly in standard format: `adapter_config.json` and `adapter_model.safetensors` (or `adapter_model.bin` for PyTorch format)

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
```

S3 credentials for the `code-adapter` are injected via the service account (see [S3 credentials](#s3-compatible-storage-s3)).

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
   - Sets `--max-lora-rank`, `--max-loras`, `--max-cpu-loras` only when explicitly configured in `spec.model.lora`; vLLM's own defaults apply otherwise
   - Adds `--lora-modules <name>=<path> <name2>=<path2> ...`

### Path Sanitization

Adapter names are sanitized for filesystem compatibility:
- Invalid characters (`/`, `:`, etc.) are replaced with `-`
- Example: `my/adapter:v1` becomes `my-adapter-v1`

### Resource Considerations

**GPU Memory Usage**:
- Each adapter typically requires 50-500MB GPU memory depending on rank and model size
- Formula: `adapter_memory ≈ rank × num_layers × hidden_dim × 2 × sizeof(fp16)`
- All adapters are loaded simultaneously into GPU memory

**Download Time**:
- Depends on adapter size and network bandwidth
- HuggingFace: typically 10-60 seconds per adapter
- S3: depends on endpoint proximity and bandwidth
- PVC: no download time (instant)

---

## Advanced Configuration

### Tuning LoRA Runtime Parameters

Use the spec fields to configure vLLM's LoRA runtime settings:

```yaml
spec:
  model:
    lora:
      maxRank: 128        # increase if adapters were trained with rank > 16 (vLLM default)
      maxAdapters: 3      # max adapters in GPU memory simultaneously (vLLM default: 1)
      maxCpuAdapters: 6   # max adapters cached in CPU memory (vLLM default: maxAdapters)
      adapters:
        - name: sql-adapter
          uri: hf://my-org/qwen-sql-lora
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

## Routing Many Adapters

As you add adapters for different tasks or tenants, you can run into a routing limit: with KServe's default route template, the eighth adapter exceeds the HTTPRoute limit of 64 matches per rule. Enabling `regex` routing lets a larger collection of adapters share the same route matches. Clients continue to use the same model names and request format.

The default strategy is `exact`, so regex routing is an opt-in. It applies to adapters declared in `spec.model.lora.adapters`; configure how many the model server can load using the [LoRA runtime parameters](#tuning-lora-runtime-parameters).

### Enable it for your service

Start with a working [LoRA-enabled service](#configuration) that uses model-based routing and a KServe-managed HTTPRoute. Your gateway must support regular-expression header matching. For Envoy deployments, check the [gateway limits](#check-gateway-limits) below before enabling it. If you use custom workload or route presets, check the [model-based routing setup](../../../admin-guide/configurations.md#model-based-routing-prerequisites) as well.

Save this patch as `lora-routing-patch.yaml`:

```yaml title="lora-routing-patch.yaml"
spec:
  annotations:
    serving.kserve.io/lora-model-routing-strategy: regex
```

Apply it to your existing service, replacing the name and namespace:

```bash
MODEL_NAMESPACE=team-a
LLMISVC_NAME=my-llm-service

kubectl patch llminferenceservice "$LLMISVC_NAME" -n "$MODEL_NAMESPACE" \
  --type=merge --patch-file=lora-routing-patch.yaml
```

Keep the annotation under **`spec.annotations`** as shown. KServe updates the existing HTTPRoute to include the base model and declared adapters in regex matches. If you manage the route yourself through `spec.router.route.http.refs`, update that route directly; this setting only changes routes KServe generates.

To reuse the setting across services, add the same annotation to an `LLMInferenceServiceConfig` preset referenced by `spec.baseRefs`. To make regex routing the cluster default, set `loraModelRoutingStrategy` to `regex` in the `ingress` entry of the `inferenceservice-config` ConfigMap; see the [cluster configuration examples](../../../admin-guide/configurations.md#set-the-lora-routing-default). A service's own setting takes precedence over its presets, and a preset takes precedence over the cluster default.

### Try an adapter

Send a request for one of your declared adapters through the gateway. The model header directs the request to your service, and `model` in the body tells the runtime which adapter to use. This example sends both explicitly and uses `jq` to build the request.

Set `GATEWAY_URL` to your gateway's address without a service-specific path, and replace `ADAPTER_NAME` with one of your adapter names. If your installation uses a different model header, change `MODEL_HEADER` too. Include any Host header or credentials your gateway requires.

```bash
GATEWAY_URL=https://inference.example.com
ADAPTER_NAME=sql-adapter
MODEL_HEADER=X-Gateway-Model-Name

jq -n --arg model "$ADAPTER_NAME" \
  '{model: $model, prompt: "Hello", max_tokens: 8}' |
  curl --fail-with-body -sS "$GATEWAY_URL/v1/completions" \
    -H 'Content-Type: application/json' \
    -H "$MODEL_HEADER: publishers/$MODEL_NAMESPACE/models/$ADAPTER_NAME" \
    --data-binary @-
```

Repeat the request for the base model and the adapters you intend to serve. Keep using the same request format as you add adapters to the service. If your gateway already derives the model header from the request body, that setup continues to apply; enabling regex routing does not configure body processing.

<details>
<summary>Check the generated route</summary>

Inspect the model-header matches:

```bash
kubectl get httproute "${LLMISVC_NAME}-kserve-route" -n "$MODEL_NAMESPACE" -o json |
  jq --arg header "$MODEL_HEADER" '
    [.spec.rules[].matches[]?.headers[]?
     | select((.name | ascii_downcase) == ($header | ascii_downcase))
     | {type, value, characters: (.value | length)}] | unique'
```

Expect `type: RegularExpression` and a pattern containing your base model and adapter names, for example:

```text
^publishers/team-a/models/(base-model|code-adapter|sql-adapter)$
```

KServe escapes the names and matches each complete name, so an adapter name cannot act as a wildcard. With no declared adapters, the base-model matches stay `Exact`.

If the route has not updated, check the service and gateway conditions:

```bash
kubectl get llminferenceservice "$LLMISVC_NAME" -n "$MODEL_NAMESPACE" -o json |
  jq '.status.conditions[] | select(.type == "HTTPRoutesReady")'

kubectl get httproute "${LLMISVC_NAME}-kserve-route" -n "$MODEL_NAMESPACE" -o json |
  jq '.status.parents'
```

Check that `observedGeneration` reflects the current resource generation. Always verify inference traffic too: an Envoy proxy can reject a route update even when the HTTPRoute reports `Accepted=True`.

</details>

### Enable it across a cluster

Once you have verified routing on the gateways your services use, you can make `regex` the default for services without an override. Set `loraModelRoutingStrategy` to `regex` in the `ingress` entry of the `inferenceservice-config` ConfigMap. Helm installations expose the same choice as `kserve.controller.gateway.loraModelRoutingStrategy`.

See [setting the cluster default](../../../admin-guide/configurations.md#set-the-lora-routing-default) for the ConfigMap and Helm examples. KServe picks up the change without a controller restart. Individual services can still choose `exact` or `regex` through `spec.annotations`.

### Check gateway limits

Your gateway must support [regular-expression header matching](https://gateway-api.sigs.k8s.io/reference/api-spec/1.6/spec/#httpheadermatch). For Envoy-based gateways, the main setting to check is `re2.max_program_size.error_level`: Envoy rejects expressions above this compiled-size limit. The [Envoy Gateway 1.8.1 defaults](https://github.com/envoyproxy/gateway/blob/v1.8.1/internal/xds/bootstrap/bootstrap.yaml.tpl#L50) already raise it sufficiently for this use; custom bootstrap settings or other Envoy deployments may need adjustment.

Ask your gateway operator to [check the running proxy's limit](../../../admin-guide/configurations.md#envoy-regex-limits) if requests to newly added adapters fail. KServe does not change Envoy settings. For services using an `InferencePool` with Envoy Gateway, also complete the [Envoy AI Gateway integration](./llmisvc-envoy-ai-gateway.md).

Regex routing still has a size limit: the generated header pattern can contain at most [4096 characters](https://gateway-api.sigs.k8s.io/reference/api-spec/1.6/spec/#httpheadermatch). Longer names leave room for fewer adapters. If you reach that limit, shorten the names or split the adapters across services. Continue to size the runtime's adapter memory separately.

### Troubleshoot and roll back

| Symptom | What to check |
|---|---|
| The route still uses `Exact` matches | Confirm the annotation is under `spec.annotations`, adapters are declared, and KServe manages the route. Check the [model-based routing setup](../../../admin-guide/configurations.md#model-based-routing-prerequisites). |
| `HTTPRoutesReady=False` with `RoutingPreconditionNotMet` | Check custom route rules: the model-header match must start as an `Exact` match for the qualified base-model name. Use the standard route preset or correct the custom match, then apply the change. |
| `HTTPRoutesReady=False` with `HTTPRouteReconcileError` mentioning length or match count | For a pattern-length error, shorten names or reduce the adapter set. For too many exact matches, check that regex routing is enabled. |
| The route is accepted, but new adapters fail to route | Check gateway logs for `RE2 program size` or NACK messages and [inspect the Envoy limit](../../../admin-guide/configurations.md#envoy-regex-limits). The proxy may still be serving its previous route configuration. |

If KServe cannot generate or save the updated route, it retains the previous HTTPRoute. Requests may therefore use an older adapter set until you correct the configuration. Deleting the route will not fix the underlying error.

To return to `exact`, first reduce the declared adapter set to fit the route: at most seven adapters with the default template. Verify those adapters while still using regex, then change the annotation in the patch above to `exact` and apply it again. Switching while too many adapters remain causes the route update to fail.

Removing the annotation makes the service inherit its preset or cluster setting, which may still be `regex`. Use an explicit `exact` value when you want to override that default, and verify requests after the change.

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
| **Download failure** | Invalid HF/S3 credentials | Verify credentials are in a secret attached to the service account (see [HF auth](#huggingface-hub-hf) or [S3 auth](#s3-compatible-storage-s3)) |
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

**OCI Registries (`oci://`)**: Currently not supported for LoRA adapters. OCI models run as sidecar containers ("modelcars") with a shared process namespace, but only one modelcar per pod is supported. Since the base model already occupies that slot, additional modelcars cannot be used for adapters.

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
