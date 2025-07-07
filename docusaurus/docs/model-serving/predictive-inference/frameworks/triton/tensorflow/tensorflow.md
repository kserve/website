---
title: TensorFlow
description: Deploy TensorFlow BERT Models with Triton on KServe
---

# Triton TensorFlow Models

Triton Inference Server provides a flexible, robust inference solution supporting multiple frameworks, including TensorFlow. This guide demonstrates deploying a TensorFlow-based BERT (Bidirectional Encoder Representations from Transformers) model on KServe using Triton Inference Server.

BERT is a method of pre-training language representations which obtains state-of-the-art results on a wide array of Natural Language Processing (NLP) tasks.

## What You'll Learn

This guide demonstrates:

- Inference on Question Answering (QA) tasks with BERT Base/Large models
- Using fine-tuned NVIDIA BERT models
- Deploying a Transformer for preprocessing with the BERT tokenizer
- Deploying a BERT model on Triton Inference Server
- Making inference requests using KServe's V2 protocol

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with [KServe installed](../../../../../getting-started/quickstart-guide.md).
- Your cluster's Istio Ingress gateway must be [network accessible](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/).
- Basic knowledge of TensorFlow, BERT models, and Triton Inference Server.
- kubectl CLI tool configured with your cluster.

## Setup (Serverless Mode Only)

