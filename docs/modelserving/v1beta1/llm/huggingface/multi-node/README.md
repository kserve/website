# Multi-node/Multi-GPU Inference with Hugging Face vLLM Serving Runtime

This guide provides step-by-step instructions on setting up multi-node and multi-GPU inference using Hugging Face's vLLM Serving Runtime. Before proceeding, please ensure you meet the following prerequisites and understand the limitations of this setup.

## Prerequisites

- Multi-node functionality is only supported in **RawDeployment** mode.
- **Auto-scaling is not available** for multi-node setups. 
- A **Persistent Volume Claim (PVC)** is required for multi-node configurations, and it must support the **ReadWriteMany (RWX)** access mode.


### Key Validations

- `TENSOR_PARALLEL_SIZE` and `PIPELINE_PARALLEL_SIZE` cannot be set via environment variables. They must be configured through `workerSpec.tensorParallelSize` and `workerSpec.pipelineParallelSize` respectively.
- In a ServingRuntime designed for multi-node, both `workerSpec.tensorParallelSize` and `workerSpec.pipelineParallelSize` must be set.
- The minimum value for `workerSpec.tensorParallelSize` is **1**, and the minimum value for `workerSpec.pipelineParallelSize` is **2**.
- Currently, four GPU types are allowed: `nvidia.com/gpu` (*default*), `intel.com/gpu`, `amd.com/gpu`, and `habana.ai/gaudi`.
- You can specify the GPU type via InferenceService, but if it differs from what is set in the ServingRuntime, both GPU types will be assigned to the resource. Then it can cause issues.
- The Autoscaler must be configured as `external`.
- The only supported storage protocol for StorageURI is `PVC`.
- By default, the following 4 types of GPU resources are allowed:
  ~~~ 
  "nvidia.com/gpu"
  "amd.com/gpu"
  "intel.com/gpu"
  "habana.ai/gaudi" 
  ~~~
  - If you want to use other GPU types, you can set this in the annotations of ISVC as follows:
    ~~~
    serving.kserve.io/gpu-resource-types: '["gpu-type1", "gpu-type2", "gpu-type3"]'
    ~~~

!!! note 

    You must have **exactly one head pod** in your setup. The replica count for this head pod can be adjusted using the `min_replicas` or `max_replicas` settings in the `InferenceService (ISVC)`. However, creating additional head pods will cause them to be excluded from the Ray cluster, resulting in improper functioning. Ensure this limitation is clearly documented.

    Do not use 2 different GPU types for multi node serving.

### Consideration

Using the multi-node feature likely indicates that you are trying to deploy a very large model. In such cases, you should consider increasing the `initialDelaySeconds` for the `livenessProbe`, `readinessProbe`, and `startupProbe`. The default values may not be suitable for your specific needs. 

You can set StartupProbe in ServingRuntime for your own situation.
~~~
..
      startupProbe:
        failureThreshold: 40
        periodSeconds: 30
        successThreshold: 1
        timeoutSeconds: 30
        initialDelaySeconds: 20
..
~~~

Multi-node setups typically use the `RollingUpdate` deployment strategy, which ensures that the existing service remains operational until the new service becomes Ready. However, this approach requires more than twice the resources to function effectively. Therefore, during the development phase, it is more appropriate to use the `Recreate` strategy.

~~~
spec:
  predictor:
    deploymentStrategy:
      type: Recreate
    model:
      modelFormat:
        name: huggingface
      runtime: kserve-huggingfaceserver-multinode
      storageUri: pvc://XXXX
    workerSpec: {}
~~~
Additionally, modifying the `PipelineParallelSize` (either increasing or decreasing it) can impact the existing service due to the default behavior of the Deployment resource. It is important to note that **PipelineParallelSize is not an autoscaling concept**; rather, it determines how many nodes will be used to run the model. For this reason, it is strongly recommended not to modify this setting in production environments.

If the `Recreate` deployment strategy is not used and you need to change the PipelineParallelSize, the best approach is to delete the existing InferenceService (ISVC) and create a new one with the desired configuration. The same recommendation applies to TensorParallelSize, as modifying this setting dynamically can also affect the service's stability and performance.

!!! note

    To reiterate, **PipelineParallelSize is not a general-purpose autoscaling mechanism**, and changes to it should be handled with caution, especially in production environments.


## WorkerSpec and ServingRuntime

To enable multi-node/multi-GPU inference,  `workerSpec` must be configured in both ServingRuntime and InferenceService. The `huggingface-server-multinode` `ServingRuntime` already includes this field and is built on **vLLM**, which supports multi-node/multi-GPU feature. Note that this setup is **not compatible with Triton**.

!!! note 

    Even if the `ServingRuntime` is properly configured with `workerSpec`, multi-node/multi-GPU will not be enabled unless the InferenceService also configures the workerSpec.

```
...
  predictor:
    model:
      runtime: kserve-huggingfaceserver-multinode
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned  
    workerSpec: {} # Specifying workerSpec indicates that multi-node functionality will be used     
```

## Key Configurations

When using the `huggingface-server-multinode` `ServingRuntime`, there are two critical configurations you need to understand:

1. **`workerSpec.tensorParallelSize`**:    
   This setting controls how many GPUs are used per node. The GPU type count in both the head and worker node deployment resources will be updated automatically.


2. **`workerSpec.pipelineParallelSize`**
  This setting determines how many nodes are involved in the deployment. This variable represents the total number of nodes, including both the head and worker nodes.


### Example InferenceService

Here’s an example of an `InferenceService` configuration for a Hugging Face model:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
    serving.kserve.io/autoscalerClass: external

spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned
    workerSpec: {
      pipelineParallelSize: 2
      tensorParallelSize: 1
    }  
```

## Serve the Hugging Face vLLM Model Using 2 Nodes

Follow these steps to serve the Hugging Face vLLM model using a multi-node setup.

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

curl -o download-model-to-pvc.yaml https://kserve.github.io/website/latest/modelserving/v1beta1/vLLM/huggingface/multi-node/download-model-to-pvc.yaml
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
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
    serving.kserve.io/autoscalerClass: external
  name: huggingface-llama3
spec:
  predictor:
    model:
      runtime: kserve-huggingfaceserver-multinode
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned  
    workerSpec: {}
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
    huggingface-llama3   http://huggingface-llama3.default.example.com                                          5m
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
