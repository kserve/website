# Deploy the Llama2 model with Huggingface LLM Serving Runtime
The Huggingface LLM serving runtime implements a runtime that can serve huggingface LLM model out of the box. 

In this example, we deploy a Llama2 model from huggingface by running an `InferenceService` with [Hugginface Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). Based on the performance requirement for large language models, KServe chooses to perform the inference using a more optimized inference engine like [vLLM](https://github.com/vllm-project/vllm) for text generation models.

### Serve the Huggingface LLM model using vLLM
KServe Huggingface runtime by default uses vLLM to serve the LLM models for faster inference, higher throughput than Huggingface API, implemented with paged attention, continous batching, optmized CUDA kernel. 
You can still use `--disable_vllm` flag to fall back to perform the inference using Huggingface API.

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
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-llama2 -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Perform inference with v1 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["Where is Eiffel Tower?"] }'
```

!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"predictions":["Where is Eiffel Tower?\nEiffel Tower is located in Paris, France. It is one of the most iconic landmarks in the world and stands at 324 meters (1,063 feet) tall. The tower was built for the 1889 World's Fair in Paris and was designed by Gustave Eiffel. It is made of iron and has four pillars that support the tower. The Eiffel Tower is a popular tourist destination and offers stunning views of the city of Paris."]}
  ```

KServe Huggingface vLLM runtime supports the [/generate](https://github.com/kserve/open-inference-protocol/blob/main/specification/protocol/generate_rest.yaml) endpoint schema for text generation endpoint.

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/generate -d '{"text_input": "The capital of france is [MASK]." }'

```
!!! success "Expected Output"

  ```{ .bash .no-copy }
    {"text_output":"Where is Eiffel Tower?\nThe Eiffel Tower is located in the 7th arrondissement of Paris, France. It stands on the Champ de Mars, a large public park next to the Seine River. The tower's exact address is:\n\n2 Rue du Champ de Mars, 75007 Paris, France.","model_name":"llama2","model_version":null,"details":null}
  ```
