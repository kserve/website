# ModelMesh Installation

ModelMesh provides high-scale, high-density model serving for scenarios with frequent model changes and large numbers of models. It's designed for efficient resource utilization and intelligent model loading.

## Overview

ModelMesh is designed for use cases where:
- You have many models (hundreds to thousands)
- Models are frequently updated or changed
- Resource efficiency is critical
- You need intelligent model placement and caching

## Prerequisites

- Kubernetes cluster (v1.25+)
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

## Serving Runtimes

### Available Runtimes

ModelMesh supports multiple serving runtimes:

- **TensorFlow Serving**: For TensorFlow models
- **Triton Inference Server**: Multi-framework support
- **MLServer**: Python-based serving with scikit-learn, XGBoost
- **TorchServe**: PyTorch model serving
- **Custom Runtimes**: Bring your own serving logic

### Configure Runtime

Example runtime configuration:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: mlserver-sklearn
spec:
  supportedModelFormats:
    - name: sklearn
      version: "1"
      autoSelect: true
  containers:
    - name: kserve-container
      image: docker.io/seldonio/mlserver:1.3.5-sklearn
      env:
        - name: MLSERVER_MODELS_DIR
          value: "/opt/mlserver/models"
        - name: MLSERVER_GRPC_PORT
          value: "8001"
        - name: MLSERVER_HTTP_PORT
          value: "8002"
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 5
          memory: 5Gi
```

## Deploying Models

### Basic Model Deployment

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: example-sklearn-isvc
  annotations:
    serving.kserve.io/deploymentMode: ModelMesh
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: s3://modelmesh-example-models/sklearn/mnist-svm.joblib
```

### Model with Custom Storage

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: example-tensorflow-isvc
spec:
  predictor:
    model:
      modelFormat:
        name: tensorflow
      storageUri: s3://my-bucket/tensorflow/savedmodel
      storage:
        key: my-storage-config
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

## Monitoring

### Model Metrics

ModelMesh provides metrics for:
- Model loading/unloading times
- Request latency and throughput
- Memory and CPU utilization per model
- Cache hit/miss rates

### Prometheus Integration

Enable Prometheus monitoring:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: model-serving-config
data:
  config.yaml: |
    metrics:
      enabled: true
      port: 2112
      path: /metrics
```

## Troubleshooting

### Common Issues

1. **Models not loading**: Check storage configuration and credentials
2. **Out of memory**: Adjust model cache size or add more memory
3. **Slow model loading**: Verify network connectivity to model storage

### Debug Commands

```bash
# Check ModelMesh pods
kubectl get pods -l app.kubernetes.io/name=modelmesh-serving

# View ModelMesh logs
kubectl logs -l app.kubernetes.io/name=modelmesh-serving

# Check model status
kubectl get inferenceservice
kubectl describe inferenceservice <name>
```

## Best Practices

### Resource Planning

- Size memory based on model sizes and cache requirements
- Plan CPU resources for concurrent model inference
- Consider storage bandwidth for model loading

### Model Organization

- Group similar models to optimize resource sharing
- Use consistent naming conventions
- Implement proper versioning strategies

### Performance Tuning

- Monitor cache hit rates and adjust cache size
- Optimize model storage formats
- Use appropriate compression for models

## Next Steps

- [Deploy models with ModelMesh](../modelserving/mms/multi-model-serving.md)
- [Monitor ModelMesh performance](../modelserving/observability/prometheus_metrics.md)
- [Scale ModelMesh deployments](../modelserving/mms/modelmesh/overview.md)
