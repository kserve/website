# Hugging Face Runtime

KServe's Hugging Face serving runtime provides optimized deployment for transformer models from the Hugging Face ecosystem, supporting both traditional ML tasks and large language model inference.

## Overview

The Hugging Face runtime supports:
- **Transformer Models**: BERT, GPT, T5, and thousands of pre-trained models
- **Multiple Tasks**: Text classification, NER, QA, text generation, and more
- **Model Hub Integration**: Direct deployment from Hugging Face Hub
- **GPU Acceleration**: CUDA support for faster inference
- **Streaming Support**: Real-time text generation for LLMs

## Quick Start

### Text Classification

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "huggingface-bert"
spec:
  predictor:
    huggingface:
      storageUri: "hf://bert-base-uncased"
      env:
      - name: TASK
        value: "text-classification"
```

### Text Generation (LLM)

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "huggingface-gpt2"
spec:
  predictor:
    huggingface:
      storageUri: "hf://gpt2"
      env:
      - name: TASK
        value: "text-generation"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 8Gi
```

## Supported Tasks

| Task                     | Model Examples            | Use Cases                             |
|--------------------------|---------------------------|---------------------------------------|
| **text-classification**  | BERT, RoBERTa, DistilBERT | Sentiment analysis, spam detection    |
| **token-classification** | BERT-NER, BioBERT         | Named entity recognition, POS tagging |
| **question-answering**   | BERT-QA, DeBERTa          | Document QA, conversational AI        |
| **text-generation**      | GPT-2, GPT-Neo, CodeT5    | Text completion, code generation      |
| **text2text-generation** | T5, BART, Pegasus         | Summarization, translation            |
| **fill-mask**            | BERT, RoBERTa             | Masked language modeling              |
| **feature-extraction**   | Sentence-BERT             | Embeddings, similarity                |

## Model Storage Options

### Hugging Face Hub
```yaml
storageUri: "hf://model-name"
# Examples:
# hf://bert-base-uncased
# hf://microsoft/DialoGPT-large
# hf://facebook/bart-large-cnn
```

### Custom Storage
```yaml
storageUri: "s3://my-bucket/custom-model"
# Local model files with HF structure
```

### Private Models
```yaml
storageUri: "hf://private-org/private-model"
env:
- name: HF_TOKEN
  valueFrom:
    secretKeyRef:
      name: hf-secret
      key: token
```

## Configuration Examples

### Basic Text Classification

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sentiment-analysis"
spec:
  predictor:
    huggingface:
      storageUri: "hf://cardiffnlp/twitter-roberta-base-sentiment-latest"
      env:
      - name: TASK
        value: "text-classification"
      resources:
        requests:
          cpu: 1000m
          memory: 2Gi
        limits:
          cpu: 2000m
          memory: 4Gi
```

### Large Language Model

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "text-generator"
spec:
  predictor:
    huggingface:
      storageUri: "hf://gpt2-large"
      env:
      - name: TASK
        value: "text-generation"
      - name: MAX_LENGTH
        value: "100"
      - name: DO_SAMPLE
        value: "true"
      - name: TEMPERATURE
        value: "0.7"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 16Gi
```

### Token Classification (NER)

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "ner-model"
spec:
  predictor:
    huggingface:
      storageUri: "hf://dbmdz/bert-large-cased-finetuned-conll03-english"
      env:
      - name: TASK
        value: "token-classification"
      - name: AGGREGATION_STRATEGY
        value: "simple"
```

## Request/Response Examples

### Text Classification

**Request:**
```json
{
  "instances": [
    "I love this movie! It's fantastic.",
    "This is the worst film I've ever seen."
  ]
}
```

**Response:**
```json
{
  "predictions": [
    [{"label": "POSITIVE", "score": 0.9998}],
    [{"label": "NEGATIVE", "score": 0.9995}]
  ]
}
```

### Text Generation

**Request:**
```json
{
  "instances": [
    "The future of artificial intelligence is"
  ],
  "parameters": {
    "max_length": 50,
    "temperature": 0.7,
    "do_sample": true
  }
}
```

**Response:**
```json
{
  "predictions": [
    [{
      "generated_text": "The future of artificial intelligence is bright and full of possibilities. We are seeing rapid advances in machine learning..."
    }]
  ]
}
```

### Named Entity Recognition

**Request:**
```json
{
  "instances": [
    "Apple Inc. was founded by Steve Jobs in Cupertino, California."
  ]
}
```

**Response:**
```json
{
  "predictions": [
    [
      {"entity": "B-ORG", "score": 0.9998, "word": "Apple", "start": 0, "end": 5},
      {"entity": "I-ORG", "score": 0.9995, "word": "Inc.", "start": 6, "end": 10},
      {"entity": "B-PER", "score": 0.9999, "word": "Steve", "start": 25, "end": 30},
      {"entity": "I-PER", "score": 0.9998, "word": "Jobs", "start": 31, "end": 35},
      {"entity": "B-LOC", "score": 0.9997, "word": "Cupertino", "start": 39, "end": 48},
      {"entity": "B-LOC", "score": 0.9996, "word": "California", "start": 50, "end": 60}
    ]
  ]
}
```

## Environment Variables

| Variable           | Description                    | Default  |
|--------------------|--------------------------------|----------|
| `TASK`             | HuggingFace task type          | Required |
| `MAX_LENGTH`       | Max generation length          | `20`     |
| `TEMPERATURE`      | Sampling temperature           | `1.0`    |
| `DO_SAMPLE`        | Enable sampling                | `false`  |
| `TOP_K`            | Top-k sampling                 | `50`     |
| `TOP_P`            | Top-p sampling                 | `1.0`    |
| `HF_TOKEN`         | Hugging Face API token         | None     |
| `RETURN_FULL_TEXT` | Return full text in generation | `true`   |

## Advanced Features

### Model Optimization

```yaml
env:
- name: TORCH_DTYPE
  value: "float16"  # Use half precision
