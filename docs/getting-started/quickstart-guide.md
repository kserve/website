import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ActiveDocsVersion from '@site/src/components/ActiveDocsVersion';
import QuickInstallCommand from '@site/src/components/QuickInstallCommand';

# Quickstart Guide
Welcome to the KServe Quickstart Guide! This guide will help you set up a KServe Quickstart environment for testing and experimentation. KServe Quickstart is designed to provide a simple and quick way to get started with KServe, allowing you to deploy and test machine learning models on Kubernetes with minimal setup.
This guide will walk you through the prerequisites, installation steps, and how to verify your KServe Quickstart environment is up and running. By the end of this guide, you will have a fully functional KServe Quickstart environment ready for experimentation.

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
<!-- TODO: Make the minimum kubernetes version constant so it can be reused in other places. -->
:::info[Version Requirements]

KServe requires a Kubernetes version 1.29 or higher. Ensure your cluster meets this requirement before proceeding with the installation.

:::

You will need a running Kubernetes cluster with properly configured kubeconfig to run KServe. You can use any Kubernetes cluster, but for local development and testing, we recommend using `kind` (Kubernetes in Docker) or `minikube`.

<Tabs>
<TabItem value="kind" label="Local Kind Cluster" default>
If you want to run a local Kubernetes cluster, you can use [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/) (Kubernetes in Docker). It allows you to create a Kubernetes cluster using Docker container nodes. This is ideal for local development and testing.

First, ensure you have [Docker installed](https://docs.docker.com/engine/install/) on your machine. Install Kind by following the [Kind Quick Start Guide](https://kind.sigs.k8s.io/docs/user/quick-start/) if you haven't done so already.

Then, you can create a local Kubernetes cluster with the following command:

```bash
kind create cluster
```
</TabItem>
<TabItem value="minikube" label="Local Minikube Cluster">
If you prefer to use Minikube, you can follow the [Minikube Quickstart Guide](https://minikube.sigs.k8s.io/docs/start/) to set up a local Kubernetes cluster. Minikube is another popular tool for running Kubernetes clusters locally.
First, ensure you have [Minikube installed](https://minikube.sigs.k8s.io/docs/start/) on your machine. Then, you can start a local Kubernetes cluster with the following command:

```bash
minikube start
```
</TabItem>
<TabItem value="remote" label="Existing Kubernetes Cluster">
If you have access to a existing Kubernetes cluster, you can use that as well. Ensure that your kubeconfig is properly configured to connect to the cluster. You can verify your current context with:

```bash
kubectl config current-context
```
Verify your cluster meets the version requirements by running:

```bash
kubectl version --output=json
```
The server version in the output should show version 1.29 or higher:
```json
{
  "serverVersion": {
    "major": "1",
    "minor": "29",
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

<!-- The insturctions are defined in the QuickInstallCommand Component -->
<QuickInstallCommand />

Verify the installation by checking the status of the KServe components:

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

## Next Steps

Now that you have a KServe Quickstart environment set up, you can start deploying and testing machine learning models. Here are some recommended next steps:

- 📖 **[First GenAI InferenceService](genai-first-isvc.md)** - Deploy your first GenAI model using InferenceService.
- 📖 **[First Predictive InferenceService](predictive-first-isvc.md)** - Deploy your first predictive model using InferenceService.
