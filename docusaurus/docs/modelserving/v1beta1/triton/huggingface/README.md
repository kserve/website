# Serve the Huggingface model using Triton Inference Runtime
Nvidia Triton Inference Server is a robust serving runtime thanks to its optmized performance, scalability, and flexibility. Combined with the expansive library of Hugging Face, which offers state-of-the-art natural language processing capabilities, it opens up immense possibilities for deploying production-ready Huggface Face transformer based models.

By harnessing the power of these tools, here we'll show you how KServe can help further simplify the Triton Inference containers deployment and make efficient use of GPUs by automatically wiring up the open inference protocol between pre/post processing(tokenization) and model inference on triton inference container.

## Export the Model to Triton format 
Export the Hugging Face models to supported model formats Torchscript or ONNX in [triton model repository layout](https://kserve.github.io/website/master/modelserving/v1beta1/triton/torchscript/#store-your-trained-model-on-cloud-storage-in-a-model-repository).
For more details, please refer to [triton model configuration](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html).


## Deploy InferenceService with Triton and Hugging Face Runtime
Create an InferenceService with triton predictor by specifying the `storageUri` with the Hugging Face model stored on cloud storage according to triton model repository layout. The KServe transformer container is created using the KServe Hugging Face runtime for the tokenization step to encode the text tokens and decode the token ids from the output the triton inference container. The Hugging Face tokenizing container and triton inference container can communicate with either REST or gRPC protocol by specifiying the `--predictor_protocol=v2` or `--predictor_protocol=grpc-v2`. 

=== "Yaml"

    ```yaml
    kubectl apply -f - <<EOF
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
          image: kserve/huggingfaceserver:v{{  kserve_release_version }}
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

## Perform Model Inference
The first step is to [determine the ingress IP and ports](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

```bash
MODEL_NAME=bert
SERVICE_HOSTNAME=$(kubectl get inferenceservice huggingface-triton -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Perform inference using v1 REST Protocol

```bash
curl -H "content-type:application/json" -H "Host: ${SERVICE_HOSTNAME}" -v http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/${MODEL_NAME}:predict -d '{"instances": ["The capital of france is [MASK]."] }'
```

!!! success "Expected Output"

  ```{ .bash .no-copy }
     {"predictions":["paris"]}
  ```
