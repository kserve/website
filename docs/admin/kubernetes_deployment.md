# Kubernetes Deployment Installation Guide
KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

## 1. Install Cert Manager
The minimally required Cert Manager version is 1.9.0 and you can refer to [Cert Manager installation guide](https://cert-manager.io/docs/installation/).

!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 2. Install KServe
!!! note 
    The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe and the `RawDeployment` mode does not have any dependecy on Knative.

**i. Create a yaml file**
Open an editor of your choice and create `kustomization.yaml` file.     
    ```
    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization

    namespace: kserve

    resources:
    - https://github.com/kserve/kserve/releases/download/v0.13.0/kserve.yaml

    patches:
    - target:
        kind: ConfigMap
        name: inferenceservice-config
      patch: |
        - path: /data/deploy
          op: replace
          value: |-
            {
                "defaultDeploymentMode": "RawDeployment"
            }
        - path: /data/ingress
          op: replace
          value: |-
            {
                "disableIstioVirtualHost": true,
                "disableIngressCreation": true,
                "ingressDomain": "svc.cluster.local",
                "ingressGateway" : "disabled",
                "ingressService" : "disabled"
            }
    
**ii. Install KServe**

=== "kubectl"
    ```bash
    kubectl apply -f kustomization.yaml
    ```

Install KServe default serving runtimes:

=== "kubectl"
    ```bash
    kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.13.0/kserve-cluster-resources.yaml
    ```
