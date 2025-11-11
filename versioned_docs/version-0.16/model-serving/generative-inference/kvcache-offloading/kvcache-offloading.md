---
title: KV Cache Offloading
description: Learn how to set up KV cache offloading with Huggingface vLLM backend in KServe
---

# KV Cache Offloading with Huggingface vLLM Backend

## Overview
Key-Value (KV) cache offloading is a technique used in large language model (LLM) serving to store and reuse the intermediate key and value tensors generated during model inference. In transformer-based models, these KV caches represent the context for each token processed, and reusing them allows the model to avoid redundant computations for repeated or similar prompts.

By enabling KV cache offloading across multiple requests and serving instances, you can achieve:

- **Reduced Latency:** Faster inference and lower prefill delay (Time To First Token, TTFT) by skipping repeated computation for overlapping context.
- **Lower GPU Utilization:** Less computation per request, freeing up GPU resources for more users or larger models.
- **Efficient Memory Usage:** Centralized, deduplicated cache storage reduces overall memory footprint.
- **Scalability:** Multiple inference servers can access and update the same cache, supporting distributed, high-throughput deployments.
- **Improved User Experience:** Especially beneficial for multi-turn QA, retrieval-augmented generation (RAG), and scenarios with repeated or similar prompts.

This document provides a guide on how to set up [LMCache](https://docs.lmcache.ai/index.html) and offload KV cache across multiple instances with the Huggingface vLLM backend in KServe. By combining LMCache with vLLM, you can achieve significant reductions in prefill delay and GPU utilization, especially for multi-round QA and RAG workloads.

Support for LMCache with vLLM backend was added in [KServe PR #4320](https://github.com/kserve/kserve/pull/4320).


## Prerequisites
- A Kubernetes cluster with [KServe v0.15.1](../../../getting-started/quickstart-guide.md) or later installed.


## Example: End-to-End LMCache Integration with KServe and Remote Backends

Below is a step-by-step guide with example Kubernetes YAML manifests to set up LMCache with the Huggingface vLLM backend in KServe. You can use either Redis or an LMCache server as the remote storage backend for the KV cache. This setup enables distributed and persistent KV cache offloading across multiple inference service instances, improving efficiency for multi-turn and high-throughput LLM workloads.

### Create Huggingface Secret (HF_TOKEN)
If your model requires authentication (e.g., downloading from Huggingface Hub), create a Kubernetes Secret for your Huggingface token. This secret will be mounted as an environment variable in the inference container.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hf-secret
  # namespace: kserve
stringData:
  HF_TOKEN: xxxxxx  # Replace with your actual Huggingface token
```
Apply the secret:
```sh
kubectl apply -f hf_secret.yaml
```

### LMCache Configuration Options
LMCache can be configured via environment variables (prefixed with `LMCACHE_`) or through a YAML config file. If both are present, the config file takes precedence. For a full list of configuration options, see the [LMCache Configuration Documentation](https://docs.lmcache.ai/api_reference/configurations.html).

### Using Redis as Remote Backend
The LMCache configuration is stored in a Kubernetes ConfigMap. This config enables local CPU caching and sets Redis as the remote backend for offloading KV cache. Adjust `chunk_size` and `max_local_cpu_size` as needed for your workload and hardware.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lmcache-config
data:
  lmcache_config.yaml: |
    local_cpu: true  # Enable local CPU RAM cache for fast access (Recommended)
    chunk_size: 256  # Size of cache chunks (tune for your model)
    max_local_cpu_size: 2.0  # Max size (GB) for local CPU cache
    remote_url: "redis://redis.default.svc.cluster.local:6379"  # Redis as remote backend
    remote_serde: "naive"  # Serialization method for remote cache. Supported values: "naive", "cachegen"
```
Apply the ConfigMap:
```sh
kubectl apply -f lmcache_config.yaml
```

#### Deploy Redis Backend
Redis is used as the remote, persistent backend for LMCache. The following manifest deploys a single Redis instance and exposes it as a Kubernetes service.

```yaml title="redis_deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:latest
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
    - protocol: TCP
      port: 6379
      targetPort: 6379
```
Apply the Redis deployment and service:
```sh
kubectl apply -f redis_deployment.yaml
```

Wait for the Redis pod to be ready:
```sh
kubectl get pods -l app=redis
```
:::tip[Expected Output]

```sh
NAME                     READY   STATUS    RESTARTS   AGE
redis-ajlfsf             1/1     Running   0          5m
```

:::

### Using LMCache Server as Remote Backend
Alternatively, you can deploy an LMCache server as the remote backend. This is useful if you want to avoid Redis and use LMCache's own server implementation for remote KV cache storage.

#### Deploy LMCache Server
```yaml title="lmcache_server.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lmcache-server
  labels:
    app: lmcache-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lmcache-server
  template:
    metadata:
      labels:
        app: lmcache-server
    spec:
      containers:
        - name: lmcache-server
          image: kserve/huggingfaceserver:v0.15.1-gpu
          command: ["lmcache_experimental_server"]
          args:
            - "0.0.0.0"
            - "8080"
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: lmcache-server
spec:
  selector:
    app: lmcache-server
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
```
Apply the LMCache server deployment and service:
```sh
kubectl apply -f lmcache_server.yaml
```

Wait for the LMCache server pod to be ready:
```sh
kubectl get pods -l app=lmcache-server
```
:::tip[Expected Output]

```sh
NAME                     READY   STATUS    RESTARTS   AGE
lmcache-server-abc123    1/1     Running   0          5m
```

:::

Change the `remote_url` in your LMCache config to point to the LMCache server:
```yaml
remote_url: "lm://lmcache-server.default.svc.cluster.local:8080"
```

### Deploy Huggingface vLLM InferenceService with LMCache
This manifest configures the KServe InferenceService to use the Huggingface vLLM backend, with LMCache enabled for KV cache offloading. The LMCache config is mounted as a volume, and relevant environment variables are set for integration. The `--kv-transfer-config` argument enables LMCache as the connector for both local and remote cache roles.

```yaml title="lmcache_isvc.yaml"
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    minReplicas: 2
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3
        - --model_id=meta-llama/Llama-3.2-1B-Instruct
        - --max-model-len=10000
        - --kv-transfer-config
        - '{"kv_connector":"LMCacheConnectorV1", "kv_role":"kv_both"}'
        - --enable-chunked-prefill
      env:
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-secret
              key: HF_TOKEN
              optional: false
        - name: LMCACHE_USE_EXPERIMENTAL
          value: "True"
        - name: LMCACHE_CONFIG_FILE
          value: /lmcache/lmcache_config.yaml
        # Uncomment the following lines and comment the above env variable to provide configuration via env variables instead of ConfigMap.
        # - name: LMCACHE_REMOTE_URL
        #   value: redis://redis.default.svc.cluster.local:6379
        # - name: LMCACHE_REMOTE_SERDE
        #   value: naive
        # - name: LMCACHE_LOCAL_CPU
        #   value: "True"
        # - name: LMCACHE_CHUNK_SIZE
        #   value: "256"
        # - name: LMCACHE_MAX_LOCAL_CPU_SIZE
        #   value: "2.0"
        - name: LMCACHE_LOG_LEVEL
          value: "INFO"
      resources:
        limits:
          cpu: 6
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: 6
          memory: 24Gi
          nvidia.com/gpu: "1"
      volumeMounts:
        - name: lmcache-config-volume
          mountPath: /lmcache
          readOnly: true
    volumes:
      - name: lmcache-config-volume
        configMap:
          name: lmcache-config
          items:
            - key: lmcache_config.yaml
              path: lmcache_config.yaml
```
Apply the InferenceService:
```sh
kubectl apply -f lmcache_isvc.yaml
```

Wait for the InferenceService to be ready:
```sh
kubectl get isvc huggingface-llama3
```

:::tip[Expected Output]

```sh
NAME                  URL                                                 READY   REASON
huggingface-llama3   http://huggingface-llama3.default.example.com        True
```

:::

### Verify the Setup with an Inference Request
Once all resources are deployed and running, you can test the end-to-end setup by sending a sample inference request to your KServe endpoint. This example uses the OpenAI-compatible API route:

```sh
curl -X 'POST' \
'http://localhost:8000/openai/v1/chat/completions' \
-H 'accept: application/json' \
-H 'Content-Type: application/json' \
-H 'Host: huggingface-llama3.default.example.com' \
-d '{
      "model": "llama3",
      "messages": [
        {"role": "system", "content": "You are a helpful AI coding assistant."},
        {"role": "user", "content": "Write a segment tree implementation in python"}
      ],
      "max_tokens": 150
    }'
```

If the setup is correct, you should receive a model-generated response, and the KV cache will be shared and offloaded via LMCache and Redis.

:::tip[Expected Output]

```json
{
  "id": "chatcmpl-cb8006bc-928e-4d16-b129-6fa84b3e1772",
  "object": "chat.completion",
  "created": 1747385160,
  "model": "llama3",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "reasoning_content": null,
        "content": "**Segment Tree Implementation in Python**\n=====================================================\n\nA segment tree is a data structure used for efficient range queries on a set of elements. Here's a Python implementation of a segment tree using the in-order traversal approach.\n\n**Code**\n--------\n\n```python\nclass Node:\n    \"\"\"Represents a node in the segment tree.\"\"\"\n    def __init__(self, value, left=None, right=None, parent=None):\n        self.value = value\n        self.left = left\n        self.right = right\n        self.parent = parent\n\nclass SegmentTree:\n    \"\"\"Represents a segment tree with in-order traversal.\"\"\"\n    def __init__(self, arr, id):\n        \"\"\"\n        Initializes the segment tree with the given array and ID.\n\n        :",
        "tool_calls": []
      },
      "logprobs": null,
      "finish_reason": "length",
      "stop_reason": null
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "total_tokens": 200,
    "completion_tokens": 150,
    "prompt_tokens_details": null
  },
  "prompt_logprobs": null
}
```

:::

You can also check the Redis instance to see the cached KV pairs. Use a Redis client or CLI to connect to the Redis service and run commands like `KEYS *` or `GET <key>` to inspect the cache.

```sh
kubectl exec deploy/redis -it -- redis-cli
```

```sh
# Show all keys
localhost:6379> KEYS *
1) "vllm@meta-llama/Llama-3.2-1B-Instruct@1@0@02783dafec...kv_bytes"
2) "vllm@meta-llama/Llama-3.2-1B-Instruct@1@0@02783dafec...metadata"
```

If you look at the logs of your Huggingface server, you should see the cache store/hit logs (the logs are truncated for cleanliness):
```sh
kubectl logs -f <pod-name> -c kserve-container
```
:::tip[Expected Output]

```
# Cold LMCache Miss and then Store

