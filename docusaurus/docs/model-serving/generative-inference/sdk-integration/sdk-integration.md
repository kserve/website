---
title: Integrate with LLM SDKs
description: Learn how to connect your KServe-deployed LLMs with popular SDKs like OpenAI and LangChain
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Integrating KServe LLM Deployments with LLM SDKs

KServe-deployed LLMs can seamlessly integrate with popular LLM application frameworks through standardized interfaces. This guide demonstrates how to connect your deployed models with widely-used SDKs to build AI applications.

## Deploy a KServe LLM Inference Service

First, you need a deployed LLM inference service. Follow our [Text Generation with Llama3](../tasks/text-generation/text-generation.md) guide to deploy a model. After completing the deployment, you'll have a model endpoint ready for integration.

### Getting Your Model Endpoint

Once your model is deployed, you need to obtain the service hostname for API calls:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

For the Llama3 example, the model name is `llama3`. You'll need both the service hostname and model name for SDK integration.

## Integration with OpenAI SDK

The OpenAI SDK is widely used for working with LLMs. KServe's OpenAI-compatible endpoints make it easy to connect your deployed models with applications built using this SDK.

### Installation

Install the OpenAI Python client:

```bash
pip3 install openai
```

### Usage Example

Create a Python script (`sample_openai.py`) to interact with your KServe LLM:

<Tabs>
<TabItem value="python" label="Python">

```python
from openai import OpenAI

Deployment_url = "<SERVICE_HOSTNAME>"
client = OpenAI(
    base_url=f"{Deployment_url}/openai/v1",
    api_key="empty",
)

# typial chat completion response
print("Typical chat completion response:")
response = client.chat.completions.create(
    model="llama3",
    messages=[
        {'role': 'user', 'content': "What's 1+1? Answer in one word."}
    ],
    temperature=0,
    max_tokens=256
)

reply = response.choices[0].message
print(f"Extracted reply: \n{reply.content}\n")

# streaming chat completion response
print("Streaming chat completion response:")
stream = client.chat.completions.create(
    model='llama3',
    messages=[
        {'role': 'user', 'content': 'Count to 100, with a comma between each number and no newlines. E.g., 1, 2, 3, ...'}
    ],
    temperature=0,
    max_tokens=300,
    stream=True  # this time, we set stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

</TabItem>
</Tabs>

### Running the Example

Execute the script to see both regular and streaming responses:

```bash
python3 sample_openai.py
```

:::tip Expected Output
```
Typical chat completion response:
Extracted reply: 
Two.

Streaming chat completion response:
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100
```
:::

### Key Points

- Replace `<SERVICE_HOSTNAME>` with your actual service hostname
- The endpoint path `/openai/v1` routes requests through KServe's OpenAI-compatible interface
- The `api_key="empty"` parameter is needed but authentication can be configured separately
- The `model` parameter should match the model name from your InferenceService

## Integration with LangChain Framework

[LangChain](https://www.langchain.com/) is a popular framework for developing applications powered by language models. It provides components for working with LLMs and building more complex AI applications.

### Installation

Install the LangChain OpenAI integration package:

```bash
pip3 install langchain-openai
```

### Usage Example

Create a Python script (`sample_langchain.py`) to interact with your KServe LLM through LangChain:

<Tabs>
<TabItem value="python" label="Python">

```python
from langchain_openai import ChatOpenAI

Deployment_url = "<SERVICE_HOSTNAME>"

llm = ChatOpenAI(
    model_name="llama3",
    base_url=f"{Deployment_url}/openai/v1",
    openai_api_key="empty",
    temperature=0,
    max_tokens=256,
)

# typial chat completion response
print("Typical chat completion response:")

messages = [
    (
        "system",
        "You are a helpful assistant that translates English to French. Translate the user sentence.",
    ),
    ("human", "I love programming."),
]
reply = llm.invoke(messages)
print(f"Extracted reply: \n{reply.content}\n")

# streaming chat completion response
print("Streaming chat completion response:")
for chunk in llm.stream("Write me a 1 verse song about goldfish on the moon"):
    print(chunk.content, end="", flush=True)
```

</TabItem>
</Tabs>

### Running the Example

Execute the script to see both regular and streaming responses:

```bash
python3 sample_langchain.py
```

:::tip Expected Output
```
Typical chat completion response:
Extracted reply: 
Je adore le programmation.

Streaming chat completion response:
Here is a 1-verse song about goldfish on the moon:

"In the lunar lake, where the craters shine
A school of goldfish swim, in a celestial shrine
Their scales glimmer bright, like stars in the night
As they dart and play, in the moon's gentle light"
```
:::

### Key Points

- LangChain provides higher-level abstractions for working with LLMs
- You can create chains, agents, and more complex workflows using your KServe-deployed models
- The integration follows the same pattern as the OpenAI SDK, utilizing the OpenAI-compatible endpoints

## Additional SDK Options

KServe's OpenAI-compatible endpoints allow integration with many other frameworks and SDKs:

### LlamaIndex

[LlamaIndex](https://www.llamaindex.ai/) is a data framework for LLM applications that helps with data connection and retrieval augmented generation (RAG).

```bash
pip install llama-index-llms-openai
```

```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="llama3",
    api_base=f"http://{SERVICE_HOSTNAME}/openai/v1",
    api_key="empty"
)

response = llm.complete("What is the capital of France?")
print(response)
```

### Direct API Calls

For languages without specific SDKs, you can use standard HTTP clients:

<Tabs>
<TabItem value="curl" label="cURL">

```bash
curl -X POST "http://${SERVICE_HOSTNAME}/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "temperature": 0.7
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript (Fetch)">

```javascript
const response = await fetch(`http://${serviceHostname}/openai/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3',
    messages: [{ role: 'user', content: 'Hello, how are you?' }],
    temperature: 0.7,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

</TabItem>
</Tabs>

## Best Practices

When integrating with KServe-deployed LLMs:

1. **Error Handling**: Implement robust error handling for network issues, timeouts, and API errors.
2. **Caching**: Consider caching responses for frequently asked questions to reduce latency and costs.
3. **Monitoring**: Track usage metrics, latency, and error rates to optimize your application.
4. **Fallback Mechanisms**: Implement fallback options if primary model responses are slow or unavailable.
5. **Token Management**: Be mindful of token limits when designing prompts and handling responses.

## Next Steps

After integrating your LLM with an SDK, consider exploring:

1. **Advanced serving options** like [multi-node inference](../multi-node/README.md) for large models
2. **Exploring other inference tasks** such as [text-to-text generation](../tasks/text2text-generation/text2text-generation.md) and [embeddings](../tasks/embedding/embedding.md)
3. **Optimizing performance** with features like [model caching](../modelcache/localmodel.md) and [KV cache offloading](../kvcache-offloading/README.md)

By connecting your KServe-deployed models with these popular SDKs, you can quickly build sophisticated AI applications while maintaining control over your model infrastructure.
