# Hugging Face LLM Serving Runtime
The Hugging Face serving runtime can serve Hugging Face models out of the box.
The preprocess and post-process handlers are implemented based on different predictive inference tasks, for example text classification,
token-classification and fill-mask.

## Supported ML Tasks
The Hugging Face runtime supports the following predictive inference tasks:

- Fill Mask
- Token Classification
- Sequence Classification (Text Classification)

## API Endpoints
Predictive inference tasks like token classification, sequence classification, and fill mask are served using KServe's [Open Inference Protocol](../../../data_plane/v2_protocol.md) or [V1 API](../../../data_plane/v1_protocol.md).

## Examples
The following examples demonstrate how to deploy and perform inference using the Hugging Face runtime with different predictive inference tasks:

- [Token Classification using BERT](token_classification/README.md)
- [Sequence Classification (Text Classification) using distilBERT](text_classification/README.md)
- [Fill Mask using BERT](fill_mask/README.md)

!!! note
    The Hugging Face runtime image has the following environment variables set by default:
    
    1. `SAFETENSORS_FAST_GPU` is set by default to improve the model loading performance.
    2. `HF_HUB_DISABLE_TELEMETRY` is set by default to disable the telemetry.


## Hugging Face Runtime Arguments

Below, you can find an explanation of command line arguments which are supported by the Hugging Face runtime. [vLLM backend engine arguments](https://docs.vllm.ai/en/latest/serving/engine_args.html) can also be specified on the command line and will be parsed by the Hugging Face runtime.

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
