---
title: Text Generation
description: Learn how to deploy and serve Large Language Models (LLMs) for text generation tasks using KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Text Generation with Large Language Models

Text generation is a fundamental capability of Large Language Models (LLMs) that enables a wide range of applications including chatbots, content creation, summarization, and more. This guide demonstrates how to deploy Llama3, a powerful open-source LLM, using KServe's flexible inference runtimes.

## Prerequisites

Before getting started, ensure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- GPU resources available for model inference (this example uses NVIDIA GPUs).
- A Hugging Face account with [access token](https://huggingface.co/docs/hub/en/security-tokens) (required for downloading Llama3 model).

## Create a Hugging Face Token Secret

Both backends require a Hugging Face token to download the Llama3 model:

```yaml title="hf-secret.yaml"
apiVersion: v1
kind: Secret
metadata:
    name: hf-secret
type: Opaque	
stringData:
    HF_TOKEN: <your-hugging-face-token>
```

Save this to a file (e.g., `hf-secret.yaml`) and apply it:

```bash
kubectl apply -f hf-secret.yaml
```

## Create a StorageContainer

To enable KServe to access Hugging Face models, you need to create a `ClusterStorageContainer` that uses the Hugging Face token secret. This allows KServe to authenticate and download models from the Hugging Face Hub.

To know more about storage containers, refer to the [Storage Containers documentation](../../../storage/storage-containers/storage-containers.md).

```yaml title="huggingface-storage.yaml"
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    name: storage-initializer
    image: 'kserve/storage-initializer:latest'
    env:
      - name: HF_TOKEN
        valueFrom:
          secretKeyRef:
            name: hf-secret
            key: HF_TOKEN
            optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: '1'
      limits:
        memory: 4Gi
        cpu: '1'
  supportedUriFormats:
    - prefix: 'hf://'
```
## Deploy Text Generation Model

### Understanding Backend Options

KServe supports two inference backends for serving LLMs. This guide covers two primary options:

1. **vLLM Backend** (default): This is the recommended backend for serving LLMs, providing optimized performance and lower latency. It supports advanced features like model parallelism and efficient memory management.
2. **Hugging Face Backend**: This backend uses the standard Hugging Face library. It is suitable for simpler use cases but may not perform as well as vLLM for larger models or high concurrency scenarios.

Please refer to the overview of [KServe's generative inference capabilities](../../overview.md) for more details on these backends.

<Tabs>
<TabItem value="vllm" label="vLLM Backend (Recommended)" default>

The vLLM backend is enabled by default in KServe's Hugging Face serving runtime for optimal performance.

```yaml title="llama3-vllm.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama3-8b
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

Save this to a file (e.g., `llama3-vllm.yaml`) and apply it:

```bash
kubectl apply -f llama3-vllm.yaml
```
</TabItem>
<TabItem value="huggingface" label="Hugging Face Backend">

If you prefer to use the standard Hugging Face inference pipeline, specify the backend explicitly:

```yaml title="llama3-hf.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama3-8b
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3
        - --backend=huggingface
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

Save this to a file (e.g., `llama3-hf.yaml`) and apply it:

```bash
kubectl apply -f llama3-hf.yaml
```
</TabItem>
</Tabs>

## Verifying Deployment

Check that your InferenceService is ready:

```bash
kubectl get inferenceservice llama3-8b
```
:::tip[Expected Output]
You should see output similar to:

```
NAME         URL                                     READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                  AGE
llama3-8b  http://llama3-8b.default.example.com  True           100                              llama3-8b-predictor-default-xxxx   5m
```
:::

Wait until the `READY` column shows `True` before proceeding.

## Making Inference Requests

Both backends support the OpenAI-compatible API endpoints for inference. Set up your environment variables first:

```bash
# Replace with your actual model name and InferenceService
MODEL_NAME=llama3
SERVICE_NAME=llama3-8b
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${SERVICE_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Determine your ingress information as per [KServe documentation](../../../../getting-started/genai-first-isvc.md#4-determine-the-ingress-ip-and-ports)
and set INGRESS_HOST and INGRESS_PORT accordingly.


### Using the Completions API

For simple text completion:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-H "Host: ${SERVICE_HOSTNAME}" \
-H "Content-Type: application/json" \
-d '{
  "model": "'"${MODEL_NAME}"'", 
  "prompt": "Write a poem about colors", 
  "max_tokens": 100,
  "stream": false
}'
```

:::tip[Expected Output]
You should receive a response similar to:
```json
{
  "id": "cmpl-625a9240f25e463487a9b6c53cbed080",
  "choices": [
    {
      "finish_reason": "length",
      "index": 0,
      "logprobs": null,
      "text": " and how they make you feel\nColors, oh colors, so vibrant and bright\nA world of emotions, a kaleidoscope in sight\nRed"
    }
  ],
  "created": 1718620153,
  "model": "llama3",
  "system_fingerprint": null,
  "object": "text_completion",
  "usage": {
    "completion_tokens": 30,
    "prompt_tokens": 6,
    "total_tokens": 36
  }
}
```
:::

### Using the Chat Completions API

For chat-based interactions with system and user messages:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions \
-H "Host: ${SERVICE_HOSTNAME}" \
-H "Content-Type: application/json" \
-d '{
  "model": "'"${MODEL_NAME}"'",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant that speaks like Shakespeare."},
    {"role": "user", "content": "Write a poem about colors"}
  ],
  "max_tokens": 100,
  "stream": false
}'
```

:::tip[Expected Output]
You should receive a response similar to:
```json
{
   "id": "cmpl-9aad539128294069bf1e406a5cba03d3",
   "choices": [
     {
       "finish_reason": "length",
       "index": 0,
       "message": {
         "content": "  O, fair and vibrant colors, how ye doth delight\nIn the world around us, with thy hues so bright!\n",
         "tool_calls": null,
         "role": "assistant",
         "function_call": null
       },
       "logprobs": null
     }
   ],
   "created": 1718638005,
   "model": "llama3",
   "system_fingerprint": null,
   "object": "chat.completion",
   "usage": {
     "completion_tokens": 30,
     "prompt_tokens": 37,
     "total_tokens": 67
   }
}
```
:::

### Streaming Responses

Both APIs support streaming for real-time token generation. Simply set `"stream": true` in your request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions \
-H "Host: ${SERVICE_HOSTNAME}" \
-H "Content-Type: application/json" \
-d '{
  "model": "'"${MODEL_NAME}"'",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant that speaks like Shakespeare."},
    {"role": "user", "content": "Write a poem about colors"}
  ],
  "max_tokens": 100,
  "stream": true
}'
```

