# InferenceService Node Scheduling
## Setup
The `InferenceService` spec supports node selector, node affinity and tolerations. To enable these features we must enable the knative flags (see [Install Knative Serving Note](https://kserve.github.io/website/admin/serverless/serverless/#1-install-knative-serving)).

### Option 1: Pre-Kubeflow Install Feature Flags Setup
If we install KServe as part of Kubeflow manifest and would like to enable the feature flags before installing Kubeflow, we can do so by editing the file `manifests/common/knative/knative-serving/base/upstream/serving-core.yaml`   
This is often a common approach that allows a reproducible configuration as the feature flags will be enabled everytime we install Kubeflow.  


1. Enable kubernetes.podspec-affinity  
```yaml
kubernetes.podspec-affinity: "enabled"
```
2. Enable kubernetes.podspec-nodeselector  
```yaml
kubernetes.podspec-nodeselector: "enabled"
```
3. Enable kubernetes.podspec-tolerations  
```yaml
kubernetes.podspec-tolerations: "enabled"
```

With all features enabled we should have a `data` portion that looks like this : 
```yaml
data:
  kubernetes.podspec-affinity: "enabled"
  kubernetes.podspec-nodeselector: "enabled"
  kubernetes.podspec-tolerations: "enabled"
```

### Option 2: Post-Kubeflow Install Feature Flags Setup  
If we don't want to enable the flags before installing kubeflow, we can enable the flags after installing kubeflow by editing the configuration using : 
```bash
kubectl edit configmap config-features -n knative-serving
```
Simply add the flags in the `data` section like it was done for the pre-Kubeflow install setup.

## Usage
To use node selector/node affinity and tolerations, we can use it directly in the `InferenceService` custom resource definition.

### Node Selector
Here is an example using node selector where `myLabelName` can be replaced by the name of the label that the specific node we want has, same thing for `myLabelValue`.
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  predictor:
    nodeSelector:
      myLabelName: "myLabelValue"
    triton:
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 21.08-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
```
Note that this also works on other pod spec like `transformer`, here is the equivalent for a `transformer`, we simply add it under the `transformer` spec : 
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  transformer:
    nodeSelector:
      myLabelName: "myLabelValue"
    containers:
    - image: kfserving/image-transformer-v2:latest
      name: kfserving-container
      command:
      - "python"
      - "-m"
      - "image_transformer_v2"
      args:
      - --model_name
      - cifar10
      - --protocol
      - v2
  predictor:
    triton:
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 21.08-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
```
#### GPU Node Label Selector Example
In this example, our `predictor` will only run on the node with the label `k8s.amazonaws.com/accelerator` with the value `"nvidia-tesla-t4"`. 
You can learn more about recommended label names for GPU nodes when using kubernetes autoscaler by checking your cloud provider's documentation.
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  predictor:
    nodeSelector:
      k8s.amazonaws.com/accelerator: "nvidia-tesla-t4"
    triton:
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 21.08-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
```

### Tolerations
This examples shows how to add a toleration to our `predictor`, this will make it possible (not mandatory) for the `predictor` pod to be scheduled on any node with the matching taint. You can replace `yourTaintKeyHere` with the taint key from your node taint.
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  predictor:
    tolerations:
      - key: "yourTaintKeyHere"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
    triton:
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 21.08-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
```  
This also works for other pod spec like `transformer`.
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  transformer:
    tolerations:
      - key: "yourTaintKeyHere"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
    containers:
    - image: kfserving/image-transformer-v2:latest
      name: kfserving-container
      command:
      - "python"
      - "-m"
      - "image_transformer_v2"
      args:
      - --model_name
      - cifar10
      - --protocol
      - v2
  predictor:
    triton:
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 21.08-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
```  
#### **Important Note On Tolerations for GPU Nodes**
It's important to use the conventional taint `nvidia.com/gpu` for NVIDIA GPU nodes because if we use a custom taint, the **nvidia-device-plugin** will not be able to be scheduled on the GPU node. Therefore our node would not be able to expose its GPUs to kubernetes making it a plain CPU only node. This would prevent us from scheduling any GPU workload on it.  
  
The nvidia-device-plugin automatically tolerates the `nvidia.com/gpu` taint, see [this commit](https://github.com/NVIDIA/k8s-device-plugin/commit/2d569648dac03252088b67f6333cb9df7c4059a7). Therefore by using this conventional taint, we ensure that the nvidia-device-plugin will work and allow our node to expose its GPUs.

Using this taint on a GPU node also has the advantage that every pods scheduled on this GPU node will automatically have the toleration for this taint **if it requests GPU resources.**  
For instance, if we deploy an `InferenceService` with a `predictor` that requests 1 GPU, then kubernetes will detect a request of 1 GPU and add to the `predictor` pod the `nvidia.com/gpu` toleration automatically. If on the other hand, our `predictor` (or other pod spec like `transformer`) does not request GPUs and has a node affinity/node selector for the GPU node then since the pod did not request GPUs, the toleration to `nvidia.com/gpu` will not be added to the pod. This is to prevent CPU only workload from preventing the GPU node to scale down for instance. Note that this feature of automatically adding toleration to pods requesting GPU resources is enabled via the **ExtendedResourceToleration admission controller** which was added in kubernetes 1.19.  
You can learn more about dedicated node pools and ExtendedResourceToleration admission controller [here](https://notes.rohitagarwal.org/2017/12/17/dedicated-node-pools-and-ExtendedResourceToleration-admission-controller.html).

### Node Selector + Tolerations
As described in the [Overview](./overview.md#putting-it-all-together) we can combine node selector/node affinity and tolerations to force a pod to be scheduled on a node and to force a node to only accept pods with a matching toleration.
Here is an exemple where we want our `transformer` to run on a node with the label `myLabel1=true`, we also want our `transformer` to tolerate nodes with the taint `myTaint1`. We want our predictor to run on a node with the label `myLabel2=true`, we also want our `predictor` to tolerate nodes with the taint `myTaint2`.
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torch-transformer
spec:
  transformer:
    nodeSelector:
      myLabel1: "true"
    tolerations:
      - key: "myTaint1"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
    containers:
    - image: kfserving/image-transformer-v2:latest
      name: kfserving-container
      command:
      - "python"
      - "-m"
      - "image_transformer_v2"
      args:
      - --model_name
      - cifar10
      - --protocol
      - v2
  predictor:
    nodeSelector:
      myLabel2: "true"
    tolerations:
      - key: "myTaint2"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
    triton:
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 20.10-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      args:
      - --log-verbose=1
```
#### GPU Example
This applies to other pod spec like `transformer` but if we want our `predictor` to run on a GPU node and if the `predictor` requests GPUs, then we should make sure our GPU node has the taint `nvidia.com/gpu`. As described [earlier](./inferenceservicenodescheduling.md#important-note-on-tolerations-for-gpu-nodes), this allows us to leverage kubernetes ExtendedResourceToleration and simply omit the toleration for our GPU pod given that we have a kubernetes version that supports it.  

The result is the same as before but we removed the toleration for the pod requesting GPUs (here the `predictor`) :  
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: torch-transformer
spec:
  transformer:
    nodeSelector:
      myLabel1: "true"
    tolerations:
      - key: "myTaint1"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
    containers:
    - image: kfserving/image-transformer-v2:latest
      name: kfserving-container
      command:
      - "python"
      - "-m"
      - "image_transformer_v2"
      args:
      - --model_name
      - cifar10
      - --protocol
      - v2
  predictor:
    nodeSelector:
      myLabel2: "true"
    triton:
      storageUri: gs://kfserving-examples/models/torchscript
      runtimeVersion: 20.10-py3
      env:
      - name: OMP_NUM_THREADS
        value: "1"
      args:
      - --log-verbose=1
      resources:
        limits:
          nvidia.com/gpu: 1
        requests:
          nvidia.com/gpu: 1
```
