# Getting Started with KServe
## Before you begin
!!! warning
    KServe Quickstart Environments are for experimentation use only. For production installation, see our [Administrator's Guide](../admin)

Before you can get started with a KServe Quickstart deployment you must install kind and the Kubernetes CLI.

### Install Kind (Kubernetes in Docker)

You can use [`kind`](https://kind.sigs.k8s.io/docs/user/quick-start){target=_blank} (Kubernetes in Docker) to run a local Kubernetes cluster with Docker container nodes.

### Install the Kubernetes CLI

The [Kubernetes CLI (`kubectl`)](https://kubernetes.io/docs/tasks/tools/install-kubectl){target=_blank}, allows you to run commands against Kubernetes clusters. You can use `kubectl` to deploy applications, inspect and manage cluster resources, and view logs.


## Install the KServe "Quickstart" environment

You can get started with a local deployment of KServe by using _KServe Quick installation script on Kind_:

```bash
curl -s "https://raw.githubusercontent.com/kserve/kserve/release-0.7/hack/quick_install.sh" | bash
```

