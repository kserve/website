# Kubernetes Deployment Installation Guide
KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

Kubernetes 1.22 is the minimally required version and please check the following recommended Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version   |
| :---------- | :------------ |
| 1.22       | 1.11, 1.12   |
| 1.23       | 1.12, 1.13   |
| 1.24       | 1.13, 1.14   |
| 1.25       | 1.15, 1.16   |

## 1. Install Istio 

The minimally required Istio version is 1.13 and you can refer to the [Istio install guide](https://istio.io/latest/docs/setup/install).

Once Istio is installed, create `IngressClass` resource for istio.
```
apiVersion: networking.k8s.io/v1beta1
kind: IngressClass
metadata:
  name: istio
spec:
  controller: istio.io/ingress-controller
```


!!! note 
    Istio ingress is recommended, but you can choose to install with other [Ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/) and create `IngressClass` resource for your Ingress option.



## 2. Install Cert Manager
The minimally required Cert Manager version is 1.9.0 and you can refer to [Cert Manager installation guide](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 3. Install KServe
!!! note 
    The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe.


**i. Install KServe**

=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.10.0/kserve.yaml
    ```

Install KServe default serving runtimes:

=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.10.0/kserve-runtimes.yaml
    ```

**ii. Change default deployment mode and ingress option**

First in ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` in the `deploy` section,

=== "kubectl"
    ```bash
    kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
    ```

then modify the `ingressClassName` in `ingress` section to point to `IngressClass` name created in step 1.

    ```yaml
    ingress: |-
    {
        "ingressClassName" : "your-ingress-class",
    }
    ```

