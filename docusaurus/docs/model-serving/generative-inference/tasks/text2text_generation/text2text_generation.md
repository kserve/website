---
title: Text-to-Text Generation
description: Learn how to deploy and serve t5 model for text-to-text generation tasks using KServe's Hugging Face LLM Serving Runtime
---

# Text-to-Text Generation with T5 Model

Text-to-text generation is a versatile NLP task where both input and output are text, enabling applications like translation, summarization, and question answering. This guide demonstrates how to deploy Google's T5 model using KServe's flexible inference runtimes.

## Prerequisites

Before getting started, ensure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- GPU resources available for model inference (this example uses NVIDIA GPUs).

## Create a Hugging Face Secret (Optional)
If you plan to use private models from Hugging Face, you need to create a Kubernetes secret containing your Hugging Face API token. This step is optional for public models.
```bash
kubectl create secret generic hf-secret \
  --from-literal=HF_TOKEN=<your_huggingface_token>
```

## Create a StorageContainer (Optional)

For models that require authentication, you might need to create a `ClusterStorageContainer`. While the model in this example is public, for private models you would need to configure access:

```yaml title="huggingface-storage.yaml"
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    env:
      - name: HF_TOKEN
        valueFrom:
          secretKeyRef:
            key: HF_TOKEN
            name: hf-secret
    image: kserve/huggingfacehub-storage-initializer:latest
    resources:
      limits:
        memory: 512Mi
      requests:
        memory: 256Mi
```
<!-- TODO: FIX DOC LINK -->
To know more about storage containers, refer to the [Storage Containers documentation](../../../concepts/storage_containers.md).

## Deploy T5 Model

### Understanding Backend Options

KServe supports two inference backends for serving text-to-text models:

1. **vLLM Backend** (default): This is the recommended backend for most language models, providing optimized performance with techniques like paged attention and continuous batching.
2. **Hugging Face Backend**: This backend uses the standard Hugging Face inference API. It serves as a fallback for models not supported by vLLM, like the T5 model in this example.

:::note
At the time this document was written, the `t5 model` is not supported by the vLLM engine, so the runtime will automatically 
use the Hugging Face backend to serve the model.
:::

Please refer to the overview of [KServe's generative inference capabilities](../../overview.md) for more details on these backends.

### Deploy T5 with Hugging Face Backend

Since T5 is not currently supported by vLLM, we'll use the Hugging Face backend explicitly:

```yaml title="huggingface-t5.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-t5
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=t5
        - --model_id=google-t5/t5-small
        - --backend=huggingface
      resources:
        limits:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
```

Apply the YAML:

```bash
kubectl apply -f huggingface-t5.yaml
```

## Verifying Deployment

Check that your InferenceService is ready:

```bash
kubectl get inferenceservices huggingface-t5
```

:::tip Expected Output
```
NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
huggingface-t5       http://huggingface-t5.default.example.com             True           100                              huggingface-t5-predictor-default-47q2g   7d23h
```
:::

Wait until the `READY` column shows `True` before proceeding.

## Making Inference Requests

The T5 model supports the OpenAI-compatible API endpoints for inference. Set up your environment variables first:

```bash
# Set up service hostname for requests
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-t5 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Determine your ingress information as per [KServe documentation](../../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT` accordingly.

### Using the Completions API

For text-to-text translation:

```bash
curl -H "content-type:application/json" \
-H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-d '{"model": "t5", "prompt": "translate English to German: The house is wonderful.", "stream":false, "max_tokens": 30 }'
```

:::tip Expected Output
```json
{
  "id": "de53f527-9cb9-47a5-9673-43d180b704f2",
  "choices": [
    {
      "finish_reason": "length",
      "index": 0,
      "logprobs": null,
      "text": "Das Haus ist wunderbar."
    }
  ],
  "created": 1717998661,
  "model": "t5",
  "system_fingerprint": null,
  "object": "text_completion",
  "usage": {
    "completion_tokens": 7,
    "prompt_tokens": 11,
    "total_tokens": 18
  }
}
```
:::

### Streaming Responses

The API also supports streaming for real-time token generation. Simply set `"stream": true` in your request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-d '{"model": "t5", "prompt": "translate English to German: The house is wonderful.", "stream":true, "max_tokens": 30 }'
```

:::tip Expected Output
```json
data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Das "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Haus "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"ist "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"wunderbar.</s>"}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
data: [DONE]
```
:::

## Troubleshooting

Common issues and solutions:

- **OOM errors**: Increase the memory allocation in the InferenceService specification
- **Pending Deployment**: Ensure your cluster has enough GPU resources available
- **Model not found**: Double-check your Hugging Face token and model ID

## Next Steps

Once you've successfully deployed your text generation model, consider:

- Explore [Model Caching](../../modelcache/localmodel.md)
- Setting up [KV Cache Offloading](../../kv_cache_offloading/README.md) for faster inference
- Explore [Auto Scaling](../../autoscaling/README.md) options for handling variable loads
- Multi Node Inference for large models with [vLLM](../../multi-node/README.md)
- AI Gateway for serving models with [KServe](../../ai-gateway/README.md)

For more information on KServe's capabilities for generative AI, see the [generative inference overview](../../overview.md).
