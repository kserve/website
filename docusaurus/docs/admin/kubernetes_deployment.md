# Kubernetes Deployment Installation

Install KServe using raw Kubernetes deployments without serverless capabilities. This option provides more control over resource management and is suitable for environments where serverless features are not needed.

## Prerequisites

- Kubernetes cluster (v1.27+)
- kubectl configured to access your cluster
- Cluster admin permissions

## Installation

### 1. Install KServe CRDs

```bash
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve-crd.yaml
```

### 2. Install KServe Controller

```bash
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve-runtimes.yaml
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
```

### 3. Configure Raw Deployment Mode

Enable raw deployment mode in KServe configuration:

```bash
kubectl patch configmap inferenceservice-config -n kserve-system -p '{
  "data": {
    "deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"
  }
}'
```

## Features

### Raw Deployment Mode

In raw deployment mode, KServe creates:
- Kubernetes Deployments instead of Knative Services
- Standard Kubernetes Services for networking
- Ingress resources for external access
- HorizontalPodAutoscaler for scaling

### Benefits

- **Simplicity**: No dependency on Knative or Istio
- **Control**: Direct control over Kubernetes resources
- **Compatibility**: Works with standard Kubernetes tooling
- **Predictability**: No serverless overhead

## Configuration

### Ingress Setup

Configure ingress for your cluster. Example with NGINX ingress:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### Auto-scaling Configuration

Configure HPA for automatic scaling:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  annotations:
    serving.kserve.io/autoscalerClass: "hpa"
spec:
  predictor:
    minReplicas: 1
    maxReplicas: 10
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 1
          memory: 1Gi
```

## Verification

Check that all components are running:

```bash
kubectl get pods -n kserve-system
kubectl get crd | grep serving.kserve.io
```

## Next Steps

- [Deploy your first model](../get_started/first_isvc)
- [Configure auto-scaling](../modelserving/autoscaling/raw_deployment_autoscaling)
- [Set up monitoring](../modelserving/observability/prometheus_metrics)
