import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart Guide

Welcome to the KServe Quickstart Guide! This guide will help you set up a KServe Quickstart environment for testing and experimentation. KServe provides two deployment paths based on your use case:

- **Generative AI (LLMInferenceService)**: For Large Language Models and generative AI workloads
- **Predictive AI (InferenceService)**: For traditional ML models and predictive inference workloads

This guide will walk you through the prerequisites, installation steps, and how to verify your KServe environment is up and running. By the end of this guide, you will have a fully functional KServe environment ready for experimentation.

## Prerequisites

Before you can get started with a KServe Quickstart deployment, you will need to ensure you have the following prerequisites installed:

### Tools

Make sure you have the following tools installed:
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) - The Kubernetes command-line tool
- [helm](https://helm.sh/docs/intro/install/) - for installing KServe and other Kubernetes operators
- [curl](https://curl.se/docs/install.html) - for the quickstart script and for testing API endpoints (installed by default on most systems)

:::tip[Verify Installations]
Run the following commands to verify that you have the required tools installed:

To verify `kubectl` installation, run:
```bash
kubectl version --client
```

To verify `helm` installation, run:
```bash
helm version
```

To verify `curl` installation, run:
```bash
curl --version
```
:::

### Kubernetes Cluster

:::info[Version Requirements]

Kubernetes version **1.32 or higher** is required.

:::

You will need a running Kubernetes cluster with properly configured kubeconfig to run KServe. You can use any Kubernetes cluster, but for local development and testing, we recommend using `kind` (Kubernetes in Docker) or `minikube`.

<Tabs>
<TabItem value="local" label="Local Cluster (Kind/Minikube)" default>

**Using Kind (Kubernetes in Docker)**:

If you want to run a local Kubernetes cluster, you can use [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/). It allows you to create a Kubernetes cluster using Docker container nodes.

First, ensure you have [Docker installed](https://docs.docker.com/engine/install/) on your machine. Install Kind by following the [Kind Quick Start Guide](https://kind.sigs.k8s.io/docs/user/quick-start/) if you haven't done so already.

Then, you can create a local Kubernetes cluster with the following command:

```bash
kind create cluster
```

**Using Minikube**:

If you prefer to use Minikube, you can follow the [Minikube Quickstart Guide](https://minikube.sigs.k8s.io/docs/start/) to set up a local Kubernetes cluster.

First, ensure you have [Minikube installed](https://minikube.sigs.k8s.io/docs/start/) on your machine. Then, you can start a local Kubernetes cluster with the following command:

```bash
minikube start
```

</TabItem>
<TabItem value="remote" label="Existing Kubernetes Cluster">
If you have access to an existing Kubernetes cluster, you can use that as well. Ensure that your kubeconfig is properly configured to connect to the cluster. You can verify your current context with:

```bash
kubectl config current-context
```

Verify your cluster meets the version requirements by running:

```bash
kubectl version --output=json
```

The server version in the output should show version 1.32 or higher:
```json
{
  "serverVersion": {
    "major": "1",
    "minor": "32",
    ...
  }
}
```

</TabItem>

</Tabs>

## Install KServe Quickstart Environment

Once you have the prerequisites installed and a Kubernetes cluster running, you can proceed with the KServe Quickstart installation.

:::warning

KServe Quickstart Environments are for experimentation use only. For production installation, see our [Administrator's Guide](../admin-guide/overview.md).

:::

### Quick Install (Recommended)

The fastest way to get started with KServe is using the quick install script.

<Tabs groupId="ai-workload-type">
<TabItem value="genai" label="Generative AI (LLMInferenceService)" default>

Choose your installation option based on your needs:
- **KServe (Standard) + LLMInferenceService**: Install both KServe (Standard) and LLMInferenceService for complete functionality
- **LLMInferenceService Only**: Install only LLMInferenceService components without KServe (Standard)
- **Dependencies Only**: Install infrastructure dependencies first, then customize your installation

<Tabs groupId="llmisvc-install">
<TabItem value="full-kserve" label="KServe (Standard) + LLMInferenceService" default>

Install all dependencies, KServe (Standard), and LLMInferenceService:

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/master/hack/setup/quick-install/kserve-standard-mode-full-install-with-manifests.sh" | bash
```

**What gets installed**:

*Infrastructure Components for Kserve Standard:*
1. ✅ KEDA (for Standard KServe autoscaling)
2. ✅ KEDA OpenTelemetry Addon (for Standard KServe autoscaling)

*Infrastructure Components for LLMInferenceService:*
1. ✅ External Load Balancer (MetalLB for local clusters)
2. ✅ Cert Manager
3. ✅ Gateway API CRDs
4. ✅ Gateway API Inference Extension CRDs
5. ✅ Envoy Gateway
6. ✅ Envoy AI Gateway
7. ✅ LeaderWorkerSet (multi-node deployments)
8. ✅ GatewayClass
9. ✅ Gateway

*KServe Components:*
1. ✅ KServe CRDs and Controller (Standard)
2. ✅ LLMInferenceService CRDs and Controller

:::info[Component Versions]
Component versions are managed via [a central place](https://github.com/kserve/kserve/blob/master/kserve-deps.env). Check this file for the latest versions used by the installation script.
:::

**Installation time**: ~5-10 minutes

</TabItem>

<TabItem value="llmisvc-only" label="LLMInferenceService Only">

Install all dependencies and LLMInferenceService (without KServe Standard):

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/master/hack/setup/quick-install/llmisvc-full-install-with-manifests.sh" | bash
```

**What gets installed**:

*Infrastructure Components:*
1. ✅ Cert Manager
2. ✅ External Load Balancer (MetalLB for local clusters)

*LLMInferenceService Components:*
3. ✅ Gateway API CRDs
4. ✅ Gateway API Inference Extension
5. ✅ Envoy Gateway
6. ✅ Envoy AI Gateway
7. ✅ LeaderWorkerSet (multi-node deployments)
8. ✅ GatewayClass
9. ✅ Gateway
10. ✅ LLMInferenceService CRDs and Controller

:::success
This installs only LLMInferenceService components. KServe (Standard) is not included.
:::

**Installation time**: ~5-10 minutes

</TabItem>

<TabItem value="dependencies" label="Dependencies Only">

Install only infrastructure dependencies for LLMIsvc without any KServe components:

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/master/hack/setup/quick-install/llmisvc-dependency-install.sh" | bash
```

This is useful when you want to:
- Install LLMInferenceService controller manually later
- Use a specific version of LLMInferenceService
- Customize LLMInferenceService installation with specific Helm values

After installing dependencies, you can install LLMInferenceService controller separately:

```bash
# Install LLMInferenceService CRDs
helm install kserve-llmisvc-crd oci://ghcr.io/kserve/charts/kserve-llmisvc-crd \
  --version <version> \
  --namespace kserve \
  --create-namespace

# Install LLMInferenceService Controller
helm install kserve-llmisvc oci://ghcr.io/kserve/charts/kserve-llmisvc-resources \
  --version <version> \
  --namespace kserve
```

:::tip[Check Latest Version]
Replace `<version>` with the desired version. Check available versions at [KServe Releases](https://github.com/kserve/kserve/releases) or in [kserve-deps.env](https://github.com/kserve/kserve/blob/master/kserve-deps.env).
:::

</TabItem>
</Tabs>

:::note[Local Development]
The quick install script automatically configures **MetalLB** if detected (for kind, minikube), providing LoadBalancer support for local testing.
:::

</TabItem>
<TabItem value="predictive" label="Predictive AI (InferenceService)">

<Tabs groupId="deployment-type">
<TabItem value="standard" label="Standard Deployment" default>

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/master/hack/quick_install.sh" | bash -s -- -r
```

</TabItem>

<TabItem value="knative" label="Knative">

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/master/hack/quick_install.sh" | bash
```

</TabItem>
</Tabs>

</TabItem>
</Tabs>

---

### Verify Installation

After installation, verify all components are working:

<Tabs groupId="ai-workload-type">
<TabItem value="genai" label="Generative AI (LLMInferenceService)" default>

```bash
# Check all pods are running
kubectl get pods -n cert-manager
kubectl get pods -n envoy-gateway-system
kubectl get pods -n envoy-ai-gateway-system
kubectl get pods -n lws-system
kubectl get pods -n kserve

# Check LLMInferenceService CRD
kubectl get crd llminferenceservices.serving.kserve.io

# Check Gateway status
kubectl get gateway kserve-ingress-gateway -n kserve

# Check Gateway has external IP (may take a few minutes)
kubectl get gateway kserve-ingress-gateway -n kserve -o jsonpath='{.status.addresses[0].value}'
```

**Expected output**:
- ✅ All pods in `Running` state
- ✅ Gateway shows `READY: True`
- ✅ Gateway has `EXTERNAL-IP` or `ADDRESS` assigned

:::tip[Verify Installation]
You should see the LLMInferenceService controller up and running:
```plaintext
NAME                                         READY   STATUS    RESTARTS   AGE
llmisvc-controller-manager-7f5b6c4d8f-abcde   1/1     Running   0          2m
```

Gateway should have an address:
```plaintext
NAME                                              CLASS   ADDRESS         PROGRAMMED   AGE
gateway.gateway.networking.k8s.io/kserve-ingress-gateway  envoy   <external-ip>   True         2m
```
:::

</TabItem>
<TabItem value="predictive" label="Predictive AI (InferenceService)">

```bash
kubectl get pods -n kserve
```

:::tip[Verify Installation]
You should see the KServe controller up and running:
```plaintext
NAME                                                   READY   STATUS    RESTARTS   AGE
kserve-controller-manager-7f5b6c4d8f-abcde              1/1     Running   0          2m
kserve-localmodel-controller-manager-5b8b6574c7-jz42m   1/1     Running   0          2m
```
:::

</TabItem>
</Tabs>

## Next Steps

Now that you have a KServe Quickstart environment set up, you can start deploying and testing machine learning models. Here are some recommended next steps:

<Tabs groupId="ai-workload-type">
<TabItem value="genai" label="Generative AI (LLMInferenceService)" default>

- 📖 **[First LLMInferenceService](genai-first-llmisvc.md)** - Deploy your first LLM using LLMInferenceService
- 📖 **[LLMInferenceService Overview](../model-serving/generative-inference/llmisvc/llmisvc-overview.md)** - Learn about LLMInferenceService architecture and features
- 📖 **[LLMInferenceService Configuration](../model-serving/generative-inference/llmisvc/llmisvc-configuration.md)** - Explore configuration options for your LLM deployments

</TabItem>
<TabItem value="predictive" label="Predictive AI (InferenceService)">

- 📖 **[First GenAI InferenceService](genai-first-isvc.md)** - Deploy your first GenAI model using InferenceService.
- 📖 **[First Predictive InferenceService](predictive-first-isvc.md)** - Deploy your first predictive model using InferenceService.

</TabItem>
</Tabs>
