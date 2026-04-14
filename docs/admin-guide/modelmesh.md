---
title: "ModelMesh Installation Guide"
description: "High-scale, high-density model serving for predictive inference workloads"
---

# ModelMesh Installation

ModelMesh installation provides high-scale, high-density model serving for scenarios with frequent model changes and large numbers of models, making it particularly well-suited for predictive inference workloads.

It uses a distributed architecture particularly designed for:

- High-scale model serving
- Multi-model management
- Intelligent model loading
- Efficient resource utilization
- Frequent model updates

:::info When to use ModelMesh
For generative inference (LLMs), use [Standard Kubernetes Deployment](./kubernetes-deployment.md) instead.
:::

---

## Use Cases

ModelMesh is designed for predictive inference use cases where:

- You have many models (hundreds to thousands)
- Models are frequently updated or changed
- Resource efficiency is critical
- You need intelligent model placement and caching
- Model inference times are relatively short
- Models can share computational resources efficiently

---

## Prerequisites

| Requirement | Details |
|---|---|
| Kubernetes | v1.32+ |
| kubectl | Configured with cluster admin access |
| Permissions | Cluster admin |

---

## Installation

### Option 1: Quick Install

```bash
curl -s "https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/scripts/install.sh" | bash
```

### Option 2: Manual Installation

**Step 1 — Install etcd** (model metadata storage):

```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/config/dependencies/etcd.yaml
```

**Step 2 — Install ModelMesh Serving**:

```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/config/default/modelmesh-serving.yaml
```

**Step 3 — Install KServe Controller**:

```bash
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.17.0/kserve.yaml
```

---

## Configuration

### Enable ModelMesh Mode

Set ModelMesh as the default deployment mode in KServe:

```bash
kubectl patch configmap inferenceservice-config -n kserve-system -p '{
  "data": {
    "deploy": "{\"defaultDeploymentMode\": \"ModelMesh\"}"
  }
}'
```

### Storage Configuration

Configure a model storage backend (example: MinIO/S3):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: model-storage-config
  namespace: modelmesh-serving
data:
  localMinIO: |
    {
      "type": "s3",
      "access_key_id": "minioadmin",
      "secret_access_key": "minioadmin",
      "endpoint_url": "http://minio.minio.svc.cluster.local:9000",
      "default_bucket": "modelmesh-example-models",
      "region": "us-south"
    }
```

---

## Features

### Intelligent Model Management

- **Model Caching**: Frequently accessed models stay in memory
- **LRU Eviction**: Least recently used models are evicted when memory is full
- **Predictive Loading**: Models can be pre-loaded based on usage patterns

### High Density Serving

- **Resource Sharing**: Multiple models share the same runtime pods
- **Dynamic Loading**: Models are loaded and unloaded as needed
- **Efficient Packing**: Optimal placement of models across available resources

### Performance Optimization

- **Fast Model Loading**: Optimized model loading and caching
- **Connection Pooling**: Efficient request routing to model instances
- **Minimal Overhead**: Low latency model switching
