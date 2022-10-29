# Development

This doc explains how to setup a development environment so you can get started
[contributing](https://github.com/kserve/kserve/blob/master/CONTRIBUTING.md).

## Prerequisites

Follow the instructions below to set up your development environment. Once you
meet these requirements, you can make changes and
[deploy your own version of kserve](#deploy-kserve)!

Before submitting a PR, see also [CONTRIBUTING.md](https://github.com/kserve/kserve/blob/master/CONTRIBUTING.md).

### Install requirements

You must install these tools:

1. [`go`](https://golang.org/doc/install): KServe controller is written in Go and requires Go 1.18.0+.
1. [`git`](https://help.github.com/articles/set-up-git/): For source control.
1. [`Go Module`](https://blog.golang.org/using-go-modules): Go's new dependency management system.
1. [`ko`](https://github.com/google/ko):
   For development.
1. [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/): For
   managing development environments.
1. [`kustomize`](https://github.com/kubernetes-sigs/kustomize/) To customize YAMLs for different environments, requires v3.5.4+.
1. [`yq`](https://github.com/mikefarah/yq) yq is used in the project makefiles to parse and display YAML output, requires yq `4.*`.

### Install Knative on a Kubernetes cluster

KServe currently requires `Knative Serving` for auto-scaling, canary rollout, `Istio` for traffic routing and ingress.

* To install Knative components on your Kubernetes cluster, follow the [installation guide](https://knative.dev/docs/admin/install/) or alternatively, 
use the [Knative Operators](https://knative.dev/docs/install/operator/knative-with-operators/) to manage your installation. Observability, tracing and logging are optional but are often very valuable tools for troubleshooting difficult issues,
they can be installed via the [directions here](https://github.com/knative/docs/blob/release-0.15/docs/serving/installing-logging-metrics-traces.md).

* If you start from scratch, KServe requires Kubernetes 1.17+, Knative 0.19+, Istio 1.9+.

* If you already have `Istio` or `Knative` (e.g. from a Kubeflow install) then you don't need to install them explictly, as long as version dependencies are satisfied.
  

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
mkdir -p ${GOPATH}/src/github.com/kserve
cd ${GOPATH}/src/github.com/kserve
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
Once you've [setup your development environment](#prerequisites), you can verify the installation with following:

!!! Success
    ```bash
    $ kubectl -n knative-serving get pods
    NAME                                                     READY   STATUS      RESTARTS   AGE
    activator-77784645fc-t2pjf                               1/1     Running     0          11d
    autoscaler-6fddf74d5-z2fzf                               1/1     Running     0          11d
    autoscaler-hpa-5bf4476cc5-tsbw6                          1/1     Running     0          11d
    controller-7b8cd7f95c-6jxxj                              1/1     Running     0          11d
    istio-webhook-866c5bc7f8-t5ztb                           1/1     Running     0          11d
    networking-istio-54fb8b5d4b-xznwd                        1/1     Running     0          11d
    webhook-5f5f7bd9b4-cv27c                                 1/1     Running     0          11d

    $ kubectl get gateway -n knative-serving
    NAME                      AGE
    knative-ingress-gateway   11d
    knative-local-gateway     11d
    
    $ kubectl get svc -n istio-system
    NAME                    TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                                                      AGE
    istio-ingressgateway    LoadBalancer   10.101.196.89    X.X.X.X       15021:31101/TCP,80:31781/TCP,443:30372/TCP,15443:31067/TCP   11d
    istiod                  ClusterIP      10.101.116.203   <none>        15010/TCP,15012/TCP,443/TCP,15014/TCP,853/TCP                11d
    ```

### Deploy KServe from master branch
We suggest using [cert manager](https://github.com/cert-manager/cert-manager) for
provisioning the certificates for the webhook server. Other solutions should
also work as long as they put the certificates in the desired location.

You can follow
[the cert manager documentation](https://cert-manager.io/docs/installation/)
to install it.

If you don't want to install cert manager, you can set the `KSERVE_ENABLE_SELF_SIGNED_CA` environment variable to true.
`KSERVE_ENABLE_SELF_SIGNED_CA` will execute a script to create a self-signed CA and patch it to the webhook config.
```bash
export KSERVE_ENABLE_SELF_SIGNED_CA=true
```

After that you can run following command to deploy `KServe`, you can skip above step if cert manager is already installed.
```bash
make deploy
```

!!! Optional
     you can change CPU and memory limits when deploying `KServe`.
     ```bash
     export KSERVE_CONTROLLER_CPU_LIMIT=<cpu_limit>
     export KSERVE_CONTROLLER_MEMORY_LIMIT=<memory_limit>
     make deploy
     ```

==**Expected Output**==
```console
$ kubectl get pods -n kserve -l control-plane=kserve-controller-manager
NAME                             READY   STATUS    RESTARTS   AGE
kserve-controller-manager-0      2/2     Running   0          13m
```
!!! Note
    By default it installs to `kserve` namespace with the published controller manager image from master branch.

### Deploy KServe with your own version
Run the following command to deploy `KServe` controller and model agent with your local change.
```bash
make deploy-dev
```
!!! Note
    `deploy-dev` builds the image from your local code, publishes to `KO_DOCKER_REPO` and deploys the `kserve-controller-manager` and `model agent` with the image digest to your cluster for testing. 
    Please also ensure you are logged in to `KO_DOCKER_REPO` from your client machine.

Run the following command to deploy model server with your local change.
```bash
make deploy-dev-sklearn
make deploy-dev-xgb
```

Run the following command to deploy explainer with your local change.
```
make deploy-dev-alibi
```

Run the following command to deploy storage initializer with your local change.
```
make deploy-dev-storageInitializer
```

!!! Warning
    The deploy command publishes the image to `KO_DOCKER_REPO` with the version `latest`, it changes the `InferenceService` configmap to point to the newly built image sha.
    The built image is only for development and testing purpose, the current limitation is that it changes the image impacted and reset all other images including the
    `kserver-controller-manager` to use the default ones. 

### Smoke test after deployment

Run the following command to smoke test the deployment
```bash
kubectl apply -f https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/tensorflow/tensorflow.yaml
```

You should see model serving deployment running under default or your specified namespace.

```kubectl
$ kubectl get pods -n default -l serving.kserve.io/inferenceservice=flower-sample
```

==**Expected Output**==    
```
NAME                                                      READY   STATUS    RESTARTS   AGE
flower-sample-default-htz8r-deployment-8fd979f9b-w2qbv   3/3     Running   0          10s
```
## Running unit/integration tests
`kserver-controller-manager` has a few integration tests which requires mock apiserver
and etcd, they get installed along with [`kubebuilder`](https://book.kubebuilder.io/quick-start.html#installation).

To run all unit/integration tests:

```bash
make test
```

## Run e2e tests locally
To setup from local code, do:

 1. `./hack/quick_install.sh`
 2. `make undeploy`
 3. `make deploy-dev`

Go to `python/kserve` and install kserve python sdk deps 
```
pip3 install -e .[test]
```
Then go to `test/e2e`. 

Run `kubectl create namespace kserve-ci-e2e-test`

For KIND/minikube:

* Run `export KSERVE_INGRESS_HOST_PORT=localhost:8080`
* In a different window run `kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80`
* Note that not all tests will pass as the pytorch test requires gpu. These will show as pending pods at the end or you can add marker to skip the test.

Run `pytest > testresults.txt`

Tests may not clean up. To re-run, first do `kubectl delete namespace kserve-ci-e2e-test`, recreate namespace and run again.

## Iterating

As you make changes to the code-base, there are two special cases to be aware
of:

- **If you change an input to generated code**, then you must run
  `make manifests`. Inputs include:

  - API type definitions in
    [apis/serving/v1beta1](https://github.com/kserve/kserve/tree/master/pkg/apis/serving/v1beta1),
  - Manifests or kustomize patches stored in [config](https://github.com/kserve/kserve/tree/master/config).

  To generate the KServe python/go clients, you should run `make generate`.

- **If you want to add new dependencies**, then you add the imports and the specific version of the dependency
module in `go.mod`. When it encounters an import of a package not provided by any module in `go.mod`, the go
command automatically looks up the module containing the package and adds it to `go.mod` using the latest version.

- **If you want to upgrade the dependency**, then you run go get command e.g `go get golang.org/x/text` to upgrade
to the latest version, `go get golang.org/x/text@v0.3.0` to upgrade to a specific version.

```shell
make deploy-dev
```

## Contribute to the code 

See the guidelines for 
- [contributing a feature](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#contributing-a-feature)
- [contributing to an existing issue](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#pull-requests)

## Feedback 

The best place to provide feedback about the KServe code is via a Github issue. See [creating a Github issue](https://github.com/kserve/community/blob/main/CONTRIBUTING.md#issues) for guidelines on submitting bugs and feature requests.

