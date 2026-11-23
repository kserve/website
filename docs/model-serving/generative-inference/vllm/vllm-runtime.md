---
title: vLLM Runtime
description: Deploy LLMs on KServe with the standalone vLLM serving runtime
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# vLLM Serving Runtime

Since KServe v0.20, [vLLM](https://github.com/vllm-project/vllm) is available as its own serving runtime for `InferenceService`, separate from the [Hugging Face serving runtime](../overview.md). Setting `modelFormat.name: vLLM` deploys the upstream vLLM OpenAI-compatible server directly, without the KServe Hugging Face server in front of it.

This page describes the runtime, how it differs from the Hugging Face runtime with the vLLM backend, and how to deploy it on GPU and CPU.

## The `kserve-vllmserver` ClusterServingRuntime

KServe installs a dedicated `ClusterServingRuntime` named `kserve-vllmserver`:

| Property | Value |
|----------|-------|
| Model format | `vLLM` (auto-selected) |
| Image | `vllm/vllm-openai` (GPU), `vllm/vllm-openai-cpu` (CPU) |
| Entrypoint | `python -m vllm.entrypoints.openai.api_server` |
| Default arguments | `--port=8080`, `--served-model-name=<InferenceService name>`, `--model=/mnt/models` |
| Readiness and startup probes | HTTP `GET /v1/models` on port `8080` |
| Metrics | `/metrics` on port `8080` |

You can inspect the installed runtime with:

```bash
kubectl get clusterservingruntime kserve-vllmserver -o yaml
```

:::warning[Model format name is case-sensitive]
The model format is `vLLM`, with that exact casing. KServe matches model format names exactly, so `modelFormat.name: vllm` does not select this runtime and the InferenceService fails with `No runtime found to support specified framework/version`.
:::

The startup probe allows about 30 minutes for the model to load before the pod is restarted, which accommodates large model downloads and weight loading.

## Standalone vLLM vs Hugging Face Runtime with vLLM Backend

KServe offers two ways to serve a model with vLLM on an `InferenceService`:

| | Standalone vLLM runtime | Hugging Face runtime with vLLM backend |
|---|---|---|
| `modelFormat.name` | `vLLM` | `huggingface` |
| ClusterServingRuntime | `kserve-vllmserver` | `kserve-huggingfaceserver` |
| Container image | Upstream `vllm/vllm-openai` | KServe-built `kserve/huggingfaceserver` |
| Server process | vLLM OpenAI API server | KServe Hugging Face server embedding the vLLM engine |
| OpenAI endpoint paths | `/v1/...` | `/openai/v1/...` |
| Arguments | vLLM CLI arguments only | Hugging Face runtime arguments (`--model_name`, `--backend`, `--task`, ...) plus vLLM engine arguments |
| Fallback to the Hugging Face backend | No | Yes, when the model is not supported by vLLM |
| Predictive tasks (`fill_mask`, `token_classification`, ...) | No | Yes, with the Hugging Face backend |
| KServe V1 / Open Inference Protocol endpoints | No | Yes |
| Multi-node inference (`workerSpec`) | No | Yes, with `kserve-huggingfaceserver-multinode` |
| vLLM version | Follows the upstream image tag you choose | Pinned by the KServe release |

### When to Use Which

Use the **standalone vLLM runtime** when:

- You want to run a specific upstream vLLM release, including new releases, without waiting for a KServe release.
- You want the exact behavior, CLI flags, and endpoints documented by vLLM.
- Your clients already use the standard OpenAI paths (`/v1/chat/completions`).

Use the **Hugging Face runtime with the vLLM backend** when:

- You need automatic fallback to the Hugging Face backend, or you serve predictive tasks from the same runtime.
- You need the KServe V1 or Open Inference Protocol endpoints.
- You need [multi-node/multi-GPU inference](../multi-node/multi-node.md).
- Your clients already depend on the `/openai/v1/...` paths.

:::tip
For production generative workloads that need intelligent routing, multi-node orchestration, or a scheduler, also consider [`LLMInferenceService`](../llmisvc/llmisvc-overview.md).
:::

## Prerequisites

- A Kubernetes cluster with [KServe v0.20 or later installed](../../../getting-started/quickstart-guide.md).
- For GPU: NVIDIA GPU resources available on your nodes.
- For CPU: nodes with enough CPU and memory for the model.
- For gated models: a [Hugging Face access token](https://huggingface.co/docs/hub/en/security-tokens), configured as described in the [text generation guide](../tasks/text-generation/text-generation.md#create-a-hugging-face-token-secret).

## Deploy a Model

KServe selects the container image from the resources of the InferenceService. If the predictor requests a GPU (`nvidia.com/gpu`), the default GPU image is used. Otherwise, KServe rewrites the image to the sibling `-cpu` repository (`vllm/vllm-openai` becomes `vllm/vllm-openai-cpu`).

<Tabs groupId="vllm-hardware">
<TabItem value="gpu" label="GPU" default>

```yaml title="vllm.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: qwen-llm
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      args:
        - --served-model-name=qwen
      storageUri: hf://Qwen/Qwen2.5-0.5B-Instruct
      resources:
        requests:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
        limits:
          cpu: "2"
          memory: 6Gi
          nvidia.com/gpu: "1"
```

</TabItem>
<TabItem value="cpu" label="CPU">

```yaml title="vllm.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: qwen-llm
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      args:
        - --served-model-name=qwen
        - --max-model-len=4096
        - --dtype=bfloat16
      env:
        - name: VLLM_CPU_KVCACHE_SPACE
          value: "4"
      storageUri: hf://Qwen/Qwen2.5-0.5B-Instruct
      resources:
        requests:
          cpu: "16"
          memory: 20Gi
        limits:
          cpu: "16"
          memory: 20Gi
```

No GPU is requested, so KServe runs the `vllm/vllm-openai-cpu` image. See [CPU Deployment Configuration](../overview.md#cpu-deployment-configuration) for the CPU-related environment variables and the `--dtype` recommendation, which apply to this runtime as well.

</TabItem>
</Tabs>

Apply the manifest:

```bash
kubectl apply -f vllm.yaml
```

In both examples the storage initializer downloads the model to `/mnt/models`, which is the path the runtime passes to vLLM with `--model`.

### Loading the Model Directly from Hugging Face

To let vLLM download the model itself, omit `storageUri` and pass the model ID with `--model`. Arguments from the InferenceService are appended after the runtime defaults, so this overrides `--model=/mnt/models`:

```yaml
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      args:
        - --model=Qwen/Qwen2.5-0.5B-Instruct
        - --served-model-name=qwen
      env:
        - name: HF_TOKEN  # only needed for gated models
          valueFrom:
            secretKeyRef:
              name: hf-secret
              key: HF_TOKEN
```

## Verify the Deployment

```bash
kubectl get inferenceservice qwen-llm
```

:::tip[Expected Output]
```
NAME       URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION        AGE
qwen-llm   http://qwen-llm.default.example.com   True           100                              qwen-llm-predictor-00001   5m
```
:::

You can confirm which runtime and image were selected:

```bash
kubectl get inferenceservice qwen-llm -o jsonpath='{.status.clusterServingRuntimeName}{"\n"}'
kubectl get pods -l serving.kserve.io/inferenceservice=qwen-llm \
  -o jsonpath='{.items[0].spec.containers[?(@.name=="kserve-container")].image}{"\n"}'
```

## Make Inference Requests

The vLLM runtime serves the OpenAI-compatible API at the standard paths. Unlike the Hugging Face runtime, there is **no `openai/` prefix**.

| Task | API Endpoint |
|------|--------------|
| Text completion | `v1/completions` |
| Chat completion | `v1/chat/completions` |
| Embeddings | `v1/embeddings` |
| Re-rank | `v1/rerank` |
| List served models | `v1/models` |

Set up the environment variables, and determine `INGRESS_HOST` and `INGRESS_PORT` as described in [Determine the ingress IP and ports](../../../getting-started/genai-first-isvc.md#4-determine-the-ingress-ip-and-ports):

```bash
MODEL_NAME=qwen
SERVICE_HOSTNAME=$(kubectl get inferenceservice qwen-llm -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

`MODEL_NAME` must match `--served-model-name`. If you do not set that argument, the served model name defaults to the name of the InferenceService.

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/chat/completions \
  -H "Host: ${SERVICE_HOSTNAME}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"${MODEL_NAME}"'",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is 2 + 2?"}
    ],
    "max_tokens": 30,
    "stream": false
  }'
```

Set `"stream": true` to receive the response as server-sent events.

## Configuration

### vLLM Arguments

Everything in `args` is passed to the vLLM server as is, so any option from the [vLLM engine arguments](https://docs.vllm.ai/en/latest/configuration/engine_args/) and server arguments can be used, for example `--max-model-len`, `--gpu-memory-utilization`, `--quantization`, or `--tensor-parallel-size` for multiple GPUs on a single node.

The Hugging Face runtime arguments (`--model_name`, `--backend`, `--task`, and so on) are not understood by this runtime.

### Pinning the vLLM Version

By default the runtime uses the `latest` tag of the vLLM image. For production, pin a version with `runtimeVersion`, which replaces the image tag:

```yaml
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      runtimeVersion: <vllm-image-tag>
      storageUri: hf://Qwen/Qwen2.5-0.5B-Instruct
```

:::warning[`runtimeVersion` on CPU]
When `runtimeVersion` is set, KServe only replaces the image tag and does not switch to the `-cpu` image repository. For CPU deployments, set the image and tag cluster-wide instead, as described below.
:::

To change the default image or tag for the whole cluster, set `kserve.servingruntime.vllmserver.image` and `kserve.servingruntime.vllmserver.tag` in the `kserve-runtime-configs` Helm chart, or edit the `kserve-vllmserver` `ClusterServingRuntime`.

### Multi-node Inference

The `kserve-vllmserver` runtime does not define a `workerSpec`, so an InferenceService with `modelFormat.name: vLLM` cannot set `predictor.workerSpec`. For multi-node/multi-GPU inference, use the Hugging Face runtime as described in [Multi-node/Multi-GPU Inference](../multi-node/multi-node.md), or [`LLMInferenceService`](../llmisvc/llmisvc-overview.md).

## Troubleshooting

1. **`No runtime found to support specified framework/version`**:
   - Check that the model format is spelled `vLLM`.
   - Check that the runtime exists and is not disabled: `kubectl get clusterservingruntime kserve-vllmserver`.

2. **Requests return `404 Not Found`**:
   - Use `/v1/...` paths, not `/openai/v1/...`.
   - Check that the `model` field of the request matches `--served-model-name`.

3. **Pod is restarted while the model loads**:
   - Very large models may exceed the startup probe budget. Use [model caching](../modelcache/localmodel.md) or a PVC to shorten loading.

4. **Out of memory errors**:
   - On GPU, lower `--gpu-memory-utilization` or `--max-model-len`, or use a quantized model.
   - On CPU, lower `--max-model-len` and `VLLM_CPU_KVCACHE_SPACE`, or increase the memory limit.

## Next Steps

- [Text Generation](../tasks/text-generation/text-generation.md) with the Hugging Face runtime
- [Autoscaling](../autoscaling/autoscaling.md) based on vLLM metrics
- [Kernel Cache](../modelcache/kernel-cache/overview.md) for faster model loading with the vLLM runtime
- [LLMInferenceService Overview](../llmisvc/llmisvc-overview.md)
