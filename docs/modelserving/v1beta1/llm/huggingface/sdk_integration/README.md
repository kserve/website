# Integrate KServe LLM Deployment with LLM SDKs

This document provides the example of how to integrate KServe LLM Inference Service with the popular LLM SDKs.

## Deploy a KServe LLM Inference Service

Please follow this example: [Text Generation using LLama3](../text_generation/README.md) to deploy a KServe LLM Inference Service.

Get the `SERVICE_HOSTNAME` by running the following command:

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

The model name for the above example is `llama3`.

## How to integrate with OpenAI SDK

Install the [OpenAI SDK](https://github.com/openai/openai-python):

```bash
pip3 install openai
```

Create a Python script to interact with the KServe LLM Inference Service and save it as `sample_openai.py`:

=== "python"
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

Run the python script:

```bash
python3 sample_openai.py
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    Typical chat completion response:
    Extracted reply: 
    Two.

    Streaming chat completion response:
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100
    ```

## How to integrate with Langchain SDK

Install the [Langchain SDK](https://python.langchain.com/v0.2/docs/how_to/installation/#integration-packages):

```bash
pip3 install langchain-openai
```

Create a Python script to interact with the KServe LLM Inference Service and save it as `sample_langchain.py`:

=== "python"
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

Run the python script:

```bash
python3 sample_langchain.py
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
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
