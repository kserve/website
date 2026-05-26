---
sidebar_label: "Tutorials"
sidebar_position: 6
title: "LLMInferenceService Tutorials"
---

# LLMInferenceService Tutorials

These are a set of tutorial guides for deploying the KServe LLM Inference Service in a variety of configurations with a variety of models. 

All of the tutorials are present in the [KServe repo](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc) under `docs/samples/llmisvc`.

## End-to-end guide: Run GPT-OSS-20B with KServe and llm-d

[E2E GPT OSS](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/e2e-gpt-oss)

This guide walks through deploying **RedHatAI/gpt-oss-20b** on Kubernetes using [KServe](https://kserve.github.io/website/). Steps are ordered from cluster setup through inference, AI gateway routing, optional prefix caching, and monitoring.

There are 3 alternate deployments detailed here:

1. default - a deployment of intelligent inference scheduling with vLLM and the llm-d scheduler
1. precise prefix cache aware routing - an advanced configuration that takes advantage of vLLM KV-Events
1. prefill-decode disaggregation - an advanced configuration that separates vLLM pods for the prefill and the decode stages of inference.

## Single-Node GPU Deployment Examples

[Single Node GPU](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/single-node-gpu)

Contains example configurations for deploying LLM inference services on single-node GPU setups, ranging from basic load balancing to advanced prefill-decode separation with KV cache transfer.

## DeepSeek-R1 Multi-Node Deployment Examples

[DeepSeek R1 GPU RDMA RoCE](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/dp-ep/deepseek-r1-gpu-rdma-roce)

This contains example configurations for deploying the DeepSeek-R1-0528 model using data parallelism (DP) and expert parallelism (EP) across multiple nodes with GPU acceleration.

## Precise Prefix KV Cache Routing

[Precise Prefix KV Cache Routing](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/precise-prefix-kv-cache-routing)

This contains an example configuration demonstrating advanced KV cache routing with precise prefix matching to optimize inference performance by routing requests to instances with matching cached content.
