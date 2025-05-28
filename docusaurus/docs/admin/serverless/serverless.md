# Serverless Installation

This guide covers installing KServe with serverless capabilities using Knative Serving for auto-scaling and scale-to-zero functionality.

## Prerequisites

- Kubernetes cluster (v1.27+)
- kubectl configured to access your cluster
- Cluster admin permissions

## Installation Options

### Quick Install (Recommended for Testing)

For quick testing and development, use our automated installation script:

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/release-0.15/hack/quick_install.sh" | bash
```

This script installs:
- Istio for ingress and networking
- Knative Serving for serverless workloads
- Cert Manager for certificate management
- KServe with default configuration

### Custom Installation

For production environments, install components individually:

#### 1. Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
istioctl install --set values.global.istioNamespace=istio-system -y
```

#### 2. Install Knative Serving

```bash
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.0/serving-core.yaml
```

#### 3. Configure Knative Networking

```bash
kubectl apply -f https://github.com/knative/net-istio/releases/download/knative-v1.11.0/net-istio.yaml
```

#### 4. Install Cert Manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

#### 5. Install KServe

```bash
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
```

## Configuration

### Default Domain Configuration

Configure the default domain for your cluster:

```bash
kubectl patch configmap config-domain -n knative-serving -p '{"data":{"example.com":""}}'
```

### Ingress Configuration

Configure Istio ingress gateway:

```bash
kubectl patch configmap config-network -n knative-serving -p '{"data":{"ingress.class":"istio.ingress.networking.knative.dev"}}'
```

### TLS Configuration

For HTTPS support, configure automatic TLS:

```bash
kubectl patch configmap config-network -n knative-serving -p '{"data":{"auto-tls":"Enabled"}}'
```

## Verification

### Check Installation Status

Verify all components are running:

```bash
# Check Istio
kubectl get pods -n istio-system

# Check Knative Serving
kubectl get pods -n knative-serving

# Check KServe
kubectl get pods -n kserve-system
```

### Deploy Test Model

Create a test InferenceService:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

```bash
kubectl apply -f test-model.yaml
kubectl get inferenceservice sklearn-iris
```

## Serverless Features

### Auto-scaling

Knative automatically scales your models based on traffic:

- **Scale to Zero**: Models scale down to zero when not receiving traffic
- **Concurrency-based**: Scaling based on concurrent requests
- **Custom Metrics**: Scale based on custom metrics like GPU utilization

### Configuration

Configure auto-scaling behavior:

```bash
kubectl patch configmap config-autoscaler -n knative-serving -p '{
  "data": {
    "scale-to-zero-grace-period": "30s",
    "stable-window": "60s",
    "target-concurrency-utilization": "70"
  }
}'
```

## Networking

### Ingress Gateways

Access your models through Istio ingress:

```bash
# Get ingress gateway external IP
kubectl get service istio-ingressgateway -n istio-system
```

### Custom Domains

Configure custom domains for your models:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  your-domain.com: ""
```

## Monitoring

### Metrics Collection

KServe integrates with Prometheus for metrics:

```bash
# Install Prometheus (optional)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.18/samples/addons/prometheus.yaml
```

### Observability

Enable request tracing with Jaeger:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.18/samples/addons/jaeger.yaml
```

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check resource limits and node capacity
2. **Networking issues**: Verify Istio and Knative networking configuration
3. **TLS errors**: Check cert-manager logs and certificate status

### Debug Commands

```bash
# Check KServe controller logs
kubectl logs -n kserve-system -l control-plane=kserve-controller-manager

# Check model pod logs
kubectl logs -l serving.kserve.io/inferenceservice=your-model-name

# Check Knative service status
kubectl get ksvc
```

## Production Considerations

### Resource Management

- Set appropriate resource requests and limits
- Configure node affinity for GPU workloads
- Use horizontal pod autoscaling (HPA) for additional scaling

### Security

- Enable RBAC and network policies
- Use service mesh security features
- Configure authentication and authorization

### High Availability

- Deploy across multiple availability zones
- Configure backup and disaster recovery
- Monitor and alert on system health

## Next Steps

- [Deploy your first model](../get_started/first_isvc.md)
- [Learn about model serving patterns](../modelserving/control_plane.md)
- [Explore advanced features](../modelserving/v1beta1/rollout/canary.md)
