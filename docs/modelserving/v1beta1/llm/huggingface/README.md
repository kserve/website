# Deploy the LLaMA model with Huggingface Serving Runtime
The Huggingface serving runtime implements a runtime that can serve huggingface transformer based model out of the box. 

In this example, we deploy a LLaMa model from huggingface by running an `InferenceService` with [Hugginface Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). Based on the performance requirement, you can choose to perform the inference on a more optimized inference engine like [vLLM](https://github.com/vllm-project/vllm) for text generation.

### Serve the huggingface model using KServe python runtime 

=== "Yaml"
    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-llama2
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
          - --tensor_input_names=input_ids
          - --disable_vllm
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

### Serve the huggingface model using vllm runtime

=== "Yaml"
    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-llama2
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
          - --model_name=llama2
          - --model_id=meta-llama/Llama-2-7b-chat-hf
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
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["Where is Eiffel Tower?"] }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"predictions":["Where is Eiffel Tower?\nEiffel Tower is located in Paris, France. It is one of the most iconic landmarks in the world and stands at 324 meters (1,063 feet) tall. The tower was built for the 1889 World's Fair in Paris and was designed by Gustave Eiffel. It is made of iron and has four pillars that support the tower. The Eiffel Tower is a popular tourist destination and offers stunning views of the city of Paris."]}
  ```

Inference KServe python runtime with v2 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer -d '{"id": "42","inputs": [{"name": "input0","shape": [-1],"datatype": "BYTES","data": [""Where is Eiffel Tower?"]}]}'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"model_name":"llama2","model_version":null,"id":"42","parameters":null,"outputs":[{"name":"output-0","shape":[1],"datatype":"BYTES","parameters":null,"data":["Where is Eiffel Tower?\nWhere is Eiffel Tower located?\nThe Eiffel Tower is located in Paris, France. It stands on the Champ de Mars in the 7th arrondissement of Paris, near the Seine River. The exact address of the Eiffel Tower is:\n\n2, avenue Anatole France\n75007 Paris, France\n\nThe Eiffel Tower is one of the most iconic landmarks in the world and is a must-visit attraction for anyone traveling to Paris. It was built for the 1889 World's Fair and stands 324 meters (1,063 feet) tall, making it the tallest structure in Paris and one of the tallest in Europe."]}]}
  ```

vLLM runtime only supports the [/generate](https://github.com/kserve/open-inference-protocol/blob/main/specification/protocol/generate_rest.yaml) endpoint schema for inference.

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/generate -d '{"text_input": "The capital of france is [MASK]." }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"text_output":"Where is Eiffel Tower?\n2022.01.22 17:56 Where is Eiffel Tower?\nThe Eiffel Tower is located in the 7th arrondissement of Paris, France. It stands on the Champ de Mars, a large public park next to the Seine River. The tower's exact address is:\n\n2 Rue du Champ de Mars, 75007 Paris, France.","model_name":"llama2","model_version":null,"details":null}
  ```
