# Deploy Your First LLM InferenceService

Quick guide to deploy your first LLMInferenceService using a simple CPU-based example.

## Prerequisites

Before starting, ensure you have:
- **LLMInferenceService installed**: Follow the [Quickstart Guide](quickstart-guide.md) to install LLMInferenceService and its dependencies
- Kubernetes cluster with `kubectl` access

---

## Quick Start: Single-Node CPU Deployment

### Step 1: Create a Namespace

```bash
kubectl create namespace llm-demo
```

### Step 2: Deploy LLM Inference Service

Deploy Facebook OPT-125M model (small model for CPU testing):

```bash
kubectl apply -n llm-demo -f - <<EOF
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: facebook-opt-125m-single
spec:
  model:
    uri: hf://facebook/opt-125m
    name: facebook/opt-125m

  replicas: 1

  template:
    containers:
      - name: main
        image: quay.io/pierdipi/vllm-cpu:latest
        securityContext:
          runAsNonRoot: false  # Image requires root
        env:
          - name: VLLM_LOGGING_LEVEL
            value: DEBUG
        resources:
          limits:
            cpu: '1'
            memory: 10Gi
          requests:
            cpu: '100m'
            memory: 8Gi
        livenessProbe:
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 30
          failureThreshold: 5

  router:
    gateway: {}
    route: {}
    scheduler: {}
EOF
```

**What this creates**:
- **Deployment**: 1 pod running vLLM CPU with Facebook OPT-125M model
- **Service**: Internal service for the deployment
- **Gateway**: Entry point for external traffic
- **HTTPRoute**: Routes traffic to the scheduler
- **Scheduler Resources**: InferencePool, InferenceModel, and EPP (Endpoint Picker Pod)

### Step 3: Verify Deployment

Check the deployment status:

```bash
# Check LLMInferenceService status
kubectl get llminferenceservice facebook-opt-125m-single -n llm-demo

# Check all created resources
kubectl get deployment,service,gateway,httproute,inferencepool -n llm-demo

# Watch pods until Running
kubectl get pods -n llm-demo -w
```

Wait until the pod shows `Running` status and all containers are ready (this may take a few minutes for model download).

:::tip[Expected Output]
```
NAME                                          URL                                               READY   AGE
llminferenceservice.serving.kserve.io/facebook-opt-125m-single   http://facebook-opt-125m-single-kserve-gateway...   True    5m
```
:::

### Step 4: Test Inference

Once the service is ready, test it with a completion request:

```bash
# Get the Gateway URL if you have external LB not KIND cloud-provider
# GATEWAY_URL=$(kubectl get llminferenceservice facebook-opt-125m-single -n llm-demo -o jsonpath='{.status.url}')

kubectl port-forward $(oc get svc -n envoy-gateway-system -l serving.kserve.io/gateway=kserve-ingress-gateway --no-headers -o name)  -n envoy-gateway-system 8001:80 &

# Send a completion request
curl -sS -X POST http://localhost:8001/llm-demo/facebook-opt-125m-single/v1/completions   \
    -H 'accept: application/json'   \
    -H 'Content-Type: application/json'    \
    -d '{
        "model": "facebook/opt-125m",
        "prompt":"Who are you?"
      }'
```

**Expected response**:

```json
{
  "id": "cmpl-f0601f1b-66cc-4f0c-bd0c-cc93c8afd9ec",
  "object": "text_completion",
  "created": 1751477229,
  "model": "facebook/opt-125m",
  "choices": [
    {
      "index": 0,
      "text": " big place and I'd imagine it will stay that way. Until the US rel",
      "logprobs": null,
      "finish_reason": "length",
      "stop_reason": null,
      "prompt_logprobs": null
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 21,
    "completion_tokens": 16,
    "prompt_tokens_details": null
  },
  "kv_transfer_params": null
}
```

### Step 5: Clean Up

When you're done testing, remove all resources:

```bash
# Delete the LLMInferenceService (automatically deletes all child resources)
kubectl delete llminferenceservice facebook-opt-125m-single -n llm-demo

# Delete the namespace
kubectl delete namespace llm-demo
```

---


## Next Steps

**Learn more about LLMInferenceService**:
- 📖 [LLMInferenceService Overview](../model-serving/generative-inference/llmisvc/llmisvc-overview.md) - Understand LLMInferenceService
- 📖 [LLMInferenceService Configuration](../model-serving/generative-inference/llmisvc/llmisvc-configuration.md) - Explore configuration options
- 📖 [Control Plane - LLMInferenceService](../concepts/architecture/control-plane-llmisvc.md) - Understand architecture

**Explore advanced deployment patterns**:
- 📖 [Single-Node GPU Example](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/single-node-gpu) - GPU-accelerated inference
- 📖 [Multi-Node Deployment (Data Parallelism)](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc/dp-ep) - Scale across multiple nodes
- 📖 [All Samples](https://github.com/kserve/kserve/tree/master/docs/samples/llmisvc) - Browse all example configurations

