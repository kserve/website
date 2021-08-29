Kubernetes 1.17 is the minimally recommended version, Knative Serving and Istio should be available on Kubernetes Cluster.

- [Istio](https://istio.io/latest/docs/setup/install/operator): v1.9.0+

KServe currently only depends on Istio Ingress Gateway to route requests to inference services externally or internally. If you do not need Service Mesh, we recommend turning off Istio sidecar injection.

- Knative Serving: v0.19.0+

 If you are running Service Mesh mode with Authorization please follow knative doc to setup the authorization policies.

 If you are looking to use PodSpec fields such as nodeSelector, affinity or tolerations which are now supported in the v1beta1 API spec, you need to turn on the corresponding feature flags in your Knative configuration.

- Cert Manager: v1.3.0+

Cert manager is needed to provision webhook certs for production grade installation, alternatively you can run our self signed certs generation script.