# Multi-node/Multi-GPU Inference with Hugging Face LLM Serving Runtime

This guide provides step-by-step instructions on setting up multi-node and multi-GPU inference using Hugging Face's LLM Serving Runtime. Before proceeding, please ensure you meet the following prerequisites and understand the limitations of this setup.

## Prerequisites

- Multi-node functionality is only supported in **RawDeployment** mode.
- **Auto-scaling is not available** for multi-node setups. The auto-scaler will be automatically set to external.
- A **Persistent Volume Claim (PVC)** is required for multi-node configurations, and it must support the **ReadWriteMany (RWM)** access mode.


!!! note 

    You must have **exactly one head pod** in your setup. The replica count for this head pod can be adjusted using the `min_replicas` or `max_replicas` settings in the `InferenceService (ISVC)`. However, creating additional head pods will cause them to be excluded from the Ray cluster, resulting in improper functioning. Ensure this limitation is clearly documented.

## WorkerSpec and ServingRuntime

To enable multi-node/multi-GPU inference, a new API field, `workerSpec`, must be configured. The `huggingface-server-multinode` `ServingRuntime` includes this field and is built on **vLLM**, which supports multi-node/multi-GPU setups. Note that this setup is **not compatible with Triton**.

## Key Configurations

When using the `huggingface-server-multinode` `ServingRuntime`, there are two critical configurations you need to understand:

1. **`tensor-parallel-size`**:     
   This setting controls how many GPUs are used per node. You can configure it via the environment variable `"TENSOR_PARALLEL_SIZE"`. Once set, the GPU count (`nvidia.com/gpu`) in both the head and worker node deployment resources will be updated automatically.


2. **`pipeline-parallel-size`**:  
  This setting determines how many nodes are involved in the deployment. There are two ways to configure it:
    - Set the `WorkerSpec.Size` field.
    - Use the environment variable `"PIPELINE_PARALLEL_SIZE"`. Unlike `WorkerSpec.Size`, this variable represents the total number of nodes, including both the head and worker nodes.

    Therefore, the `"PIPELINE_PARALLEL_SIZE"` should always be **1 greater** than `WorkerSpec.Size`. If both the `WorkerSpec.Size` and `"PIPELINE_PARALLEL_SIZE"` are specified, the **environment variable takes precedence**. The default value for `"PIPELINE_PARALLEL_SIZE"` is 2.


### Example Configuration

Here’s an example of an `InferenceService` configuration for a Hugging Face model:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned
      env:
        - name: TENSOR_PARALLEL_SIZE
          value: "1"
        - name: PIPELINE_PARALLEL_SIZE
          value: "2"
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
        requests:
          cpu: "6"
          memory: 24Gi
    workerSpec:
      size: 1   # This will be ignored because PIPELINE_PARALLEL_SIZE is set in environments
```

## Serve the Hugging Face LLM Model Using 2 Nodes

Follow these steps to serve the Hugging Face LLM model using a multi-node setup.

### 1. Create a Persistent Volume Claim (PVC)

First, create a PVC for model storage. Be sure to update `%fileStorageClassName%` with your actual storage class.

```yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: llama-3-8b-pvc
spec:
  accessModes:
    - ReadWriteMany
  volumeMode: Filesystem
  resources:
    requests:
      storage: 50Gi
  storageClassName: %fileStorageClassName%
EOF
```

### 2. Download the Model to the PVC
  
To download the model, export your Hugging Face token (`HF_TEST_TOKEN`) as an environment variable. Replace `%token%` with your actual token.


```yaml
export HF_TEST_TOKEN=%token%
export MODEL=meta-llama/Meta-Llama-3-8B-Instruct

