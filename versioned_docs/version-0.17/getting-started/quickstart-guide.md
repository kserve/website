import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart Guide

Welcome to the KServe Quickstart Guide! This guide will help you set up a KServe Quickstart environment for testing and experimentation.

By the end of this guide, you will have a fully functional KServe environment ready for experimentation.

:::warning

KServe Quickstart Environments are for experimentation use only. For production installation, see our [Administrator's Guide](../admin-guide/overview).

:::

## Prerequisites

Before you can get started with a KServe Quickstart deployment, you will need to ensure you have the following prerequisites installed:

### Tools

Make sure you have the following tools installed:
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) - The Kubernetes command-line tool
- [helm](https://helm.sh/docs/intro/install/) - for installing KServe and other Kubernetes operators
- [git](https://git-scm.com/downloads) - for cloning the KServe repository

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

To verify `git` installation, run:
```bash
git --version
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

First, clone the KServe repository:

```bash
git clone https://github.com/kserve/kserve.git
cd kserve
```

Then choose your installation scenario:

<Tabs groupId="installation-type">
<TabItem value="kserve-only" label="KServe Only" default>

Install KServe controller only without additional components.

<details>
<summary>Using Quick Install Script</summary>

```
# Standard mode
curl -s "https://raw.githubusercontent.com/kserve/kserve/refs/heads/master/install/v0.17.0/kserve-standard-mode-full-install-with-manifests.sh" | bash

# Knative mode (serverless)
curl -s "https://raw.githubusercontent.com/kserve/kserve/refs/heads/master/install/v0.17.0/kserve-knative-mode-full-install-with-manifests.sh" | bash
```
</details>

<details>
<summary>Using kserve-install.sh</summary>

**Helm Mode**:

```bash
# Standard mode
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve --standard

# Knative mode (serverless)
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve --knative
```

**Kustomize Mode**:

```bash
# Standard mode
./hack/kserve-install.sh --kustomize --standard

# Knative mode (serverless)
./hack/kserve-install.sh --kustomize --knative
```

</details>

</TabItem>

<TabItem value="kserve-localmodel" label="KServe + LocalModel">

Install KServe controller with LocalModel support for local model caching.

<details>
<summary>Using kserve-install.sh</summary>

**Helm Mode**:

```bash
# Standard mode
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve,localmodel --standard

# Knative mode (serverless)
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve,localmodel --knative
```

**Kustomize Mode**:

```bash
# Standard mode
./hack/kserve-install.sh --kustomize --standard --type kserve,localmodel

# Knative mode (serverless)
./hack/kserve-install.sh --kustomize --knative --type kserve,localmodel
```

</details>

</TabItem>

<TabItem value="llmisvc-only" label="LLMIsvc Only">

Install LLMInferenceService controller only for Generative AI model serving.

<details>
<summary>Using Quick Install Script</summary>

```
curl -s "https://raw.githubusercontent.com/kserve/kserve/refs/heads/master/install/v0.17.0/llmisvc-full-install-with-manifests.sh" | bash
```
</details>

<details>
<summary>Using kserve-install.sh</summary>

**Helm Mode**:

```bash
./hack/kserve-install.sh --kserve-version v0.17.0 --type llmisvc
```

**Kustomize Mode**:

```bash
# LLMIsvc
./hack/kserve-install.sh --kustomize --type llmisvc
```

</details>

</TabItem>

<TabItem value="all-components" label="KServe + LLMIsvc + LocalModel">

Install all KServe components together.

<details>
<summary>Using Quick Install Script</summary>

**Step 1: Install KServe Dependencies (Choose ONE)**

Choose either Standard mode or Knative mode:

```bash
# Option A: Standard Mode Dependencies
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-standard-mode-dependency-install.sh | bash

# OR

# Option B: Knative Mode Dependencies
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-knative-mode-dependency-install.sh | bash
```

**Step 2: Install All Components**

After installing dependencies above, run these commands:

```bash
# Install LLMInferenceService Dependencies
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/llmisvc-dependency-install.sh | bash


# Install CRDs
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-crds.yaml
# Install Controllers
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.17.0/kserve.yaml

# Install ClusterServingRuntimes/LLMIsvcConfigs
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-cluster-resources.yaml
```

</details>

<details>
<summary>Using kserve-install.sh</summary>

**Helm Mode**:

```bash
# All components (Standard mode)
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve,llmisvc,localmodel --standard

# All components (Knative mode)
./hack/kserve-install.sh --kserve-version v0.17.0 --type kserve,llmisvc,localmodel --knative
```

**Kustomize Mode**:

```bash
# All components (Standard mode)
./hack/kserve-install.sh --kustomize --standard --type kserve,llmisvc,localmodel
```
```bash
# All components (Knative mode)
./hack/kserve-install.sh --kustomize --knative --type kserve,llmisvc,localmodel
```
</details>

</TabItem>

<TabItem value="dependencies" label="Dependencies Only">

Install only infrastructure dependencies without KServe components.

<details>
<summary>Using Quick Install Script</summary>

**Standard Mode Dependencies**:

```bash
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-standard-mode-dependency-install.sh | bash
```

**Knative Mode Dependencies**:

```bash
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/kserve-knative-mode-dependency-install.sh | bash
```

**LLMIsvc Dependencies**:

```bash
curl -fsSL https://github.com/kserve/kserve/releases/download/v0.17.0/llmisvc-dependency-install.sh | bash
```


</details>

<details>
<summary>Using kserve-install.sh</summary>

**Standard Dependencies**
```bash
./hack/kserve-install.sh --deps-only --standard
```

**Knative Dependencies**
```bash
./hack/kserve-install.sh --deps-only --knative
```

**LLMIsvc Dependencies**:
```bash
./hack/kserve-install.sh --deps-only --type llmisvc
```
</details>

</TabItem>
</Tabs>

:::info[More Installation Options]
For detailed installation instructions, customization options, and troubleshooting:
- [KServe Installation Guide](../install/kserve-install)
- [LLMInferenceService Installation Guide](../install/llmisvc-install)
- [LocalModel Installation Guide](../install/localmodel-install)
:::

## Next Steps

Now that you have a KServe Quickstart environment set up, you can start deploying and testing machine learning models:

- 📖 **[First GenAI InferenceService](genai-first-isvc)** - Deploy your first GenAI model using InferenceService
- 📖 **[First Predictive InferenceService](predictive-first-isvc)** - Deploy your first predictive model using InferenceService
