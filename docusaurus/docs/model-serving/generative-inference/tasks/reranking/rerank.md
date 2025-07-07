---
title: Rerank
description: Learn how to deploy and serve reranking models for improving search relevance using KServe's vLLM Serving Runtime
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Text Reranking with Reranker Models

Reranking is a crucial component in information retrieval systems that improves search relevance by rescoring an initial set of search results. By applying more computationally intensive semantic analysis, rerankers can significantly improve the order of search results based on their relevance to a query. This guide demonstrates how to deploy a reranker model using KServe's vLLM inference runtime.

## Understanding Reranker Models

Rerankers work by taking a query and a set of candidate documents or passages, then producing relevance scores that indicate how well each candidate answers the query. Unlike simple embedding-based similarity, rerankers perform cross-attention between the query and each candidate, allowing for more nuanced understanding of relevance.

Key benefits of reranking include:

1. **Improved Search Relevance**: By applying deeper semantic analysis than initial retrieval systems
2. **Context-Aware Scoring**: Takes into account the relationship between query and document
3. **Complementary to Embeddings**: Works well as a refinement step after embedding-based retrieval

## Prerequisites

Before getting started, ensure you have:

- A Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- GPU resources available for model inference (recommended for better performance).
- Basic familiarity with information retrieval and search concepts.

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
    name: storage-initializer
    image: kserve/storage-initializer:latest
    env:
    - name: HF_TOKEN
      valueFrom:
        secretKeyRef:
          name: hf-secret
          key: HF_TOKEN
          optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: hf://
```
<!-- TODO: FIX DOC LINK -->
To know more about storage containers, refer to the Storage Containers documentation.

## Deploy Reranker Model

### Understanding Backend Options

:::note
Only the vLLM backend currently supports the reranking task in KServe. The Hugging Face backend does not support reranking at this time.
:::

The vLLM backend is recommended for serving reranker models, providing optimized performance and lower latency. It supports advanced features like model parallelism and efficient memory management, which are particularly beneficial for reranking operations.

Please refer to the overview of [KServe's generative inference capabilities](../../overview.md) for more details on these backends.

```yaml title="reranker-vllm.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: reranker-model
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=reranker
        - --task=score
      storageUri: "hf://BAAI/bge-reranker-base"
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
kubectl apply -f reranker-vllm.yaml
```

## Verifying Deployment

Check that your InferenceService is ready:

```bash
kubectl get inferenceservices reranker-model
```

:::tip[Expected Output]
```
NAME            URL                                            READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                    AGE
reranker-model  http://reranker-model.default.example.com      True           100                              reranker-model-predictor-default-xjh8p  3m
```
:::

Wait until the `READY` column shows `True` before proceeding.

## Making Inference Requests

Reranker models accept a query and a list of passages or documents, then return relevance scores indicating how well each passage matches the query. Set up your environment variables first:

```bash
# Set up service hostname for requests
SERVICE_NAME="reranker-model"
SERVICE_HOSTNAME=$(kubectl get inferenceservice ${SERVICE_NAME} -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Determine your ingress information as per [KServe documentation](../../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT` accordingly.

### Generating Relevance Scores

To rerank a set of passages, use the following request format:

```bash
curl -H "Content-Type: application/json" \
-H "Host: ${SERVICE_HOSTNAME}" \
-v http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/rerank \
-d '{
  "model": "reranker",
  "query": "What is the capital of France?",
  "documents": [
    "Paris is the capital and most populous city of France.",
    "Berlin is the capital and largest city of Germany.",
    "The Eiffel Tower is located in Paris, France.",
    "France is a country in Western Europe."
  ],
  "top_n": 2
}'
```

:::tip[Expected Output]
The response will contain the ranked documents with their relevance scores:
```json
{
  "id": "rerank-b6aa1fc9-bc03-44c9-a5d1-da2704fe5155",
  "model": "reranker",
  "usage": {
    "total_tokens": 56
  },
  "results": [
    {
      "index": 0,
      "document": "Paris is the capital and most populous city of France.",
      "relevance_score": 1.0
    },
    {
      "index": 2,
      "document": "The Eiffel Tower is located in Paris, France.",
      "relevance_score": 0.99560546875
    }
  ]
}
```
:::

The `top_n` parameter is optional and, if provided, the response will include only the top N most relevant documents. If omitted, all documents will be returned with their relevance scores.

## Use Cases for Reranking

Reranking models can be integrated into applications for:

1. **Enhanced Search Systems**: Improve the relevance of search results in applications
2. **Question Answering**: Identify the most relevant passages that answer a user's question
3. **Content Recommendation**: Better prioritize relevant content for users
4. **Retrieval Augmented Generation (RAG)**: Improve the quality of contexts fed to LLMs for RAG pipelines

By combining embedding-based retrieval with reranking, you can create powerful hybrid search systems that balance recall and precision.

## Deployment Patterns

Common deployment patterns using reranking models include:

1. **Two-Stage Retrieval**: Use fast embedding-based retrieval to select candidate documents, then apply reranking to improve ordering
2. **Multi-Stage Ranking**: Apply multiple reranking stages with increasingly complex models
3. **Hybrid Search**: Combine keyword-based search, embedding similarity, and reranking scores

## Troubleshooting

Common issues and solutions:

- **Init:OOMKilled**: This indicates that the storage initializer exceeded the memory limits. You can try increasing the memory limits in the `ClusterStorageContainer`.
- **OOM errors**: Increase the memory allocation in the InferenceService specification
- **Pending Deployment**: Ensure your cluster has enough GPU resources available
- **Model not found**: Double-check your model ID and ensure it's publicly available

## Next Steps

Once you've successfully deployed your reranker model, consider:

- **Advanced serving options** like [multi-node inference](../../multi-node/multi-node.md) for large models
- **Exploring other inference tasks** such as [text-to-text generation](../text2text-generation/text2text-generation.md) and [embedding](../embedding/embedding.md)
- **Optimizing performance** with features like [model caching](../../modelcache/localmodel.md) and [KV cache offloading](../../kvcache-offloading/kvcache-offloading.md)
- **Auto-scaling** your inference services based on traffic patterns using [KServe's auto-scaling capabilities](../../autoscaling/autoscaling.md)
- **Token based rate limiting** to control usage with [AI Gateway](../../ai-gateway/envoy-ai-gateway.md) for serving models.

For more information on KServe's capabilities for generative AI, see the [generative inference overview](../../overview.md).
