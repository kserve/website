---
title: LLMInferenceService with AgentGateway
description: How to integrate KServe LLMInferenceService with AgentGateway for LLM-aware routing, token tracking, and GenAI telemetry
---

# LLMInferenceService with AgentGateway

This guide walks through integrating a KServe LLMInferenceService with [AgentGateway](https://agentgateway.dev) to enable LLM-aware routing with token tracking, GenAI telemetry (OpenTelemetry semantic conventions), and token-based rate limiting. The key mechanism is overriding the HTTPRoute `backendRef` via `LLMInferenceServiceConfig` so that KServe's auto-generated routes point to an `AgentgatewayBackend` instead of a plain `InferencePool` or `Service`.

## AgentGateway Overview

[AgentGateway](https://github.com/agentgateway/agentgateway) is a Rust-based proxy under the [AI Agent Infrastructure Foundation (AAIF)](https://aaif.io) at the Linux Foundation. It implements the Kubernetes Gateway API but is LLM-aware: it parses OpenAI chat completion requests and responses, extracts token usage, emits OpenTelemetry GenAI semantic conventions, and enforces token-based rate limits and policies. Key custom resources:

- **`AgentgatewayBackend`**: Declares a backend as an LLM provider so the gateway activates its LLM pipeline (token parsing, model tracking, GenAI telemetry).
- **`AgentgatewayPolicy`**: Attaches governance policies such as token-based rate limiting.
- **`HTTPRoute`**: Standard Gateway API routing — AgentGateway supports `AgentgatewayBackend` as a `backendRef` kind.

For more information, see the [AgentGateway documentation](https://agentgateway.dev/docs).

## Why This Integration Matters

When KServe generates HTTPRoutes for an LLMInferenceService, the `backendRef` defaults to `InferencePool` (or `Service` for catch-all routes). AgentGateway treats these as generic HTTP traffic — it routes requests correctly but cannot activate LLM-aware features because it doesn't know the backend serves LLM traffic.

By overriding the `backendRef` to use `AgentgatewayBackend`, the gateway recognizes the backend as an LLM provider and activates:

| Capability | Plain Service / InferencePool | AgentgatewayBackend |
|---|---|---|
| Routing | Yes | Yes |
| Protocol detection | `http` (generic) | `llm` (LLM-aware) |
| Token parsing | No | Yes (extracts `usage.input_tokens`, `usage.output_tokens` from response body) |
| Model tracking | No | Yes (`gen_ai.request.model`, `gen_ai.response.model`) |
| GenAI semantic conventions (OTel) | No | Yes (`gen_ai.*` attributes per [OTel GenAI spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)) |
| Token-based rate limiting | No | Yes |
| Cost tracking | No | Yes |

:::note
KServe supports [distributed tracing](https://github.com/kserve/kserve/pull/5481) natively via `spec.tracing`, which provides request-level spans and traces. The GenAI semantic conventions listed above are complementary — they add LLM-specific attributes (token counts, model name, operation type) at the gateway level.
:::

## Prerequisites

Before you begin, ensure you have the following components installed and configured:

- A Kubernetes cluster with [KServe with Gateway API enabled](../../../admin-guide/kubernetes-deployment.md)
- [AgentGateway](https://agentgateway.dev/docs/kubernetes/latest/getting-started/) installed in your cluster
- [Gateway API CRDs](https://gateway-api.sigs.k8s.io/guides/#installing-gateway-api) installed
- [LLMInferenceService dependencies](./llmisvc-dependencies.md) installed
- The `kubectl` command-line tool installed and configured to access your cluster
- Basic understanding of [KServe concepts](../../../concepts/index.md) and [LLMInferenceService](./llmisvc-overview.md)

## Deploy LLMInferenceService

### Create Namespace

```shell
kubectl create namespace kserve-test
```

### Create Gateway

Create an AgentGateway Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: agentgateway
  namespace: kserve-test
spec:
  gatewayClassName: agentgateway
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
```

### Deploy Your Model

Deploy an LLMInferenceService. This example uses a small model for demonstration; replace with your model of choice:

```yaml
apiVersion: serving.kserve.io/v1alpha1
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

## Configure LLM-Aware Routing

### Step 1: Create AgentgatewayBackend

Create an `AgentgatewayBackend` that declares the KServe predictor Service as an LLM provider. This tells AgentGateway to activate its LLM pipeline for traffic to this backend:

```yaml
apiVersion: agentgateway.dev/v1alpha1
kind: AgentgatewayBackend
metadata:
  name: my-model-backend
  namespace: kserve-test
spec:
  ai:
    provider:
      openai:
        model: Qwen/Qwen2.5-0.5B-Instruct
      host: my-model-kserve-workload-svc.kserve-test.svc.cluster.local
      port: 8000
```

:::tip
The `host` should point to the KServe workload Service. The naming convention is `{llminferenceservice-name}-kserve-workload-svc`. Verify with:

```shell
kubectl get svc -n kserve-test | grep workload
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
apiVersion: serving.kserve.io/v1alpha1
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
    route:
      http:
        spec:
          parentRefs:
            - group: gateway.networking.k8s.io
              kind: Gateway
              name: agentgateway
              namespace: kserve-test
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
apiVersion: serving.kserve.io/v1alpha1
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
              name: agentgateway
              namespace: kserve-test
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
apiVersion: serving.kserve.io/v1alpha1
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

### Step 3: Attach Token-Based Rate Limiting (Optional)

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
      name: my-model-llminferenceservice-route
  traffic:
    rateLimit:
      local:
        - tokens: 10000
          unit: Hours
```

## Configure $GATEWAY_URL

Check if your Gateway has an external IP address assigned:

```shell
kubectl get svc -n kserve-test -l gateway.networking.k8s.io/gateway-name=agentgateway
```

<Tabs>
  <TabItem value="external-ip" label="Using External IP">
    If the EXTERNAL-IP shows an actual IP address (not &lt;pending&gt;):

    ```shell
    export GATEWAY_URL="http://$(kubectl get gateway -n kserve-test agentgateway \
      -o jsonpath='{.status.addresses[0].value}')"
    ```
  </TabItem>
  <TabItem value="port-forwarding" label="Using Port Forwarding">
    If the EXTERNAL-IP shows &lt;pending&gt;:

    ```shell
    export GATEWAY_URL="http://localhost:8080"
    kubectl port-forward -n kserve-test svc/agentgateway 8080:80
    ```
  </TabItem>
</Tabs>

## Testing the Integration

Send a test request:

```shell
curl -s "$GATEWAY_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }' | jq .
```

### Verify LLM-Aware Processing

Check the AgentGateway logs to confirm the LLM pipeline is active:

```shell
kubectl logs -n kserve-test deploy/agentgateway --tail=10
```

With `AgentgatewayBackend`, you should see GenAI fields in the log:

```text
route=my-model-llminferenceservice-route
http.status=200
protocol=llm
gen_ai.operation.name=chat
gen_ai.request.model=Qwen/Qwen2.5-0.5B-Instruct
gen_ai.response.model=Qwen/Qwen2.5-0.5B-Instruct
gen_ai.usage.input_tokens=12
gen_ai.usage.output_tokens=15
```

Without `AgentgatewayBackend` (plain Service or InferencePool backendRef), the same request would only show:

```text
protocol=http
http.status=200
```

## How It Works

The default [LLMInferenceServiceConfig route template](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-router-route.yaml) generates HTTPRoutes with `backendRef` pointing to `InferencePool` (kind: `InferencePool`, group: `inference.networking.x-k8s.io`).

By overriding `spec.router.route.http` — either directly on the `LLMInferenceService` or via a reusable `LLMInferenceServiceConfig` — you change the `backendRef` to `AgentgatewayBackend` (kind: `AgentgatewayBackend`, group: `agentgateway.dev`). This leverages Gateway API's support for [arbitrary backendRef kinds (GEP-1742)](https://gateway-api.sigs.k8s.io/geps/gep-1742/).

AgentGateway recognizes `AgentgatewayBackend` references and activates its LLM pipeline: parsing OpenAI request/response payloads, extracting token usage, emitting GenAI telemetry, and enforcing token-based policies.

:::note
This approach is generic. Any gateway that supports custom `backendRef` kinds via Gateway API can use the same `LLMInferenceServiceConfig` override mechanism. Replace `AgentgatewayBackend` with your gateway's backend CRD.
:::

## Next Steps

- Explore the [AgentGateway documentation](https://agentgateway.dev/docs) for advanced features like content filtering and cost tracking.
- Learn more about [LLMInferenceServiceConfig composition](./llmisvc-config-composition.md) for managing configurations across multiple services.
- See the [LLMInferenceService Configuration Guide](./llmisvc-configuration.md) for the full `spec.router.route.http` reference.
- Follow the discussion in [kserve/kserve#5729](https://github.com/kserve/kserve/issues/5729) and [agentgateway/agentgateway#2323](https://github.com/agentgateway/agentgateway/issues/2323) for ongoing integration improvements.
