# Deploy the t5 model for text2text generation task with Hugging Face LLM Serving Runtime
In this example, We demonstrate how to deploy `t5 model` for Text2Text Generation task from Hugging Face by deploying the `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). 


## Serve the Hugging Face LLM model using HuggingFace Backend
KServe Hugging Face runtime by default uses vLLM to serve the LLM models for faster time-to-first-token(TTFT) and higher token generation throughput than the Hugging Face API. vLLM is implemented with common inference optimization techniques, such as paged attention, continuous batching and an optimized CUDA kernel.
If the model is not supported by vLLM, KServe falls back to HuggingFace backend as a failsafe.

You can use `--backend=huggingface` argument to perform the inference using Hugging Face API. KServe Hugging Face backend runtime also 
supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference.

!!! note
    At the time this document was written, the `t5 model` is not supported by the vLLM engine, so the runtime will automatically 
    use the Hugging Face backend to serve the model.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
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
    EOF
    ```

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-t5
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-t5       http://huggingface-t5.default.example.com             True           100                              huggingface-t5-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-t5 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

#### Sample OpenAI Completions request:

```bash
curl -H "content-type:application/json" \
-H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-d '{"model": "t5", "prompt": "translate English to German: The house is wonderful.", "stream":false, "max_tokens": 30 }'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
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

#### Sample OpenAI Completions streaming request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions \
-d '{"model": "${MODEL_NAME}", "prompt": "translate English to German: The house is wonderful.", "stream":true, "max_tokens": 30 }'
```

!!! success "Expected Output"

  ```{ .json .no-copy }
  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Das "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Haus "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"ist "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"wunderbar.</s>"}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}
  data: [DONE]
  ```
