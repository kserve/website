# Deploy the Llama2 model with Hugging Face LLM Serving Runtime
The Hugging Face LLM serving runtime implements a runtime that can serve Hugging Face LLM model out of the box. 

In this example, we deploy a Llama2 model from Hugging Face by running an `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). Based on the performance requirement for large language models, KServe chooses to perform the inference using a more optimized inference engine like [vLLM](https://github.com/vllm-project/vllm) for text generation models.

### Serve the Hugging Face LLM model using vLLM

KServe Hugging Face runtime by default uses vLLM to serve the LLM models for faster inference and higher throughput than the Hugging Face API, implemented with paged attention, continuous batching and an optimized CUDA kernel. 

You can still use `--disable_vllm` flag to fall back to perform the inference using Hugging Face API.


=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-llama2
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
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

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama2
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Perform inference with v1 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["Where is Eiffel Tower?"] }'
```

!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"predictions":["Where is Eiffel Tower?\nEiffel Tower is located in Paris, France. It is one of the most iconic landmarks in the world and stands at 324 meters (1,063 feet) tall. The tower was built for the 1889 World's Fair in Paris and was designed by Gustave Eiffel. It is made of iron and has four pillars that support the tower. The Eiffel Tower is a popular tourist destination and offers stunning views of the city of Paris."]}
  ```

KServe Hugging Face vLLM runtime supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference

Sample OpenAI Completions request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions -d '{"model": "${MODEL_NAME}", "prompt": "<prompt>", "stream":false, "max_tokens": 30 }'
```

!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"id":"cmpl-7c654258ab4d4f18b31f47b553439d96","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"<generated_text>"}],"created":1715353182,"model":"llama2","system_fingerprint":null,"object":"text_completion","usage":{"completion_tokens":26,"prompt_tokens":4,"total_tokens":30}}
  ```

Sample OpenAI Chat request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions -d '{"model": "${MODEL_NAME}", "messages": [{"role": "user","content": "<message>"}], "stream":false }'
```

Sample OpenAI Completions request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions -d '{"model": "${MODEL_NAME}", "prompt": "<prompt>", "stream":false, "max_tokens": 30 }'
```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"id":"cmpl-87ee252062934e2f8f918dce011e8484","choices":[{"finish_reason":"length","index":0,"message":{"content":"<generated_response>","tool_calls":null,"role":"assistant","function_call":null},"logprobs":null}],"created":1715353461,"model":"llama2","system_fingerprint":null,"object":"chat.completion","usage":{"completion_tokens":30,"prompt_tokens":3,"total_tokens":33}}
  ```

Sample OpenAI Chat request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["Where is Eiffel Tower?"] }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"id":"cmpl-7c654258ab4d4f18b31f47b553439d96","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"<generated_text>"}],"created":1715353182,"model":"llama2","system_fingerprint":null,"object":"text_completion","usage":{"completion_tokens":26,"prompt_tokens":4,"total_tokens":30}}
  ```

Sample OpenAI Chat request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions -d '{"model": "${MODEL_NAME}", "messages": [{"role": "user","content": "<message>"}], "stream":false }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"id":"cmpl-87ee252062934e2f8f918dce011e8484","choices":[{"finish_reason":"length","index":0,"message":{"content":"<generated_response>","tool_calls":null,"role":"assistant","function_call":null},"logprobs":null}],"created":1715353461,"model":"llama2","system_fingerprint":null,"object":"chat.completion","usage":{"completion_tokens":30,"prompt_tokens":3,"total_tokens":33}}
  ```
