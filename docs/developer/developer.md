# Development

This doc explains how to setup a development environment so you can get started
[contributing](../CONTRIBUTING.md). Also take a look at:

- [How to add and run tests](../test/README.md)
- [Iterating](#iterating)

## Prerequisites

Follow the instructions below to set up your development environment. Once you
meet these requirements, you can make changes and
[deploy your own version of kserve](#deploy-kserve)!

Before submitting a PR, see also [CONTRIBUTING.md](../CONTRIBUTING.md).

### Install requirements

You must install these tools:

1. [`go`](https://golang.org/doc/install): KFServing controller is written in Go and requires Go 1.14.0+.
1. [`git`](https://help.github.com/articles/set-up-git/): For source control.
1. [`Go Module`](https://blog.golang.org/using-go-modules): Go's new dependency management system.
1. [`ko`](https://github.com/google/ko):
   For development.
1. [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/): For
   managing development environments.
1. [`kustomize`](https://github.com/kubernetes-sigs/kustomize/) To customize YAMLs for different environments, requires v3.5.4+.
1. [`yq`](https://github.com/mikefarah/yq) yq is used in the project makefiles to parse and display YAML output. Please use yq version [`3.*`](https://github.com/mikefarah/yq/releases/tag/3.4.1). Latest yq version `4.*` has remove `-d` command so doesn't work with the scripts.

### Install Knative on a Kubernetes cluster

KFServing currently requires `Knative Serving` for auto-scaling, canary rollout, `Istio` for traffic routing and ingress.

* To install Knative components on your Kubernetes cluster, follow the [generic cluster installation guide](https://knative.dev/docs/install/any-kubernetes-cluster/) or alternatively, use the [Knative Operators](https://knative.dev/docs/install/knative-with-operators/) to manage your installation. Observability, tracing and logging are optional but are often very valuable tools for troubleshooting difficult issues - they can be installed via the [directions here](https://github.com/knative/docs/blob/release-0.15/docs/serving/installing-logging-metrics-traces.md).

* If you already have `Istio` or `Knative` (e.g. from a Kubeflow install) then you don't need to install them explictly, as long as version dependencies are satisfied. If you are using DEX based config for Kubeflow 1.0, Istio 1.3.1 is installed by default in your Kubeflow cluster.
* Prior to Knative 0.19, you had to follow the instructions on [Updating your install to use cluster local gateway](https://knative.dev/docs/install/installing-istio/#updating-your-install-to-use-cluster-local-gateway) to add cluster local gateway to your cluster to serve cluster-internal traffic for transformer and explainer use cases. As of Knative 0.19, `cluster-local-gateway` has been replaced by `knative-local-gateway` and doesn't require separate installation instructions. 
  
If you start from scratch, we would recommend Knative 0.20 for KFServing 0.5.0 and for the KFServing code in master. For Istio use version 1.7.1 which is been tested, and for Kubernetes use 1.18+

### Setup your environment

To start your environment you'll need to set these environment variables (we
recommend adding them to your `.bashrc`):

1. `GOPATH`: If you don't have one, simply pick a directory and add
   `export GOPATH=...`
1. `$GOPATH/bin` on `PATH`: This is so that tooling installed via `go get` will
   work properly.
1. `KO_DOCKER_REPO`: The docker repository to which developer images should be
   pushed (e.g. `docker.io/<username>`).

- **Note**: Set up a docker repository for pushing images. You can use any container image registry by adjusting 
the authentication methods and repository paths mentioned in the sections below.
   - [Google Container Registry quickstart](https://cloud.google.com/container-registry/docs/pushing-and-pulling)
   - [Docker Hub quickstart](https://docs.docker.com/docker-hub/)
   - [Azure Container Registry quickstart](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal)
!!! Note  
    if you are using docker hub to store your images your `KO_DOCKER_REPO` variable should be `docker.io/<username>`.
    Currently Docker Hub doesn't let you create subdirs under your username.

`.bashrc` example:

```shell
export GOPATH="$HOME/go"
export PATH="${PATH}:${GOPATH}/bin"
export KO_DOCKER_REPO='docker.io/<username>'
```

### Checkout your fork

The Go tools require that you clone the repository to the
`src/github.com/kserve/kserve` directory in your
[`GOPATH`](https://github.com/golang/go/wiki/SettingGOPATH).

To check out this repository:

1. Create your own
   [fork of this repo](https://help.github.com/articles/fork-a-repo/)
1. Clone it to your machine:

```shell
mkdir -p ${GOPATH}/src/github.com/kubeflow
cd ${GOPATH}/src/github.com/kubeflow
git clone git@github.com:${YOUR_GITHUB_USERNAME}/kserve.git
cd kserve
git remote add upstream git@github.com:kserve/kserve.git
git remote set-url --push upstream no_push
```

_Adding the `upstream` remote sets you up nicely for regularly
[syncing your fork](https://help.github.com/articles/syncing-a-fork/)._

Once you reach this point you are ready to do a full build and deploy as
described below.

## Deploy KServe

### Check Knative Serving installation
Once you've [setup your development environment](#prerequisites), you can see things running with:

```console
$ kubectl -n knative-serving get pods
NAME                                                     READY   STATUS      RESTARTS   AGE
activator-77784645fc-t2pjf                               1/1     Running     0          11d
autoscaler-6fddf74d5-z2fzf                               1/1     Running     0          11d
autoscaler-hpa-5bf4476cc5-tsbw6                          1/1     Running     0          11d
controller-7b8cd7f95c-6jxxj                              1/1     Running     0          11d
istio-webhook-866c5bc7f8-t5ztb                           1/1     Running     0          11d
networking-istio-54fb8b5d4b-xznwd                        1/1     Running     0          11d
storage-version-migration-serving-serving-0.20.0-qrr2l   0/1     Completed   0          11d
webhook-5f5f7bd9b4-cv27c                                 1/1     Running     0          11d

$ kubectl get gateway -n knative-serving
NAME                      AGE
knative-ingress-gateway   11d
knative-local-gateway     11d

$ kubectl get svc -n istio-system
NAME                    TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                                                      AGE
istio-ingressgateway    LoadBalancer   10.101.196.89    X.X.X.X       15021:31101/TCP,80:31781/TCP,443:30372/TCP,15443:31067/TCP   11d
istiod                  ClusterIP      10.101.116.203   <none>        15010/TCP,15012/TCP,443/TCP,15014/TCP,853/TCP                11d
knative-local-gateway   ClusterIP      10.100.179.96    <none>        80/TCP                                                       11d
```
### Deploy KServe from default
We suggest using [cert manager](https://github.com/jetstack/cert-manager) for
provisioning the certificates for the webhook server. Other solutions should
also work as long as they put the certificates in the desired location.

You can follow
[the cert manager documentation](https://docs.cert-manager.io/en/latest/getting-started/install/kubernetes.html)
to install it.

If you don't want to install cert manager, you can set the `KFSERVING_ENABLE_SELF_SIGNED_CA` environment variable to true.
`KFSERVING_ENABLE_SELF_SIGNED_CA` will execute a script to create a self-signed CA and patch it to the webhook config.
```bash
export KFSERVING_ENABLE_SELF_SIGNED_CA=true
```

After that you can run following command to deploy `KServe`, you can skip above step once cert manager is installed.
```bash
make deploy
```

**Optional**: you can set CPU and memory limits when deploying `KServe`.
```bash
make deploy KFSERVING_CONTROLLER_CPU_LIMIT=<cpu_limit> KFSERVING_CONTROLLER_MEMORY_LIMIT=<memory_limit>
```

or
```bash
export KFSERVING_CONTROLLER_CPU_LIMIT=<cpu_limit>
export KFSERVING_CONTROLLER_MEMORY_LIMIT=<memory_limit>
make deploy
```

After above step you can see things running with:
```console
$ kubectl get pods -n kserve -l control-plane=kfserving-controller-manager
NAME                             READY   STATUS    RESTARTS   AGE
kfserving-controller-manager-0   2/2     Running   0          13m
```
!!! Note
    By default it installs to `kserve` namespace with the published controller manager image.

### Deploy KServe with your own version
Run the following command to deploy `KServe` controller and model agent.
```bash
make deploy-dev
```
!!! Note
    `deploy-dev` builds the image from your local code, publishes to `KO_DOCKER_REPO` and deploys the `kserve-controller-manager` and `agent` with the image digest to your cluster for testing. Please also ensure you are logged in to `KO_DOCKER_REPO` from your client machine.

There are also commands to build and deploy the image from your local code for the model server, explainer and storage-initializer, you can choose to use one of below commands for your development purpose.
```bash
make deploy-dev-sklearn

make deploy-dev-xgb

make deploy-dev-pytorch

make deploy-dev-alibi

make deploy-dev-storageInitializer
```

!!! Note
    These commands also publishes to `KO_DOCKER_REPO` with the image of version 'latest', and change the configmap of your cluster to point to the new built images.
    It's just for development and testing purpose so you need to do it one by one. In configmap, for predictors it will just keep the one in development, 
    for exlainer and storage initializer will just change the item impacted and set all others images including the `controller-manager` to be default. 

### Smoke test after deployment

Run the following command to smoke test the deployment
```bash
kubectl apply -f docs/samples/v1beta1/tensorflow/tensorflow.yaml
```

You should see model serving deployment running under default or your specified namespace.

```kubectl
$ kubectl get pods -n default -l serving.kserve.io/inferenceservice=flowers-sample
```

==**Expected Output**==    
```
NAME                                                      READY   STATUS    RESTARTS   AGE
flowers-sample-default-htz8r-deployment-8fd979f9b-w2qbv   3/3     Running   0          10s
```

## Iterating

As you make changes to the code-base, there are two special cases to be aware
of:

- **If you change an input to generated code**, then you must run
  `make manifests`. Inputs include:

  - API type definitions in
    [apis/serving/v1beta1](https://github.com/kserve/kserve/tree/master/pkg/apis/serving/v1beta1),
  - Manifests or kustomize patches stored in [config](../config).

- **If you want to add new dependencies**, then you add the imports and the specific version of the dependency
module in `go.mod`. When it encounters an import of a package not provided by any module in `go.mod`, the go
command automatically looks up the module containing the package and adds it to `go.mod` using the latest version.

- **If you want to upgrade the dependency**, then you run go get command e.g `go get golang.org/x/text` to upgrade
to the latest version, `go get golang.org/x/text@v0.3.0` to upgrade to a specific version.

```shell
make deploy-dev
```

