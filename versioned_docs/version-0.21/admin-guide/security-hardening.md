---
title: "Security Hardening"
description: "Pod Security Standards defaults for LLMInferenceService and the PYTHONPATH restriction in KServe admission webhooks"
---

# Security Hardening

KServe applies two hardening measures by default since v0.18:

- The default `LLMInferenceService` workload templates follow the Kubernetes [Pod Security Standards (PSS) restricted profile](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted).
- The admission webhooks reject `InferenceService`, `ServingRuntime` and `ClusterServingRuntime` resources that set the `PYTHONPATH` environment variable.

This page explains what each one does, what changes for workloads that relied on the old behavior, and how to adapt them.

## Pod Security Standards for LLMInferenceService

The well-known `LLMInferenceServiceConfig` templates installed with KServe, such as [`kserve-config-llm-template`](https://github.com/kserve/kserve/blob/v0.21.0/config/llmisvcconfig/config-llm-template.yaml) and its prefill, decode and data parallel variants, run the model server container with a restricted security context:

```yaml
securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
  # nvidia-cdi-hook requires a writable root filesystem
  readOnlyRootFilesystem: false
```

This lets LLM workloads run in namespaces that enforce the restricted profile, for example with the `pod-security.kubernetes.io/enforce: restricted` label, and on platforms with similar admission rules such as OpenShift.

The templates also mount `emptyDir` volumes for the paths that model servers write to, so they do not need write access to the image:

| Mount path | Purpose |
|---|---|
| `/home` | `HOME` for the server process (caches and config files) |
| `/tmp` | Temporary files written by Python, vLLM and other libraries |
| `/models` | Model cache (`HF_HUB_CACHE`) |
| `/dev/shm` | Shared memory, backed by memory |

:::note

The root filesystem of the model server container stays writable because the NVIDIA container toolkit's `nvidia-cdi-hook` fails on a read-only root filesystem. `readOnlyRootFilesystem` is not required by the PSS restricted profile. Other components, such as the scheduler, run with a read-only root filesystem.

:::

To see the exact security context of a template in your installation, inspect it in the KServe namespace:

```bash
kubectl get llminferenceserviceconfig kserve-config-llm-template -n kserve -o yaml
```

### What this means for custom images

If you replace the model server image through `spec.template` (or a `baseRefs` config), the image has to work with these settings:

- **Run as a non-root user.** With `runAsNonRoot: true`, the kubelet refuses to start a container whose image runs as UID 0. If the image runs as root, or declares a user name instead of a numeric UID, the container fails with `CreateContainerConfigError`, for example `container has runAsNonRoot and image will run as root` or `image has non-numeric user`. Either add a numeric `USER` to the image, or set a non-root `runAsUser` on the `main` container.
- **No extra Linux capabilities or privilege escalation.** All capabilities are dropped and setuid binaries cannot raise privileges, so the server cannot rely on `sudo` or on changing file ownership at startup.
- **Write to the mounted paths.** Caches and temporary files should go to `/home`, `/tmp` or `/models`. Paths owned by root inside the image are not writable for a non-root user.

For example, to run an image that does not declare a `USER`:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: my-llm
spec:
  model:
    uri: hf://Qwen/Qwen2.5-0.5B-Instruct
  template:
    containers:
      - name: main
        image: registry.example.com/my-vllm:latest
        securityContext:
          runAsUser: 1001
```

The `main` container in your spec is merged with the one from the template, so the other security settings stay in place. See [Configuration Composition](../model-serving/generative-inference/llmisvc/llmisvc-config-composition.md) for how the merge works.

## PYTHONPATH Restriction

`PYTHONPATH` changes where Python looks for modules before the standard library and installed packages. Anyone who can set it on a model server container can make the server import their own code, for example from a mounted volume or a downloaded model directory. To close this path, the KServe admission webhooks reject any resource that sets `PYTHONPATH` in the `env` of a container:

- **InferenceService**: the containers and init containers of the predictor, its `workerSpec`, the transformer and the explainer, including framework specs such as `spec.predictor.sklearn.env` and the ART explainer container.
- **ServingRuntime** and **ClusterServingRuntime**: `spec.containers` and `spec.workerSpec.containers`.

The check applies on create and on update. A resource that sets `PYTHONPATH` is rejected with an error like:

```
admission webhook "inferenceservice.kserve-webhook-server.validator" denied the request: the InferenceService "my-model" is invalid: setting PYTHONPATH in container "kserve-container" is not allowed for security reasons
```

### Migrating workloads that set PYTHONPATH

Resources created before the upgrade keep running, but any update to them is rejected until `PYTHONPATH` is removed from the spec. Instead of setting it at deploy time:

- **Install the code as a package** in the serving image (`pip install .`), so it is importable without changing the search path.
- **Set the path in the image.** An `ENV PYTHONPATH=...` line in the Dockerfile is part of the image you build and control, and is not checked by the webhook.
- **Use a custom predictor or transformer image** for code that is currently loaded from a volume at runtime. See [Custom Predictor](../model-serving/predictive-inference/frameworks/custom-predictor/custom-predictor.md).
