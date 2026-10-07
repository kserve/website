---
sidebar_label: "Runtime"
sidebar_position: 7
title: "LLMInferenceService Runtime"
description: Select the model server runtime for LLMInferenceService, including the default vLLM path and experimental SGLang support
---

# LLMInferenceService Runtime

The runtime controls which model server starts inside the `LLMInferenceService` workload. KServe uses the default llm-d/vLLM configuration when `spec.runtime` is omitted. To try SGLang, set `spec.runtime: kserve-llm-sglang`.

## Runtime options

| Runtime | How to select it | Use it for |
|---------|------------------|------------|
| vLLM with llm-d | Omit `spec.runtime` | Production workloads, single-node serving, multi-node serving, prefill-decode disaggregation, LoRA adapters, KV cache offloading, tracing, and advanced parallelism |
| SGLang | Set `spec.runtime: kserve-llm-sglang` | Experimental plain single-node serving |

:::note
Runtime names other than `kserve-llm-sglang` are not currently documented as supported `LLMInferenceService` runtime selectors. Do not rely on arbitrary runtime names selecting a different engine.
:::

## Select the default vLLM runtime

Leave `spec.runtime` unset to use the default vLLM-based llm-d configuration:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: vllm-opt-125m
spec:
  model:
    uri: hf://facebook/opt-125m
    name: facebook/opt-125m
  replicas: 1
```

Use this default path for advanced LLMInferenceService features. For example, keep `spec.runtime` unset when enabling multi-node serving:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: vllm-multinode
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-70B-Instruct
    name: meta-llama/Llama-3.1-70B-Instruct
  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: "4"
  worker:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: "4"
```

The controller injects the vLLM workload presets for this shape because `spec.worker` is present and no SGLang runtime is selected.

## Select the experimental SGLang runtime

Set `spec.runtime: kserve-llm-sglang` to start [SGLang](https://github.com/sgl-project/sglang) instead of the default vLLM server:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: sglang-opt-125m
spec:
  runtime: kserve-llm-sglang
  model:
    uri: hf://facebook/opt-125m
    name: facebook/opt-125m
  replicas: 1
  template:
    containers:
      - name: main
        resources:
          limits:
            cpu: "4"
            memory: 16Gi
            nvidia.com/gpu: "1"
          requests:
            cpu: "1"
            memory: 8Gi
            nvidia.com/gpu: "1"
```

The built-in SGLang runtime:

- Starts `python3 -m sglang.launch_server` on port `8000`.
- Mounts the model downloaded by KServe at `/mnt/models`.
- Uses `lmsysorg/sglang:v0.5.14` by default.
- Maps `spec.parallelism.tensor` to the SGLang `--tp` argument.
- Adds `--trust-remote-code` when `spec.trustRemoteCode` is available in the installed CRD and enabled.

For tensor parallelism with SGLang, set only `spec.parallelism.tensor` and request the matching number of GPUs:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: sglang-tp
spec:
  runtime: kserve-llm-sglang
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct
  parallelism:
    tensor: 2
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: "2"
```

:::warning Experimental
SGLang support is experimental and currently covers only plain single-node serving. Use the default vLLM runtime for production workloads or for any feature outside the compatibility table below.
:::

## SGLang compatibility

The built-in SGLang runtime has been validated for plain single-node serving. These combinations are not currently supported:

| Feature or field | SGLang behavior today | Use instead |
|------------------|-----------------------|-------------|
| `spec.model.lora` | The controller may append vLLM LoRA flags such as `--lora-modules` that SGLang rejects. | Use the default vLLM runtime. |
| `spec.tracing` | The controller may append vLLM tracing flags such as `--collect-detailed-traces` that SGLang rejects. | Use the default vLLM runtime. |
| `spec.prefill` | Prefill-decode presets are vLLM based. | Use the default vLLM runtime. |
| `spec.worker` | Multi-node presets are vLLM based. | Use the default vLLM runtime. |
| KV cache offloading | Offloading volumes may be mounted, but SGLang is not wired to use them. | Use the default vLLM runtime. |
| `spec.parallelism.data`, `spec.parallelism.expert`, `spec.parallelism.pipeline` | These fields are not translated into SGLang server arguments. | Use `spec.parallelism.tensor` only, or use vLLM. |
| TLS | The Service may still advertise HTTPS, but the SGLang server is not configured with certificate files or SSL flags. | Terminate TLS at the gateway or use the default vLLM runtime. |

## Verify the selected runtime

Check that the service is ready:

```bash
kubectl wait --for=condition=Ready \
  llminferenceservice/sglang-opt-125m \
  --timeout=1800s
```

Inspect the generated workload if you need to confirm which server command is running:

```bash
kubectl get deployment sglang-opt-125m-kserve-workload \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="main")].command}{" "}{.spec.template.spec.containers[?(@.name=="main")].args}{"\n"}'
```

For SGLang, the command should start `python3 -m sglang.launch_server`. For the default path, the generated workload uses the vLLM server configured by the llm-d presets.

## Next steps

- [Configuration guide](./llmisvc-configuration.md) for model, workload, router, and parallelism fields.
- [Config composition](./llmisvc-config-composition.md) for how runtime templates combine with well-known configs and `baseRefs`.
- [LLMInferenceService dependencies](./llmisvc-dependencies.md) for installing the CRD, runtime resources, Gateway API, and routing dependencies.
