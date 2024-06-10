# Deploy the Llama3 model with Hugging Face LLM Serving Runtime
The Hugging Face serving runtime implements a runtime that can serve Hugging Face models out of the box.
The preprocess and post-process handlers are implemented based on different ML tasks, for example text classification,
token-classification, text-generation, text2text-generation, fill-mask.

Based on the performance requirement for large language models(LLM), KServe chooses to run the optimized inference engine [vLLM](https://github.com/vllm-project/vllm) for text generation tasks by default considering its ease-of-use and high performance.

In this example, we deploy a Llama3 model from Hugging Face by deploying the `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). 

### Serve the Hugging Face LLM model using vLLM backend

KServe Hugging Face runtime by default uses vLLM to serve the LLM models for faster time-to-first-token(TTFT) and higher token generation throughput than the Hugging Face API. vLLM is implemented with common inference optimization techniques, such as paged attention, continuous batching and an optimized CUDA kernel. If the model is not supported by vLLM, KServe falls back to HuggingFace backend as a failsafe.


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
!!! note
    1. `SAFETENSORS_FAST_GPU` is set by default to improve the model loading performance.
    2. `HF_HUB_DISABLE_TELEMETRY` is set by default to disable the telemetry.

#### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama3
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

KServe Hugging Face vLLM runtime supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference

Sample OpenAI Completions request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions -d '{"model": "${MODEL_NAME}", "prompt": "<prompt>", "stream":false, "max_tokens": 30 }'

```
!!! success "Expected Output"

  ```{ .json .no-copy }
    {"id":"cmpl-7c654258ab4d4f18b31f47b553439d96","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"<generated_text>"}],"created":1715353182,"model":"llama3","system_fingerprint":null,"object":"text_completion","usage":{"completion_tokens":26,"prompt_tokens":4,"total_tokens":30}}
  ```

Sample OpenAI Chat request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions -d '{"model": "${MODEL_NAME}", "messages": [{"role": "user","content": "<message>"}], "stream":false }'

```
!!! success "Expected Output"

  ```{ .json .no-copy }
    {"id":"cmpl-87ee252062934e2f8f918dce011e8484","choices":[{"finish_reason":"length","index":0,"message":{"content":"<generated_response>","tool_calls":null,"role":"assistant","function_call":null},"logprobs":null}],"created":1715353461,"model":"llama3","system_fingerprint":null,"object":"chat.completion","usage":{"completion_tokens":30,"prompt_tokens":3,"total_tokens":33}}
  ```

### Serve the Hugging Face LLM model using HuggingFace Backend
You can use `--backend=huggingface` argument to perform the inference using Hugging Face API. KServe Hugging Face backend runtime also 
supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference.

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
              memory: 2Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
    EOF
    ```

#### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=t5
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-t5 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Sample OpenAI Completions request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions -d '{"model": "${MODEL_NAME}", "prompt": "translate English to German: The house is wonderful.", "stream":false, "max_tokens": 30 }'

```
!!! success "Expected Output"

  ```{ .json .no-copy }
  {"id":"de53f527-9cb9-47a5-9673-43d180b704f2","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Das Haus ist wunderbar."}],"created":1717998661,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":{"completion_tokens":7,"prompt_tokens":11,"total_tokens":18}}
  ```

Sample OpenAI Completions streaming request:

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/completions -d '{"model": "${MODEL_NAME}", "prompt": "translate English to German: The house is wonderful.", "stream":true, "max_tokens": 30 }'

```
!!! success "Expected Output"

  ```{ .json .no-copy }
  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Das "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}

  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"Haus "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}

  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"ist "}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}

  data: {"id":"70bb8bea-57d5-4b34-aade-da38970c917c","choices":[{"finish_reason":"length","index":0,"logprobs":null,"text":"wunderbar.</s>"}],"created":1717998767,"model":"t5","system_fingerprint":null,"object":"text_completion","usage":null}

  data: [DONE]
  ```



### Hugging Face Runtime Arguments

Below, you can find an explanation of command line arguments which are supported for Hugging Face runtime. [vLLM backend engine arguments](https://docs.vllm.ai/en/latest/models/engine_args.html) can also be specified on the command line argument which is parsed by the Hugging Face runtime.

- `--model_name`: The name of the model used on the endpoint path.
- `--model_dir`: The local path where the model is downloaded to. If `model_id` is provided, this argument will be ignored.
- `--model_id`: Huggingface model id.
- `--model_revision`: Huggingface model revision.
- `--tokenizer_revision`: Huggingface tokenizer revision.
- `--dtype`: Data type to load the weights in. One of 'auto', 'float16', 'float32', 'bfloat16', 'float', 'half'. 
             Defaults to float16 for GPU and float32 for CPU systems. 'auto' uses float16 if GPU is available and uses float32 otherwise to ensure consistency between vLLM and HuggingFace backends. 
             Encoder models defaults to 'float32'. 'float' is shorthand for 'float32'. 'half' is 'float16'. The rest are as the name reads.
- `--task`: The ML task name. Can be one of 'text_generation', 'text2text_generation', 'fill_mask', 'token_classification', 'sequence_classification'.
- `--backend`: The backend to use to load the model. Can be one of 'auto', 'huggingface', 'vllm'.
- `--max_length`: Max sequence length for the tokenizer.
- `--disable_lower_case`: Disable lower case for the tokenizer.
- `--disable_special_tokens`: The sequences will not be encoded with the special tokens relative to the model.
- `--trust_remote_code`: Allow loading of models and tokenizers with custom code.
- `--tensor_input_names`: The tensor input names passed to the model for triton inference server backend.
- `--return_token_type_ids`: Return token type ids.
- `--return_probabilities`: Return probabilities of predicted indexes. This is only applicable for tasks 'sequence_classification', 'token_classification' and 'fill_mask'.
