---
title: InferenceService Tracing
description: Supported runtimes, component identities, and a runnable InferenceService tracing example.
---

# InferenceService Tracing

Start with the [central distributed tracing guide](../../observability/distributed-tracing.md) for prerequisites, `spec.tracing` fields/defaults, sampling, Python exporter/transport settings, context propagation, and troubleshooting. This page covers ISVC-specific behavior; for LLMISVC, see [its observability guide](../../generative-inference/llmisvc/canary-rollout-observability.md#distributed-tracing).

## Runtime Support

Configuration injection is not instrumentation: use runtime images with tracing support. ISVC tracing applies to supported predictors (including canaries), transformers, and explainers, not unrelated sidecars or model internals.

| Runtime | Tracing configuration |
|---------|-----------------------|
| KServe-maintained Python predictors | Scikit-learn, XGBoost, LightGBM, PMML, Paddle, AutoGluon, PredictiveServer, and Hugging Face share ModelServer REST/gRPC instrumentation with the tracing-capable SDK. |
| Python transformers and explainers | ART and custom ModelServer processes share SDK instrumentation. |
| Native vLLM | Adds `--otlp-traces-endpoint` and `--collect-detailed-traces all`. |
| MLServer | Sets `MLSERVER_TRACING_SERVER` alongside common OTEL variables. |
| Triton | Adds OpenTelemetry `--trace-config` arguments when none are supplied; requires a compatible image. |
| Other custom containers | Receive configuration in supported component containers, but need their own instrumentation. |

Native runtime injection uses the ServingRuntime's `serving.kserve.io/server-type` annotation (`vllmserver`, `mlserver`, or `tritonserver`), with a fallback for known explicitly selected runtime names. Hugging Face using a vLLM backend is not automatically detected as native vLLM. Exporter/sampler/protocol support varies by runtime.

## Try Tracing with a Python Runtime

With [KServe installed in Standard mode](../../../admin-guide/kubernetes-deployment.md) and `kubectl` configured, save this as `sklearn-tracing.yaml`. It exports spans to logs without a tracing backend:

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

Apply, wait, and forward the predictor port; leave this terminal running:

```bash
kubectl apply -f sklearn-tracing.yaml
kubectl wait --for=condition=Ready inferenceservice/sklearn-tracing -n default --timeout=300s
kubectl port-forward deployment/sklearn-tracing-predictor -n default 8080:8080
```

In another terminal, send an inference request and inspect exported spans:

```bash
curl -i http://localhost:8080/v1/models/sklearn-tracing:predict \
  -H 'Content-Type: application/json' \
  -d '{"instances": [[6.8, 2.8, 4.8, 1.4], [6.0, 3.4, 4.5, 1.6]]}'
kubectl logs deployment/sklearn-tracing-predictor -n default -c kserve-container
```

Expect predictions and a `traceparent` response header. Find `service.name=sklearn-tracing-predictor` and the matching trace ID in spans/logs. For backend export, replace the endpoint below with your OTLP/gRPC receiver:

```bash
kubectl patch inferenceservice sklearn-tracing -n default --type merge -p '{
  "spec": {"tracing": {
    "exporter": "otlp",
    "exporterEndpoint": "http://otel-collector.observability.svc.cluster.local:4317"
  }}
}'
```

Wait for the updated predictor to be ready, restart port-forwarding if necessary, and repeat the request. Find service `sklearn-tracing-predictor` and the response's trace ID in the backend; batched OTLP spans may take a short time to appear. When finished, stop port-forwarding and clean up:

```bash
kubectl delete -f sklearn-tracing.yaml
```

## Component Identity and Overrides

The controller sets `OTEL_SERVICE_NAME` to `<inferenceservice>-predictor`, `<inferenceservice>-transformer`, or `<inferenceservice>-explainer`, including standalone/collocated transformers. Resource attributes include `k8s.namespace.name`, `k8s.node.name`, `k8s.pod.name`, `isvc.name`, and `isvc.component`.

Primary and canary predictors share the predictor service name; `isvc.predictor.variant` identifies a named canary and is normally absent on the primary predictor. For Knative, enable `kubernetes.podspec-fieldref` for injected pod/node attributes; the example uses Standard mode.

Existing container environment entries override injected values. `OTEL_RESOURCE_ATTRIBUTES` replaces, rather than merges with, generated attributes. Existing tracing flags are preserved without duplication on reconciliation; keep separately overridden native endpoints consistent with OTEL settings.

## Connected Traces and Limitations

See [shared propagation requirements and limitations](../../observability/distributed-tracing.md#connected-traces-and-limitations). For custom transformer HTTP calls, follow the [context injection example](../transformers/custom-transformer/custom-transformer.md#distributed-tracing).