[2025-05-16 08:46:00,417] LMCache INFO: Reqid: chatcmpl-cb8006bc-928e-4d16-b129-6fa84b3e1772, Total tokens 50, LMCache hit tokens: 0, need to load: 0 (vllm_v1_adapter.py:543:lmcache.integration.vllm.vllm_v1_adapter)
[2025-05-16 08:46:00,450] LMCache INFO: Storing KV cache for 50 out of 50 tokens for request chatcmpl-cb8006bc-928e-4d16-b129-6fa84b3e1772 (vllm_v1_adapter.py:497:lmcache.integration.vllm.vllm_v1_adapter)

# Warm LMCache Hit!!

[2025-05-16 09:09:09,550] LMCache INFO: Reqid: chatcmpl-fabe706e-f030-4af3-b562-38712d9b86a9, Total tokens 50, LMCache hit tokens: 49, need to load: 49 (vllm_v1_adapter.py:543:lmcache.integration.vllm.vllm_v1_adapter)
```

:::

### Other Supported Storage Backends
LMCache supports additional remote storage backends such as MoonCake, InfiniStore, ValKey, Redis Sentinel, and more. For details and configuration examples, refer to the [official documentation](https://docs.lmcache.ai/api_reference/configurations.html) and the following links:

- [Redis](https://docs.lmcache.ai/kv_cache/redis.html)
- [Redis Sentinel](https://docs.lmcache.ai/kv_cache/redis.html#redis-sentinel)
- [InfiniStore](https://docs.lmcache.ai/kv_cache/infinistore.html)
- [MoonCake](https://docs.lmcache.ai/kv_cache/mooncake.html)
- [ValKey](https://docs.lmcache.ai/kv_cache/valkey.html)

## Troubleshooting & Tips
- See the [LMCache Troubleshoot Guide](https://docs.lmcache.ai/getting_started/troubleshoot.html) and [FAQ](https://docs.lmcache.ai/getting_started/faq.html)

## Next Steps
- Explore more advanced use cases and configurations in the [LMCache Documentation](https://docs.lmcache.ai/index.html)
- For advanced storage backends (CPU RAM, local storage, Redis, InfiniStore, etc.), refer to the [KV Cache Offloading and Sharing](https://docs.lmcache.ai/kv_cache/cpu_ram.html) section

