# Serverless Installation Guide
KServe Serverless installation enables autoscaling based on request volume and supports scale down to and from zero. It also supports revision management
and canary rollout based on revisions.

Kubernetes 1.28 is the minimally required version and please check the following recommended Knative, Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version | Recommended Knative Version |
|:-------------------|:--------------------------|:----------------------------|
| 1.28               | 1.22                      | 1.15                        |
| 1.29               | 1.22,1.23                 | 1.15,1.16                   |
| 1.30               | 1.22,1.23                 | 1.15,1.16                   |

## 1. Install Knative Serving
Please refer to [Knative Serving install guide](https://knative.dev/docs/admin/install/serving/install-serving-with-yaml/).

!!! note
    If you are looking to use PodSpec fields such as nodeSelector, affinity or tolerations which are now supported in the v1beta1 API spec, 
    you need to turn on the corresponding [feature flags](https://knative.dev/docs/admin/serving/feature-flags) in your Knative configuration.
    
!!! warning
    Knative 1.13.1 requires Istio 1.20+, gRPC routing does not work with previous Istio releases, see [release notes](https://github.com/knative/serving/releases/tag/knative-v1.13.1).

## 2. Install Networking Layer
The recommended networking layer for KServe is [Istio](https://istio.io/) as currently it works best with KServe, please refer to the [Istio install guide](https://knative.dev/docs/admin/install/installing-istio).
Alternatively you can also choose other networking layers like [Kourier](https://github.com/knative-sandbox/net-kourier) or [Contour](https://projectcontour.io/), see [how to install Kourier with KServe guide](./kourier_networking/README.md).

## 3. Install Cert Manager
The minimally required Cert Manager version is 1.15.0 and you can refer to [Cert Manager](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.
    
## 4. Install KServe

=== "Install using Helm"

    Install KServe CRDs
    ```bash
    helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v{{ kserve_release_version }}
    ```
    
    Install KServe Resources
    ```bash
    helm install kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }}
    ```
    
=== "Install using YAML"
    Install KServe CRDs and Controller, `--server-side` option is required as the InferenceService CRD is large, see [this issue](https://github.com/kserve/kserve/issues/3487) for details.

    ```bash
    kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{kserve_release_version}}/kserve.yaml
    ```
    
    Install KServe Built-in ClusterServingRuntimes
    ```bash
    kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{ kserve_release_version }}/kserve-cluster-resources.yaml
    ```

!!! note
    **ClusterServingRuntimes** are required to create InferenceService for built-in model serving runtimes with KServe v0.8.0 or higher.
