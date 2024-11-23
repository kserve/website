# Kubernetes Deployment Installation Guide
KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

Kubernetes 1.28 is the minimally required version and please check the following recommended Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version |
| :----------------- | :------------------------ |
| 1.28               | 1.22                      |
| 1.29               | 1.22, 1.23                |
| 1.30               | 1.22, 1.23                |

## 1. Install Istio 

The minimally required Istio version is 1.22 and you can refer to the [Istio install guide](https://istio.io/latest/docs/setup/install).

Once Istio is installed, create `IngressClass` resource for istio.
```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: istio
spec:
  controller: istio.io/ingress-controller
```


!!! note 
    Istio ingress is recommended, but you can choose to install with other [Ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/) and create `IngressClass` resource for your Ingress option.



## 2. Install Cert Manager
The minimally required Cert Manager version is 1.15.0 and you can refer to [Cert Manager installation guide](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 3. Install KServe
!!! note 
    The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe.

=== "Install using Helm"

    I. Install KServe CRDs

    ```shell
    helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v{{ kserve_release_version }}
    ```
    II. Install KServe Resources

    Set the `kserve.controller.deploymentMode` to `RawDeployment` and `kserve.controller.gateway.ingressGateway.className` to point to the `IngressClass`
    name created in [step 1](#1-install-istio).

    ```shell
    helm install kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }} \
     --set kserve.controller.deploymentMode=RawDeployment \
     --set kserve.controller.gateway.ingressGateway.className=your-ingress-class
    ```

=== "Install using YAML"

    I. Install KServe

    ```bash
    # --server-side option is required as the InferenceService CRD is large, see [this issue](https://github.com/kserve/kserve/issues/3487) for details.
    kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{  kserve_release_version }}/kserve.yaml
    ```

    II. Install KServe default serving runtimes:

    ```bash
    kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{  kserve_release_version }}/kserve-cluster-resources.yaml
    ```

    III. Change default deployment mode and ingress option

    First in ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` in the `deploy` section,

    ```bash
    kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
    ```

    then modify the `ingressClassName` in `ingress` section to point to `IngressClass` name created in [step 1](#1-install-istio).
    ```yaml
    ingress: |-
    {
        "ingressClassName" : "your-ingress-class",
    }
    ```
