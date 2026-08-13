---
sidebar_label: "Autoscaling Examples"
sidebar_position: 8
title: "WVA Autoscaling Examples"
---

# WVA Autoscaling Examples

This page provides complete, ready-to-use YAML manifests for common WVA autoscaling configurations. For an overview of WVA autoscaling concepts, configuration options, and prerequisites, see the [Autoscaling Guide](./llmisvc-autoscaling.md).

---

## HPA with Deployment

Single-node deployment with HPA-based autoscaling and custom scaling behavior:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-hpa
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  scaling:
    minReplicas: 1
    maxReplicas: 5
    wva:
      variantCost: "10.0"
      hpa:
        behavior:
          scaleUp:
            stabilizationWindowSeconds: 0
          scaleDown:
            stabilizationWindowSeconds: 300

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-hpa-kserve-va

# Check HPA
kubectl get hpa llama-hpa-kserve-hpa

# Check scaling status
kubectl get llminferenceservice llama-hpa -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

---

## KEDA with Deployment

Single-node deployment with KEDA-based autoscaling, including idle scale-down and metric fallback:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-keda
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-3.1-8B-Instruct
    name: meta-llama/Llama-3.1-8B-Instruct

  scaling:
    minReplicas: 2
    maxReplicas: 8
    wva:
      variantCost: "10.0"
      keda:
        pollingInterval: 5
        cooldownPeriod: 120
        initialCooldownPeriod: 60
        idleReplicaCount: 1
        fallback:
          failureThreshold: 3
          replicas: 2

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "1"
            cpu: "8"
            memory: 32Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-keda-kserve-va

# Check KEDA ScaledObject
kubectl get scaledobjects llama-keda-kserve-keda

# Check scaling status
kubectl get llminferenceservice llama-keda -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

---

## Multi-Node (LeaderWorkerSet) with HPA

For multi-node deployments using LeaderWorkerSet, WVA scales the LWS resource directly:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-70b-multinode
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-2-70b-hf
    name: meta-llama/Llama-2-70b-hf

  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4

  scaling:
    minReplicas: 1
    maxReplicas: 4
    wva:
      hpa: {}

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  worker:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

:::note
When `spec.worker` is present, WVA targets the `LeaderWorkerSet` resource instead of a `Deployment`.
:::

---

## Multi-Node (LeaderWorkerSet) with KEDA

Multi-node deployment with KEDA-based autoscaling, leveraging idle scale-down and initial cooldown for large model loading:

```yaml
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: llama-70b-multinode-keda
  namespace: default
spec:
  model:
    uri: hf://meta-llama/Llama-2-70b-hf
    name: meta-llama/Llama-2-70b-hf

  parallelism:
    tensor: 4
    data: 8
    dataLocal: 4

  scaling:
    minReplicas: 2
    maxReplicas: 6
    wva:
      variantCost: "20.0"
      keda:
        pollingInterval: 10
        cooldownPeriod: 300
        initialCooldownPeriod: 120
        idleReplicaCount: 1
        fallback:
          failureThreshold: 3
          replicas: 2

  template:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  worker:
    containers:
      - name: main
        image: vllm/vllm-openai:latest
        args:
          - "--model"
          - "/mnt/models"
          - "--tensor-parallel-size"
          - "4"
        resources:
          limits:
            nvidia.com/gpu: "4"
            cpu: "16"
            memory: 128Gi

  router:
    gateway: {}
    route: {}
    scheduler: {}
```

**Verify the created resources:**

```bash
# Check VariantAutoscaling
kubectl get variantautoscalings llama-70b-multinode-keda-kserve-va

# Check KEDA ScaledObject (targets LeaderWorkerSet)
kubectl get scaledobjects llama-70b-multinode-keda-kserve-keda

# Check scaling status
kubectl get llminferenceservice llama-70b-multinode-keda -o jsonpath='{.status.conditions[?(@.type=="ScalingReady")]}'
```

:::tip
For large multi-node models, set `initialCooldownPeriod` to account for model loading time across all nodes. This prevents KEDA from making premature scaling decisions before the model is ready to serve traffic.
:::