1. Skip [tag resolution](https://knative.dev/docs/serving/tag-resolution/) for `nvcr.io` which requires authentication to resolve Triton inference server image digest:

```bash
kubectl patch cm config-deployment --patch '{"data":{"registriesSkippingTagResolving":"nvcr.io"}}' -n knative-serving
```

2. Increase progress deadline since pulling Triton image and large BERT models may take longer than the default timeout of 120s (this setting requires Knative 0.15.0+):

```bash
kubectl patch cm config-deployment --patch '{"data":{"progressDeadline": "600s"}}' -n knative-serving
```

## Creating a Custom Transformer for BERT Tokenizer

### Implementing Pre/Post-Processing Logic

To effectively use the BERT model with Triton, we need to create a custom transformer that handles:

- **Preprocessing**: Converting paragraphs and questions to BERT input format using the BERT tokenizer
- **Prediction**: Calling Triton Inference Server using the Python REST API
- **Postprocessing**: Converting raw predictions to answers with probabilities

Here's an example transformer implementation:

```python
class BertTransformer(kserve.Model):
    def __init__(self, name: str):
        super().__init__(name)
        self.short_paragraph_text = "The Apollo program was the third United States human spaceflight program. First conceived as a three-man spacecraft to follow the one-man Project Mercury which put the first Americans in space, Apollo was dedicated to President John F. Kennedy's national goal of landing a man on the Moon. The first manned flight of Apollo was in 1968. Apollo ran from 1961 to 1972 followed by the Apollo-Soyuz Test Project a joint Earth orbit mission with the Soviet Union in 1975."

        self.tokenizer = tokenization.FullTokenizer(vocab_file="/mnt/models/vocab.txt", do_lower_case=True)
        self.model_name = "bert_tf_v2_large_fp16_128_v2"
        self.triton_client = None

    def preprocess(self, inputs: Dict) -> Dict:
        self.doc_tokens = data_processing.convert_doc_tokens(self.short_paragraph_text)
        self.features = data_processing.convert_examples_to_features(self.doc_tokens, inputs["instances"][0], self.tokenizer, 128, 128, 64)
        return self.features

    def predict(self, features: Dict) -> Union[Dict, InferResponse]:
        if not self.triton_client:
            self.triton_client = httpclient.InferenceServerClient(
                url=self.predictor_config.predictor_host, verbose=True)

        unique_ids = np.zeros([1,1], dtype=np.int32)
        segment_ids = features["segment_ids"].reshape(1,128)
        input_ids = features["input_ids"].reshape(1,128)
        input_mask = features["input_mask"].reshape(1,128)

        inputs = []
        inputs.append(httpclient.InferInput('unique_ids', [1,1], "INT32"))
        inputs.append(httpclient.InferInput('segment_ids', [1, 128], "INT32"))
        inputs.append(httpclient.InferInput('input_ids', [1, 128], "INT32"))
        inputs.append(httpclient.InferInput('input_mask', [1, 128], "INT32"))
        inputs[0].set_data_from_numpy(unique_ids)
        inputs[1].set_data_from_numpy(segment_ids)
        inputs[2].set_data_from_numpy(input_ids)
        inputs[3].set_data_from_numpy(input_mask)

        outputs = []
        outputs.append(httpclient.InferRequestedOutput('start_logits', binary_data=False))
        outputs.append(httpclient.InferRequestedOutput('end_logits', binary_data=False))
        result = self.triton_client.infer(self.model_name, inputs, outputs=outputs)
        return result.get_response()

    def postprocess(self, result: Dict) -> Dict:
        end_logits = result['outputs'][0]['data']
        start_logits = result['outputs'][1]['data']
        n_best_size = 20

        # The maximum length of an answer that can be generated. This is needed
        #  because the start and end predictions are not conditioned on one another
        max_answer_length = 30

        (prediction, nbest_json, scores_diff_json) = \
           data_processing.get_predictions(self.doc_tokens, self.features, start_logits, end_logits, n_best_size, max_answer_length)
        return {"predictions": prediction, "prob": nbest_json[0]['probability'] * 100.0}
```

### Building the Transformer Docker Image

Build the KServe Transformer image with the above code:

```bash
cd bert_tokenizer_v2
docker build -t $USER/bert_transformer-v2:latest . --rm
```

Alternatively, you can use the pre-built image `kfserving/bert-transformer-v2:latest`.

## Creating the InferenceService

Add the custom KServe Transformer image and Triton Predictor to the `InferenceService` specification:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "bert-v2"
spec:
  transformer:
    containers:
      - name: kserve-container      
        image: kfserving/bert-transformer-v2:latest
        command:
          - "python"
          - "-m"
          - "bert_transformer_v2"
        env:
          - name: STORAGE_URI
            value: "gs://kfserving-examples/models/triton/bert-transformer"
  predictor:
    model:
      modelFormat:
        name: triton
      protocolVersion: v2
      storageUri: "gs://kfserving-examples/models/triton/bert"
      runtimeVersion: 20.10-py3
      resources:
        limits:
          cpu: "1"
          memory: 8Gi
        requests:
          cpu: "1"
          memory: 8Gi
```

Apply the `InferenceService` YAML:

```bash
kubectl apply -f bert_v1beta1.yaml
```

:::tip[Expected Output]
```
inferenceservice.serving.kserve.io/bert-v2 created
```
:::

## Checking the InferenceService Status

Verify that your InferenceService is running properly:

```bash
kubectl get inferenceservice bert-v2
```

:::tip[Expected Output]

Output should look like:
```
NAME      URL                                           READY   AGE
bert-v2   http://bert-v2.default.35.229.120.99.xip.io   True    71s
```
:::

Confirm that both the transformer and predictor components are in a Ready state:

```bash
kubectl get revision -l serving.kserve.io/inferenceservice=bert-v2
```

:::tip[Expected Output]
Output should look like:
```
NAME                                CONFIG NAME                   K8S SERVICE NAME                    GENERATION   READY   REASON
bert-v2-predictor-default-plhgs     bert-v2-predictor-default     bert-v2-predictor-default-plhgs     1            True    
bert-v2-transformer-default-sd6nc   bert-v2-transformer-default   bert-v2-transformer-default-sd6nc   1            True  
```
:::

## Running a Prediction

First, determine the [ingress IP and ports](../../../../../getting-started/first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

Send a question request with the following input. The transformer expects a list of `instances` or `inputs` and preprocesses them into the expected tensor format for the Triton Inference Server:

```json
{
  "instances": [
    "What President is credited with the original notion of putting Americans in space?"
  ]
}
```

You can find the sample input file here: [input.json](./input.json)

Execute the following command to make a prediction request:

```bash
MODEL_NAME=bert-v2
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservices bert-v2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

:::tip[Expected Output]
```json
{"predictions": "John F. Kennedy", "prob": 77.91848979818604}
```
:::

## Model Repository Structure for TensorFlow Models

For TensorFlow models, Triton expects a specific model repository structure. Your model repository should follow this layout:

```
<model-repository-path>/
  <model-name>/
    config.pbtxt
    1/
      model.savedmodel/
        saved_model.pb
        variables/
          variables.data-00000-of-00001
          variables.index
```

The `config.pbtxt` file defines the model configuration, including inputs, outputs, and execution options. Here's an example configuration for a TensorFlow model:

```protobuf
name: "bert_tf_v2_large_fp16_128_v2"
platform: "tensorflow_savedmodel"
max_batch_size: 8
input [
  {
    name: "unique_ids"
    data_type: TYPE_INT32
    dims: [ 1 ]
  },
  {
    name: "segment_ids"
    data_type: TYPE_INT32
    dims: [ 128 ]
  },
  {
    name: "input_ids"
    data_type: TYPE_INT32
    dims: [ 128 ]
  },
  {
    name: "input_mask"
    data_type: TYPE_INT32
    dims: [ 128 ]
  }
]
output [
  {
    name: "end_logits"
    data_type: TYPE_FP32
    dims: [ 128 ]
  },
  {
    name: "start_logits"
    data_type: TYPE_FP32
    dims: [ 128 ]
  }
]

instance_group [
  {
    count: 1
    kind: KIND_GPU
  }
]
```

## Performance Optimization

For optimal performance with TensorFlow models on Triton, consider these options:

1. **Dynamic Batching**: Enable dynamic batching to improve throughput when serving multiple requests:

```protobuf
dynamic_batching {
  preferred_batch_size: [ 4, 8 ]
  max_queue_delay_microseconds: 100
}
```

2. **Instance Groups**: Configure multiple model instances across GPUs or CPUs:

```protobuf
instance_group [
  {
    count: 2
    kind: KIND_GPU
    gpus: [ 0, 1 ]
  }
]
```

3. **Mixed Precision**: Use FP16 precision for faster inference on supported GPUs:

```protobuf
optimization { execution_accelerators {
  gpu_execution_accelerator : [ {
    name : "auto_mixed_precision"
  } ]
}}
```

## Conclusion

This guide demonstrated how to deploy a TensorFlow BERT model using Triton Inference Server on KServe. The approach shown can be extended to other TensorFlow models. By leveraging the flexibility of Triton Inference Server with KServe's serving capabilities, you can deploy sophisticated TensorFlow models with custom pre and post-processing in Kubernetes environments.
