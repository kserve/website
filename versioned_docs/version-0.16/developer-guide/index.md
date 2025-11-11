---
title: "Development Guide"
description: "Guide to setting up a development environment for contributing to KServe"
---

# Development Guide

This guide provides comprehensive instructions for setting up a development environment for KServe, whether you want to contribute to the project or create a custom development setup. You'll learn how to:

- Install the required development tools and dependencies
- Deploy KServe in different configurations (serverless or raw deployment modes)
- Set up networking requirements for each deployment option
- Understand the KServe architecture and development workflow
- Build, test, and debug your KServe development environment

## Prerequisites

Follow the instructions below to set up your development environment. Once you
meet these requirements, you can make changes and
[deploy your own version of KServe](#deploy-kserve)!

Before submitting a PR, see also [the contribution guidelines](https://github.com/kserve/community/blob/main/CONTRIBUTING.md).

### Install Development Tools

You must install these tools:

1. [`go`](https://golang.org/doc/install): KServe controller is written in Go and requires Go 1.24.1+.
2. [`git`](https://help.github.com/articles/set-up-git/): For source control.
3. [`ko`](https://github.com/google/ko): For development and building container images without a Dockerfile.
4. [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/): For managing Kubernetes clusters and resources.
5. [`pre-commit`](https://pre-commit.com/): Used to run checks on the codebase before committing changes.
6. [`helm`](https://helm.sh/docs/intro/install/): Used to install KServe and dependencies.
7. [`uv`](https://docs.astral.sh/uv/getting-started/installation/): Used to create and manage virtual environments.

### Setup Your Environment

To start your environment, you'll need to set these environment variables (we
recommend adding them to your `.bashrc`):

1. `GOPATH`: If you don't have one, simply pick a directory and add
   `export GOPATH=...`
2. `$GOPATH/bin` on `PATH`: This is so that tooling installed via `go get` will
   work properly.
3. `KO_DEFAULTPLATFORMS`: If you are using M1 Mac book the value is `linux/arm64`.
4. `KO_DOCKER_REPO`: The docker repository to which developer images should be
   pushed (e.g. `docker.io/<username>`).
   
   **Note**: Set up a docker repository for pushing images. You can use any container image registry by adjusting
   the authentication methods and repository paths mentioned in the sections below.
    * [Google Container Registry quickstart](https://cloud.google.com/container-registry/docs/pushing-and-pulling)
    * [Docker Hub quickstart](https://docs.docker.com/docker-hub/)
    * [Azure Container Registry quickstart](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal)
      
:::note
If you are using Docker Hub to store your images, your `KO_DOCKER_REPO` variable should be `docker.io/<username>`.
Currently, Docker Hub doesn't let you create subdirs under your username.
:::

`.bashrc` example:

```shell
export GOPATH="$HOME/go"
export PATH="${PATH}:${GOPATH}/bin"
export KO_DOCKER_REPO='docker.io/<username>'
```

### Checkout Your Fork

To check out this repository:

1. Create your own [fork of this repo](https://help.github.com/articles/fork-a-repo/)
2. Clone it to your machine:

```shell
git clone git@github.com:${YOUR_GITHUB_USERNAME}/kserve.git
cd kserve
git remote add upstream git@github.com:kserve/kserve.git
git remote set-url --push upstream no_push
```

_Adding the `upstream` remote sets you up nicely for regularly
[syncing your fork](https://help.github.com/articles/syncing-a-fork/)._

Once you reach this point, you are ready to do a full build and deploy as
described below.

### Install Pre-commit Hooks

Configuring pre-commit hooks will run checks on the codebase before committing changes. This will help you catch lint errors, formatting issues, and other common problems before they reach the repository.

```shell
pre-commit install --install-hooks
```

## Local Development and Testing

This section provides guidance on developing KServe locally and testing your changes.

### Setting Up a Local Development Environment

For local development, we recommend using either:
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/) (Kubernetes IN Docker)
- [minikube](https://minikube.sigs.k8s.io/docs/start/)

#### Using kind for Development

1. **Create a cluster with required features**:
   ```bash
   cat <<EOF | kind create cluster --config=-
   kind: Cluster
   apiVersion: kind.x-k8s.io/v1alpha4
   nodes:
   - role: control-plane
     extraPortMappings:
     - containerPort: 31080 # exposed NodePort for ingress
       hostPort: 80
     - containerPort: 31443 # exposed NodePort for ingress
       hostPort: 443
   EOF
   ```

2. **Configure ko for local development**:
   ```bash
   # For local development with kind
   export KO_DOCKER_REPO=kind.local
   ```

#### Using minikube for Development

1. **Start minikube**:
   ```bash
   minikube start --driver=docker --memory=8192 --cpus=4
   ```

2. **Enable the registry addon**:
   ```bash
   minikube addons enable registry
   ```

3. **Configure Docker to use Minikube's daemon**:
   ```bash
   eval $(minikube docker-env)
   export KO_DOCKER_REPO=localhost:5000
   ```

### Installation Requirements

KServe offers two deployment modes:

- **Knative deployment** requires `Knative Serving` for request-based auto-scaling, scale-to-zero, and canary rollouts
- **Raw deployment** doesn't require Knative, suitable for generative inference workloads with stable resource allocation

For networking:
- **Knative mode**: Requires Knative Serving; while Istio is recommended as the networking layer for Knative, you can use any ingress/networking solution supported by Knative (like Kourier or Contour)
- **Raw deployment**: Uses Gateway API or standard Kubernetes Ingress, compatible with various networking implementations

Note that the quick install script installs Istio by default for both deployment modes for convenience.

### Quick Installation (Recommended for Development)

For development purposes, you can use the quick install script provided in the KServe repository:

```bash
# Clone the repository if you haven't already
git clone https://github.com/kserve/kserve.git
cd kserve

# Run the quick install script with serverless mode (installs Knative + Istio)
./hack/quick_install.sh -s

# For Raw deployment mode (without Knative, using Gateway API + Istio)
./hack/quick_install.sh -r

# To install only dependencies (without KServe)
./hack/quick_install.sh -d

# To include KEDA (Kubernetes Event-driven Autoscaling)
./hack/quick_install.sh -k
```

The script installs:
- Gateway API CRDs (used by both deployment modes)
- Istio (installed by default for both modes, but not strictly required)
- Cert Manager (for webhook certificates)
- Knative Operator and Serving (only when using serverless mode with `-s` flag)
- Optionally KEDA for event-driven autoscaling (with `-k` flag)
- Latest stable KServe CRDs and controller (configured for the selected deployment mode)

:::tip
You can check the current versions used in the script by examining the environment variables at the top of the `hack/quick_install.sh` file.
:::

:::note
To uninstall everything, run:
```bash
./hack/quick_install.sh -u
```
:::

### Manual Installation

If you prefer manual installation, follow the instructions from the [administrator guide](../admin-guide/overview.md).

### Deploy KServe

#### Deploy KServe from Master Branch

When deploying manually, we suggest using [cert manager](https://github.com/cert-manager/cert-manager) for provisioning the certificates for the webhook server. Other solutions should also work as long as they put the certificates in the desired location.

If you don't want to install cert manager, you can set the `KSERVE_ENABLE_SELF_SIGNED_CA` environment variable to true. `KSERVE_ENABLE_SELF_SIGNED_CA` will execute a script to create a self-signed CA and patch it to the webhook config.
```bash
export KSERVE_ENABLE_SELF_SIGNED_CA=true
```

After that, you can run the following command to deploy `KServe`. You can skip the above step if cert manager is already installed.
```bash
make deploy
```

:::tip
You can change CPU and memory limits when deploying `KServe`.
```bash
export KSERVE_CONTROLLER_CPU_LIMIT=<cpu_limit>
export KSERVE_CONTROLLER_MEMORY_LIMIT=<memory_limit>
make deploy
```
:::

:::tip[Expected Output]
```console
$ kubectl get pods -n kserve -l control-plane=kserve-controller-manager
NAME                             READY   STATUS    RESTARTS   AGE
kserve-controller-manager-0      2/2     Running   0          13m
```
:::

:::note
By default, it installs to the `kserve` namespace with the published controller manager image from the master branch.
:::

#### Deploy KServe with Your Own Version

Whether you used the quick install script or deployed manually, when you want to test your local code changes, you'll need to rebuild and redeploy the components you've modified.

Run the following command to deploy the `KServe` controller and model agent with your local changes:
```bash
make deploy-dev
```

:::note
`deploy-dev` builds the image from your local code, publishes to `KO_DOCKER_REPO`, and deploys the `kserve-controller-manager` and `model agent` with the image digest to your cluster for testing. 
Please also ensure you are logged in to `KO_DOCKER_REPO` from your client machine.
:::

Run the following command to deploy the model server with your local changes:
```bash
make deploy-dev-sklearn
make deploy-dev-huggingface
```

Run the following command to deploy the explainer with your local changes:
```bash
make deploy-dev-alibi
```

Run the following command to deploy the storage initializer with your local changes:
```bash
make deploy-dev-storageInitializer
```

:::warning
The `deploy` command publishes the image to `KO_DOCKER_REPO` with the version `latest` and changes the `InferenceService` configmap or the respective `ServingRuntime` to point to the newly built image SHA. It is recommended to first build and deploy the controller and model agent with `make deploy-dev` before deploying the model server, explainer, or storage initializer using respective `deploy-dev-<component>` commands.

The built image is only for development and testing purposes. The current limitation is that it changes the impacted image and resets all other images, including the
`kserve-controller-manager`, to use the default ones.
:::

### Smoke Test After Deployment

Run the following command to smoke test the deployment:
```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/tensorflow/tensorflow.yaml
```

You should see model serving deployment running under default or your specified namespace:

```bash
kubectl get pods -n default -l serving.kserve.io/inferenceservice=flower-sample
```

:::tip Expected Output
```
NAME                                                      READY   STATUS    RESTARTS   AGE
flower-sample-default-htz8r-deployment-8fd979f9b-w2qbv   3/3     Running   0          10s
```
:::

### Running Unit/Integration Tests

`kserver-controller-manager` has a few integration tests which require mock apiserver
and etcd; they get installed along with [`kubebuilder`](https://book.kubebuilder.io/quick-start.html#installation).

To run all unit/integration tests:

```bash
make test
```

To run servingruntime tests:

Go to the respective runtime directory, e.g., `python/huggingface`, and run:

```bash
make dev_install
pytest .
```

### Run E2E Tests Locally

To set up from local code:

 1. Install KServe dependencies using the quick install script with the `-d` flag (installs dependencies only):
    ```bash
    ./hack/quick_install.sh -d
    ```
 2. If you already have a KServe installation, undeploy it:
    ```bash
    make undeploy
    ```
 3. Deploy KServe with your local changes:
    ```bash
    make deploy-dev
    ```

Go to `python/kserve` and install KServe Python SDK deps:
```bash
uv sync --group test --group dev
```
Then go to end to end test directory
```shell
cd test/e2e
```
Run `kubectl create namespace kserve-ci-e2e-test`

For KIND/minikube:

* Run `export KSERVE_INGRESS_HOST_PORT=localhost:8080`
* In a different window run `kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80`
* Note that not all tests will pass as the PyTorch test requires GPU. These will show as pending pods at the end, or you can add a marker to skip the test.

Run `pytest -m <markers> > testresults.txt`. You can view the available markers by running `pytest --markers`.

When running tests with Gateway API, you should provide the `--networking-layer` flag to specify the networking layer. The available options are `istio-gatewayapi`, `envoy-gatewayapi`, and `knative`.

Tests may not clean up. To re-run, first do `kubectl delete namespace kserve-ci-e2e-test`, recreate the namespace, and run again.

### Iterating

As you make changes to the code-base, there are special cases to be aware of:

- **If you change an input to generated code**, then you must run
  `make manifests`. Inputs include:

  - API type definitions in [apis/serving](https://github.com/kserve/kserve/tree/master/pkg/apis/serving)
  - Manifests or kustomize patches stored in [config](https://github.com/kserve/kserve/tree/master/config).

  To generate the KServe python/go clients, you should run `make generate`.

- **If you want to add new dependencies**, then you add the imports and the specific version of the dependency
module in `go.mod`. When it encounters an import of a package not provided by any module in `go.mod`, the go
command automatically looks up the module containing the package and adds it to `go.mod` using the latest version.

- **If you want to upgrade the go dependency**, then you run the go get command e.g., `go get golang.org/x/text` to upgrade
to the latest version, `go get golang.org/x/text@v0.3.0` to upgrade to a specific version.

- **If you want to upgrade the python dependency**, then you can add the package to the respective `pyproject.toml` and run `uv lock` to update the package version.

You can run `make precommit` to make sure that your code passes all the pre-commit hooks and checks before committing.

After making your changes, you can deploy KServe with your updates:

```shell
make deploy-dev
```

## Contribute to the Code 

See the guidelines for:

- [contributing a feature](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#contributing-a-feature)

- [contributing to an existing issue](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#pull-requests)

## Releases

Please check out the documentation [here](https://github.com/kserve/kserve/blob/master/release/RELEASE_PROCESS_v2.md) to understand the release schedule and process.

## Feedback 

The best place to provide feedback about the KServe code is via a Github issue. See [creating a Github issue](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#issues) for guidelines on submitting bugs and feature requests.

## Common Development Issues and Solutions

### Installation Issues

#### Knative Installation Fails
```
Error: failed to create resource: Invalid value: "some-namespace": must be a DNS label
```
- Ensure your namespace names follow Kubernetes naming conventions
- Try using the YAML installation method instead of the Knative Quickstart
- Verify you have appropriate RBAC permissions

#### Istio Installation Issues
```
Error: failed to create resource: CustomResourceDefinition.apiextensions.k8s.io "gateways.networking.istio.io" is invalid
```
- This can happen when installing a newer version of Istio over an older one
- Clean up the old Istio installation first: `istioctl x uninstall --purge`

#### KServe Webhook Issues
```
Error: Internal error occurred: failed calling webhook "isvc.serving.kserve.io"
```
- Verify the webhook service is running: `kubectl get pods -n kserve`
- Check cert-manager is properly installed and has generated valid certificates
- Look at controller pod logs: `kubectl logs -n kserve <controller-pod-name>`

### Networking Issues

#### Unable to Access InferenceService
- Check that your Gateway or Ingress is properly configured
- For serverless mode, verify Knative endpoints: `kubectl get ksvc -n your-namespace`
- For raw mode, check Gateway resources: `kubectl get gateways,httproutes -A`
- Verify network policies allow traffic to your services

#### Slow Cold Start in Knative Mode
- Consider setting `minScale` in your InferenceService spec to keep a minimum number of pods ready
- Check for large container images that might be slow to pull
- Review resource limits and requests

### Development Workflow Issues

#### Local Development with ko
If `ko` fails to build and deploy:
- Ensure `KO_DOCKER_REPO` is set correctly for your environment
- For kind clusters, use `export KO_DOCKER_REPO=kind.local`
- Check Docker daemon is running and accessible

#### Pre-commit Hooks Failing
- Run `pre-commit install --install-hooks` to ensure hooks are installed
- Update pre-commit: `pre-commit autoupdate`
- Check individual errors in the pre-commit output

#### Go Module Issues
```
go: inconsistent vendoring in ...
```
- Run `go mod tidy`
- Ensure Go version matches the project requirements

### Debugging Resources

For more detailed debugging approaches, see the [debugging guide](./debugging.md).

:::tip
When troubleshooting, the KServe controller and webhook logs are invaluable:
```bash
kubectl logs -n kserve -l control-plane=kserve-controller-manager
```
:::
