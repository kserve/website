import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deploy Your First GenAI Service

In this tutorial, you will deploy a Large Language Model (LLM) using KServe's InferenceService to create a powerful generative AI service. We'll use the Qwen model, a state-of-the-art language model developed by Alibaba, capable of understanding and generating human-like text across multiple languages.

You will learn how to deploy the model and interact with it using OpenAI-compatible APIs, making it easy to integrate with existing applications and tools that support the OpenAI standard.

Since your LLM is deployed as an InferenceService rather than a basic Kubernetes deployment, you automatically get enterprise-grade features like **autoscaling**, **load balancing**, **canary deployments**, and **GPU acceleration** out of the box :rocket:.

### Prerequisites
Before you begin, ensure you have followed the [KServe Quickstart Guide](quickstart-guide.md) to set up KServe in your Kubernetes cluster. This guide assumes you have a working KServe installation and a Kubernetes cluster ready for deployment.

### 1. Create a namespace

First, create a namespace to use for deploying KServe resources:

```shell
kubectl create namespace kserve-test
```

### 2. Create an `InferenceService`

Create an InferenceService to deploy the Qwen LLM model. This model will be served using KServe's Hugging Face runtime with vLLM backend for optimized performance.

:::warning

Do not deploy `InferenceServices` in control plane namespaces (i.e. namespaces with `control-plane` label). The webhook is configured in a way to skip these namespaces to avoid any privilege escalations. Deploying InferenceServices to these namespaces will result in the storage initializer not being injected into the pod, causing the pod to fail with the error `No such file or directory: '/mnt/models'`.

:::

<Tabs>
<TabItem value="kubectl" label="Apply from stdin" default>

```yaml
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "qwen-llm"
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
      storageUri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
      resources:
        limits:
          cpu: "2"
          memory: 6Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
EOF
```
</TabItem>
<TabItem value="yaml" label="Yaml">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "qwen-llm"
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
      storageUri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
      resources:
        limits:
          cpu: "2"
          memory: 6Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
```
</TabItem>
</Tabs>

:::tip[Using Hugging Face Token]

If you need to authenticate with Hugging Face, first create a secret:
```shell
kubectl create secret generic hf-secret \
--from-literal=HF_TOKEN=your_hf_token_here \
-n kserve-test
```
    
Then add the environment variable to your InferenceService:
```yaml
env:
  - name: HF_TOKEN
    valueFrom:
      secretKeyRef:
        name: hf-secret
        key: HF_TOKEN
