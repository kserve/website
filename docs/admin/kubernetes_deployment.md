# Kubernetes Deployment Installation Guide
KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

Kubernetes 1.17 is the minimally required version and please check the following recommended Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version   |
| :---------- | :------------ |
| 1.17       | 1.9  |
| 1.18       | 1.9, 1.10 |
| 1.19       | 1.9, 1.10, 1.11   |
| 1.20       | 1.9, 1.10, 1.11   |
| 1.21       | 1.10, 1.11   |
| 1.22       | 1.11   |

## 1. Install Istio
The minimally required Istio version is 1.9.5 and you can refer to the [Istio install guide](https://istio.io/latest/docs/setup/install).

!!! note 
    Istio ingress is recommended, but you can choose to install with other [Ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).

## 2. Install Cert Manager
The minimally required Cert Manager version is 1.3.0 and you can refer to [Cert Manager installation guide](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 3. Install KServe
!!! note 
    The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe.

**i. Change default deployment mode**

Download the KServe's install manifest yaml.
```bash
wget https://github.com/kserve/kserve/releases/download/v0.7.0/kserve.yaml
```
Open the `kserve.yaml`, find the `ConfigMap` with name `inferenceservice-config` in the manifest and modify the `deploy` section:
```json
deploy:
    {
      "defaultDeploymentMode": "RawDeployment"
    }
```

**ii. Install KServe**
=== "kubectl"
    ```bash
    kubectl apply -f kserve.yaml
    ``` 
