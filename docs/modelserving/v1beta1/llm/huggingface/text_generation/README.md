# Deploy the Llama3 model for text_generation task with Hugging Face LLM Serving Runtime
In this example, We demonstrate how to deploy `Llama3 model` for text generation task from Hugging Face by deploying the `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). 

## Serve the Hugging Face LLM model using vLLM backend

KServe Hugging Face runtime by default uses vLLM to serve the LLM models for faster time-to-first-token(TTFT) and higher token generation throughput than the Hugging Face API. vLLM is implemented with common inference optimization techniques, such as paged attention, continuous batching and an optimized CUDA kernel.
If the model is not supported by vLLM, KServe falls back to HuggingFace backend as a failsafe.

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
            - --model_id=meta-llama/meta-llama-3-8b-instruct
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

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-llama3
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-llama3   http://huggingface-llama3.default.example.com         True           100                              huggingface-llama3-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama3
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

KServe Hugging Face vLLM runtime supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference

#### Sample OpenAI Completions request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"model": "llama3", "prompt": "Write a poem about colors", "stream":false, "max_tokens": 30}'
```
!!! success "Expected Output"
    ```{ .json .no-copy .select }
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

#### Sample OpenAI Chat request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions \
-d '{"model":"llama3","messages":[{"role":"system","content":"You are an assistant that speaks like Shakespeare."},{"role":"user","content":"Write a poem about colors"}],"max_tokens":30,"stream":false}'
```

!!! success "Expected Output"
    ```{ .json .no-copy }
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

#### Sample OpenAI Chat Completions streaming request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions \
-d '{"model":"llama3","messages":[{"role":"system","content":"You are an assistant that speaks like Shakespeare."},{"role":"user","content":"Write a poem about colors"}],"max_tokens":30,"stream":true}'
```
!!! note
    The output is truncated for brevity.

!!! success "Expected Output"
    ```{ .json .no-copy }
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" ","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" O","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":",","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":"skie","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":",","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: {"id":"cmpl-22e12eb9fa5e4b0c9726cef4a9ac993c","choices":[{"delta":{"content":" what","function_call":null,"tool_calls":null,"role":"assistant"},"logprobs":null,"finish_reason":null,"index":0}],"created":1718638726,"model":"llama3","system_fingerprint":null,"object":"chat.completion.chunk"}
    data: [DONE]
    ```

## Serve the Hugging Face LLM model using HuggingFace Backend
You can use `--backend=huggingface` argument to perform the inference using Hugging Face API. KServe Hugging Face backend runtime also 
supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference.

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
            - --model_id=meta-llama/meta-llama-3-8b-instruct
            - --backend=huggingface
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

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-llama3
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-llama3   http://huggingface-llama3.default.example.com         True           100                              huggingface-llama3-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama3
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

#### Sample OpenAI Completions request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-H "content-type: application/json" \
-d '{"model": "llama3", "prompt": "Write a poem about colors", "stream":false, "max_tokens": 30}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "id": "564d3bcf-5569-4d15-ace4-ed8a29678359",
      "choices": [
        {
          "finish_reason": "length",
          "index": 0,
          "logprobs": null,
          "text": "\nColors, oh colors, so vibrant and bright\nA world of emotions, a world in sight\nRed, the passion, the fire that burns"
        }
      ],
      "created": 1718699758,
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

#### Sample OpenAI Chat Completions request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions \
-d '{"model":"llama3","messages":[{"role":"system","content":"You are an assistant that speaks like Shakespeare."},{"role":"user","content":"Write a poem about colors"}],"max_tokens":30,"stream":false}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "id": "7dcc83b4-aa94-4a52-90fd-fa705978d3c1",
      "choices": [
        {
          "finish_reason": "length",
          "index": 0,
          "message": {
            "content": "assistant\n\nO, fairest hues of earth and sky,\nHow oft thy beauty doth my senses fly!\nIn vibrant splendor, thou",
            "tool_calls": null,
            "role": "assistant",
            "function_call": null
          },
          "logprobs": null
        }
      ],
      "created": 1718699982,
      "model": "llama3",
      "system_fingerprint": null,
      "object": "chat.completion",
      "usage": {
        "completion_tokens": 30,
        "prompt_tokens": 26,
        "total_tokens": 56
      }
    }
    ```

#### Sample OpenAI Completions streaming request:

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-H "content-type: application/json" \
-d '{"model": "llama3", "prompt": "Write a poem about colors", "stream":true, "max_tokens": 30}'
```

!!! note
    The output is truncated for brevity.

!!! success "Expected Output"
    ```{ .json .no-copy }
    data: {"id":"acadb7d0-1235-4cd7-bd7b-24c62a89b8de","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"\n"}],"created":1718700166,"model":"llama3","system_fingerprint":null,"object":"text_completion","usage":null}
    data: {"id":"acadb7d0-1235-4cd7-bd7b-24c62a89b8de","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Colors, "}],"created":1718700168,"model":"llama3","system_fingerprint":null,"object":"text_completion","usage":null}
    data: {"id":"acadb7d0-1235-4cd7-bd7b-24c62a89b8de","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"oh "}],"created":1718700169,"model":"llama3","system_fingerprint":null,"object":"text_completion","usage":null}
    data: {"id":"acadb7d0-1235-4cd7-bd7b-24c62a89b8de","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"colors, "}],"created":1718700170,"model":"llama3","system_fingerprint":null,"object":"text_completion","usage":null}
    data: [DONE]
    ```