:::tip[Expected Output]
You will receive a continuous stream of tokens as they are generated, similar to:

```json
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" ","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" O","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":",","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":"skie","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":",","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" what","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
data: [DONE]
```
:::

## Troubleshooting

Common issues and solutions:

- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.
- **OOM errors**: Increase the memory allocation in the InferenceService specification
- **Pending Deployment**: Ensure your cluster has enough GPU resources available
- **Model not found**: Double-check your Hugging Face token and model ID

## Next Steps

Once you've successfully deployed your text generation model, consider:

- **Advanced serving options** like [multi-node inference](../../multi-node/multi-node.md) for large models
- **Exploring other inference tasks** such as [text-to-text generation](../text2text-generation/text2text-generation.md) and [embedding](../embedding/embedding.md)
- **Optimizing performance** with features like [model caching](../../modelcache/localmodel.md) and [KV cache offloading](../../kvcache-offloading/kvcache-offloading.md)
- **Auto-scaling** your inference services based on traffic patterns using [KServe's auto-scaling capabilities](../../autoscaling/autoscaling.md)
- **Token based rate limiting** to control usage with [AI Gateway](../../ai-gateway/envoy-ai-gateway.md) for serving models.

For more information on KServe's capabilities for generative AI, see the [generative inference overview](../../overview.md).
