# Control Plane
**KServe Control Plane**: Responsible for reconciling the `InferenceService` custom resources. It creates the Knative serverless deployment for predictor, transformer, explainer to enable
autoscaling based on incoming request workload including scaling down to zero when no traffic is received. When raw deployment mode is enabled, control plane creates Kubernetes deployment,
service, ingress, HPA.

![Architect](../images/controlplane.png)

## Control Plane Components
- **KServe Controller**: Responsible for creating service, ingress resources, model server container and model agent container for request/response logging
, batching and model pulling.

- **Ingress Gateway**: Gateway for routing external or internal requests.

In Serverless Mode:

- **Knative Serving Controller**: Responsible for service revision management, creating network routing resources, serverless container with queue proxy to expose traffic metrics and 
enforce concurrency limit. 

- **Knative Activator**: Brings back scaled-to-zero pods and forwards requests.

- **Knative Autoscaler(KPA)**: Watches traffic flow to the application, and scales replicas up or down based on configured metrics.


