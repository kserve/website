# Kubernetes Deployment Installation Guide
KServe supports `RawDeployment` mode to enable `InferenceService` deployment with Kubernetes resources [`Deployment`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment), [`Service`](https://kubernetes.io/docs/concepts/services-networking/service), [`Ingress`](https://kubernetes.io/docs/concepts/services-networking/ingress) / [`Gateway API`](https://kubernetes.io/docs/concepts/services-networking/gateway/) and [`Horizontal Pod Autoscaler`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale). Comparing to serverless deployment it unlocks Knative limitations such as mounting multiple volumes, on the other hand `Scale down and from Zero` is not supported in `RawDeployment` mode.

Kubernetes 1.28 is the minimally required version and please check the following recommended Istio versions for the corresponding
Kubernetes version.

!!! note
    `Gateway API` is the recommended option for KServe while Ingress API is still supported. Follow the [Gateway API migration guide](gatewayapi_migration.md) to migrate from Kubernetes Ingress to Gateway API.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version |
| :----------------- | :------------------------ |
| 1.28               | 1.22                      |
| 1.29               | 1.22, 1.23                |
| 1.30               | 1.22, 1.23                |

## 1. Install Cert Manager
The minimally required Cert Manager version is 1.15.0 and you can refer to [Cert Manager installation guide](https://cert-manager.io/docs/installation/).
    
!!! note
    Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.

## 2. Install Network Controller

=== "Gateway API"

    The Kubernetes Gateway API is a newer, more flexible and standardized way to manage traffic ingress and egress in Kubernetes clusters. KServe Implements the Gateway API version `1.2.1`.
    
    The Gateway API is not part of the Kubernetes cluster, therefore it needs to be installed manually, to do this, follow the next step.

    ```shell
    kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
    ```
    Then, create a `GatewayClass` resource using your preferred network controller. For this example, we will use [Envoy Gateway](https://gateway.envoyproxy.io/docs/) as the network controller.

    ```yaml
    apiVersion: gateway.networking.k8s.io/v1
    kind: GatewayClass
    metadata:
      name: envoy
    spec:
      controllerName: gateway.envoyproxy.io/gatewayclass-controller  
    ```
    Create a `Gateway` resource to expose the `InferenceService`. In this example, you will use the `envoy` `GatewayClass` that we created above. If you already have a `Gateway` resource, you can skip this step and can configure KServe to use the existing `Gateway`.

    ```yaml
    apiVersion: gateway.networking.k8s.io/v1
    kind: Gateway
    metadata:
      name: kserve-ingress-gateway
      namespace: kserve
    spec:
      gatewayClassName: envoy
      listeners:
        - name: http
          protocol: HTTP
          port: 80
            allowedRoutes:
              namespaces:
                from: All
        - name: https
          protocol: HTTPS
          port: 443
          tls:
            mode: Terminate
            certificateRefs:
              - kind: Secret
                name: my-secret
                namespace: kserve
          allowedRoutes:
            namespaces:
              from: All
        infrastructure:
        labels:
          serving.kserve.io/gateway: kserve-ingress-gateway
    ```
    !!! note
        KServe comes with a default `Gateway` named kserve-ingress-gateway. You can enable the default gateway by setting Helm value `kserve.controller.gateway.ingressGateway.createGateway` to `true`.

=== "Kubernetes Ingress"
    
    In this guide we choose to install Istio as ingress controller. The minimally required Istio version is 1.22 and you can refer to the [Istio install guide](https://istio.io/latest/docs/setup/install).
    
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

    
## 3. Install KServe
!!! note 
    The default KServe deployment mode is `Serverless` which depends on Knative. The following step changes the default deployment mode to `RawDeployment` before installing KServe.

=== "Gateway API"

    === "Install using Helm"
    
        I. Install KServe CRDs
    
        ```shell
        helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v{{ kserve_release_version }}
        ```
        
        II. Install KServe Resources
    
        Set the `kserve.controller.deploymentMode` to `RawDeployment` and `kserve.controller.gateway.ingressGateway.kserveGateway` to point to the `Gateway`
        created in [step 2](#2-install-network-controller).
    
        ```shell
        helm install kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }} \
         --set kserve.controller.deploymentMode=RawDeployment \
         --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true
         --set kserve.controller.gateway.ingressGateway.kserveGateway=<gateway-namespace>/<gateway-name>
        ```
    
    === "Install using YAML"
    
        I. Install KServe:
        `--server-side` option is required as the InferenceService CRD is large, see [this issue](https://github.com/kserve/kserve/issues/3487) for details.
    
        ```bash
        kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{kserve_release_version}}/kserve.yaml
        ```
    
        II. Install KServe default serving runtimes:
    
        ```bash
        kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{kserve_release_version}}/kserve-cluster-resources.yaml
        ```
    
        III. Change default deployment mode and ingress option
    
        First in the ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` from the `deploy` section to `RawDeployment`.
    
        ```bash
        kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
        ```
    
        Then from `ingress` section, modify the `enableGatewayApi` to the `true` and modify the `kserveIngressGateway` to point to the Gateway created in [step 2](#2-install-network-controller).
        ```yaml
        ingress: |-
        {
            "enableGatewayApi": true,
            "kserveIngressGateway": "<gateway-namespace>/<gateway-name>",
        }
        ```

=== "Kubernetes Ingress"

    === "Install using Helm"
    
        I. Install KServe CRDs
    
        ```shell
        helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v{{ kserve_release_version }}
        ```
        
        II. Install KServe Resources
    
        Set the `kserve.controller.deploymentMode` to `RawDeployment` and `kserve.controller.gateway.ingressGateway.className` to point to the `IngressClass`
        name created in [step 2](#2-install-network-controller).
    
        ```shell
        helm install kserve oci://ghcr.io/kserve/charts/kserve --version v{{ kserve_release_version }} \
         --set kserve.controller.deploymentMode=RawDeployment \
         --set kserve.controller.gateway.ingressGateway.className=your-ingress-class
        ```
    
    === "Install using YAML"

        I. Install KServe:
        `--server-side` option is required as the InferenceService CRD is large, see [this issue](https://github.com/kserve/kserve/issues/3487) for details.
        
        ```bash
        kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{kserve_release_version}}/kserve.yaml
        ```
        
        II. Install KServe default serving runtimes:
        
        ```bash
        kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v{{kserve_release_version}}/kserve-cluster-resources.yaml
        ```
        
        III. Change default deployment mode and ingress option
        
        First in the ConfigMap `inferenceservice-config` modify the `defaultDeploymentMode` from the `deploy` section to `RawDeployment`,
        
        ```bash
        kubectl patch configmap/inferenceservice-config -n kserve --type=strategic -p '{"data": {"deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}"}}'
        ```
        
        then modify the `ingressClassName` from `ingress` section to the `IngressClass` name created in [step 2](#2-install-network-controller).
        ```yaml
        ingress: |-
        {
            "ingressClassName" : "your-ingress-class",
        }
        ```
