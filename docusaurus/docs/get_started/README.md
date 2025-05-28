# Getting Started with KServe

Welcome to KServe! This guide will help you get started with the standard Model Inference Platform on Kubernetes.

:::warning Quickstart Environments
KServe Quickstart Environments are for experimentation use only. For production installation, see our [Administrator's Guide](../admin/serverless/serverless.md).
:::

## Before you begin

Before you can get started with a KServe Quickstart deployment you must install kind and the Kubernetes CLI.

### Install Kind (Kubernetes in Docker)

You can use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) (Kubernetes in Docker) to run a local Kubernetes cluster with Docker container nodes.

### Install the Kubernetes CLI

The [Kubernetes CLI (`kubectl`)](https://kubernetes.io/docs/tasks/tools/install-kubectl), allows you to run commands against Kubernetes clusters. You can use `kubectl` to deploy applications, inspect and manage cluster resources, and view logs.

### Install Helm

The [Helm](https://helm.sh/docs/intro/install/) package manager for Kubernetes helps you define, install and upgrade software built for Kubernetes.

## Install the KServe "Quickstart" environment

1. After having kind installed, create a `kind` cluster with:
    ```bash
    kind create cluster
    ```

2. Then run:
    ```bash
    kubectl config get-contexts
    ```

    It should list out a list of contexts you have, one of them should be `kind-kind`. Then run:

    ```bash
    kubectl config use-context kind-kind
    ```
    to use this context.

3. You can then get started with a local deployment of KServe by using _KServe Quick installation script on Kind_:
    ```bash
    curl -s "https://raw.githubusercontent.com/kserve/kserve/release-0.15/hack/quick_install.sh" | bash
    ```

This script will install:
- Knative Serving
- Istio Gateway (for ingress)
- Cert Manager
- KServe

## Verify Installation

After the installation completes, verify that KServe is running:

```bash
kubectl get pods -n kserve-system
```

You should see the kserve-controller-manager running:

```
NAME                                      READY   STATUS    RESTARTS   AGE
kserve-controller-manager-0               2/2     Running   0          2m
```

## What's Next?

Now that you have KServe installed, you can:

1. **[Deploy Your First Model](./first_isvc.md)** - Create your first InferenceService
2. **[Explore the Swagger UI](./swagger_ui.md)** - Interact with the KServe API
3. **[Learn About Model Serving](../modelserving/control_plane.md)** - Understand KServe architecture

## Production Installation

For production environments, see our comprehensive installation guides:

- **[Serverless Installation](../admin/serverless/serverless.md)** - Install with Knative Serving
- **[Kubernetes Deployment](../admin/kubernetes_deployment.md)** - Install with raw Kubernetes deployments
- **[ModelMesh Installation](../admin/modelmesh.md)** - Install ModelMesh for high-scale scenarios

## Need Help?

- **Documentation**: Browse our comprehensive [model serving guides](../modelserving/control_plane.md)
- **Community**: Join our [Slack community](https://kubeflow.slack.com/archives/C06982X42KC)
- **Issues**: Report bugs on [GitHub](https://github.com/kserve/kserve/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/kserve/kserve/discussions)
