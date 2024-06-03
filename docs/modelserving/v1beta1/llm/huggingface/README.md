# Deploy the Llama2 model with Hugging Face LLM Serving Runtime
The Hugging Face LLM serving runtime implements a runtime that can serve Hugging Face LLM model out of the box.
The preprocess and post-process handlers are implemented based on different ML tasks, for example text classification,
token-classification, text-generation, text2text-generation, fill-mask. Based on the performance requirement, you can choose to perform
the inference on a more optimized inference engine like triton inference server and vLLM for text generation.

In this example, we deploy a Llama2 model from Hugging Face by running an `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). Based on the performance requirement for large language models, KServe chooses to perform the inference using a more optimized inference engine like [vLLM](https://github.com/vllm-project/vllm) for text generation models.

### Serve the Hugging Face LLM model using vLLM

KServe Hugging Face runtime by default uses vLLM to serve the LLM models for faster inference and higher throughput than the Hugging Face API, implemented with paged attention, continuous batching and an optimized CUDA kernel.
If the model is not supported by vLLM, KServe falls back to HuggingFace backend as a failsafe.


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
!!! note
    1. `SAFETENSORS_FAST_GPU` is set by default to improve the model loading performance.
    2. `HF_HUB_DISABLE_TELEMETRY` is set by default to disable the telemetry.

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama2
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
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
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"id":"cmpl-87ee252062934e2f8f918dce011e8484","choices":[{"finish_reason":"length","index":0,"message":{"content":"<generated_response>","tool_calls":null,"role":"assistant","function_call":null},"logprobs":null}],"created":1715353461,"model":"llama2","system_fingerprint":null,"object":"chat.completion","usage":{"completion_tokens":30,"prompt_tokens":3,"total_tokens":33}}
  ```

### Serve the Hugging Face LLM model using HuggingFace Backend
You can use `--backend=huggingface` arg to perform the inference using Hugging Face. KServe Hugging Face backend runtime also 
supports the OpenAI `/v1/completions` and `/v1/chat/completions` endpoints for inference.

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

### Test HuggingFace Server Locally
Install and run the [HuggingFace Server](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver) using the trained model locally and test the prediction. 
```bash
python -m huggingfaceserver --model_id=bert-base-uncased --model_name=bert
```
```
INFO:kserve:successfully loaded tokenizer for task: 5
Some weights of the model checkpoint at bert-base-uncased were not used when initializing BertForMaskedLM: ['cls.seq_relationship.weight', 'bert.pooler.dense.bias', 'cls.seq_relationship.bias', 'bert.pooler.dense.weight']
- This IS expected if you are initializing BertForMaskedLM from the checkpoint of a model trained on another task or with another architecture (e.g. initializing a BertForSequenceClassification model from a BertForPreTraining model).
- This IS NOT expected if you are initializing BertForMaskedLM from the checkpoint of a model that you expect to be exactly identical (initializing a BertForSequenceClassification model from a BertForSequenceClassification model).
INFO:kserve:successfully loaded huggingface model from path bert-base-uncased
INFO:kserve:Registering model: model
INFO:kserve:Setting max asyncio worker threads as 16
INFO:kserve:Starting uvicorn with 1 workers
2024-01-08 06:32:08.801 uvicorn.error INFO:     Started server process [75012]
2024-01-08 06:32:08.801 uvicorn.error INFO:     Waiting for application startup.
2024-01-08 06:32:08.804 75012 kserve INFO [start():62] Starting gRPC server on [::]:8081
2024-01-08 06:32:08.804 uvicorn.error INFO:     Application startup complete.
2024-01-08 06:32:08.805 uvicorn.error INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
```

### HuggingFace Server Arguments

- `--model_name`: The name of the model used on the endpoint path.
- `--model_dir`: A URI pointer to the model binary. If `model_id` is provided, this argument will be ignored.
- `--model_id`: Huggingface model id.
- `--model_revision`: Huggingface model revision
- `--tokenizer_revision`: Huggingface tokenizer revision
- `--dtype`: Data type to load the weights in. One of 'auto', 'float16', 'float32', 'bfloat16', 'float', 'half'. 
             Defaults to float16 for GPU and float32 for CPU systems. 'auto' uses float16 if GPU is available and uses float32 otherwise to ensure consistency between vLLM and HuggingFace backends. 
             Encoder models defaults to 'float32'. 'float' is shorthand for 'float32'. 'half' is 'float16'. The rest are as the name reads.
- `--task`: The ML task name. Can be one of 'text_generation', 'text2text_generation', 'fill_mask', 'token_classification', 'sequence_classification'.
- `--backend`: The backend to use to load the model. Can be one of 'auto', 'huggingface', 'vllm'
- `--max_length`: Max sequence length for the tokenizer
- `--disable_lower_case`: Do not use lower case for the tokenizer
- `--disable_special_tokens`: The sequences will not be encoded with the special tokens relative to their model
- `--trust_remote_code`: Allow loading of models and tokenizers with custom code
- `--tensor_input_names`: The tensor input names passed to the model for transformer-predictor scenarios
- `--return_token_type_ids`: Return token type ids
- `--return_probabilities`: Return probabilities of predicted indexes. This is only applicable for tasks 'sequence_classification', 'token_classification' and 'fill_mask'.
