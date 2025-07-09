---
title: "Kubernetes Deployment Installation Guide"
description: "Raw Kubernetes Deployment for both generative and predictive inference workloads"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kubernetes Deployment Installation

KServe supports `RawDeployment` mode to enable `InferenceService` deployment for both **Predictive Inference** and **Generative Inference** workloads with **minimal dependencies** on Kubernetes resources: [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) / [`Gateway API`](https://kubernetes.io/docs/concepts/services-networking/gateway/) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale).

Compared to `Serverless` mode which depends on Knative for request-driven autoscaling, in `RawDeployment` mode [KEDA](https://keda.sh) can be installed optionally to enable autoscaling based on any custom metrics. Note that `Scale from Zero` is currently not supported in `RawDeployment` mode for HTTP requests.

## Installation Requirements

KServe has the following minimum requirements:

- **Kubernetes**: Version 1.30+
- **Cert Manager**: Version 1.15.0+
- **Network Controller**: Choice of Gateway API (recommended) or Ingress controllers

:::note
`Gateway API` is the recommended option for KServe while Ingress API is still supported. Follow the [Gateway API migration guide](gatewayapi-migration.md) to migrate from Kubernetes Ingress to Gateway API.
:::

## Deployment Considerations

### For Generative Inference
Raw Kubernetes deployment is the **recommended approach** for generative inference workloads because it provides:
- Full control over resource allocation for GPU-accelerated models
- Better handling of long-running inference requests
- More predictable scaling behavior for resource-intensive workloads
- Support for streaming responses with appropriate networking configuration

### For Predictive Inference
Raw Kubernetes deployment is suitable for predictive inference workloads when:
- You need direct control over Kubernetes resources
- Your models require specific resource configurations
- You want to use standard Kubernetes scaling mechanisms
- You're integrating with existing Kubernetes monitoring solutions

## Prerequisites

- Kubernetes cluster (v1.30+)
- kubectl configured to access your cluster
- Cluster admin permissions

## Installation

### 1. Install Cert Manager

The minimally required Cert Manager version is 1.15.0 and you can refer to the [Cert Manager installation guide](https://cert-manager.io/docs/installation/).

:::note
Cert Manager is required to provision webhook certs for production-grade installation. Alternatively, you can run a self-signed certs generation script.
:::

### 2. Install Network Controller

<Tabs>
<TabItem value="gateway" label="Gateway API" default>

The Kubernetes Gateway API is a newer, more flexible and standardized way to manage traffic ingress and egress in Kubernetes clusters. KServe implements the Gateway API version `1.2.1`.

The Gateway API is not part of the Kubernetes cluster, therefore it needs to be installed manually:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

Then, create a `GatewayClass` resource using your preferred network controller. For this example, we will use [Envoy Gateway](https://gateway.envoyproxy.io/docs/):

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller  
```

Create a `Gateway` resource to expose the `InferenceService`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kserve-ingress-gateway
  namespace: kserve
spec:
  gatewayClassName: envoy
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: my-secret
            namespace: kserve
      allowedRoutes:
        namespaces:
          from: All
  infrastructure:
    labels:
      serving.kserve.io/gateway: kserve-ingress-gateway
```

:::note
KServe can automatically create a default `Gateway` named `kserve-ingress-gateway` during installation if the Helm value `kserve.controller.gateway.ingressGateway.createGateway` is set to `true`. If you choose to use this default gateway, you can skip creating your own gateway.
:::

</TabItem>
<TabItem value="ingress" label="Kubernetes Ingress">

In this guide, we choose to install Istio as ingress controller. The minimally required Istio version is 1.22 and you can refer to the [Istio install guide](https://istio.io/latest/docs/setup/install).
    
Once Istio is installed, create `IngressClass` resource for istio:

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: istio
spec:
  controller: istio.io/ingress-controller
```

:::note
Istio ingress is recommended, but you can choose to install with other [Ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/) and create `IngressClass` resource for your Ingress option.
:::

</TabItem>
</Tabs>

### 3. Install KServe

:::note
The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe.
:::

<Tabs>
<TabItem value="gatewayhelm" label="Gateway API with Helm" default>

1. Install KServe CRDs

```bash
helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v0.15.0
```

2. Install KServe Resources

Set the `kserve.controller.deploymentMode` to `RawDeployment` and configure the Gateway API:

```bash
helm install kserve oci://ghcr.io/kserve/charts/kserve --version v0.15.0 \
  --set kserve.controller.deploymentMode=RawDeployment \
  --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true \
  --set kserve.controller.gateway.ingressGateway.kserveGateway=kserve/kserve-ingress-gateway
```

</TabItem>
<TabItem value="gatewayyaml" label="Gateway API with YAML">

1. Install KServe:
`--server-side` option is required as the InferenceService CRD is large.

```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
```

2. Install KServe default serving runtimes:

```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve-cluster-resources.yaml
```

3. Change default deployment mode and ingress option

First in the ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` to `RawDeployment`:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
```

Then enable Gateway API and configure the Gateway:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{\"enableGatewayApi\": true, \"kserveIngressGateway\": \"kserve/kserve-ingress-gateway\"}"}}'
```

</TabItem>
<TabItem value="ingresshelm" label="Ingress with Helm">

1. Install KServe CRDs

```bash
helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v0.15.0
```

2. Install KServe Resources

Set the `kserve.controller.deploymentMode` to `RawDeployment` and configure the Ingress class:

```bash
helm install kserve oci://ghcr.io/kserve/charts/kserve --version v0.15.0 \
  --set kserve.controller.deploymentMode=RawDeployment \
  --set kserve.controller.gateway.ingressGateway.className=istio
```

</TabItem>
<TabItem value="ingressyaml" label="Ingress with YAML">

1. Install KServe:
`--server-side` option is required as the InferenceService CRD is large.

```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
```

2. Install KServe default serving runtimes:

```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve-cluster-resources.yaml
```

3. Change default deployment mode and ingress option

First in the ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` to `RawDeployment`:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
```

Then configure the Ingress class:

```bash
kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"ingress": "{\"ingressClassName\": \"istio\"}"}}'
```

</TabItem>
</Tabs>

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


## Verification

Check that all components are running:

```bash
kubectl get pods -n kserve
kubectl get crd | grep serving.kserve.io
```

:::tip[Expected Output]

```
NAME          URL                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                    AGE
sklearn-iris  http://sklearn-iris.default.svc.cluster.local   True           100                        sklearn-iris-predictor-default-00001   5m
```

:::

## Next Steps

- [Deploy your first GenAI InferenceService](../getting-started/genai-first-isvc.md).
- [Deploy your first Predictive InferenceService](../getting-started/predictive-first-isvc.md).
- Configure [auto-scaling](../model-serving/generative-inference/autoscaling/autoscaling.md) for your GenAI models.
