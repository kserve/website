---
title: LLMInferenceService with Inference Gateway Extension (IGW)
description: How to integrate KServe LLMInferenceService with Envoy AI Gateway to manage LLM traffic and usage-based rate limits
---

# LLMInferenceService with Inference Gateway Extension (IGW)

This tutorial walks through deploying a KServe LLMInferenceService that wraps [llm-d](https://llm-d.ai/) — which implements the [Gateway API Inference Extension](https://gateway-api-inference-extension.sigs.k8s.io/) (the llm-d router and inference pool) — and fronts it with Envoy AI Gateway to provide OpenAI-compatible routing, token usage accounting, and usage-based rate limiting. KServe integrates with llm-d via a Kubernetes-native custom resource, LLMInferenceService, which provisions the router and inference pool. You will create a Gateway and an AIGatewayRoute that forward requests to the KServe InferencePool, enable automatic token metering (input, output, and total) via llmRequestCosts, and enforce per-user, per-model quotas using a BackendTrafficPolicy. KServe can run behind the AI Gateway in the same cluster or a different one; for clarity, this guide uses a single-cluster setup.

## AI Gateway Overview

[Envoy AI Gateway](https://aigateway.envoyproxy.io/) simplifies connecting applications to GenAI services using Envoy's flexibility and Kubernetes-native features. It provides a secure, scalable way to manage LLM/AI traffic with usage-based rate limiting and policy control. Key features include:

- **Request Routing**: Directs API requests to appropriate GenAI services.
- **Authentication and Authorization**: Implements API key validation to secure communication.
- **Backend Security Policy**: Introduces fine-grained access control for backend services, controlling LLM/AI backend usage using token-per-second (TPS) policies to prevent overuse.
- **Multi-Upstream Provider Support for LLM/AI Services**: The ability to receive requests in the format of one LLM provider and route them to different upstream providers, ensuring compatibility with their expected formats. This is achieved through built-in transformation capabilities that adapt requests and responses accordingly.
- **AWS Request Signing**: Supports external processing for secure communication with AWS-hosted LLM/AI services.

For more information, see the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/).

## LLM-D Overview

[llm-d](https://llm-d.ai/) is a Kubernetes-native distributed inference serving stack, providing well-lit paths for anyone to serve large generative AI models at scale, with the fastest time-to-value and competitive performance per dollar for most models across most hardware accelerators.

KServe's generative inference leverages LLM-D components to scale and schedule traffic efficiently:

- **Router and Scheduler**: The router exposes a stable endpoint and uses a scheduler to select the best backend replica based on precise prefix-cache aware routing and customizable scheduling policies to decrease latency and increase throughput.
- **Inference Pool**: A group of worker pods (for example, vLLM) serving your model. The pool scales independently from the router.
- **EndpointPickerConfig**: Configures the scheduler with pluggable scoring and picking strategies (for example, prefix-cache-scorer, load-aware-scorer).
- **LeaderWorkerSet (LWS)**: Ensures reliable leadership and coordination for the pool in multi node setup.
- **Prefill/Decode Disaggregation**: Reduce time to first token (TTFT) and get more predictable time per output token (TPOT) by splitting inference into prefill servers handling prompts and decode servers handling responses, primarily on large models such as Llama-70B and when processing very long prompts.
- **Wide Expert-Parallelism**: Deploy very large Mixture-of-Experts (MoE) models like DeepSeek-R1 and significantly reduce end-to-end latency and increase throughput by scaling up with Data Parallelism and Expert Parallelism over fast accelerator networks.

In this tutorial you'll deploy an `LLMInferenceService` that creates a router and an inference pool, and configure AI Gateway to route OpenAI-compatible requests to it while tracking token usage.

## Prerequisites

Before you begin, ensure you have the following components installed and configured:

- A Kubernetes cluster with [KServe with Gateway API Enabled](../../../admin-guide/kubernetes-deployment.md)
- [Gateway API Inference Extension](https://gateway-api-inference-extension.sigs.k8s.io/guides/) installed in your cluster
- [Envoy Gateway with Inference Pool support enabled prerequisites](https://aigateway.envoyproxy.io/docs/getting-started/prerequisites) installed in your cluster
- [Envoy AI Gateway](https://aigateway.envoyproxy.io/docs/getting-started/installation) installed in your cluster
- [LeaderWorkerSet (LWS)](https://lws.sigs.k8s.io/docs/installation/) installed in your cluster
- Hugging Face token for accessing the LLM models (you can get a token from [Hugging Face](https://huggingface.co/settings/tokens))
- The `kubectl` command-line tool installed and configured to access your cluster
- Basic understanding of Kubernetes concepts and [KServe](../../../concepts/index.md)

:::tip

After installing Gateway API Inference Extension CRD, enable InferencePool support in Envoy Gateway, restart the deployment, and wait for it to be ready

```bash
kubectl apply -f https://raw.githubusercontent.com/envoyproxy/ai-gateway/main/examples/inference-pool/config.yaml

kubectl rollout restart -n envoy-gateway-system deployment/envoy-gateway

kubectl wait --timeout=2m -n envoy-gateway-system deployment/envoy-gateway --for=condition=Available
```

:::

## Deploy LLMInferenceService

### Create Namespace

Create a namespace for the LLMInferenceService.

```shell
kubectl create namespace kserve-test
```

## Create Gateway for the Envoy AI Gateway

Create a Gateway for the Envoy AI Gateway to route the traffic to different LLM providers.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: inference-pool-with-aigwroute
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ai-gateway
  namespace: kserve-test
spec:
  gatewayClassName: inference-pool-with-aigwroute
  listeners:
    - name: http
      protocol: HTTP
      port: 80
```

### Create EndpointPickerConfig

The Endpoint Picker (EPP) or scheduler is a core component of the Gateway API Inference Extension. It is responsible for selecting the best backend endpoint (pod) from the InferencePool for each request. You can customize the scheduling behavior by defining various plugins for scoring, filtering, and picking endpoints based on your requirements.

About the configuration:

- Plugins: Define the set of scoring, filtering, picking, and profile-handling plugins to instantiate. Each plugin can optionally be given a name, allowing multiple instances of the same plugin type (useful when you configure multiple scheduling profiles). Plugins are later referenced from scheduling profiles via pluginRef.
- SchedulingProfiles: Specify which plugins participate when scheduling a request and with what weights. If no profile is specified on a request, a default profile named default is used and will reference all instantiated plugins unless otherwise configured.
- Profile Handler: Determines which SchedulingProfile(s) applies to a given request (for example, based on headers or metadata). A profile handler must be specified unless the configuration contains exactly one profile, in which case SingleProfileHandler is used automatically.
- Picker: After filtering and scoring, a picker chooses the actual pod. If a profile does not reference a picker, MaxScorePicker is added by default.

Common plugins used in this guide:

- single-profile-handler (Profile Handler): Always selects a single, primary profile. Parameters: none.
- prefix-cache-scorer (Scorer): Increases score for pods likely to contain more of the prompt in their KV cache, improving latency and throughput. Parameters:
  - hashBlockSize: Block size for prompt hashing (default: 64).
  - maxPrefixBlocksToMatch: Maximum number of prefix blocks to match (default: 256).
  - lruCapacityPerServer: LRU index capacity per server/pod (default: 31250).
- load-aware-scorer (Scorer): Scores candidates based on current load; lower load yields a higher score. Parameters may include sensitivity controls such as threshold (example below uses threshold: 100).
- max-score-picker (Picker): Chooses the candidate with the highest aggregate score.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-endpoint-picker-config
  namespace: kserve-test
data:
  endpoint-picker-config.yaml: |
    apiVersion: inference.networking.x-k8s.io/v1alpha1
    kind: EndpointPickerConfig
    plugins:
      - type: single-profile-handler
      - type: prefix-cache-scorer
      - type: load-aware-scorer
        parameters:
              threshold: 100
      - type: max-score-picker
    schedulingProfiles:
      - name: default
        plugins:
          - pluginRef: prefix-cache-scorer
            weight: 2.0
          - pluginRef: load-aware-scorer
            weight: 1.0
          - pluginRef: max-score-picker
```

### Create LLMInferenceServiceConfig

In this step, you’ll define an LLMInferenceServiceConfig — a reusable template (preset) for LLMInferenceService. Think of it as a preset you apply to one or more services via `spec.baseRefs` in `LLMInferenceService`. When you reference it, any fields you leave out on the service are auto-filled from the template; anything you set on the service overrides the template.

In this example, we will configure:
- vLLM worker defaults: image, command/args that pass the served model name, port 8000, logging level, HF cache path, liveness/readiness probes, secure pod settings, and volumes for /home, /dev/shm, model cache, and TLS certs.
- Router and scheduler defaults: an inference scheduler (gRPC + metrics ports) configured for secure serving and wired to the EndpointPickerConfig (from the ConfigMap above) to score/pick endpoints; the pool targets port 8000 and references an internal EPP service.
- Operational safeguards: conservative timeouts and termination grace, plus readiness/liveness for safe rollouts.


```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceServiceConfig
metadata:
  name: custom-config-llm-template
  namespace: kserve-test
spec:
  template:
    containers:
      - image: ghcr.io/llm-d/llm-d-dev:v0.2.2
        imagePullPolicy: IfNotPresent
        name: main
        ports:
          - containerPort: 8000
            protocol: TCP
        command:
          - vllm
          - serve
          - /mnt/models
        args:
          - --served-model-name
          - "{{ .Spec.Model.Name }}"
          - --port
          - "8000"
          - --disable-log-requests
        env:
          - name: HOME
            value: /home
          - name: VLLM_LOGGING_LEVEL
            value: INFO
          - name: HF_HUB_CACHE
            value: /models
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          runAsNonRoot: true
          capabilities:
            drop:
              - ALL
          seccompProfile:
            type: RuntimeDefault
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: FallbackToLogsOnError
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 120
          periodSeconds: 10
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 60
        volumeMounts:
          - mountPath: /home
            name: home
          - mountPath: /dev/shm
            name: dshm
          - mountPath: /models
            name: model-cache
          - mountPath: /etc/ssl/certs
            name: tls-certs
            readOnly: true
    terminationGracePeriodSeconds: 30
    volumes:
      - emptyDir: { }
        name: home
      - emptyDir:
          medium: Memory
          sizeLimit: 1Gi
        name: dshm
      - emptyDir: { }
        name: model-cache
      - name: tls-certs
        secret:
          secretName: "{{ ChildName .ObjectMeta.Name `-kserve-self-signed-certs` }}"
  router:
    scheduler:
      pool:
        spec:
          extensionRef:
            failureMode: FailOpen
            kind: Service
            name: |-
              {{ ChildName .ObjectMeta.Name `-epp-service` }}
          selector: { }
          targetPortNumber: 8000
      template:
        containers:
          - name: main
            ports:
              - containerPort: 9002
                name: grpc
                protocol: TCP
              - containerPort: 9003
                name: grpc-health
                protocol: TCP
              - containerPort: 9090
                name: metrics
                protocol: TCP
            image: ghcr.io/llm-d/llm-d-inference-scheduler:v0.2.0
            imagePullPolicy: IfNotPresent
            livenessProbe:
              failureThreshold: 3
              grpc:
                port: 9003
                service: envoy.service.ext_proc.v3.ExternalProcessor
              initialDelaySeconds: 5
              periodSeconds: 10
              successThreshold: 1
              timeoutSeconds: 1
            readinessProbe:
              failureThreshold: 3
              grpc:
                port: 9003
                service: envoy.service.ext_proc.v3.ExternalProcessor
              initialDelaySeconds: 30
              periodSeconds: 10
              successThreshold: 1
              timeoutSeconds: 1
            args:
              - --poolName
              - "{{ ChildName .ObjectMeta.Name `-inference-pool` }}"
              - --poolNamespace
              - "{{ .ObjectMeta.Namespace }}"
              - --zap-encoder
              - json
              - --grpcPort
              - "9002"
              - --grpcHealthPort
              - "9003"
              - --secureServing
              - --certPath
              - "/etc/ssl/certs"
              - --configFile
              - "/etc/config/endpoint-picker-config.yaml"
            resources:
              requests:
                cpu: 256m
                memory: 500Mi
            terminationMessagePath: /dev/termination-log
            terminationMessagePolicy: FallbackToLogsOnError
            securityContext:
              allowPrivilegeEscalation: false
              readOnlyRootFilesystem: true
              runAsNonRoot: true
              capabilities:
                drop:
                  - ALL
              seccompProfile:
                type: RuntimeDefault
            volumeMounts:
              - mountPath: /etc/ssl/certs
                name: tls-certs
                readOnly: true
              - mountPath: /etc/config
                name: endpoint-picker-config
                readOnly: true
        volumes:
          - name: tls-certs
            secret:
              secretName: "{{ ChildName .ObjectMeta.Name `-kserve-self-signed-certs` }}"
          - name: endpoint-picker-config
            configMap:
              name: custom-endpoint-picker-config
        dnsPolicy: ClusterFirst
        restartPolicy: Always
        terminationGracePeriodSeconds: 30
```

### Create LLMInferenceService

Now let's create the actual LLMInferenceService that will serve your model. This is where everything comes together! Notice how this configuration is much simpler than the template we created earlier — that's because we're referencing our `custom-config-llm-template` via `spec.baseRefs`. 

The empty braces (`{}`) you see for `router.scheduler`, `router.route`, and `router.gateway` tell the controller to auto-configure these components using the defaults from our template. You only need to specify what's unique to this particular service: the model details, replica count, and resource requirements.

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: qwen-instruct
  namespace: kserve-test
spec:
  model:
    uri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
    name: Qwen/Qwen2.5-0.5B-Instruct
  replicas: 4
  router:
    scheduler: { }
    route: { }
    gateway: { }
  baseRefs:
    - name: custom-config-llm-template
  template:
    containers:
      - name: main
        resources:
          limits:
            cpu: '2'
            memory: 16Gi
            nvidia.com/gpu: 1
          requests:
            cpu: '1'
            memory: 8Gi
            nvidia.com/gpu: 1
```

## Create AIGatewayRoute with LLM Request Costs

Now let's connect everything together! The AIGatewayRoute acts as the bridge between your AI Gateway (which receives requests) and your LLMInferenceService (which processes them). This configuration tells the AI Gateway how to route requests to your model and track token usage for rate limiting.

Here's what we're setting up:
- **Gateway Connection**: References the `ai-gateway` we created earlier via `parentRefs`
- **Model Matching**: Routes requests to your Qwen model based on the `x-ai-eg-model` header
- **Backend Target**: Points to the `qwen-instruct-inference-pool` that was automatically created by your LLMInferenceService
- **Token Tracking**: Configures automatic counting of input, output, and total tokens for each request

The AI Gateway will automatically set the `x-ai-eg-model` header by reading the model name from incoming request payloads, making routing seamless.

```yaml
apiVersion: aigateway.envoyproxy.io/v1alpha1
kind: AIGatewayRoute
metadata:
  name: envoy-ai-gateway
  namespace: kserve-test
spec:
  parentRefs:
    - name: ai-gateway  # Gateway Name
      kind: Gateway
      group: gateway.networking.k8s.io
  rules:
    - matches:
        - headers:
            - type: Exact
              name: x-ai-eg-model
              value: Qwen/Qwen2.5-0.5B-Instruct
      backendRefs:
        - group: inference.networking.x-k8s.io
          kind: InferencePool
          name: qwen-instruct-inference-pool  # Route to the InferencePool created by the LLMInferenceService
      timeouts:
        request: 60s
  llmRequestCosts:
    - metadataKey: llm_input_token
      type: InputToken    # Counts tokens in the request
    - metadataKey: llm_output_token
      type: OutputToken   # Counts tokens in the response
    - metadataKey: llm_total_token
      type: TotalToken   # Tracks combined usage
```

## Configure Rate Limiting

Now comes the powerful part — setting up usage-based rate limiting to control costs and prevent abuse! This is where all the token tracking we configured in the AIGatewayRoute pays off. We'll create a BackendTrafficPolicy that applies to our AI Gateway and enforces token-based limits per user.

Here's how it works:
- **Gateway Target**: The policy applies to our `ai-gateway` via `targetRefs`
- **User Identification**: Uses the `x-user-id` header to track usage per individual user
- **Model-Specific Limits**: Targets our specific Qwen model via the `x-ai-eg-model` header
- **Token-Based Counting**: Uses the `llm_total_token` metadata (from our AIGatewayRoute) to count actual token usage rather than just request count.
- **Smart Costing**: Sets request cost to 0 so only the token usage from responses counts toward the limit

This example sets a limit of 1000 total tokens per hour per user for the Qwen model. Once a user hits this limit, they'll receive HTTP 429 responses until the hour resets.

```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: model-specific-token-limit-policy
  namespace: kserve-test
spec:
  targetRefs:
    - name: ai-gateway  # Gateway Name
      kind: Gateway
      group: gateway.networking.k8s.io
  rateLimit:
    type: Global
    global:
      rules:
        # Rate limit rule for Qwen: 1000 total tokens per hour per user
        - clientSelectors:
            - headers:
                - name: x-user-id
                  type: Distinct
                - name: x-ai-eg-model
                  type: Exact
                  value: Qwen/Qwen2.5-0.5B-Instruct
          limit:
            requests: 1000    # 1000 total tokens per hour
            unit: Hour
          cost:
            request:
              from: Number
              number: 0      # Set to 0 so only token usage counts
            response:
              from: Metadata
              metadata:
                namespace: io.envoy.ai_gateway
                key: llm_total_token    # Uses total tokens from the responses
```

:::warning
When configuring rate limits:

1. Always set the request cost number to 0 so only token usage counts towards the limit.
2. Choose limits per model based on cost and capability.
3. Include both user and model identifiers in rules to isolate usage correctly.
:::

## Configure $GATEWAY_URL

First, check if your Gateway has an external IP address assigned:

```shell
kubectl get svc -n envoy-gateway-system \
  --selector=gateway.envoyproxy.io/owning-gateway-namespace=kserve-test,gateway.envoyproxy.io/owning-gateway-name=ai-gateway
```

You'll see output similar to this:

```
NAME                  TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)
eg-ai-gateway-xxxx    LoadBalancer   10.96.61.234    <pending/IP>     80:31234/TCP
```

Choose one of these options based on the EXTERNAL-IP status:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="external-ip" label="Using External IP">
    If the EXTERNAL-IP shows an actual IP address (not &lt;pending&gt;), you can access the gateway directly:

    First, save the external IP and set the gateway URL:

    ```shell
    export GATEWAY_URL="http://$(kubectl get gateway -n kserve-test ai-gateway -o jsonpath='{.status.addresses[0].value}')"
    ```
  </TabItem>
  <TabItem value="port-forwarding" label="Using Port Forwarding">
    If the EXTERNAL-IP shows &lt;pending&gt; or your cluster doesn't support LoadBalancer services, use port forwarding.

    First, set the gateway URL:

    ```shell
    export GATEWAY_URL="http://localhost:8080"
    ```
    Then set up port forwarding (this will block the terminal):

    ```shell
    export ENVOY_SERVICE=$(kubectl get svc -n envoy-gateway-system \
      --selector=gateway.envoyproxy.io/owning-gateway-namespace=kserve-test,gateway.envoyproxy.io/owning-gateway-name=ai-gateway \
      -o jsonpath='{.items[0].metadata.name}')

    kubectl port-forward -n envoy-gateway-system svc/$ENVOY_SERVICE 8080:80
    ```
  </TabItem>
</Tabs>

## Testing the Gateway

Verify the URL is available:

```shell
echo $GATEWAY_URL
```

:::tip
If you open a new terminal, set GATEWAY_URL again. For proper cost control and rate limiting, include an `x-user-id` header to identify the caller. You do not need to set `x-ai-eg-model` because AI Gateway extracts the model name from the request body.
:::

Send a test request to the AI Gateway as user _user123_ using the GATEWAY_URL you set up:
```shell
curl -v -H "Content-Type: application/json" -H "x-user-id: user123" -d '{
        "model": "Qwen/Qwen2.5-0.5B-Instruct",
        "messages": [
              {
                  "role": "system",
                  "content": "You are a poet."
              },
              {
                  "role": "user",
                  "content": "Write a poem about clouds."
              }
          ]
   }'     "$GATEWAY_URL"/v1/chat/completions
```

:::tip Expected Output
The response should be similar to the following:
    ```json
    {
      "choices": [
        {
          "finish_reason": "stop",
          "index": 0,
          "logprobs": null,
          "message": {
            "content": "In the sky, where the heavens stretch,\nThe clouds dance with the wind's soft hand.\nThey float like fluffy white wings,\nA gentle breeze that never leaves.\n\nTheir colors range from deep blue to gold,\nFrom green to purple, they blend together.\nThey're not just a sight to see,\nBut a symbol of change and growth.\n\nThe sun sets behind them, casting\nA warm glow on their faces,\nAs night falls, and the world is asleep.\nFor in these clouds, we find our peace.\n\nAnd so we stand by, watching this show,\nOf nature's beauty, and its mystery.\nFor even though we may not understand it,\nIt all comes back to us, in time.\n\nSo let us cherish each cloud, and each one,\nThat whispers secrets to the sky.\nFor in the midst of chaos and strife,\nWe find a place of calm and rest.",
            "reasoning_content": null,
            "role": "assistant",
            "tool_calls": []
          },
          "stop_reason": null
        }
      ],
      "created": 1758107110,
      "id": "chatcmpl-bb9bb4be-3b90-4147-bb66-a39f2a09d725",
      "kv_transfer_params": null,
      "model": "Qwen/Qwen2.5-0.5B-Instruct",
      "object": "chat.completion",
      "prompt_logprobs": null,
      "usage": {
        "completion_tokens": 178,
        "prompt_tokens": 24,
        "prompt_tokens_details": null,
        "total_tokens": 202
      }
    }
    ```
:::

Because the prefix-cache-scorer plugin is enabled, the scheduler performs prefix-aware routing and will tend to send requests with similar prompts to the same backend pod. Inspect the router-scheduler pod logs to see which endpoint handled a given request:

```shell
kubectl logs -l="app.kubernetes.io/component=llminferenceservice-router-scheduler,app.kubernetes.io/name=qwen-instruct" -n kserve-test
```

```
{"level":"Level(-2)","ts":"2025-09-19T08:52:53Z","caller":"requestcontrol/director.go:251","msg":"Request handled","x-request-id":"4a3f6247-d02f-4a57-9a90-9b25b2daa18c","model":"Qwen/Qwen2.5-0.5B-Instruct","resolvedTargetModel":"Qwen/Qwen2.5-0.5B-Instruct","criticality":"Critical","model":"Qwen/Qwen2.5-0.5B-Instruct","targetModel":"Qwen/Qwen2.5-0.5B-Instruct",
# highlight-next-line
"endpoint":"{NamespacedName:kserve-test/qwen-instruct-kserve-6899dd5fb8-tqwn8 Address:10.244.1.234 Labels:map[app.kubernetes.io/component:llminferenceservice-workload app.kubernetes.io/name:qwen-instruct app.kubernetes.io/part-of:llminferenceservice kserve.io/component:workload llm-d.ai/role:both pod-template-hash:6899dd5fb8]}"}

{"level":"Level(-2)","ts":"2025-09-19T08:57:11Z","caller":"requestcontrol/director.go:251","msg":"Request handled","x-request-id":"bea219be-aa44-443a-be27-75000338caf8","model":"Qwen/Qwen2.5-0.5B-Instruct","resolvedTargetModel":"Qwen/Qwen2.5-0.5B-Instruct","criticality":"Critical","model":"Qwen/Qwen2.5-0.5B-Instruct","targetModel":"Qwen/Qwen2.5-0.5B-Instruct",
# highlight-next-line
"endpoint":"{NamespacedName:kserve-test/qwen-instruct-kserve-6899dd5fb8-tqwn8 Address:10.244.1.234 Labels:map[app.kubernetes.io/component:llminferenceservice-workload app.kubernetes.io/name:qwen-instruct app.kubernetes.io/part-of:llminferenceservice kserve.io/component:workload llm-d.ai/role:both pod-template-hash:6899dd5fb8]}"}

{"level":"Level(-2)","ts":"2025-09-19T08:57:36Z","caller":"requestcontrol/director.go:251","msg":"Request handled","x-request-id":"a6085a71-774b-4f48-89fb-79f44c212605","model":"Qwen/Qwen2.5-0.5B-Instruct","resolvedTargetModel":"Qwen/Qwen2.5-0.5B-Instruct","criticality":"Critical","model":"Qwen/Qwen2.5-0.5B-Instruct","targetModel":"Qwen/Qwen2.5-0.5B-Instruct",
# highlight-next-line
"endpoint":"{NamespacedName:kserve-test/qwen-instruct-kserve-6899dd5fb8-tqwn8 Address:10.244.1.234 Labels:map[app.kubernetes.io/component:llminferenceservice-workload app.kubernetes.io/name:qwen-instruct app.kubernetes.io/part-of:llminferenceservice kserve.io/component:workload llm-d.ai/role:both pod-template-hash:6899dd5fb8]}"
```

Once the token limit is reached, you will receive a 429 error response with the message `Too Many Requests`. For example:
```
< HTTP/1.1 429 Too Many Requests
< x-envoy-ratelimited: true
< x-ratelimit-limit: 1000, 1000;w=3600
< x-ratelimit-remaining: 0
< x-ratelimit-reset: 1715
< date: Mon, 17 Mar 2025 14:31:24 GMT
< content-length: 0
<
* Connection #0 to host localhost left intact
```

:::tip
Optional: Quickly exercise the limit

To hit the token limit faster in a test environment, lower the limit temporarily (for example, 50 tokens) or loop a few requests:

```shell
for i in $(seq 1 5); do
  curl -s -o /dev/null -w "%{http_code}\n" -H "Content-Type: application/json" -H "x-user-id: user123" \
    -d '{"model":"Qwen/Qwen2.5-0.5B-Instruct","messages":[{"role":"user","content":"Write a short limerick about clouds."}]}' \
    "$GATEWAY_URL"/v1/chat/completions
done
```
:::

## Next Steps

Now that you've tested the basic setup, you can:

- Explore more rate limiter-related configuration at the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/capabilities/usage-based-ratelimiting).

- Explore the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/) to learn more about the features and capabilities.
