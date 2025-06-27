---
title: Embedding
description: Learn how to deploy and serve embedding models for vector representation tasks using KServe's Hugging Face LLM Serving Runtime
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Text Embeddings with Sentence Transformers

Text embeddings are numerical representations of text that capture semantic meaning in vector form. These embeddings are essential for various machine learning applications including semantic search, clustering, recommendation systems, and similarity analysis. This guide demonstrates how to deploy a Sentence Transformer model for generating text embeddings using KServe's flexible inference runtimes.

## Understanding Embedding Models

Embeddings transform text into high-dimensional vector spaces where semantically similar texts are positioned closer together. This mathematical representation enables machines to understand relationships between words and sentences based on their meaning rather than just lexical matching.

KServe supports different embedding models through its serving runtimes:

1. **Sentence Transformers**: These models are specifically trained to generate meaningful sentence embeddings and are widely used for semantic similarity tasks.
2. **General-purpose LLMs**: Some large language models can also generate embeddings as one of their capabilities.

## Prerequisites

Before getting started, ensure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- GPU resources available for model inference (recommended for better performance).
- Basic familiarity with vector embeddings concepts.

## Create a Hugging Face Secret (Optional)
If you plan to use private models from Hugging Face, you need to create a Kubernetes secret containing your Hugging Face API token. This step is optional for public models.
```bash
kubectl create secret generic hf-secret \
  --from-literal=HF_TOKEN=<your_huggingface_token>
```

## Create a StorageContainer (Optional)

For models that require authentication, you might need to create a `ClusterStorageContainer`. While the model in this example is public, for private models you would need to configure access:

```yaml title="huggingface-storage.yaml"
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    env:
      - name: HF_TOKEN
        valueFrom:
          secretKeyRef:
            key: HF_TOKEN
            name: hf-secret
    image: kserve/huggingfacehub-storage-initializer:latest
    resources:
      limits:
        memory: 512Mi
      requests:
        memory: 256Mi
```
<!-- TODO: FIX DOC LINK -->
To know more about storage containers, refer to the [Storage Containers documentation](../../../concepts/storage_containers.md).

## Deploy Embedding Model

### Understanding Backend Options

KServe supports two inference backends for serving LLMs. This guide covers two primary options:

1. **vLLM Backend** (default): This is the recommended backend for serving LLMs, providing optimized performance and lower latency. It supports advanced features like model parallelism and efficient memory management.
2. **Hugging Face Backend**: This backend uses the standard Hugging Face library. It is suitable for simpler use cases but may not perform as well as vLLM for larger models or high concurrency scenarios.

Please refer to the overview of [KServe's generative inference capabilities](../../overview.md) for more details on these backends.

Choose the appropriate backend for your embedding model deployment:

:::note
Note that the backends use different values for the `--task` argument. The vLLM backend uses `embed`, while the Hugging Face backend uses `text_embedding`. Ensure you use the correct one based on your deployment choice.
:::

<Tabs>
<TabItem value="vllm" label="vLLM Backend (Recommended)" default>

For embedding models, the vLLM backend provides high-performance embedding generation with optimized CUDA kernels:

```yaml title="embedding-vllm.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: embedding-model
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=sentence-transformer
        - --task=embed
      storageUri: "hf://sentence-transformers/all-MiniLM-L6-v2"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 1Gi
          nvidia.com/gpu: "1"
```

Apply the YAML:

```bash
kubectl apply -f embedding-vllm.yaml
```

</TabItem>
<TabItem value="huggingface" label="Hugging Face Backend">

If you prefer to use the standard Hugging Face inference pipeline, specify the backend explicitly:

```yaml title="embedding-hf.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: embedding-model
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=sentence-transformer
        - --task=text_embedding
        - --backend=huggingface
      storageUri: "hf://sentence-transformers/all-MiniLM-L6-v2"
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 1Gi
          nvidia.com/gpu: "1"
```

Apply the YAML:

```bash
kubectl apply -f embedding-hf.yaml
```

</TabItem>
</Tabs>

## Verifying Deployment

Check that your InferenceService is ready:

```bash
kubectl get inferenceservices embedding-model
```

:::tip Expected Output
```
NAME              URL                                              READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                      AGE
embedding-model   http://embedding-model.default.example.com       True           100                              embedding-model-predictor-default-xjh8p   3m
```
:::

Wait until the `READY` column shows `True` before proceeding.

## Making Inference Requests

Sentence Transformer models support API endpoints for generating embeddings. The request format varies slightly based on the backend you chose. Set up your environment variables first:

```bash
# Set up service hostname for requests
SERVICE_NAME="embedding-model"
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${SERVICE_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Determine your ingress information as per [KServe documentation](../../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT` accordingly.

### Generating Text Embeddings

You can generate embeddings for a single sentence or multiple sentences in a single request:

```bash
curl -H "Content-Type: application/json" \
-H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/embeddings \
-d '{
  "model": "sentence-transformer",
  "input": "This is an example sentence for embedding generation."
}'
```

:::tip[Expected Output]
The response will contain the generated embedding vector:
```json
{ 
  "id":"embd-0d91c708-eb5b-4d60-ac08-c9a227ec09c4",
  "object": "list",
  "created":1750840715,
  "data": [
    {
      "object": "embedding",
      "embedding": [
        0.007899402640759945,
        0.008340050466358662,
        0.035796716809272766,
        ... // 384-dimensional vector continues
        0.09077603369951248,
        0.03257409855723381,
        -0.02999882400035858
      ],
      "index": 0
    }
  ],
  "model": "sentence-transformer",
  "usage": {
    "prompt_tokens": 13,
    "total_tokens": 13,
    "completion_tokens": 0,
    "prompt_tokens_details":null
  }
}
```
:::

## Use Cases for Embeddings

Embeddings generated with this model can be used for:

1. **Semantic Search**: Index documents and perform similarity-based searches
2. **Text Clustering**: Group similar documents together
3. **Recommendation Systems**: Find content similar to user preferences
4. **Data Analysis**: Visualize text relationships through dimensionality reduction techniques
5. **Downstream ML Tasks**: Use embeddings as features for classification or regression models

You can store these embeddings in vector databases like Pinecone, Weaviate, or Milvus for efficient similarity searches at scale.

## Troubleshooting

Common issues and solutions:

- **OOM errors**: Increase the memory allocation in the InferenceService specification
- **Pending Deployment**: Ensure your cluster has enough GPU resources available
- **Model not found**: Double-check your model ID and ensure it's publicly available
- **Incorrect vector dimensions**: Verify that your application expects vectors of the same dimension that the model produces

## Next Steps

Once you've successfully deployed your embedding model, consider:

- **Advanced serving options** like [multi-node inference](../../multi-node/multi-node.md) for large models
- **Exploring other inference tasks** such as [text-to-text generation](../text2text-generation/text2text-generation.md) and [reranking](../reranking/rerank.md)
- **Optimizing performance** with features like [model caching](../../modelcache/localmodel.md) and [KV cache offloading](../../kvcache-offloading/kvcache-offloading.md)
- **Auto-scaling** your inference services based on traffic patterns using [KServe's auto-scaling capabilities](../../autoscaling/autoscaling.md)
- **Token based rate limiting** to control usage with [AI Gateway](../../ai-gateway/envoy-ai-gateway.md) for serving models.

For more information on KServe's capabilities for generative AI, see the [generative inference overview](../../overview.md).
