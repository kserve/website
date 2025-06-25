---
title: Overview
---

# Hugging Face Runtime Overview

The Hugging Face serving runtime in KServe is a specialized model server designed to deploy and serve Hugging Face models with high performance and scalability. It implements two backend engines:

1. **vLLM Backend** (default): Optimized for Large Language Models (LLMs) with high-performance text generation capabilities
2. **Hugging Face Backend**: Standard implementation using Hugging Face's native APIs as a fallback option

KServe's Hugging Face runtime by default uses [`vLLM`](https://github.com/vllm-project/vllm) backend to serve `text generation` and `text2text generation` LLM models. This provides significant performance improvements, including:

- Faster time-to-first-token (TTFT)
- Higher token generation throughput
- Improved memory efficiency for serving large models
- Support for continuous batching of requests

vLLM implements several state-of-the-art inference optimization techniques, including:
- [PagedAttention](https://vllm.ai) for efficient key and value memory management
- [Speculative decoding](https://docs.vllm.ai/en/stable/features/spec_decode.html) for improved latency
- [Continuous batching](https://www.anyscale.com/blog/continuous-batching-llm-inference) for higher throughput
- Chunked prefill
- [Prefix caching](https://docs.vllm.ai/en/stable/features/automatic_prefix_caching.html)
- Optimized CUDA kernels for faster computation

If a model is not supported by the vLLM engine, KServe automatically falls back to the standard Hugging Face backend to ensure compatibility across a wide range of models.

## Architecture

The Hugging Face runtime integrates into KServe's modular serving architecture, handling model loading, inference, and serving through standardized APIs:

```
┌───────────────────────────────────────────────┐
│             KServe InferenceService           │
└───────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│           Hugging Face Runtime Server         │
├───────────────────────────────────────────────┤
│                                               │
│    ┌─────────────┐          ┌─────────────┐   │
│    │     vLLM    │◄───┐  ┌──►  Hugging    │   │
│    │   Backend   │    │  │  │    Face     │   │
│    └─────────────┘    │  │  │   Backend   │   │
│                       │  │  └─────────────┘   │
│    ┌─────────────────────────────────────┐    │
│    │    Backend Selection & Fallback     │    │
│    └─────────────────────────────────────┘    │
│                                               │
└───────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│           OpenAI-Compatible APIs              │
│                                               │
│  • Completions                                │
│  • Chat Completions                           │
│  • Embeddings                                 │
│  • Scoring                                    │
└───────────────────────────────────────────────┘
```

## Deployment Images

The Hugging Face runtime provides pre-built container images optimized for different hardware environments:

- **CUDA-enabled Image**: Optimized for GPU acceleration with CUDA libraries
- **CPU Image**: Optimized for CPU-only environments with AVX512 instructions disabled for compatibility

KServe automatically selects the appropriate image based on the resources specified in your InferenceService:

- If GPU resources are requested (`nvidia.com/gpu`), the CUDA-enabled image is selected
- If no GPU resources are specified, the CPU-optimized image is used

Example InferenceService with GPU resources that will use the CUDA image:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "huggingface-llm"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: "hf://meta-llama/llama-3-8b-instruct"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
          nvidia.com/gpu: 1  # This triggers CUDA image selection
        limits:
          cpu: "1"
          memory: "2Gi"
          nvidia.com/gpu: 1
```

This automatic selection ensures optimal performance without requiring manual configuration of container images.

## Supported Generative Tasks

The Hugging Face runtime supports the following generative tasks:

- **Text Generation**: Generation of text completions for models like LLaMA, GPT-2, and other autoregressive models
- **Text2Text Generation**: Transformation of input text into output text for models like T5, BART, and other encoder-decoder models
- **Embeddings**: Generation of vector embeddings for text inputs using models like Sentence Transformers
- **Reranking**: Scoring and re-ranking of text inputs using models like BERT and other transformer-based models

For a complete list of models supported by the vLLM backend, please refer to [vLLM's documentation on supported models](https://docs.vllm.ai/en/stable/models/supported_models.html).

:::note

The Hugging Face runtime supports other tasks such as `fill_mask`, `token_classification`, and `sequence_classification` using the Hugging Face backend. These are classified under predictive tasks rather than generative tasks.

:::

## API Endpoints

The Hugging Face runtime provides OpenAI-compatible API endpoints for easy integration with existing applications. Supported endpoints include:

| Task            | API Endpoint                 | Description                                 |
|-----------------|------------------------------|---------------------------------------------|
| Text Generation | `openai/v1/completions`      | Standard text completion (similar to GPT-3) |
| Chat            | `openai/v1/chat/completions` | Chat completion with message history        |
| Embeddings      | `openai/v1/embeddings`       | Vector embeddings for text                  |
| Re-rank         | `openai/v1/rerank`           | Re-ranking (scoring) of text inputs         |

:::tip[OpenAI API Prefix]

KServe prefixes OpenAI API endpoints with 'openai' to prevent confusion with the [V1 API protocol](../../concepts/architecture/data_plane/v1_protocol.md). For instance, the endpoint for text generation via OpenAI's Completion API becomes `openai/v1/completions`, while the Chat Completion API is accessed at `openai/v1/chat/completions`. You can remove this prefix by setting the `KSERVE_OPENAI_ROUTE_PREFIX` environment variable to an empty string (""), or specify a custom prefix by assigning a different value to the variable.

:::

## Performance Considerations

When deploying models with the Hugging Face runtime, consider the following performance factors:

- **Model Size**: Larger models require more GPU memory. Ensure your deployment has adequate resources.
- **Quantization**: The runtime supports various quantization options through vLLM to reduce memory footprint.
- **Batch Size**: Configure appropriate batch sizes based on your workload patterns and available resources.
- **GPU Memory**: vLLM optimizes memory usage, but still requires sufficient GPU memory for model weights and KV cache.

## Examples

The following examples demonstrate how to deploy and perform inference using the Hugging Face runtime with different ML tasks:

- [Text Generation using LLama3](tasks/text_generation/text_generation.md)
- [Text-To-Text Generation using T5](tasks/text2text_generation/text2text_generation.md)
- [Embeddings using Sentence Transformers](tasks/embedding/embedding.md)
- [Reranking using BGE](tasks/reranking/rerank.md)
- [Client SDK Usage](sdk_integration/sdk_integration.md)

## Environment Variables

The Hugging Face runtime image has the following environment variables set by default:

| Variable                     | Default  | Description                        |
|------------------------------|----------|------------------------------------|
| `SAFETENSORS_FAST_GPU`       | Enabled  | Improves model loading performance |
| `HF_HUB_DISABLE_TELEMETRY`   | Enabled  | Disables telemetry data collection |
| `KSERVE_OPENAI_ROUTE_PREFIX` | "openai" | Prefix for OpenAI API routes       |

## Configuration Options

### Hugging Face Runtime Arguments

Below is an explanation of command line arguments supported by the Hugging Face runtime. [vLLM backend engine arguments](https://docs.vllm.ai/en/latest/serving/engine_args.html) can also be specified on the command line and will be parsed by the Hugging Face runtime.

- `--model_name`: The name of the model used on the endpoint path.
- `--model_dir`: The local path where the model is downloaded to. If `model_id` is provided, this argument will be ignored.
- `--model_id`: Hugging Face model id.
- `--model_revision`: Hugging Face model revision.
- `--tokenizer_revision`: Hugging Face tokenizer revision.
- `--dtype`: Data type to load the weights in. One of 'auto', 'float16', 'float32', 'bfloat16', 'float', 'half'. 
             Defaults to float16 for GPU and float32 for CPU systems. 'auto' uses float16 if GPU is available and uses float32 otherwise to ensure consistency between vLLM and HuggingFace backends. 
             Encoder models defaults to 'float32'. 'float' is shorthand for 'float32'. 'half' is 'float16'. The rest are as the name reads.
- `--task`: The ML task name. Can be one of 'text_generation', 'text2text_generation', 'fill_mask', 'token_classification', 'sequence_classification'. 
            If not provided, model server will try to infer the task from model architecture.
- `--backend`: The backend to use to load the model. Can be one of 'auto', 'huggingface', 'vllm'.
- `--max_model_len`: Max number of tokens the model can process/tokenize. If not mentioned, uses model's max position encodings.
- `--disable_lower_case`: Disable lower case for the tokenizer.
- `--disable_special_tokens`: The sequences will not be encoded with the special tokens relative to the model.
- `--trust_remote_code`: Allow loading of models and tokenizers with custom code.
- `--tensor_input_names`: The tensor input names passed to the model for triton inference server backend.
- `--return_token_type_ids`: Return token type ids.
- `--return_probabilities`: Return probabilities of predicted indexes. This is only applicable for tasks 'sequence_classification', 'token_classification' and 'fill_mask'.
- `--disable_log_requests`: Disable logging of requests.

### vLLM Specific Configuration

The Hugging Face runtime supports **all** vLLM engine arguments, allowing for complete customization of the vLLM backend. These arguments can be passed directly when deploying the runtime. For a comprehensive list of available parameters, refer to [vLLM's engine arguments documentation](https://docs.vllm.ai/en/latest/serving/engine_args.html).

Some frequently used vLLM parameters include:

- `--quantization`: Quantization method (e.g., 'awq', 'gptq', 'squeezellm') to reduce memory usage
- `--tensor_parallel_size`: Number of GPUs to use for tensor parallelism
- `--gpu_memory_utilization`: Target GPU memory utilization (0.0 to 1.0)
- `--max_model_len`: Maximum sequence length the model can process
- `--enforce_eager`: Run the model in eager mode instead of using CUDA graph


## Troubleshooting

Common issues and their solutions:

1. **Out of Memory (OOM) errors**:
   - Reduce batch size or use model quantization
   - Enable tensor parallelism if using multiple GPUs
   - Use a smaller model variant

2. **Slow first inference**:
   - This is expected due to model loading and CUDA initialization
   - For production, consider enabling model preloading

3. **Model incompatibility**:
   - If you see errors with vLLM backend, try forcing the Hugging Face backend with `--backend huggingface`
   - Verify your model is listed in vLLM's supported models list

4. **API compatibility issues**:
   - Check that your requests match the OpenAI API format
   - Verify endpoint URLs include the correct prefix (default: "openai")

For more help, check the KServe troubleshooting guide or [submit an issue](https://github.com/kserve/kserve/issues).
