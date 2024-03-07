# Getting Started with KServe
## Before you begin
!!! warning
    KServe Quickstart Environments are for experimentation use only. For production installation, see our [Administrator's Guide](../admin/serverless/serverless.md)

Before you can get started with a KServe Quickstart deployment you must install kind and the Kubernetes CLI.

### Install Kind (Kubernetes in Docker)

You can use [`kind`](https://kind.sigs.k8s.io/docs/user/quick-start){target=_blank} (Kubernetes in Docker) to run a local Kubernetes cluster with Docker container nodes.

### Install the Kubernetes CLI

The [Kubernetes CLI (`kubectl`)](https://kubernetes.io/docs/tasks/tools/install-kubectl){target=_blank}, allows you to run commands against Kubernetes clusters. You can use `kubectl` to deploy applications, inspect and manage cluster resources, and view logs.


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
    curl -s "https://raw.githubusercontent.com/kserve/kserve/release-0.11/hack/quick_install.sh" | bash
    ```

!!! Note
    If you encounter the following error when installing, Please re-run the script.
    ```
    Error from server (InternalError): error when creating "https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml": Internal error occurred: failed calling webhook "webhook.cert-manager.io": failed to call webhook: Post "https://cert-manager-webhook.cert-manager.svc:443/mutate?timeout=10s": tls: failed to verify certificate: x509: certificate signed by unknown authority
    Error from server (InternalError): error when creating "https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml": Internal error occurred: failed calling webhook "webhook.cert-manager.io": failed to call webhook: Post "https://cert-manager-webhook.cert-manager.svc:443/mutate?timeout=10s": tls: failed to verify certificate: x509: certificate signed by unknown authority
    ```
