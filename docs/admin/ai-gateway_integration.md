# Integrating KServe with Envoy AI Gateway
This guide explains how to integrate KServe with the Envoy AI Gateway. KServe can be integrated with the AI Gateway either within the same cluster or across different clusters. In this example, we will demonstrate how to integrate KServe with the Envoy AI Gateway within the same cluster.

## AI Gateway Overview
The Envoy AI Gateway was created to address the complexity of connecting applications to GenAI services by leveraging Envoy's flexibility and Kubernetes-native features. It provides a secure, scalable, and efficient way to manage LLM/AI traffic, with backend rate limiting and policy control.Key features of the AI Gateway include:

- **Request Routing**: Directs API requests to appropriate GenAI services
- **Authentication and Authorization**: Implement API key validation to secure communication.
- **Backend Security Policy**: Introduces fine-grained access control for backend services.
  This also controls LLM/AI backend usage using token-per-second (TPS) policies to prevent overuse.
- **Multi-Upstream Provider Support for LLM/AI Services**: The ability to receive requests in the
  format of one LLM provider and route them to different upstream providers, ensuring compatibility
  with their expected formats. This is made possible through built-in transformation capabilities that
  adapt requests and responses accordingly.
- **AWS Request Signing**: Supports external processing for secure communication with AWS-hosted
  LLM/AI services.

For more information, see the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/).

## Prerequisites
- A Kubernetes cluster with [KServe with Gateway API Enabled](kubernetes_deployment.md), [Envoy Gateway](https://aigateway.envoyproxy.io/docs/getting-started/prerequisites), and [Envoy AI Gateway installed](https://aigateway.envoyproxy.io/docs/getting-started/installation).
- The `kubectl` command-line tool installed

## Create Namespace
Create a namespace for the InferenceService.

```shell
kubectl create namespace kserve-test
```

## Create an InferenceService
Create a secret with the Hugging Face token.

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

Create an InferenceService in the `kserve-test` namespace with OpenAI route prefix disabled. The following example creates an InferenceService with 'llama3.2-1B' model from Hugging Face.


```shell
kubectl apply -f - <<EOF
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
        limits:
          cpu: "4"
          memory: 12Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "6"
          memory: 12Gi
          nvidia.com/gpu: "1"
EOF
```


## Create BackendSecurityPolicy
You can configure the BackendSecurityPolicy for authentication and authorization with the InferenceService.
For example, you can create a BackendSecurityPolicy to secure communication with the InferenceService using an API key.
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

```shell
kubectl apply -f - <<EOF
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
  timeouts:
    request: 60s
  # backendSecurityPolicyRef:
  #   name: envoy-ai-gateway-openai-kserve-apikey
  #   kind: BackendSecurityPolicy
  #   group: aigateway.envoyproxy.io
EOF
```

## Create ReferenceGrant
Since, the InferenceService is in the `kserve-test` namespace, we need to create a `ReferenceGrant` to allow the `AIServiceBackend` to reference the InferenceService.

```shell
kubectl apply -f - <<EOF
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
EOF
```

## Create Gateway for the AI Gateway
Create a Gateway for the AI Gateway to route the traffic to different LLM providers.

```shell
kubectl apply -f - <<EOF
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
EOF
```


## Create AIGatewayRoute
Create an `AIGatewayRoute` and configure KServe as the LLM service provider for the model `llama3-1b` using the AIServiceBackend created in the previous step. The `AIGatewayRoute` can be configured to rate limit requests based on the token usage. For rate limiter configuration, see the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/capabilities/usage-based-ratelimiting).

```shell
kubectl apply -f - <<EOF
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
EOF
```
The traffic from the Envoy AI Gateway will be routed to the InferenceService based on the `x-ai-eg-model` header value. This header is automatically set by the AI Gateway by reading the model name in the payload request. This header value should match the model name of the InferenceService.

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

=== "Using External IP"
    If the EXTERNAL-IP shows an actual IP address (not <pending>), you can access the gateway directly:

    First, save the external IP and set the gateway URL:

    ```shell
    export GATEWAY_URL=$(kubectl get gateway/envoy-ai-gateway-basic -o jsonpath='{.status.addresses[0].value}')
    ```

=== "Using Port Forwarding"
    If the EXTERNAL-IP shows <pending> or your cluster doesn't support LoadBalancer services, use port forwarding.

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

## Testing the Gateway
Verify the URL is available:

```shell
echo $GATEWAY_URL
```
!!! tip
    If you're opening a new terminal, you'll need to set the GATEWAY_URL variable again.

Send a test request to the AI Gateway using the GATEWAY_URL we set up:

```shell
curl -v -H "Content-Type: application/json" \
    -d '{
        "model": "llama3-1b",
        "messages": [
            {
                "role": "system",
                "content": "Hi."
            }
        ]
    }' \
    $GATEWAY_URL/v1/chat/completions
```

!!! success "Expected Output"
    The response should be similar to the following:
    ```json
    {
      "id": "chatcmpl-4f82341b-6d9d-4bcb-870c-5194dfd4a66b",
      "object": "chat.completion",
      "created": 1741711473,
      "model": "llama3-1b",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "reasoning_content": null,
            "content": "Hello. Is there something I can help you with or would you like to chat?",
            "tool_calls": []
          },
          "logprobs": null,
          "finish_reason": "stop",
          "stop_reason": null
        }
      ],
      "usage": {
        "prompt_tokens": 32,
        "total_tokens": 50,
        "completion_tokens": 18,
        "prompt_tokens_details": null
      },
      "prompt_logprobs": null
    }
    ```

## Next Steps
Now that you've tested the basic setup, you can:

- Explore the [Envoy AI Gateway documentation](https://aigateway.envoyproxy.io/docs/) to learn more about the features and capabilities.