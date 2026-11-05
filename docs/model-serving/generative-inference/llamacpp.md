---
title: CPU inference with llama.cpp
description: Serve quantized GGUF models on CPU with the llama.cpp InferenceService runtime.
---

# CPU inference with llama.cpp

The `kserve-llamacpp` ClusterServingRuntime serves GGUF models on CPU through
llama.cpp's OpenAI-compatible API. This example uses Standard deployment mode
and an ungated 135M-parameter model with two CPUs and 2 GiB of memory.
Larger models require more memory for weights and the context cache.

This guide requires a KServe build containing the `kserve-llamacpp` runtime and
single-file Hugging Face downloads in the storage initializer. Older storage
initializers reject `hf://` URIs with a filename.

## Deploy a model

Ensure the runtime is installed:

```sh
kubectl get clusterservingruntime kserve-llamacpp
```

For Helm installations, enable the runtime bundle in the `kserve-runtime-configs`
chart with `--set kserve.servingruntime.enabled=true`. The
`kserve.servingruntime.llamacpp` values configure the image, pull policy, pull
secrets, security context, and disabled flag. The default CPU image is pinned by
digest and runs as a non-root user.

Save the following as `llamacpp.yaml`:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llamacpp-smollm2
  annotations:
    serving.kserve.io/deploymentMode: Standard
spec:
  predictor:
    model:
      modelFormat:
        name: gguf
      runtime: kserve-llamacpp
      storageUri: hf://QuantFactory/SmolLM2-135M-Instruct-GGUF/SmolLM2-135M-Instruct.Q4_K_M.gguf
      args:
        - --model
        - /mnt/models/SmolLM2-135M-Instruct.Q4_K_M.gguf
        - --threads
        - "2"
      resources:
        requests:
          cpu: "2"
          memory: 2Gi
        limits:
          cpu: "2"
          memory: 2Gi
```

```sh
kubectl apply -f llamacpp.yaml
kubectl wait --for=condition=Ready inferenceservice/llamacpp-smollm2 --timeout=15m
```

The initializer downloads only the specified GGUF file. `--model` must match its
path under `/mnt/models`. Nested paths and revisions are supported, for example
`hf://owner/repository:revision/quantized/model.gguf` with
`--model /mnt/models/quantized/model.gguf` as two separate arguments. Repository URIs without a filename
retain snapshot downloading. See [Hugging Face storage](../storage/providers/hf.md)
for private model authentication. Existing `s3://` and `pvc://` model sources can
also be used with the corresponding local model path.

To serve Q8_0 instead, change both filenames to
`SmolLM2-135M-Instruct.Q8_0.gguf`. You can omit `runtime` to let KServe select a
runtime supporting `gguf` automatically.

## Send a request

Forward the predictor Service in a separate terminal:

```sh
kubectl port-forward service/llamacpp-smollm2-predictor 8080:80
```

```sh
curl http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"llamacpp-smollm2","messages":[{"role":"user","content":"Say hello."}],"max_tokens":32}'
```

The model alias is the `InferenceService` name. Add `"stream":true` for
server-sent events. `/v1/completions` accepts a text `prompt`, `/health` reports
readiness, and `/metrics` exposes Prometheus metrics. These endpoints have no
`/openai` prefix. Runtime defaults, including the 2048-token context size, can be
overridden with `spec.predictor.model.args`.
Use separate list items for each flag and value; llama.cpp does not accept
`--flag=value` syntax.

This integration covers `InferenceService` with the CPU image. It does not
provide KServe v1/v2 prediction protocols, `LLMInferenceService` integration,
distributed inference, or GPU configuration.
