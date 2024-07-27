# Deploy the BERT model for text classification task with Hugging Face LLM Serving Runtime
In this example, We demonstrate how to deploy `distilBERT model` for sequence classification (a.k.a. text classification) task from Hugging Face by deploying the `InferenceService` with [Hugging Face Serving runtime](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver). 

## Serve the Hugging Face LLM model using V1 Protocol
First, We will deploy the `distilBERT model` using the Hugging Face backend with V1 Protocol.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-distilbert
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          args:
            - --model_name=distilbert
            - --model_id=distilbert/distilbert-base-uncased-finetuned-sst-2-english
          resources:
            limits:
              cpu: "1"
              memory: 4Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-distilbert
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                     URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-distilbert   http://huggingface-distilbert.default.example.com             True           100                              huggingface-distilbert-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=distilbert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-distilbert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"instances": ["Hello, my dog is cute", "I am feeling sad"]}'
```

!!! success "Expected Output"
    ```{ .json .no-copy .select }
    {"predictions":[1,0]}
    ```

## Serve the Hugging Face LLM model using Open Inference Protocol(V2 Protocol)

First, We will deploy the `distilBERT model` using the Hugging Face backend with Open Inference Protocol(V2 Protocol).
For this, We need to set the **`protocolVersion` field to `v2`**.

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: huggingface-distilbert
    spec:
      predictor:
        model:
          modelFormat:
            name: huggingface
          protocolVersion: v2
          args:
            - --model_name=distilbert
            - --model_id=distilbert/distilbert-base-uncased-finetuned-sst-2-english
          resources:
            limits:
              cpu: "1"
              memory: 4Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 2Gi
              nvidia.com/gpu: "1"
    EOF
    ```

### Check `InferenceService` status.

```bash
kubectl get inferenceservices huggingface-distilbert
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                     URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-distilbert   http://huggingface-distilbert.default.example.com             True           100                              huggingface-distilbert-predictor-default-47q2g   7d23h
    ```

### Perform Model Inference

The first step is to [determine the ingress IP and ports](../../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=distilbert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-distilbert -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

```bash
curl -v http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer \
-H "content-type: application/json" -H "Host: ${SERVICE_HOSTNAME}" \
-d '{"inputs": [{"name": "input-0", "shape": [2], "datatype": "BYTES", "data": ["Hello, my dog is cute", "I am feeling sad"]}]}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "model_name": "distilbert",
      "model_version": null,
      "id": "e4bcfc28-e9f2-4c2a-b61f-c491e7346528",
      "parameters": null,
      "outputs": [
        {
          "name": "output-0",
          "shape": [2],
          "datatype": "INT64",
          "parameters": null,
          "data": [1, 0]
        }
      ]
    }
    ```