curl -o download-model-to-pvc.yaml https://kserve.github.io/website/latest/modelserving/v1beta1/llm/huggingface/multi-node/download-model-to-pvc.yaml
envsubst < download-model-to-pvc.yaml | kubectl create -f -
```


### 3. Create a ServingRuntime

Apply the ServingRuntime configuration. Replace %TBD% with the path to your ServingRuntime YAML.

```bash
kubectl apply -f https://github.com/kserve/kserve/blob/master/config/runtimes/kserve-huggingfaceserver-multinode.yaml
```

### 4. Deploy the model 

Finally, deploy the model using the following InferenceService configuration:

```yaml
kubectl apply -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
spec:
  predictor:
    model:
      runtime: kserve-huggingfaceserver-multinode
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned  
EOF
```      

## Check `InferenceService` status.

To verify the status of your `InferenceService`, run the following command:

```bash
kubectl get inferenceservices huggingface-llama3
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                 URL                                                   READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                          AGE
    huggingface-llama3   http://huggingface-llama3.default.example.com                                          12m
    ```



## Check `GPU resource` status.

To check the GPU resource status, follow these steps:

 1. Retrieve the pod names for the head and worker nodes:
    ```bash
    # Get pod name
    podName=$(kubectl get pod -l app=isvc.huggingface-llama3-predictor --no-headers|cut -d' ' -f1)
    workerPodName=$(kubectl get pod -l app=isvc.huggingface-llama3-predictor-worker --no-headers|cut -d' ' -f1)
    ```

  2. Check the GPU memory size for both the head and worker pods:
      ```bash
      # Check GPU memory size
      kubectl exec $podName -- nvidia-smi
      kubectl exec $workerPodName -- nvidia-smi
      ```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    +-----------------------------------------------------------------------------------------+
    | NVIDIA-SMI 550.90.07              Driver Version: 550.90.07      CUDA Version: 12.4     |
    |-----------------------------------------+------------------------+----------------------+
    | GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
    | Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
    |                                         |                        |               MIG M. |
    |=========================================+========================+======================|
    |   0  NVIDIA A10G                    On  |   00000000:00:1E.0 Off |                    0 |
    |  0%   33C    P0             71W /  300W |   19031MiB /  23028MiB |      0%      Default |
    |                                         |                        |                  N/A |
    +-----------------------------------------+------------------------+----------------------+
             ...                                                               
    +-----------------------------------------------------------------------------------------+
    | NVIDIA-SMI 550.90.07              Driver Version: 550.90.07      CUDA Version: 12.4     |
    |-----------------------------------------+------------------------+----------------------+
    | GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
    | Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
    |                                         |                        |               MIG M. |
    |=========================================+========================+======================|
    |   0  NVIDIA A10G                    On  |   00000000:00:1E.0 Off |                    0 |
    |  0%   30C    P0             69W /  300W |   18959MiB /  23028MiB |      0%      Default |
    |                                         |                        |                  N/A |
    +-----------------------------------------+------------------------+----------------------+             
    ```

## Perform Model Inference

You can perform model inference by forwarding the port for testing purposes. Use the following command:

```bash
kubectl port-forward pod/$podName 8080:8080
```

The KServe Hugging Face vLLM runtime supports the following OpenAI endpoints for inference:

 - `/v1/completions`
 - `/v1/chat/completions` 

#### Sample OpenAI Completions request:

To make a request to the OpenAI completions endpoint, use the following `curl` command:

```bash
curl http://localhost:8080/openai/v1/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "huggingface-llama3",
        "prompt": "At what temperature does Nitrogen boil?",
        "max_tokens": 100,
        "temperature": 0
    }'
```
!!! success "Expected Output"
    ```{ .json .no-copy }
     {
      "id": "cmpl-3bf2b04bac4a43548bc657c999e4fe5f",
      "choices": [
        {
          "finish_reason": "length",
          "index": 0,
          "logprobs": null,
          "text": " Nitrogen is a colorless, odorless, tasteless, and non-toxic gas. It is a member of the group 15 elements in the periodic table. Nitrogen is a very common element in the universe and is found in many compounds, including ammonia, nitric acid, and nitrate salts.\nThe boiling point of nitrogen is -195.8°C (-320.4°F) at standard atmospheric pressure. This means that at this temperature, nitrogen will change from a liquid to a"
        }
      ],
      "created": 1728348255,
      "model": "huggingface-llama3",
      "system_fingerprint": null,
      "object": "text_completion",
      "usage": {
        "completion_tokens": 100,
        "prompt_tokens": 9,
        "total_tokens": 109
      }
    }    
    ```

#### Sample OpenAI Chat request:

To make a request to the OpenAI chat completions endpoint, use the following `curl` command:

```bash
curl http://localhost:8080/openai/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "huggingface-llama3",
        "messages":[{"role":"system","content":"At what temperature does Nitrogen boil?"}],
        "max_tokens": 100,
        "stream": false
       }'
```

!!! success "Expected Output"
    ```{ .json .no-copy }
     {
      "id": "cmpl-1201662139294b81b02aca115d7981b7",
      "choices": [
        {
          "finish_reason": "stop",
          "index": 0,
          "message": {
            "content": "The boiling point of nitrogen is -195.8°C (-320.44°F) at a pressure of 1 atm.",
            "tool_calls": null,
            "role": "assistant",
            "function_call": null
          },
          "logprobs": null
        }
      ],
      "created": 1728348754,
      "model": "huggingface-llama3",
      "system_fingerprint": null,
      "object": "chat.completion",
      "usage": {
        "completion_tokens": 26,
        "prompt_tokens": 19,
        "total_tokens": 45
      }
    }    
    ```
