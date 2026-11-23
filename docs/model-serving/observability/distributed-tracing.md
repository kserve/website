---
title: Distributed Tracing
description: Configure OpenTelemetry tracing for InferenceService and LLMInferenceService.
---

# Distributed Tracing

KServe configures OpenTelemetry tracing through `spec.tracing` on both `InferenceService` and `LLMInferenceService`. Traces connect per-request activity across instrumented components and help correlate latency with runtime logs.

- [InferenceService tracing](../predictive-inference/observability/distributed-tracing.md): supported runtimes, predictors/transformers/explainers, component identity, and a runnable Scikit-learn example.
- [LLMInferenceService tracing](../generative-inference/llmisvc/canary-rollout-observability.md#distributed-tracing): inference server and scheduler instrumentation, version identity, and canary observability.

## Prerequisites

Install [InferenceService](../../admin-guide/kubernetes-deployment.md) or [LLMInferenceService](../../install/llmisvc-install.md) with tracing-capable CRDs, controller, and runtime images. Updating the controller alone does not instrument older images.

For OTLP export, provide a reachable OpenTelemetry Collector or compatible backend such as Jaeger or Tempo. KServe does not install a tracing backend; an OpenTelemetry Operator is not required for an existing receiver. A collector needs a **traces** pipeline: the [KEDA metrics pipeline](../predictive-inference/autoscaling/keda-autoscaler.md#autoscale-by-using-opentelemetry-collector) alone does not collect traces. The Python console-exporter example needs no backend.

## Enable Tracing

Set `spec.tracing: {}` to enable tracing configuration with defaults, or specify overrides:

```yaml
spec:
  tracing:
    exporterEndpoint: "http://otel-collector.observability.svc.cluster.local:4317"
    exporter: "otlp"
    sampler: "parentbased_traceidratio"
    samplerArg: "0.1"
```

| Field | Default | Injected environment variable |
|-------|---------|-------------------------------|
| `exporterEndpoint` | `http://otel-collector:4317` | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `exporter` | `otlp` | `OTEL_TRACES_EXPORTER` |
| `sampler` | `parentbased_traceidratio` | `OTEL_TRACES_SAMPLER` |
| `samplerArg` | `"0.05"` | `OTEL_TRACES_SAMPLER_ARG` |

Missing fields receive defaults; ISVC defaults are applied by API defaulting, LLMISVC defaults by well-known config merge. Omitting `spec.tracing` prevents controller injection, not manually supplied runtime configuration. Use an absolute HTTP/HTTPS endpoint with a host (also for OTLP/gRPC); qualify the collector service name if it is in another namespace. The endpoint scheme does not select transport. Exporter, sampler, and protocol support depend on the runtime.

### Sampling

OpenTelemetry samplers include `always_on`, `always_off`, `traceidratio`, `parentbased_always_on`, `parentbased_always_off`, and `parentbased_traceidratio`; InferenceService accepts these values. Check native runtime support before selecting one.

Use `always_on` for verification, then reduce production sampling. `parentbased_traceidratio` respects a parent's sampling decision and samples a fraction of new root traces; the default `"0.05"` samples 5%. `parentbased_always_off` still follows a sampled parent: it is not an unconditional off switch. `always_off` disables sampling, not instrumentation.

## Python Runtime Configuration

For deployments, prefer `spec.tracing`. For standalone ModelServer processes or advanced overrides, use the environment variables above; `OTEL_SERVICE_NAME` names the service and `OTEL_RESOURCE_ATTRIBUTES` supplies resource metadata. Controller-provided component identities are described in the resource-specific guides.

The Python SDK accepts `OTEL_TRACES_EXPORTER=otlp`, `console`, `otlp,console`, or `none`. An OTLP endpoint without an explicit exporter selects `otlp`. Without either, KServe enables neither tracing instrumentation nor response trace headers. `none` keeps instrumentation/context propagation without export and cannot be combined with another exporter; `OTEL_SDK_DISABLED=true` disables instrumentation and export regardless of exporter settings.

### OTLP Transport

Python defaults to OTLP/gRPC (typically port `4317`). For HTTP/protobuf, use:

```bash
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

`OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` and `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` override their generic counterparts. TLS, authentication headers, and timeouts follow the [OTLP exporter settings](https://opentelemetry.io/docs/specs/otel/protocol/exporter/). Invalid exporters or unsupported protocols log a warning and disable SDK tracing rather than block startup. These Python controls do not imply equivalent support in native vLLM, MLServer, or Triton.

See the [Python SDK reference](../../reference/python-runtime-sdk/python-runtime-sdk.md#distributed-tracing) for response headers, logging, and excluded routes, or the [Scikit-learn walkthrough](../predictive-inference/observability/distributed-tracing.md#try-tracing-with-a-python-runtime) to send a request and inspect spans.

## Connected Traces and Limitations

Instrument each component and propagate context on every call. `InferenceRESTClient.infer()` automatically injects active W3C context without creating an HTTP client span. Custom HTTP clients must [inject context explicitly](../predictive-inference/transformers/custom-transformer/custom-transformer.md#distributed-tracing); copying request IDs or incoming `traceparent` unchanged is not equivalent. Verify shared trace IDs and parent/child relationships in the backend.

This configuration does not add KServe agent or InferenceGraph router spans, or instrument arbitrary application code. Configure [router header propagation](../../admin-guide/configurations.md#header-propagation), ingress/mesh tracing, and gRPC clients separately as needed; Python gRPC server instrumentation alone does not guarantee connected client traces.

## Troubleshooting

- **No spans:** inspect admitted configuration, pod environment, runtime flags/image support, receiver reachability, and the collector traces pipeline. Try `always_on` to rule out sampling.
- **Connection errors:** match transport, port, TLS, and authentication to the receiver; changing `http` to `https` does not switch gRPC to HTTP/protobuf.
- **Missing Python response headers:** test directly against an instrumented inference endpoint. Headers require configured tracing and valid active context; proxies may filter them. Native runtimes can behave differently.
- **Missing identity attributes:** inspect existing environment overrides; keep required generated attributes when replacing `OTEL_RESOURCE_ATTRIBUTES`.
- **Disconnected spans:** verify instrumentation and active-context propagation on each downstream call, not just independent spans from each service.
