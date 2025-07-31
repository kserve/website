---
title: Rate Limiting with AI Gateway
description: How to integrate KServe with the Envoy AI Gateway for managing LLM/AI traffic
---

# Integrating KServe with Envoy AI Gateway

This guide explains how to integrate KServe with the Envoy AI Gateway. KServe can be integrated with the AI Gateway either within the same cluster or across different clusters. In this example, we will demonstrate how to integrate KServe with the Envoy AI Gateway within the same cluster.

## AI Gateway Overview

The Envoy AI Gateway was created to address the complexity of connecting applications to GenAI services by leveraging Envoy's flexibility and Kubernetes-native features. It provides a secure, scalable, and efficient way to manage LLM/AI traffic, with backend rate limiting and policy control.Key features of the AI Gateway include:

- **Request Routing**: Directs API requests to appropriate GenAI services.
- **Authentication and Authorization**: Implements API key validation to secure communication.
- **Backend Security Policy**: Introduces fine-grained access control for backend services, controlling LLM/AI backend usage using token-per-second (TPS) policies to prevent overuse.
- **Multi-Upstream Provider Support for LLM/AI Services**: The ability to receive requests in the format of one LLM provider and route them to different upstream providers, ensuring compatibility with their expected formats. This is achieved through built-in transformation capabilities that adapt requests and responses accordingly.
- **AWS Request Signing**: Supports external processing for secure communication with AWS-hosted LLM/AI services.

For more information, see the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/).

## Prerequisites

Before you begin, ensure you have the following components installed and configured:

