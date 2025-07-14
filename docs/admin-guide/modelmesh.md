---
title: "ModelMesh Installation Guide"
description: "High-scale, high-density model serving for predictive inference workloads"
---

# ModelMesh Installation

ModelMesh provides high-scale, high-density model serving for scenarios with frequent model changes and large numbers of models. It's designed for efficient resource utilization and intelligent model loading, making it particularly well-suited for predictive inference workloads.

## Overview

:::info
ModelMesh is optimized for predictive inference workloads with high model density requirements.
:::

ModelMesh is designed for predictive inference use cases where:
- You have many models (hundreds to thousands)
- Models are frequently updated or changed
- Resource efficiency is critical
- You need intelligent model placement and caching
- Model inference times are relatively short
- Models can share computational resources efficiently

## Prerequisites

- Kubernetes cluster (v1.30+)
- kubectl configured to access your cluster
- Cluster admin permissions

## Installation

### Option 1: Quick Install with KServe

Install KServe with ModelMesh support:

```bash
curl -s "https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/scripts/install.sh" | bash
```

### Option 2: Manual Installation

#### 1. Install etcd (for model metadata storage)

```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/config/dependencies/etcd.yaml
```

#### 2. Install ModelMesh Serving

```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/modelmesh-serving/release-0.12.0/config/default/modelmesh-serving.yaml
```

#### 3. Install KServe Controller

```bash
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
```

## Configuration

### Enable ModelMesh Mode

Configure KServe to use ModelMesh:

```bash
kubectl patch configmap inferenceservice-config -n kserve-system -p '{
  "data": {
    "deploy": "{\"defaultDeploymentMode\": \"ModelMesh\"}"
  }
}'
```

### Storage Configuration

Configure storage for model repositories:

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
