---
title: Inference Gateways
description: Choose an inference gateway integration for KServe LLMInferenceService
---

# Inference Gateways

KServe `LLMInferenceService` integrates with Kubernetes Gateway API
implementations to expose models, route inference requests, and apply
gateway-specific traffic policies. For generative inference, use
`LLMInferenceService` instead of the general-purpose `InferenceService` API so
KServe can provision an `InferencePool` and the llm-d Router for
inference-aware endpoint selection.

The common request path is:

```text
Client -> Inference Gateway -> InferencePool -> llm-d Router -> Model server
```

Choose either agentgateway or Envoy AI Gateway for the gateway layer. KServe
manages the `LLMInferenceService`, `InferencePool`, router, and model-serving
workloads in both integrations.

## Reference integrations

| Gateway | Integration | Use this guide for |
| --- | --- | --- |
| [agentgateway](https://agentgateway.dev/) | [LLMInferenceService with agentgateway](../llmisvc/llmisvc-agentgateway.md) | Standard `InferencePool` routing with optional `AgentgatewayBackend` configuration for AI policies |
| [Envoy AI Gateway](https://aigateway.envoyproxy.io/) | [LLMInferenceService with Envoy AI Gateway](../llmisvc/llmisvc-inference-gateway-extension.md) | Routing to an `InferencePool` with an endpoint picker, OpenAI-compatible routing, token accounting, and usage-based rate limiting |

Both guides use Gateway API resources and KServe's configurable router
templates. Their gateway-specific custom resources and supported policies are
different, so follow the guide for the gateway installed in your cluster. Do
not combine resources from the two guides unless you are intentionally running
both gateway implementations.

For production llm-d Router deployment patterns, see the
[llm-d well-lit paths](https://llm-d.ai/docs/well-lit-paths) and
[gateway guides](https://llm-d.ai/docs/infrastructure/gateway). The llm-d
documentation also provides provider-specific infrastructure guides for
[agentgateway](https://llm-d.ai/docs/infrastructure/gateway/agentgateway) and
[Envoy AI Gateway](https://llm-d.ai/docs/infrastructure/gateway/envoy-ai-gateway).
