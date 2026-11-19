---
title: Distributed Tracing
description: Configure OpenTelemetry tracing for InferenceService predictors, transformers, and explainers.
---

# Distributed Tracing

KServe can configure OpenTelemetry tracing for an `InferenceService` through `spec.tracing`. Traces help identify which component handled a request and correlate inference activity with runtime logs. This configuration applies to supported predictors, transformers, and explainers, including canary predictors.

For the separate `LLMInferenceService` resource, see [LLMInferenceService distributed tracing](../../generative-inference/llmisvc/canary-rollout-observability.md#distributed-tracing).

## Prerequisites

- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md) and `kubectl` configured.
- KServe CRDs and a controller that support `spec.tracing`, and runtime images that include tracing support. Upgrading the controller alone does not instrument an older runtime image.
- For OTLP export, a reachable OpenTelemetry Collector or compatible tracing backend, such as Jaeger or Tempo. The console example below does not require a backend.

KServe does not install or manage a tracing backend. An OpenTelemetry Operator is not required when exporting to an existing OTLP receiver. If you use a collector, configure a **traces** pipeline; the OpenTelemetry metrics pipeline used for [KEDA autoscaling](../autoscaling/keda-autoscaler.md#autoscale-by-using-opentelemetry-collector) does not enable trace collection by itself.

## Enable Tracing

Add an empty `tracing` object to enable configuration with defaults:

```yaml
spec:
  tracing: {}
```

Omitting `spec.tracing` leaves workloads without controller-injected tracing configuration. You can also override individual fields:

```yaml
spec:
  tracing:
    exporterEndpoint: "http://otel-collector.observability.svc.cluster.local:4317"
    exporter: "otlp"
    sampler: "parentbased_traceidratio"
    samplerArg: "0.1"
```

| Field | Default | Description |
|-------|---------|-------------|
| `exporterEndpoint` | `http://otel-collector:4317` | OTLP exporter endpoint. Must be an absolute HTTP or HTTPS URL with a host, including for OTLP/gRPC. |
| `exporter` | `otlp` | Exporter passed to the runtime through `OTEL_TRACES_EXPORTER`. Supported exporters depend on the runtime. |
| `sampler` | `parentbased_traceidratio` | Sampling strategy passed through `OTEL_TRACES_SAMPLER`. |
| `samplerArg` | `"0.05"` | String argument for the sampler, such as a ratio between `"0"` and `"1"`. |

Missing fields receive defaults. The default endpoint resolves `otel-collector` in the workload's namespace; set a qualified service name when the collector is in another namespace. The endpoint scheme does not select the OTLP transport. Python runtimes use gRPC by default; see [Python SDK tracing settings](../../../reference/python-runtime-sdk/python-runtime-sdk.md#distributed-tracing) for HTTP/protobuf configuration.

### Sampling

The API accepts `always_on`, `always_off`, `traceidratio`, `parentbased_always_on`, `parentbased_always_off`, and `parentbased_traceidratio`.

- Use `always_on` while verifying tracing to capture every request.
- Use `parentbased_traceidratio` in production to respect the parent's sampling decision and sample a fraction of new root traces. The default `"0.05"` samples 5% of new root traces.
- `parentbased_always_off` still follows a sampled parent; it is not an unconditional off switch. `always_off` disables sampling, not instrumentation.

:::tip
Tracing volume and overhead depend on the runtime and sampling configuration. Return to a suitable production sampling rate after testing.
:::

## Try Tracing with a Python Runtime

This example uses the KServe Scikit-learn runtime and writes spans to container logs. Save the following manifest as `sklearn-tracing.yaml`:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-tracing
  namespace: default
  annotations:
    serving.kserve.io/deploymentMode: "Standard"
spec:
  tracing:
    exporter: "console"
    sampler: "always_on"
  predictor:
    minReplicas: 1
    model:
      modelFormat:
        name: sklearn
      runtime: kserve-sklearnserver
      protocolVersion: v1
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

Apply the manifest and wait for readiness:

```bash
kubectl apply -f sklearn-tracing.yaml
kubectl wait --for=condition=Ready inferenceservice/sklearn-tracing -n default --timeout=300s
```

Forward the predictor port in a separate terminal:

```bash
kubectl port-forward deployment/sklearn-tracing-predictor -n default 8080:8080
```

Send an inference request directly to the runtime:

```bash
curl -i http://localhost:8080/v1/models/sklearn-tracing:predict \
  -H 'Content-Type: application/json' \
  -d '{"instances": [[6.8, 2.8, 4.8, 1.4], [6.0, 3.4, 4.5, 1.6]]}'
```

The response contains predictions and a `traceparent` header with the active trace context. Check the predictor logs for exported spans:

```bash
kubectl logs deployment/sklearn-tracing-predictor -n default -c kserve-container
```

Look for `service.name` set to `sklearn-tracing-predictor`, the inference span, and its trace ID. KServe's default Python log format also includes `trace_id`, allowing you to correlate request logs with spans.

### Export to a Trace Backend

To export the example's spans over OTLP/gRPC, replace the endpoint below with your backend's address:

```bash
kubectl patch inferenceservice sklearn-tracing -n default --type merge -p '{
  "spec": {
    "tracing": {
      "exporter": "otlp",
      "exporterEndpoint": "http://otel-collector.observability.svc.cluster.local:4317"
    }
  }
}'
```

Wait for the updated predictor to be ready, restart the port-forward if necessary, and send another request. In your trace backend, select service `sklearn-tracing-predictor` and find the trace using the response's trace ID. OTLP export is batched, so spans may take a short time to appear.

When finished, stop the port-forward and delete the example:

```bash
kubectl delete -f sklearn-tracing.yaml
```

## Runtime Support

KServe injects common OTEL environment variables and, for recognized runtimes, additional runtime-specific settings. Configuration injection is not the same as instrumentation: the runtime image must support the requested tracing options.

| Runtime | Tracing configuration |
|---------|-----------------------|
| KServe Python ModelServer | REST and gRPC server instrumentation, including the Scikit-learn runtime and custom Python servers using the updated SDK. See [Python SDK tracing](../../../reference/python-runtime-sdk/python-runtime-sdk.md#distributed-tracing). |
| Native vLLM | Adds `--otlp-traces-endpoint` and `--collect-detailed-traces all` to the predictor arguments. |
| MLServer | Sets `MLSERVER_TRACING_SERVER` in addition to common OTEL variables. |
| Triton | Adds OpenTelemetry `--trace-config` arguments when none are supplied. Use a Triton image that supports OpenTelemetry tracing. |
| Arbitrary custom containers | Receive configuration in supported component containers, but require their own OpenTelemetry instrumentation. |

Runtime-specific exporter, sampling, and protocol support can differ from the Python SDK. Do not assume every runtime honors every OTEL variable. Native vLLM configuration also does not imply that every Hugging Face runtime using a vLLM backend is detected as native vLLM.

Runtime-specific injection uses the ServingRuntime's `serving.kserve.io/server-type` metadata annotation, with a fallback for known explicitly selected runtime names. The native runtime type values are `vllmserver`, `mlserver`, and `tritonserver`.

## Component Identity and Overrides

The controller sets `OTEL_SERVICE_NAME` to `<inferenceservice>-predictor`, `<inferenceservice>-transformer`, or `<inferenceservice>-explainer`. Standalone and collocated transformers receive their own component identity. Unrelated sidecars are not automatically instrumented.

The controller also configures resource attributes:

| Attribute | Value |
|-----------|-------|
| `k8s.namespace.name` | Workload namespace |
| `k8s.node.name` | Node name from the Downward API |
| `k8s.pod.name` | Pod name from the Downward API |
| `isvc.name` | InferenceService name |
| `isvc.component` | `predictor`, `transformer`, or `explainer` |
| `isvc.predictor.variant` | Named predictor variant, when present |

Primary and canary predictors share the predictor service name. Filter by `isvc.predictor.variant` to identify a named canary; the primary predictor normally has no variant attribute.

Existing container environment entries take precedence over injected values. An existing `OTEL_RESOURCE_ATTRIBUTES` entry replaces the generated value rather than merging individual attributes. Keep the generated attributes in your override if you still need namespace, component, or variant filtering.

Existing runtime tracing flags are preserved, and repeated reconciliation does not duplicate injected settings. If you override a native runtime's endpoint argument separately, keep it consistent with the OTEL endpoint environment variables.

## Connected Traces and Limitations

A connected trace requires instrumentation in each component and context propagation on each call. For Python transformers making their own HTTP calls, see [propagating trace context](../transformers/custom-transformer/custom-transformer.md#distributed-tracing). A trace backend should show the same trace ID and parent/child relationships across components, not just independent spans from each service.

:::note
Automatic HTTP context propagation in `InferenceRESTClient.infer()` and disabling Python instrumentation when no exporter or endpoint is configured are tracked in [KServe PR #6261](https://github.com/kserve/kserve/pull/6261). Until those changes are included in your runtime image, explicitly propagate context for connected traces. Omitting `spec.tracing` prevents controller injection but does not guarantee that the Python SDK creates no spans internally. Set `OTEL_SDK_DISABLED=true` on the Python component to disable its tracing instrumentation entirely.
:::

This feature does not add KServe agent spans, InferenceGraph router spans, or instrumentation to arbitrary application code. Python gRPC server instrumentation does not by itself guarantee connected gRPC client traces. External ingress gateways and service meshes need their own tracing configuration.

For Knative deployments, enable the Knative `kubernetes.podspec-fieldref` feature needed for the injected pod and node resource attributes. The example above uses Standard mode.

## Troubleshooting

- **No spans in the backend:** Inspect the admitted `spec.tracing`, pod environment, and native runtime arguments. Verify that the runtime image supports tracing, the endpoint is reachable from the pod, and the collector has a traces pipeline. Temporarily use `sampler: "always_on"` to rule out sampling.
- **Protocol or connection errors:** Match the receiver's transport and port. OTLP/gRPC commonly uses port `4317`; HTTP/protobuf commonly uses `4318`. Check TLS and authentication settings in the runtime.
- **Missing response headers:** Test directly against the Python runtime as in the example. Headers require valid active trace context, and an ingress can filter them. Native runtimes may expose different response headers.
- **Missing resource attributes:** Check for an existing `OTEL_RESOURCE_ATTRIBUTES` override and confirm that the expected component receives the configuration.
- **Separate traces for transformer and predictor:** Confirm both components are instrumented and propagate active context on the downstream call. Passing a request ID alone does not connect OpenTelemetry spans.

For Python exporter and instrumentation controls, see the [Python Serving Runtime SDK](../../../reference/python-runtime-sdk/python-runtime-sdk.md#distributed-tracing).
