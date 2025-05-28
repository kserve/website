# Deploy the BERT model for fill mask task with Hugging Face LLM Serving Runtime
In this example, We demonstrate how to deploy `BERT model` for fill mask task from Hugging Face by deploying the `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). 

## Serve the Hugging Face LLM model using V1 Protocol
First, We will deploy the `BERT model` using the Hugging Face backend with V1 Protocol.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-bert
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
            - --model_name=bert
            - --model_id=google-bert/bert-base-uncased
          resources:
            limits:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-bert
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-bert   http://huggingface-bert.default.example.com             True           100                              huggingface-bert-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](/docs/get_started/first_isvc#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"instances": ["The capital of France is [MASK].", "The capital of [MASK] is paris."]}'
```

!!! success "Expected Output"
    ```{ .json .no-copy .select }
    {"predictions":["paris","france"]}
    ```

## Serve the Hugging Face LLM model using Open Inference Protocol(V2 Protocol)

First, We will deploy the `BERT model` using the Hugging Face backend with Open Inference Protocol(V2 Protocol).
For this, We need to set the **`protocolVersion` field to `v2`**.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-bert
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          protocolVersion: v2
          args:
            - --model_name=bert
            - --model_id=google-bert/bert-base-uncased
          resources:
            limits:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-bert
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-bert   http://huggingface-bert.default.example.com             True           100                              huggingface-bert-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](/docs/get_started/first_isvc#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-bert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"inputs": [{"name": "input-0", "shape": [2], "datatype": "BYTES", "data": ["The capital of France is [MASK].", "The capital of [MASK] is paris."]}]}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "model_name": "bert",
      "model_version": null,
      "id": "fd206443-f58c-4c5f-a04b-e6babcf6c854",
      "parameters": null,
      "outputs": [
        {
          "name": "output-0",
          "shape": [2],
          "datatype": "BYTES",
          "parameters": null,
          "data": ["paris", "france"]
        }
      ]
    }
    ```
