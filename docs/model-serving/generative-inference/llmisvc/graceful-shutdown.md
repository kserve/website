---
sidebar_label: "Graceful Shutdown"
sidebar_position: 7
title: "Graceful Shutdown for LLMInferenceService"
description: "How vLLM pods drain in-flight requests during rolling updates and scale-down"
---

# Graceful Shutdown for LLMInferenceService

LLM requests can run for a long time, especially streaming ones. When a pod is replaced during a rolling update or removed by a scale-down, the vLLM presets that ship with KServe let the pod finish the requests it is serving instead of cutting them off. This page explains the drain sequence and how to tune it.

This behavior is available since KServe v0.19.

## Drain Sequence

When Kubernetes deletes a vLLM pod created from the default presets:

1. The pod is marked as terminating and its endpoint is no longer ready. The Endpoint Picker (EPP) needs a few seconds to notice this and stop sending new requests to the pod.
2. The `preStop` hook of the `main` container runs `/bin/sleep 15`. vLLM keeps serving during these 15 seconds, so requests that EPP routed just before it noticed the change still succeed.
3. After the hook finishes, Kubernetes sends `SIGTERM`. vLLM stops accepting new requests and waits up to `--shutdown-timeout` seconds for in-flight requests to complete.
4. The pod exits. If it is still running when `terminationGracePeriodSeconds` (counted from the start of the deletion, including the `preStop` hook) has passed, Kubernetes kills it.

```text
pod deleted -> preStop: sleep 15s -> SIGTERM -> vLLM drains (up to --shutdown-timeout) -> pod exits
               (EPP stops routing)
|<------------------------- terminationGracePeriodSeconds (60s by default) ------------------------>|
```

## Default Values

| Setting | Default | Set by |
|---------|---------|--------|
| `preStop` hook on the `main` container | `/bin/sleep 15` | Preset |
| `terminationGracePeriodSeconds` | `60` | Preset |
| vLLM `--shutdown-timeout` | `40` | Computed from `terminationGracePeriodSeconds` |

These settings are part of the vLLM presets:

- Single-node and prefill/decode: [`config-llm-template`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-template.yaml), [`config-llm-decode-template`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-decode-template.yaml), [`config-llm-prefill-template`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-prefill-template.yaml)
- Multi-node (data parallel), on both the leader and the worker pods: [`config-llm-worker-data-parallel`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-worker-data-parallel.yaml), [`config-llm-decode-worker-data-parallel`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-decode-worker-data-parallel.yaml), [`config-llm-prefill-worker-data-parallel`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-prefill-worker-data-parallel.yaml), [`config-llm-decode-worker-data-parallel-multi-port`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-decode-worker-data-parallel-multi-port.yaml), [`config-llm-prefill-worker-data-parallel-multi-port`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-llm-prefill-worker-data-parallel-multi-port.yaml)

The SGLang preset ([`config-sglang-template`](https://github.com/kserve/kserve/blob/master/config/llmisvcconfig/config-sglang-template.yaml)) does not set a `preStop` hook or `--shutdown-timeout`, and keeps `terminationGracePeriodSeconds: 30`.

### How the Shutdown Timeout Is Computed

The preset passes `--shutdown-timeout` to vLLM with this value:

```text
shutdown-timeout = terminationGracePeriodSeconds - 15 (preStop) - min(5, terminationGracePeriodSeconds)
```

The extra 5 seconds leave vLLM time to exit before Kubernetes kills the pod. With the default of 60 seconds, the result is `60 - 15 - 5 = 40`. A result below 0 is set to 0, so with a grace period of 20 seconds or less vLLM gets no drain time after `SIGTERM`.

The grace period is read from the pod spec the container belongs to:

| Pods | Field |
|------|-------|
| Single-node and decode pods, multi-node leader pods | `spec.template.terminationGracePeriodSeconds` |
| Multi-node worker pods | `spec.worker.terminationGracePeriodSeconds` |
| Prefill pods, prefill leader pods | `spec.prefill.template.terminationGracePeriodSeconds` |
| Prefill worker pods | `spec.prefill.worker.terminationGracePeriodSeconds` |

If the field is not set on your LLMInferenceService, the preset default of 60 seconds is used.

:::note

`--shutdown-timeout` was added in vLLM 0.18.0. The preset checks `vllm --version` when the container starts and passes the flag only to vLLM 0.18.0 or newer. With an older vLLM image, the `preStop` hook and the grace period still apply, but vLLM uses its own default shutdown behavior.

:::

## Changing the Grace Period

Set `terminationGracePeriodSeconds` on your LLMInferenceService to give long requests more time. The shutdown timeout follows automatically. For example, with 120 seconds vLLM drains for up to `120 - 15 - 5 = 100` seconds:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-llm
spec:
  # model, router and the rest of your spec stay as they are
  template:
    terminationGracePeriodSeconds: 120
```

For multi-node or prefill/decode deployments, set the same field on `spec.worker`, `spec.prefill.template` or `spec.prefill.worker` as listed in the table above.

## Scheduler (EPP) Shutdown

The scheduler pod that runs the Endpoint Picker uses the same pattern: its `main` container has a `preStop` hook that sleeps 15 seconds, and the pod has `terminationGracePeriodSeconds: 60`, leaving 45 seconds to finish in-flight gRPC streams when the scheduler itself is replaced. The preset notes that the scheduler's grace period must be at least the workload's. If you raise the workload grace period above 60 seconds, raise the scheduler's as well through `spec.router.scheduler.template.terminationGracePeriodSeconds`.

## Related Pages

- [LLMInferenceService Configuration Guide](./llmisvc-configuration.md)
- [Configuration Composition](./llmisvc-config-composition.md)
