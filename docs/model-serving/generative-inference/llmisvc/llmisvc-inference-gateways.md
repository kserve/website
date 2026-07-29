---
title: Inference Gateways
description: Reference inference gateway integrations for KServe LLMInferenceService
---

# Inference Gateways

KServe `LLMInferenceService` integrates with Kubernetes Gateway API
implementations to expose models, route inference requests, and apply
gateway-specific traffic policies. Choose a reference integration based on the
gateway and LLM traffic-management features you want to use.

## Reference integrations

| Gateway | Integration | Use this guide for |
| --- | --- | --- |
| [agentgateway](https://agentgateway.dev/) | [LLMInferenceService with agentgateway](./llmisvc-agentgateway.md) | LLM-aware routing through an `AgentgatewayBackend`, GenAI telemetry, token tracking, and token-based policies |
| [Envoy AI Gateway](https://aigateway.envoyproxy.io/) | [Gateway API Inference Extension with Envoy AI Gateway](./llmisvc-inference-gateway-extension.md) | Routing to an `InferencePool` with an endpoint picker, OpenAI-compatible routing, token accounting, and usage-based rate limiting |

Both guides use Gateway API resources and KServe's configurable router
templates. Their gateway-specific custom resources and supported policies are
different, so follow the guide for the gateway installed in your cluster.
