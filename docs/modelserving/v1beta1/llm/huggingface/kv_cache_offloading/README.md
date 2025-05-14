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
- A Kubernetes cluster with KServe v0.15.1 or later installed ([KServe installation guide](../../../../../admin/serverless/serverless))
- Huggingface vLLM backend enabled in your KServe deployment


## Example: End-to-End LMCache Integration with KServe and Remote Backends

Below is a step-by-step guide with example Kubernetes YAML manifests to set up LMCache with the Huggingface vLLM backend in KServe. You can use either Redis or an LMCache server as the remote storage backend for the KV cache. This setup enables distributed and persistent KV cache offloading across multiple inference service instances, improving efficiency for multi-turn and high-throughput LLM workloads.

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

### Step 2: Create Huggingface Secret (HF_TOKEN)
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

### Step 3: Deploy Redis Backend
Redis is used as the remote, persistent backend for LMCache. The following manifest deploys a single Redis instance and exposes it as a Kubernetes service.

```yaml
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

### Step 3 Alternative: Using LMCache Server as Remote Backend
Alternatively, you can deploy an LMCache server as the remote backend. This is useful if you want to avoid Redis and use LMCache's own server implementation for remote KV cache storage.

#### Deploy the LMCache server:
```yaml
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
          image: kserve/huggingfaceserver:v0.15.1
          command:
            - lmcache_experimental_server
            - "0.0.0.0"
            - 8080
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

#### Update the LMCache ConfigMap:
Change the `remote_url` in your LMCache config to point to the LMCache server:
```yaml
remote_url: "lm://lmcache-server.default.svc.cluster.local:8080"
```

### Step 4: Deploy Huggingface vLLM InferenceService with LMCache
This manifest configures the KServe InferenceService to use the Huggingface vLLM backend, with LMCache enabled for KV cache offloading. The LMCache config is mounted as a volume, and relevant environment variables are set for integration. The `--kv-transfer-config` argument enables LMCache as the connector for both local and remote cache roles.

```yaml
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
        - --kv-transfer-config='{"kv_connector":"LMCacheConnectorV1", "kv_role":"kv_both"}'
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
      resources:
        limits:
          cpu: 6
          memory: 24Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: 6
          memory: 24Gi
          nvidia.com.gpu: "1"
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

### Step 5: Verify the Setup with an Inference Request
Once all resources are deployed and running, you can test the end-to-end setup by sending a sample inference request to your KServe endpoint. This example uses the OpenAI-compatible API route:

```sh
curl -X 'POST' \
'http://localhost:8000/openai/v1/chat/completions' \
-H 'accept: application/json' \
-H 'Content-Type: application/json' \
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

### LMCache Configuration Options
LMCache can be configured via environment variables (prefixed with `LMCACHE_`) or through a YAML config file. If both are present, the config file takes precedence. For a full list of configuration options, see the [LMCache Configuration Documentation](https://docs.lmcache.ai/api_reference/configurations.html).

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