- A Kubernetes cluster with [KServe with Gateway API Enabled](../../../admin-guide/kubernetes-deployment.md)
- [Envoy Gateway](https://aigateway.envoyproxy.io/docs/getting-started/prerequisites) installed in your cluster
- [Envoy AI Gateway](https://aigateway.envoyproxy.io/docs/getting-started/installation) installed in your cluster
- Hugging Face token for accessing the LLM models (you can get a token from [Hugging Face](https://huggingface.co/settings/tokens))
- The `kubectl` command-line tool installed and configured to access your cluster
- Basic understanding of Kubernetes concepts and [KServe](../../../concepts/index.md)

## Deploy InferenceService

### Create Namespace

Create a namespace for the InferenceService.

```shell
kubectl create namespace kserve-test
```

### Create a Hugging Face Secret
Create a secret with the Hugging Face token in the `kserve-test` namespace. This token will be used to access the Hugging Face models.

```yaml title="hf-secret.yaml"
apiVersion: v1
kind: Secret
metadata:
  name: hf-secret
  namespace: kserve-test
type: Opaque
stringData:
  HF_TOKEN: <token>
```

### Create an InferenceService

Create an InferenceService in the `kserve-test` namespace with OpenAI route prefix disabled. The following example creates an InferenceService with the 'llama3.2-1B' model from Hugging Face.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama3-1b
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=llama3-1b
        - --model_id=meta-llama/Llama-3.2-1B-Instruct
      env:
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-secret
              key: HF_TOKEN
              optional: false

        - name: KSERVE_OPENAI_ROUTE_PREFIX # Disable OpenAI Route Prefix
          value: ""
      resources:
        requests:
          cpu: "4"
          memory: 12Gi
          nvidia.com/gpu: "1"
        limits:
          cpu: "6"
          memory: 12Gi
          nvidia.com/gpu: "1"
```

## Create BackendSecurityPolicy

You can configure the BackendSecurityPolicy for authentication and authorization with the InferenceService. For example, you can create a BackendSecurityPolicy to secure communication with the InferenceService using an API key. 

But for simplicity, we will ignore the authentication and authorization for this example.

```yaml
apiVersion: aigateway.envoyproxy.io/v1alpha1
kind: BackendSecurityPolicy
metadata:
  name: envoy-ai-gateway-openai-kserve-apikey
  namespace: default
spec:
  type: APIKey
  apiKey:
    secretRef:
      name: envoy-ai-gateway-openai-kserve-apikey
      namespace: default
```

## Create BackendTLSPolicy

If the InferenceService is using TLS, you can create a BackendTLSPolicy to configure the TLS settings for the InferenceService. 

For this example, we will ignore the TLS settings.

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: envoy-ai-gateway-basic-openai-tls
  namespace: default
spec:
  targetRefs:
    - group: ""
      kind: Service
      name: llama3-1b-predictor
  validation:
    wellKnownCACertificates: "System"
    hostname: "llama3-1b-kserve-test.example.com"
```

## Create AIServiceBackend

Create an AIServiceBackend for the InferenceService created in the previous step. You can uncomment the `backendSecurityPolicyRef` field to use the BackendSecurityPolicy if you have configured it.

```yaml
apiVersion: aigateway.envoyproxy.io/v1alpha1
kind: AIServiceBackend
metadata:
  name: envoy-ai-gateway-openai-kserve
  namespace: default
spec:
  schema:
    name: OpenAI
  backendRef:
    name: llama3-1b-predictor
    namespace: kserve-test
    kind: Service
    group: ""
    port: 80
# backendSecurityPolicyRef:
#   name: envoy-ai-gateway-openai-kserve-apikey
#   kind: BackendSecurityPolicy
#   group: aigateway.envoyproxy.io
```

## Create ReferenceGrant

Since the InferenceService is in the `kserve-test` namespace and the AIServiceBacked in the `default` namespace, we need to create a `ReferenceGrant` to allow the `AIServiceBackend` to reference the InferenceService.

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: envoy-gateway-ref-grant
  namespace: kserve-test
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: default
  to:
  - group: ""
    kind: Service
```

## Create Gateway for the AI Gateway

Create a Gateway for the AI Gateway to route the traffic to different LLM providers.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: envoy-ai-gateway-basic
  namespace: default
spec:
  gatewayClassName: envoy-ai-gateway-basic
  listeners:
    - name: http
      protocol: HTTP
      port: 80
```

## Create AIGatewayRoute with LLM Request Costs

Create an `AIGatewayRoute` and configure KServe as the LLM service provider for the model `llama3-1b` using the `AIServiceBackend` created in the previous step. AI Gateway automatically tracks token usage for each request. We will configure `AIGatewayRoute` to track InputToken, OutputToken, and TotalToken usage.

```yaml
apiVersion: aigateway.envoyproxy.io/v1alpha1
kind: AIGatewayRoute
metadata:
  name: envoy-ai-gateway
  namespace: default
spec:
  schema:
    name: OpenAI
  targetRefs:
    - name: envoy-ai-gateway-basic
      kind: Gateway
      group: gateway.networking.k8s.io
  rules:
    - matches:
        - headers:
            - type: Exact
              name: x-ai-eg-model
              value: llama3-1b
      backendRefs:
        - name: envoy-ai-gateway-openai-kserve  # AIServiceBackend Name
          weight: 100
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

The traffic from the Envoy AI Gateway will be routed to the InferenceService based on the `x-ai-eg-model` header value. This header is automatically set by the AI Gateway by reading the model name in the payload request.

## Configure Rate Limiting

AI Gateway uses Envoy Gateway's Global Rate Limit API to configure rate limits. Rate limits should be defined using a combination of user and model identifiers to properly control costs at the model level. We will configure a rate limit of 1000 total tokens per hour per user for the model `llama3-1b` using `BackendTrafficPolicy`.

```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: model-specific-token-limit-policy
  namespace: default
spec:
  targetRefs:
    - name: envoy-ai-gateway-basic
      kind: Gateway
      group: gateway.networking.k8s.io
  rateLimit:
    type: Global
    global:
      rules:
        # Rate limit rule for llama3-1b: 1000 total tokens per hour per user
        - clientSelectors:
            - headers:
                - name: x-user-id
                  type: Distinct
                - name: x-ai-eg-model
                  type: Exact
                  value: llama3-1b
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

1. Always set the request cost number to 0 to ensure only token usage counts towards the limit.
2. Set appropriate limits for different models based on their costs and capabilities.
3. Ensure both user and model identifiers are used in rate limiting rules.
:::

## Configure $GATEWAY_URL

First, check if your Gateway has an external IP address assigned:

```shell
kubectl get svc -n envoy-gateway-system \
    --selector=gateway.envoyproxy.io/owning-gateway-namespace=default,gateway.envoyproxy.io/owning-gateway-name=envoy-ai-gateway-basic
```

You'll see output similar to this:

```
NAME                    TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)
eg-envoy-ai-gateway    LoadBalancer   10.96.61.234    <pending/IP>     80:31234/TCP
```

Choose one of these options based on the EXTERNAL-IP status:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="external-ip" label="Using External IP">
    If the EXTERNAL-IP shows an actual IP address (not &lt;pending&gt;), you can access the gateway directly:

    First, save the external IP and set the gateway URL:

    ```shell
    export GATEWAY_URL=$(kubectl get gateway/envoy-ai-gateway-basic -o jsonpath='{.status.addresses[0].value}')
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
    --selector=gateway.envoyproxy.io/owning-gateway-namespace=default,gateway.envoyproxy.io/owning-gateway-name=envoy-ai-gateway-basic \
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
If you're opening a new terminal, you'll need to set the GATEWAY_URL variable again.
For proper cost control and rate limiting, requests must include: 
- x-user-id: Identifies the user making the request
:::

Send a test request to the AI Gateway as user _user123_ using the GATEWAY_URL we set up:
```shell
curl -v -H "Content-Type: application/json" -H "x-user-id: user123" -d '{
        "model": "llama3-1b",
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
     }'     localhost:8080/v1/chat/completions
```

:::tip[Expected Output]
The response should be similar to the following:
    ```json
        {
            "id": "chatcmpl-7e49ea73-8e9a-4790-9fdd-c6e551ae14b0",
            "object": "chat.completion",
            "created": 1742223214,
            "model": "llama3-1b",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "reasoning_content": null,
                        "content": "Majestic silhouettes drifting by,\n Shapes that morph, a constant sigh,\nTheir whispers echo, yet remain unseen,\nGently drifting, leaving memories unseen.\n\nSoft puffs of white, like cotton tufts,\nFleeting wisps, a wistful route,\nAcross the sky, a canvas so grand,\nA symphony of shapes, at the clouds' command.\n\nTheir shadows dance, on walls so bright,\nA silver glow, in the moon's pale light,\nTheir silence is a reassuring sound,\nAs clouds resurface, without a bound.\n\nIn their depths, a world is spun,\nA realm of wonder, where dreams have begun,\nTheir wispy tendrils, reaching high,\nA veil of mystery, touched by the sky.\n\nAnd when they fade, into the ground,\nTheir memory remains, a poet's sound,\nFor in their fleeting, ephemeral kiss,\nLies a beauty, that forever bliss.\n\nTheir ethereal voice, a lullaby sweet,\nEchoes still, a wonder to the heart hecat,\nFor in the clouds, our souls ascend,\nAnd the magic of the heavens, will forever transcend.",
                        "tool_calls": []
                   },
                   "logprobs": null,
                   "finish_reason": "stop",
                   "stop_reason": null
              }
            ],
            "usage": {
                "prompt_tokens": 46,
                "total_tokens": 277,
                "completion_tokens": 231,
                "prompt_tokens_details": null
            },
            "prompt_logprobs": null
        }
    ```
:::

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

## Next Steps

Now that you've tested the basic setup, you can:

- For more rate limiter related configuration, see the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/capabilities/usage-based-ratelimiting).

- Explore the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/) to learn more about the features and capabilities.
