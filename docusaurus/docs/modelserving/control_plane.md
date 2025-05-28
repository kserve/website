# Model Serving Control Plane

The KServe control plane manages the lifecycle of machine learning model deployments on Kubernetes, providing a unified interface for serving models at scale.

## Architecture Overview

The KServe control plane consists of several key components:

### KServe Controller

The main controller that reconciles InferenceService resources and manages:

- Model deployment lifecycle
- Traffic routing and canary deployments
- Auto-scaling configuration
- Model monitoring and observability

### Model Runtime Management

KServe supports multiple model serving runtimes through a pluggable architecture:

#### Built-in Runtimes

- **SKLearn Server**: For scikit-learn models
- **XGBoost Server**: For XGBoost models
- **PyTorch Server**: For PyTorch models (TorchServe)
- **TensorFlow Serving**: For TensorFlow SavedModel format
- **Triton Inference Server**: NVIDIA's high-performance inference server
- **ONNX Runtime**: For ONNX format models
- **Hugging Face**: For transformer models
- **LightGBM**: For LightGBM models
- **Paddle Server**: For PaddlePaddle models

#### Custom Runtimes

Define your own model runtime with `ClusterServingRuntime`:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterServingRuntime
metadata:
  name: custom-runtime
spec:
  supportedModelFormats:
  - name: custom
    version: "1"
  containers:
  - name: kserve-container
    image: my-org/custom-server:latest
    env:
    - name: STORAGE_URI
      value: "{{.StorageUri}}"
```

## InferenceService Lifecycle

### Deployment Phases

1. **Pending**: InferenceService created, controller processing
2. **Loading**: Model artifacts being downloaded and loaded
3. **Ready**: Model ready to serve predictions
4. **Failed**: Deployment failed, check events and logs

### Status Conditions

Monitor deployment status through conditions:

```bash
kubectl get inferenceservice my-model -o yaml
```

```yaml
status:
  conditions:
  - type: PredictorReady
    status: "True"
    reason: PredictorReady
  - type: Ready
    status: "True"
    reason: InferenceServiceReady
  url: http://my-model.default.example.com
```

## Traffic Management

### Canary Deployments

Deploy new model versions safely with traffic splitting:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  predictor:
    canaryTrafficPercent: 10
    model:
      modelFormat:
        name: sklearn
      storageUri: gs://bucket/models/v2
    sklearn: {}
  canary:
    predictor:
      model:
        modelFormat:
          name: sklearn
        storageUri: gs://bucket/models/v1
      sklearn: {}
```

### Blue-Green Deployments

Switch between model versions instantly:

```bash
# Promote canary to default
kubectl patch inferenceservice my-model --type='merge' -p='{"spec":{"canaryTrafficPercent":100}}'
```

## Auto-scaling

### Horizontal Pod Autoscaler (HPA)

Configure automatic scaling based on metrics:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  predictor:
    minReplicas: 1
    maxReplicas: 10
    scaleTarget: 70
    scaleMetric: concurrency
    model:
      modelFormat:
        name: sklearn
      storageUri: gs://bucket/models/sklearn
    sklearn: {}
```

### Knative Pod Autoscaler (KPA)

KServe leverages Knative's autoscaler for:

- **Scale-to-zero**: Automatically scale down to zero when no traffic
- **Scale-from-zero**: Cold start optimization
- **Concurrency-based scaling**: Scale based on request concurrency

## Resource Management

### Resource Requests and Limits

```yaml
spec:
  predictor:
    model:
      resources:
        requests:
          cpu: 100m
          memory: 1Gi
        limits:
          cpu: 1
          memory: 2Gi
          nvidia.com/gpu: 1
```

### Node Affinity and Tolerations

```yaml
spec:
  predictor:
    nodeSelector:
      node-type: gpu
    tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
```

## Model Storage

### Supported Storage Backends

- **Cloud Storage**: GCS, S3, Azure Blob
- **Persistent Volumes**: Local storage, NFS, etc.
- **HTTP/HTTPS**: Direct download from URLs
- **Container Images**: Models baked into container images

### Storage Configuration

```yaml
spec:
  predictor:
    model:
      storageUri: s3://my-bucket/models/sklearn/v1
      env:
      - name: AWS_REGION
        value: us-west-2
```

## Monitoring and Observability

### Metrics Collection

KServe automatically exposes metrics:

- Request latency and throughput
- Model loading time
- Error rates
- Resource utilization

### Integration with Prometheus

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: kserve-metrics
spec:
  selector:
    matchLabels:
      app: kserve
  endpoints:
  - port: metrics
```

### Logging

Configure structured logging:

```yaml
spec:
  predictor:
    logger:
      mode: all
      url: http://message-dumper-logger-service.default/
```

## Security

### Model Access Control

Use Kubernetes RBAC to control access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: model-deployer
rules:
- apiGroups: ["serving.kserve.io"]
  resources: ["inferenceservices"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
```

### Network Policies

Secure model endpoints with network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kserve-predictor-netpol
spec:
  podSelector:
    matchLabels:
      component: predictor
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: istio-system
```

## Troubleshooting

### Common Issues

1. **Model Loading Failures**
   - Check storage credentials
   - Verify model format compatibility
   - Review controller logs

2. **Networking Issues**
   - Validate Istio/Knative configuration
   - Check DNS resolution
   - Verify ingress configuration

3. **Resource Constraints**
   - Monitor node resources
   - Adjust resource requests/limits
   - Check for scheduling conflicts

### Debugging Commands

```bash
# Check InferenceService status
kubectl describe inferenceservice my-model

# View controller logs
kubectl logs -n kserve -l control-plane=kserve-controller-manager

# Check model pods
kubectl get pods -l serving.kserve.io/inferenceservice=my-model

# View model logs
kubectl logs deployment/my-model-predictor-default
```

For more advanced troubleshooting, see our [troubleshooting guide](https://github.com/kserve/kserve/blob/master/docs/TROUBLESHOOTING.md).
