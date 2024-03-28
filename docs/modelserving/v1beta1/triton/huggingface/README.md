# Serve the huggingface model using triton inference runtime

Ensure to have a [storageUri](https://kserve.github.io/website/0.11/modelserving/v1beta1/triton/torchscript/#store-your-trained-model-on-cloud-storage-in-a-model-repository) in triton prescribed format 

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
    EOF
    ```