- name: DEVICE_MAP
  value: "auto"     # Automatic GPU assignment
```

### Custom Model Configuration

```yaml
env:
- name: MODEL_REVISION
  value: "main"     # Specific model revision
- name: TRUST_REMOTE_CODE
  value: "true"     # Allow custom model code
```

### Streaming Responses

For text generation with streaming:

```python
import requests
import json

def stream_generate(prompt, url):
    data = {
        "instances": [prompt],
        "parameters": {
            "max_length": 100,
            "stream": True
        }
    }
    
    response = requests.post(
        url + "/v1/models/model:predict",
        json=data,
        stream=True
    )
    
    for line in response.iter_lines():
        if line:
            yield json.loads(line)
```

## Performance Optimization

### GPU Configuration

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
env:
- name: CUDA_VISIBLE_DEVICES
  value: "0"
- name: TORCH_CUDA_ARCH_LIST
  value: "7.0;7.5;8.0"
```

### Memory Management

```yaml
env:
- name: TORCH_CUDA_MEMORY_FRACTION
  value: "0.8"
- name: TRANSFORMERS_CACHE
  value: "/tmp/transformers_cache"
```

### Model Quantization

```yaml
env:
- name: LOAD_IN_8BIT
  value: "true"
- name: LOAD_IN_4BIT
  value: "false"
```

## Multi-Node Deployment

For large models requiring multiple GPUs:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "large-llm"
spec:
  predictor:
    huggingface:
      storageUri: "hf://facebook/opt-30b"
      env:
      - name: TASK
        value: "text-generation"
      - name: DEVICE_MAP
        value: "auto"
      resources:
        limits:
          nvidia.com/gpu: 4
          memory: 64Gi
```

## Custom Models

### Local Model Structure

```
model/
├── config.json
├── pytorch_model.bin
├── tokenizer.json
├── tokenizer_config.json
└── vocab.txt
```

### Custom Pipeline

```python
# custom_pipeline.py
from transformers import pipeline

def create_pipeline():
    return pipeline(
        "text-classification",
        model="./model",
        tokenizer="./model",
        return_all_scores=True
    )
```

## Monitoring and Debugging

### Health Checks

```bash
# Model status
curl https://$SERVICE_HOSTNAME/v1/models/model

# Test inference
curl -X POST https://$SERVICE_HOSTNAME/v1/models/model:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": ["Hello world"]}'
```

### Debug Mode

```yaml
env:
- name: LOG_LEVEL
  value: "DEBUG"
- name: TRANSFORMERS_VERBOSITY
  value: "debug"
```

## Best Practices

1. **Model Selection**: Choose appropriate model size for your hardware
2. **Quantization**: Use quantized models for production deployment
3. **Caching**: Configure model caching to reduce startup time
4. **Resource Limits**: Set appropriate GPU/memory limits
5. **Monitoring**: Monitor inference latency and throughput
6. **Security**: Use secure token storage for private models

## Troubleshooting

### Common Issues

**Out of Memory:**
```yaml
# Use smaller model or enable quantization
env:
- name: LOAD_IN_8BIT
  value: "true"
```

**Slow Loading:**
```yaml
# Enable model caching
env:
- name: TRANSFORMERS_CACHE
  value: "/models/cache"
```

**Token Errors:**
```yaml
# Increase max token length
env:
- name: MAX_LENGTH
  value: "512"
```

## Next Steps

- Learn about [Custom Predictors](../custom/custom_model/README.md)
- Explore [Model Optimization](../../autoscaling/autoscaling.md)
- Configure [Multi-Model Serving](../../mms/multi-model-serving.md)
- Set up [Model Monitoring](../../observability/prometheus_metrics.md)
