# Serverless Installation Guide
KServe Serverless installation enables autoscaling based on request volume and supports scale down to and from zero. It also supports revision management
and canary rollout based on revisions.

Kubernetes 1.22 is the minimally required version and please check the following recommended Knative, Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version | Recommended Knative Version |
|:-------------------|:--------------------------|:----------------------------|
| 1.27               | 1.17,1.18                 | 1.10,1.11                   |
| 1.28               | 1.19,1.20                 | 1.11,1.12.4                 |
| 1.29               | 1.20,1.21                 | 1.12.4,1.13.3               |


## 1. Install Knative Serving
Please refer to [Knative Serving install guide](https://knative.dev/docs/admin/install/serving/install-serving-with-yaml/).

!!! note
    If you are looking to use PodSpec fields such as nodeSelector, affinity or tolerations which are now supported in the v1beta1 API spec, 
    you need to turn on the corresponding [feature flags](https://knative.dev/docs/admin/serving/feature-flags) in your Knative configuration.
    
!!! warning
    In Knative 1.8, The cluster domain suffix is changed to `svc.cluster.local` as the default domain. As routes using the cluster domain suffix are not exposed through Ingress, you will need to [configure DNS](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns) in order to expose their services (most users probably already are).

## 2. Install Networking Layer
The recommended networking layer for KServe is [Istio](https://istio.io/) as currently it works best with KServe, please refer to the [Istio install guide](https://knative.dev/docs/admin/install/installing-istio).
Alternatively you can also choose other networking layers like [Kourier](https://github.com/knative-sandbox/net-kourier) or [Contour](https://projectcontour.io/), see [how to install Kourier with KServe guide](./kourier_networking/README.md).

## 3. Install Cert Manager
The minimally required Cert Manager version is 1.9.0 and you can refer to [Cert Manager](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.
    
## 4. Install KServe
=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.11.0/kserve.yaml
    ```

## 5. Install KServe Built-in ClusterServingRuntimes

=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.11.0/kserve-runtimes.yaml
    ```

!!! note
    **ClusterServingRuntimes** are required to create InferenceService for built-in model serving runtimes with KServe v0.8.0 or higher.
