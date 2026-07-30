---
title: LLMInferenceService with agentgateway
description: How to use KServe LLMInferenceService with agentgateway as an Inference Gateway and optionally apply AI policies
---

# LLMInferenceService with agentgateway

This guide walks through using [agentgateway](https://agentgateway.dev) as an
Inference Gateway for KServe `LLMInferenceService`. agentgateway supports the
Gateway API Inference Extension, so KServe's generated `HTTPRoute` can route
directly to the standard `InferencePool` backend. An `AgentgatewayBackend` is
only needed when you want to apply AI policies that require LLM-aware
processing, such as token-based rate limiting. It can wrap the generated
`InferencePool` so that endpoint selection remains available.

## agentgateway Overview

[agentgateway](https://github.com/agentgateway/agentgateway) is a Rust-based proxy under the [AI Agent Infrastructure Foundation (AAIF)](https://aaif.io) at the Linux Foundation. It implements the Kubernetes Gateway API but is LLM-aware: it parses OpenAI chat completion requests and responses, extracts token usage, emits OpenTelemetry GenAI semantic conventions, and enforces token-based rate limits and policies. Key custom resources:

- **`InferencePool`**: Standard Gateway API Inference Extension backend supported directly by agentgateway.
- **`AgentgatewayBackend`**: Optional backend that declares an LLM provider so the gateway can apply LLM-aware processing and AI policies.
- **`AgentgatewayPolicy`**: Attaches governance policies such as token-based rate limiting.
- **`HTTPRoute`**: Standard Gateway API routing that can reference either an `InferencePool` or an `AgentgatewayBackend`.

For more information, see the [agentgateway KServe integration guide](https://agentgateway.dev/docs/kubernetes/main/integrations/kserve/), the [llm-d agentgateway guide](https://llm-d.ai/docs/infrastructure/gateway/agentgateway), and the [Gateway API Inference Extension implementation list](https://gateway-api-inference-extension.sigs.k8s.io/implementations/gateways/#gateway-implementations).

## Choose a Backend Type

When the managed scheduler is enabled, KServe generates `HTTPRoute` resources
with an `InferencePool` backend. agentgateway supports this standard backend
without any route override. Use `AgentgatewayBackend` only when an AI policy
needs agentgateway to parse the LLM request or response.

| Backend | Use it for | Route override required |
| --- | --- | --- |
| `InferencePool` | Standard inference routing through the Gateway API Inference Extension | No |
| `AgentgatewayBackend` | AI policies such as token-based rate limiting, plus LLM-aware telemetry and model tracking | Yes |

:::note
KServe supports [distributed tracing](https://github.com/kserve/kserve/pull/5481) natively via `spec.tracing`, which provides request-level spans and traces. The LLM-aware telemetry available through `AgentgatewayBackend` is complementary — it adds LLM-specific attributes such as token counts, model name, and operation type at the gateway level.
:::

## Prerequisites

Before you begin, ensure you have the following components installed and configured:

- A Kubernetes cluster with [KServe with Gateway API enabled](../../../admin-guide/kubernetes-deployment.md)
- The [Gateway API CRDs](https://gateway-api.sigs.k8s.io/guides/) installed
- [LLMInferenceService dependencies](./llmisvc-dependencies.md) installed
- The `kubectl` command-line tool installed and configured to access your cluster
- Basic understanding of [KServe concepts](../../../concepts/index.md) and [LLMInferenceService](./llmisvc-overview.md)

Configure the KServe `LLMInferenceService` controller to attach generated
routes to the shared agentgateway Gateway. During the GAIE v1 migration, KServe
also installs transitional CRDs that its controller uses for compatibility:

```shell
export KSERVE_VERSION=v0.20.0-rc0

helm upgrade -i kserve-llmisvc-resources \
  oci://ghcr.io/kserve/charts/kserve-llmisvc-resources \
  --version $KSERVE_VERSION \
  --namespace kserve \
  --set kserve.controller.deploymentMode=Standard \
  --set kserve.controller.gateway.ingressGateway.enableGatewayApi=true \
  --set kserve.controller.gateway.ingressGateway.createGateway=false \
  --set kserve.controller.gateway.ingressGateway.kserveGateway=kserve/kserve-ingress-gateway \
  --set kserve.controller.gateway.ingressGateway.className=agentgateway \
  --set kserve.controller.gateway.disableIstioVirtualHost=true \
  --set kserve.controller.gateway.disableIngressCreation=false \
  --set kserve.controller.knativeAddressableResolver.enabled=false \
  --set kserve.controller.gateway.localGateway.gateway="" \
  --set kserve.controller.gateway.localGateway.gatewayService=""
```

Wait for the updated controller, then apply the final GAIE v1.5.0 CRD bundle.
Applying the bundle after the KServe chart updates the stable API definitions
and retains KServe's transitional CRDs:

```shell
kubectl rollout status deployment/llmisvc-controller-manager \
  --namespace kserve \
  --timeout=240s

kubectl apply --server-side -f \
  https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/download/v1.5.0/manifests.yaml
```

Install or upgrade agentgateway after the GAIE CRDs so that its controller
discovers `InferencePool`, then install the matching KServe runtime
configuration:

```shell
export AGENTGATEWAY_VERSION=v1.4.1

helm upgrade -i agentgateway-crds \
  oci://cr.agentgateway.dev/charts/agentgateway-crds \
  --version $AGENTGATEWAY_VERSION \
  --namespace agentgateway-system \
  --create-namespace

helm upgrade -i agentgateway \
  oci://cr.agentgateway.dev/charts/agentgateway \
  --version $AGENTGATEWAY_VERSION \
  --namespace agentgateway-system \
  --set inferenceExtension.enabled=true

helm upgrade -i kserve-runtime-configs \
  oci://ghcr.io/kserve/charts/kserve-runtime-configs \
  --version $KSERVE_VERSION \
  --namespace kserve \
  --set kserve.llmisvcConfigs.enabled=true
```

KServe creates the `InferencePool` and deploys the llm-d Router endpoint picker
from its runtime configuration. Do not install the llm-d Router Helm chart
separately for this workflow.

## Deploy LLMInferenceService

### Create Namespace

```shell
kubectl create namespace kserve-test
```

### Create Gateway

Create a shared agentgateway Gateway resource in the `kserve` namespace.
Routes from model namespaces can attach to this Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kserve-ingress-gateway
  namespace: kserve
spec:
  gatewayClassName: agentgateway
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All
  infrastructure:
    labels:
      serving.kserve.io/gateway: kserve-ingress-gateway
```

### Deploy Your Model

Deploy an LLMInferenceService. This example uses a small model for demonstration; replace with your model of choice:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model
  namespace: kserve-test
spec:
  model:
    uri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
    name: Qwen/Qwen2.5-0.5B-Instruct
  replicas: 1
  router:
    route: {}
    scheduler: {}
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
```

Wait for the LLMInferenceService to be ready:

```shell
kubectl wait --for=condition=Ready llminferenceservice/my-model \
  -n kserve-test --timeout=300s
```

## Use the Standard InferencePool Backend

The managed scheduler and default
[LLMInferenceServiceConfig route template](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-router-route.yaml)
generate an `InferencePool` and an `HTTPRoute` that references it. agentgateway
supports this backend directly, so no `AgentgatewayBackend` or route override
is required for standard inference routing.

Verify the generated backend reference:

```shell
kubectl get httproute my-model-kserve-route \
  -n kserve-test \
  -o jsonpath='{.spec.rules[?(@.name=="v1-chat-completions-path")].backendRefs[0]}'
```

If you do not need AI policies, continue to [Configure the gateway URL](#configure-gateway-url).

## Optional: Configure an AgentgatewayBackend for AI Policies

To use AI policies that require LLM-aware request or response processing,
create an `AgentgatewayBackend` and override the generated route to reference
it.

### Step 1: Create AgentgatewayBackend

Create an `AgentgatewayBackend` that wraps the `InferencePool` generated by
KServe. This tells agentgateway to activate its LLM pipeline while retaining
the pool's endpoint selection:

```yaml
apiVersion: agentgateway.dev/v1alpha1
kind: AgentgatewayBackend
metadata:
  name: my-model-backend
  namespace: kserve-test
spec:
  ai:
    provider:
      custom:
        backendRef:
          group: inference.networking.k8s.io
          kind: InferencePool
          name: my-model-inference-pool
        model: Qwen/Qwen2.5-0.5B-Instruct
        formats:
          - type: Completions
            path: /v1/chat/completions
```

:::tip
The generated pool name is `{llminferenceservice-name}-inference-pool`.
Verify it with:

```shell
kubectl get inferencepool -n kserve-test
```
:::

### Step 2: Override HTTPRoute backendRef

You have two options to override the backendRef in KServe's auto-generated HTTPRoutes.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="per-service" label="Per-Service Override">

Override the route configuration on an individual `LLMInferenceService` using `spec.router.route.http`:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model
  namespace: kserve-test
spec:
  model:
    uri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
    name: Qwen/Qwen2.5-0.5B-Instruct
  replicas: 1
  router:
    scheduler: {}
    route:
      http:
        spec:
          parentRefs:
            - group: gateway.networking.k8s.io
              kind: Gateway
              name: kserve-ingress-gateway
              namespace: kserve
          rules:
            - backendRefs:
                - group: agentgateway.dev
                  kind: AgentgatewayBackend
                  name: my-model-backend
              matches:
                - path:
                    type: PathPrefix
                    value: /v1/chat/completions
              timeouts:
                backendRequest: 0s
                request: 0s
            - backendRefs:
                - group: agentgateway.dev
                  kind: AgentgatewayBackend
                  name: my-model-backend
              matches:
                - path:
                    type: PathPrefix
                    value: /v1/completions
              timeouts:
                backendRequest: 0s
                request: 0s
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
```

</TabItem>
<TabItem value="config-template" label="LLMInferenceServiceConfig (Reusable)">

Create an `LLMInferenceServiceConfig` that overrides the route template. This can be referenced by multiple `LLMInferenceService` resources via `baseRefs`:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceServiceConfig
metadata:
  name: agentgateway-route-config
  namespace: kserve-test
spec:
  router:
    route:
      http:
        spec:
          parentRefs:
            - group: gateway.networking.k8s.io
              kind: Gateway
              name: kserve-ingress-gateway
              namespace: kserve
          rules:
            - backendRefs:
                - group: agentgateway.dev
                  kind: AgentgatewayBackend
                  name: my-model-backend
              matches:
                - path:
                    type: PathPrefix
                    value: /v1/chat/completions
              timeouts:
                backendRequest: 0s
                request: 0s
            - backendRefs:
                - group: agentgateway.dev
                  kind: AgentgatewayBackend
                  name: my-model-backend
              matches:
                - path:
                    type: PathPrefix
                    value: /v1/completions
              timeouts:
                backendRequest: 0s
                request: 0s
```

Then reference it in your LLMInferenceService:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-model
  namespace: kserve-test
spec:
  model:
    uri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
    name: Qwen/Qwen2.5-0.5B-Instruct
  replicas: 1
  baseRefs:
    - name: agentgateway-route-config
  router:
    scheduler: {}
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
```

</TabItem>
</Tabs>

### Step 3: Attach Token-Based Rate Limiting

Apply an `AgentgatewayPolicy` to enforce token-based rate limits on the route:

```yaml
apiVersion: agentgateway.dev/v1alpha1
kind: AgentgatewayPolicy
metadata:
  name: token-ratelimit
  namespace: kserve-test
spec:
  targetRefs:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      name: my-model-kserve-route
  traffic:
    rateLimit:
      local:
        - tokens: 10000
          unit: Hours
```

## Configure $GATEWAY_URL {#configure-gateway-url}

Check if your Gateway has an external IP address assigned:

```shell
kubectl get svc -n kserve \
  -l gateway.networking.k8s.io/gateway-name=kserve-ingress-gateway
```

<Tabs>
  <TabItem value="external-ip" label="Using External IP">
    If the EXTERNAL-IP shows an actual IP address (not &lt;pending&gt;):

    ```shell
    export GATEWAY_URL="http://$(kubectl get gateway -n kserve kserve-ingress-gateway \
      -o jsonpath='{.status.addresses[0].value}')"
    ```
  </TabItem>
  <TabItem value="port-forwarding" label="Using Port Forwarding">
    If the EXTERNAL-IP shows &lt;pending&gt;:

    ```shell
    export GATEWAY_URL="http://localhost:8080"
    kubectl port-forward -n kserve svc/kserve-ingress-gateway 8080:80
    ```
  </TabItem>
</Tabs>

## Testing the Integration

Set the request path for the backend you selected:

<Tabs>
<TabItem value="inference-pool-path" label="InferencePool">

```shell
export GATEWAY_PATH="/kserve-test/my-model/v1/chat/completions"
```

</TabItem>
<TabItem value="agentgateway-backend-path" label="AgentgatewayBackend">

```shell
export GATEWAY_PATH="/v1/chat/completions"
```

</TabItem>
</Tabs>

Send a test request:

```shell
curl -s "$GATEWAY_URL$GATEWAY_PATH" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }' | jq .
```

### Verify AI Policy Processing

If you configured an `AgentgatewayBackend`, check the agentgateway logs to
confirm the LLM pipeline is active:

```shell
kubectl logs -n kserve deploy/kserve-ingress-gateway --tail=10
```

With `AgentgatewayBackend`, you should see GenAI fields in the log:

```text
route=kserve-test/my-model-kserve-route
http.status=200
protocol=llm
gen_ai.operation.name=chat
gen_ai.request.model=Qwen/Qwen2.5-0.5B-Instruct
gen_ai.response.model=Qwen/Qwen2.5-0.5B-Instruct
gen_ai.usage.input_tokens=12
gen_ai.usage.output_tokens=15
```

## How It Works

For standard inference routing, KServe generates an `HTTPRoute` whose
`backendRef` points to `InferencePool` (kind: `InferencePool`, group:
`inference.networking.k8s.io`). agentgateway implements the Gateway API
Inference Extension and routes this traffic through the pool's endpoint picker.

For AI policies, overriding `spec.router.route.http` changes the `backendRef`
to `AgentgatewayBackend` (kind: `AgentgatewayBackend`, group:
`agentgateway.dev`). The `AgentgatewayBackend` wraps the generated
`InferencePool`, so agentgateway can parse OpenAI request and response payloads,
extract token usage, emit GenAI telemetry, and enforce token-based policies
without bypassing the endpoint picker.

## Next Steps

- Compare the other [inference gateway integrations](./llmisvc-inference-gateways.md).
- Follow the [llm-d agentgateway guide](https://llm-d.ai/docs/infrastructure/gateway/agentgateway) for the llm-d Router and gateway infrastructure.
- Explore the [llm-d well-lit paths](https://llm-d.ai/docs/well-lit-paths) for production deployment patterns.
- Explore the [agentgateway documentation](https://agentgateway.dev/docs) for advanced features like content filtering and cost tracking.
- Learn more about [LLMInferenceServiceConfig composition](./llmisvc-config-composition.md) for managing configurations across multiple services.
- See the [LLMInferenceService Configuration Guide](./llmisvc-configuration.md) for the full `spec.router.route.http` reference.
- Follow the discussion in [kserve/kserve#5729](https://github.com/kserve/kserve/issues/5729) and [agentgateway/agentgateway#2323](https://github.com/agentgateway/agentgateway/issues/2323) for ongoing integration improvements.
