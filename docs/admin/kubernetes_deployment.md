# Kubernetes Deployment Installation Guide
Kserve supports `RawDeployment`, `RawDeployment` is based on kubernetes `Deployment`, `Service` and `Ingress`.

Kubernetes 1.17 is the minimally recommended version.
## 1. Install Istio
The minimally required Istio version is 1.9.5 and you can refer to the [Istio install guide](https://knative.dev/docs/admin/install/installing-istio).
!!! note 
    Istio ingress is recommended. But user can choose other [Ingress controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).

## 2. Install Cert Manager
The minimally required Cert Manager version is 1.3.0 and you can refer to [Cert Manager](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 3. Install KServe
!!! note 
    By default, Kserve deployment mode is `Serverless`, in this mode you need to istall Knative first. If you don't want to install knative, you can change the default deployment mode to `RawDeployment`.
**i. Change default deployment mode**

At first, download kserver's deployment yaml.
```bash
wget https://github.com/kserve/kserve/releases/download/v0.7.0-rc0/kserve.yaml
```
Then, open the `kserve.yaml`, find the config map by name `inferenceservice-config`, modify the `deploy` section:
```json
deploy:
    {
      "defaultDeploymentMode": "RawDeployment"
    }
```

**ii. Install Kserve**
=== "kubectl"
    ```bash
    kubectl apply -f kserve.yaml
    ``` 