```

:::


### 3. Check `InferenceService` status.

```bash
kubectl get inferenceservices qwen-llm -n kserve-test
```

:::tip[Expected Output]
```
NAME       URL                                             READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                AGE
qwen-llm   http://qwen-llm.kserve-test.example.com         True           100                              qwen-llm-predictor-default-47q2g   7d23h
```
:::

If your DNS contains example.com please consult your admin for configuring DNS or using [custom domain](https://knative.dev/docs/serving/using-a-custom-domain).

### 4. Determine the ingress IP and ports

Execute the following command to determine if your Kubernetes cluster is running in an environment that supports external load balancers
```bash
kubectl get svc istio-ingressgateway -n istio-system
```

:::tip[Expected Output]
```
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)   AGE
istio-ingressgateway   LoadBalancer   172.21.109.129   130.211.10.121   ...       17h
```
:::

<Tabs>
<TabItem value="Load Balancer" label="Load Balancer" default>
    If the EXTERNAL-IP value is set, your environment has an external load balancer that you can use for the ingress gateway.

    ```bash
    export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
    ```
</TabItem>
<TabItem value="Node Port" label="Node Port">
    If the EXTERNAL-IP value is none (or perpetually pending), your environment does not provide an external load balancer for the ingress gateway.
    In this case, you can access the gateway using the service’s node port.
    ```bash
    # GKE
    export INGRESS_HOST=worker-node-address
    # Minikube
    export INGRESS_HOST=$(minikube ip)
    # Other environment(On Prem)
    export INGRESS_HOST=$(kubectl get po -l istio=ingressgateway -n istio-system -o jsonpath='{.items[0].status.hostIP}')
    export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
    ```
</TabItem>
<TabItem value="Port Forward" label="Port Forward">
    Alternatively you can do `Port Forward` for testing purposes.
    ```bash
    INGRESS_GATEWAY_SERVICE=$(kubectl get svc --namespace istio-system --selector="app=istio-ingressgateway" --output jsonpath='{.items[0].metadata.name}')
    kubectl port-forward --namespace istio-system svc/${INGRESS_GATEWAY_SERVICE} 8080:80
    ```
    Open another terminal, and enter the following to perform inference:
    ```bash
    export INGRESS_HOST=localhost
    export INGRESS_PORT=8080

    SERVICE_HOSTNAME=$(kubectl get inferenceservice qwen-llm -n kserve-test -o jsonpath='{.status.url}' | cut -d "/" -f 3)
    curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions" -d @./chat-input.json
    ```
</TabItem>
</Tabs>

### 5. Perform inference
Create a JSON file named `chat-input.json` with the following content to send a chat completion request to the Qwen model:

```shell
cat <<EOF > "./chat-input.json"
{
  "model": "qwen",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that provides clear and concise answers."
    },
    {
      "role": "user",
      "content": "Write a short poem about artificial intelligence and machine learning."
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7,
  "stream": false
}
EOF
```

Depending on your setup, use one of the following commands to curl the `InferenceService`:

<Tabs>
<TabItem value="Real DNS" label="Real DNS" default>

```bash
curl -v -H "Content-Type: application/json" http://qwen-llm.kserve-test.example.com/openai/v1/chat/completions -d @./chat-input.json
```
</TabItem>
<TabItem value="Magic DNS" label="Magic DNS">

```bash
curl -v -H "Content-Type: application/json" http://qwen-llm.kserve-test.xip.io/openai/v1/chat/completions -d @./chat-input.json
```
</TabItem>
<TabItem value="From Ingress gateway with HOST Header" label="From Ingress gateway with HOST Header">

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice qwen-llm -n kserve-test -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/openai/v1/chat/completions" -d @./chat-input.json
```
</TabItem>
<TabItem value="From local cluster gateway" label="From local cluster gateway">

```bash
curl -v -H "Content-Type: application/json" http://qwen-llm.kserve-test/openai/v1/chat/completions -d @./chat-input.json
```
</TabItem>
<TabItem value="OpenAI Python Client" label="OpenAI Python Client">

```python
from openai import OpenAI
# Configure the client to point to your KServe endpoint
client = OpenAI(
    api_key="not-needed",  # KServe doesn't require API key authentication
    base_url="http://qwen-llm.kserve-test/openai/v1"  # Note the /openai prefix
)
# Send a chat completion request
response = client.chat.completions.create(
    model="qwen",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a short poem about artificial intelligence."}
    ],
    max_tokens=150,
    temperature=0.7
)
print(response.choices[0].message.content)
```
</TabItem>
</Tabs>
You should see a response similar to the following, which contains the generated text from the Qwen model:

```json
{
  "id": "cmpl-generated-id",
  "object": "chat.completion",
  "created": 1703123456,
  "model": "qwen",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's a poem about artificial intelligence and machine learning:\n\nSilicon minds awakening bright,\nThrough data streams and neural flight,\nPatterns learned from endless code,\nAI walks the digital road.\n\nMachine learning, wise and true,\nFinds the answers we pursue,\nIn the dance of ones and zeros,\nTechnology becomes our heroes."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 67,
    "total_tokens": 112
  }
}
```
### 6. Clean up
To clean up the resources created in this tutorial, delete the InferenceService and the namespace:

```bash
kubectl delete inferenceservice qwen-llm -n kserve-test
kubectl delete namespace kserve-test
```
### 7. Next Steps
<!-- TODO: Update next steps -->
Now that you have successfully deployed a generative AI service using KServe, you can explore more advanced features such as:
- **Autoscaling**: Automatically scale your service based on traffic and resource usage.
- **Canary Deployments**: Gradually roll out new model versions to test their performance before full deployment.
- **Multi-model Serving**: Deploy multiple models within the same InferenceService for efficient resource utilization.
- **Custom Runtimes**: Create custom inference runtimes to support specialized models or frameworks.
You can also explore the [KServe documentation](https://kserve.github.io/website/) for more information on these features and how to implement them in your applications.
```
