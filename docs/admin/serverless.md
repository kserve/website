# Serverless Installation Guide
KServe Serverless installation enables autoscaling based on request volume and supports scale down to and from zero. It also supports revision management
and canary rollout based on revisions.

Kubernetes 1.20 is the minimally required version and please check the following recommended Knative, Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version   | Recommended Knative Version  |
| :---------- | :------------ | :------------|
| 1.20       | 1.9, 1.10, 1.11   | 0.25, 0.26, 1.0  |
| 1.21       | 1.10, 1.11   | 0.25, 0.26, 1.0  |
| 1.22       | 1.11, 1.12   | 0.25, 0.26, 1.0  |

## 1. Install Istio
Please refer to the [Istio install guide](https://knative.dev/docs/admin/install/installing-istio).

## 2. Install Knative Serving
Please refer to [Knative Serving install guide](https://knative.dev/docs/admin/install/serving/install-serving-with-yaml/).

!!! note
    If you are looking to use PodSpec fields such as nodeSelector, affinity or tolerations which are now supported in the v1beta1 API spec, 
    you need to turn on the corresponding [feature flags](https://knative.dev/docs/admin/serving/feature-flags) in your Knative configuration.

## 3. Install Cert Manager
The minimally required Cert Manager version is 1.3.0 and you can refer to [Cert Manager](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.
    
## 4. Install KServe
=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.8.0/kserve.yaml
    ```

## 5. Install KServe Built-in ClusterServingRuntimes

=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.8.0/kserve-runtimes.yaml
    ```

!!! note
    **ClusterServingRuntimes** are required to create InferenceService for built-in model serving runtimes with KServe v0.8.0 or higher.
