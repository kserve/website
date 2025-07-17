---
title: Overview
description: Deploy Hugging Face models with KServe
---

# Hugging Face LLM Serving Runtime

The Hugging Face serving runtime can serve Hugging Face models out of the box. The preprocess and post-process handlers are implemented based on different predictive inference tasks, for example text classification, token-classification and fill-mask and more.

## Hugging Face Predictor

KServe supports deploying Hugging Face models using a specialized predictor that integrates with the Hugging Face `transformers` library. This allows you to deploy pre-trained models directly from the Hugging Face Hub or your own custom models.

## Supported NLP Tasks

The following NLP tasks are supported out of the box:

- **Text Classification**: Classify text into predefined categories
- **Token Classification**: Classify individual tokens in text (e.g., Named Entity Recognition)
- **Fill-Mask**: Predict masked tokens in text

## API Endpoints
Predictive inference tasks like token classification, sequence classification, and fill mask are served using KServe's [Open Inference Protocol](../../../../concepts/architecture/data-plane/v2-protocol/v2-protocol.md) or [V1 API](../../../../concepts/architecture/data-plane/v1-protocol.md).

:::tip
The Hugging Face runtime supports OpenAI Endpoints as well for generative tasks. For more information, see the [Hugging Face Generative Inference documentation](../../../generative-inference/overview.md).
:::

## Environment Variables

The Hugging Face runtime image has the following environment variables set by default:

| Variable                     | Default  | Description                        |
|------------------------------|----------|------------------------------------|
| `SAFETENSORS_FAST_GPU`       | Enabled  | Improves model loading performance |
| `HF_HUB_DISABLE_TELEMETRY`   | Enabled  | Disables telemetry data collection |

## Examples
The following examples demonstrate how to deploy and perform inference using the Hugging Face runtime with different predictive inference tasks:

- [Token Classification using BERT](./token-classification/token-classification.md)
- [Sequence Classification (Text Classification) using distilBERT](./text-classification/text-classification.md)
- [Fill Mask using BERT](./fill-mask/fill-mask.md)


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
- `--disable_postprocess`: Disable post-processing of model outputs. This is useful for tasks where raw logits are needed. This is only applicable for tasks 'sequence_classification', 'token_classification' and 'fill_mask'.
- `--disable_log_requests`: Disable logging of requests.

## Next Steps

Explore specific NLP tasks and deployment options:

- [Text Classification](./text-classification/text-classification.md)
- [Token Classification](./token-classification/token-classification.md)
- [Fill-Mask](./fill-mask/fill-mask.md)
