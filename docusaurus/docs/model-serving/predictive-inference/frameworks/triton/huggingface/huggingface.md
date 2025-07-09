---
title: Hugging Face
description: Serve Hugging Face models with Triton on KServe
---

# Serve Hugging Face Models with Triton Inference Runtime

NVIDIA Triton Inference Server is a robust serving runtime with optimized performance, scalability, and flexibility. Combined with the expansive library of Hugging Face, which offers state-of-the-art natural language processing capabilities, it opens up immense possibilities for deploying production-ready Hugging Face transformer-based models.

By harnessing the power of these tools, this guide demonstrates how KServe can help further simplify the Triton Inference containers deployment and make efficient use of GPUs by automatically wiring up the open inference protocol between pre/post processing (tokenization) and model inference on the Triton inference container.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- Basic knowledge of Hugging Face models, Triton Inference Server, and KServe.
- kubectl CLI tool configured with your cluster.

## Exporting Models to Triton Format

Export the Hugging Face models to supported model formats such as TorchScript or ONNX in [Triton model repository layout](../torchscript/torchscript.md#store-your-model-on-cloud-storage-in-a-model-repository).

For more details, please refer to the [Triton model configuration documentation](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html).

## Deploying InferenceService with Triton and Hugging Face Runtime

Create an InferenceService with a Triton predictor by specifying the `storageUri` with the Hugging Face model stored on cloud storage according to the Triton model repository layout. 

The KServe transformer container is created using the KServe Hugging Face runtime for the tokenization step to encode the text tokens and decode the token IDs from the output of the Triton inference container. 

The Hugging Face tokenizing container and Triton inference container can communicate with either REST or gRPC protocol by specifying `--predictor_protocol=v2` or `--predictor_protocol=grpc-v2`.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-triton
spec:
  predictor:
    model:
      args:
      - --log-verbose=1
      modelFormat:
        name: triton
      protocolVersion: v2
      resources:
        limits:
          cpu: "1"
          memory: 8Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 8Gi
          nvidia.com/gpu: "1"
      runtimeVersion: 23.10-py3
      storageUri: gs://kfserving-examples/models/triton/huggingface/model_repository
  transformer:
    containers:
    - args:
      - --model_name=bert
      - --model_id=bert-base-uncased
      - --predictor_protocol=v2
      - --tensor_input_names=input_ids
      image: kserve/huggingfaceserver:latest
      name: kserve-container
      resources:
        limits:
          cpu: "1"
          memory: 2Gi
        requests:
          cpu: 100m
          memory: 2Gi
```

To apply the configuration:

```bash
kubectl apply -f huggingface-triton.yaml
```

## Performing Model Inference

The first step is to [determine the ingress IP and ports](../../../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-triton -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Perform inference using v1 REST Protocol:

```bash
# You can find the sample input.json in the same directory as this document
# or create it using the command below
echo '{"instances": ["The capital of france is [MASK]."] }' > input.json

# Use the input file for inference
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d @[input.json](./input.json)
```

:::tip[Expected Output]
```
{"predictions":["paris"]}
```
:::

## Model Repository Structure for Hugging Face Models

For Hugging Face models, Triton expects a specific model repository structure. Your model repository should follow this layout:

```
<model-repository-path>/
  <model-name>/
    config.pbtxt
    1/
      model.pt     # For TorchScript models
      # or
      model.onnx   # For ONNX models
```

The `config.pbtxt` file defines the model configuration, including inputs, outputs, and execution options. Here's an example configuration for a BERT model:

```protobuf
name: "bert"
platform: "pytorch_libtorch"
max_batch_size: 8
input [
  {
    name: "input_ids"
    data_type: TYPE_INT64
    dims: [ -1 ]
  }
]
output [
  {
    name: "output"
    data_type: TYPE_FP32
    dims: [ -1, 30522 ]
  }
]

instance_group [
  {
    count: 1
    kind: KIND_GPU
  }
]
```

You can find the sample configuration file here: [config.pbtxt](./config.pbtxt)


## Conclusion

This guide demonstrated how to deploy a Hugging Face model using Triton Inference Server on KServe. By combining the power of Hugging Face's transformer models with Triton's optimized inference capabilities and KServe's simplified deployment workflow, you can efficiently serve advanced NLP models in production environments.
