# Hugging Face LLM Serving Runtime
The Hugging Face serving runtime implements two backends namely `Hugging Face` and `vLLM` that can serve Hugging Face models out of the box.
The preprocess and post-process handlers are already implemented based on different ML tasks, for example text classification,
token-classification, text-generation, text2text-generation, fill-mask.

KServe Hugging Face runtime by default uses [`vLLM`](https://github.com/vllm-project/vllm) backend to serve `text generation` and `text2text generation` LLM models for faster time-to-first-token (TTFT) and higher token generation throughput than the Hugging Face API.
vLLM is implemented with common inference optimization techniques, such as [PagedAttention](https://vllm.ai), [continuous batching](https://www.anyscale.com/blog/continuous-batching-llm-inference) and an optimized CUDA kernel.
If the model is not supported by the vLLM engine, KServe falls back to the Hugging Face backend as a failsafe.

## Supported ML Tasks
The Hugging Face runtime supports the following ML tasks:

- Text Generation
- Text2Text Generation
- Fill Mask
- Token Classification
- Sequence Classification (Text Classification)

For information on the models supported by the vLLM backend, please visit [vLLM's documentation](https://docs.vllm.ai/en/stable/models/supported_models.html).


## API Endpoints
Both of the backends support serving generative models (text generation and text2text generation) using [OpenAI's Completion](https://platform.openai.com/docs/api-reference/completions) and [Chat Completion](https://platform.openai.com/docs/api-reference/chat) API.

The other types of tasks like token classification, sequence classification, and fill mask are served using KServe's [Open Inference Protocol](../../../data_plane/v2_protocol.md) or [V1 API](../../../data_plane/v1_protocol.md).

## Examples
The following examples demonstrate how to deploy and perform inference using the Hugging Face runtime with different ML tasks:

- [Text Generation using LLama3](text_generation/README.md)
- [Text2Text Generation using T5](text2text_generation/README.md)
- [Token Classification using BERT](token_classification/README.md)
- [Sequence Classification (Text Classification) using distilBERT](text_classification/README.md)
- [Fill Mask using BERT](fill_mask/README.md)
- [SDK Integration](sdk_integration/README.md)
- [Multi-Node Multi-GPU using Ray](multi-node/README.md)

!!! note
    The Hugging Face runtime image has the following environment variables set by default:
    
    1. `SAFETENSORS_FAST_GPU` is set by default to improve the model loading performance.
    2. `HF_HUB_DISABLE_TELEMETRY` is set by default to disable the telemetry.


## Hugging Face Runtime Arguments

Below, you can find an explanation of command line arguments which are supported by the Hugging Face runtime. [vLLM backend engine arguments](https://docs.vllm.ai/en/latest/models/engine_args.html) can also be specified on the command line and will be parsed by the Hugging Face runtime.

- `--model_name`: The name of the model used on the endpoint path.
- `--model_dir`: The local path where the model is downloaded to. If `model_id` is provided, this argument will be ignored.
- `--model_id`: Hugging Face model id.
- `--model_revision`: Hugging Face model revision.
- `--tokenizer_revision`: Hugging Face tokenizer revision.
- `--dtype`: Data type to load the weights in. One of 'auto', 'float16', 'float32', 'bfloat16', 'float', 'half'. 
             Defaults to float16 for GPU and float32 for CPU systems. 'auto' uses float16 if GPU is available and uses float32 otherwise to ensure consistency between vLLM and HuggingFace backends. 
             Encoder models defaults to 'float32'. 'float' is shorthand for 'float32'. 'half' is 'float16'. The rest are as the name reads.
- `--task`: The ML task name. Can be one of 'text_generation', 'text2text_generation', 'fill_mask', 'token_classification', 'sequence_classification'. 
            If not provided, model server will try infer the task from model architecture.
- `--backend`: The backend to use to load the model. Can be one of 'auto', 'huggingface', 'vllm'.
- `--max_length`: Max sequence length for the tokenizer.
- `--disable_lower_case`: Disable lower case for the tokenizer.
- `--disable_special_tokens`: The sequences will not be encoded with the special tokens relative to the model.
- `--trust_remote_code`: Allow loading of models and tokenizers with custom code.
- `--tensor_input_names`: The tensor input names passed to the model for triton inference server backend.
- `--return_token_type_ids`: Return token type ids.
- `--return_probabilities`: Return probabilities of predicted indexes. This is only applicable for tasks 'sequence_classification', 'token_classification' and 'fill_mask'.
