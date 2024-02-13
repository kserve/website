# Deploy the LLaMA model with Huggingface Serving Runtime
The Huggingface serving runtime implements a runtime that can serve huggingface transformer based model out of the box. 

In this example, we deploy a LLaMa model from huggingface by running an `InferenceService` with [Hugginface Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). Based on the performance requirement, you can choose to perform the inference on a more optimized inference engine like triton inference server and [vLLM](https://github.com/vllm-project/vllm) for text generation.

### Serve the huggingface model using KServe python runtime 

=== "Yaml"
    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface
    spec:
      predictor:
        containers:
        - args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
          - --tensor_input_names=input_ids
          - --disable_vllm
          image: kserve/huggingfaceserver:latest
          name: kserve-container
          resources:
            limits:
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Serve the huggingface model using triton inference runtime

Ensure to have a [storageUri](https://kserve.github.io/website/0.11/modelserving/v1beta1/triton/torchscript/#store-your-trained-model-on-cloud-storage-in-a-model-repository) in triton prescribed format 

=== "Yaml"
    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface
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
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
          runtimeVersion: 23.10-py3
          storageUri: <storageUri in triton prescribed format>
      transformer:
        containers:
        - args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
          - --predictor_protocol=v2
          - --tensor_input_names=input_ids
          - --disable_vllm
          image: kserve/huggingfaceserver:latest
          name: kserve-container
          resources:
            limits:
              cpu: "1"
              memory: 2Gi
            requests:
              cpu: 100m
              memory: 2Gi
    EOF
    ```

### Serve the huggingface model using vllm runtime

=== "Yaml"
    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface
    spec:
      predictor:
        containers:
        - args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
          image: kserve/huggingfaceserver:latest
          name: kserve-container
          resources:
            limits:
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "6"
              memory: 24Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Model Inference

The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=llama2
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Inference KServe python runtime with v1 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["The capital of france is [MASK]."] }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"predictions":["The capital of France is actually Paris."]}
  ```

Inference triton runtime with v2 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["The capital of france is [MASK]."] }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"predictions":"The capital of France is actually Paris."}
  ```

vLLM runtime only supports the [/generate](https://github.com/kserve/open-inference-protocol/blob/main/specification/protocol/generate_rest.yaml) endpoint schema for inference.

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"text_input": "The capital of france is [MASK]." }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"text_output":"The capital of france is [MASK].\n\nThe capital of France is actually Paris.","model_name":"llama2","model_version":null,"details":null}
  ```
