---
sidebar_label: "Overview"
title: KV Cache Offloading
description: Learn how KV cache offloading works in KServe and which setup fits your use case
---

# KV Cache Offloading

## Overview

Key-Value (KV) cache offloading is a technique used in large language model (LLM) serving to store and reuse the intermediate key and value tensors generated during model inference. In transformer-based models, these KV caches represent the context for each token processed, and reusing them allows the model to avoid redundant computations for repeated or similar prompts.

By enabling KV cache offloading across multiple requests and serving instances, you can achieve:

- **Reduced Latency:** Faster inference and lower prefill delay (Time To First Token, TTFT) by skipping repeated computation for overlapping context.
- **Lower GPU Utilization:** Less computation per request, freeing up GPU resources for more users or larger models.
- **Efficient Memory Usage:** Centralized, deduplicated cache storage reduces overall memory footprint.
- **Scalability:** Multiple inference servers can access and update the same cache, supporting distributed, high-throughput deployments.
- **Improved User Experience:** Especially beneficial for multi-turn QA, retrieval-augmented generation (RAG), and scenarios with repeated or similar prompts.

KServe supports KV cache offloading for the Huggingface vLLM backend using [LMCache](https://docs.lmcache.ai/index.html), in two ways — see below.

## Choose a Setup

There are two ways to wire up LMCache with an `InferenceService`:

| | [Manual Setup](./kvcache-offloading-manual.md) | [LMCache Operator](./kvcache-offloading-operator.md) |
|---|---|---|
| Scope | Per `InferenceService` | Cluster-level, shared across `InferenceService`s |
| How it's configured | Static `--kv-transfer-config` argument, plus your own Redis or `lmcache_experimental_server` Deployment as the remote backend | A cluster-level `LMCacheEngine` custom resource; a mutating webhook injects the connector config automatically |
| Best for | A single `InferenceService`, full manual control over the exact config | Managing LMCache across many `InferenceService`s without repeating config |

## Next Steps

- [Manual Setup with Huggingface vLLM Backend](./kvcache-offloading-manual.md)
- [KV Cache Offloading with the LMCache Operator](./kvcache-offloading-operator.md)
- Explore more advanced use cases and configurations in the [LMCache Documentation](https://docs.lmcache.ai/index.html)
