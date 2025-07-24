---
title: InferenceService Node Scheduling
description: Learn how to schedule InferenceService components on specific nodes in your Kubernetes cluster
---

# InferenceService Node Scheduling

KServe allows you to schedule `InferenceService` components on specific nodes in your Kubernetes cluster using standard Kubernetes scheduling features like node selectors, node affinity, and tolerations. These features are available in both deployment modes:

- **Serverless Deployment**: The default mode powered by Knative, which provides scale-to-zero capabilities but requires specific Knative configurations to enable node scheduling features.
  
- **Raw Deployment**: A mode that creates standard Kubernetes resources (Deployments, Services) without Knative, which supports node scheduling by default but doesn't provide scale-to-zero capabilities.

## Setup

The `InferenceService` spec supports node selector, node affinity, and tolerations in both raw deployment and serverless modes. However, the setup requirements differ based on your deployment mode.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="serverless" label="Serverless Deployment" default>

For serverless deployment mode, you must enable the Knative flags to support node scheduling features (see [Install Knative Serving Note](../../admin-guide/serverless/serverless.md#1-install-knative-serving)).

### Option 1: Pre-Knative Install Feature Flags Setup

If you install Knative using [Knative operator](https://knative.dev/docs/install/operator/knative-with-operators/#install-the-knative-operator) and would like to enable the feature flags during installation, you can do so by [configuring `KnativeServing` CRD](https://knative.dev/docs/install/operator/configuring-with-operator/#examples).

This is often a common approach that allows a reproducible configuration as the feature flags will be enabled every time you install Knative.

1. Enable kubernetes.podspec-affinity
```yaml
spec:
  config:
    features:
      kubernetes.podspec-affinity: "enabled"
```

2. Enable kubernetes.podspec-nodeselector
```yaml
spec:
  config:
    features:
      kubernetes.podspec-nodeselector: "enabled"
```

3. Enable kubernetes.podspec-tolerations
```yaml
spec:
  config:
    features:
      kubernetes.podspec-tolerations: "enabled"
```

With all features enabled, you should have a `config.features` portion that looks like this:
```yaml
spec:
  config:
    features:
      kubernetes.podspec-affinity: "enabled"
      kubernetes.podspec-nodeselector: "enabled"
      kubernetes.podspec-tolerations: "enabled"
```

### Option 2: Post-Knative Install Feature Flags Setup

If you don't want to enable the flags before installing Knative, you can enable the flags after installing Knative by editing the configuration using:
```bash
kubectl edit configmap config-features -n knative-serving
```

Simply add the flags in the `data` section.

</TabItem>
<TabItem value="raw" label="Raw Deployment">

For raw deployment mode, no special configuration is required to enable node scheduling features. Node selector, node affinity, and tolerations are supported out-of-the-box in standard Kubernetes deployments.

To use raw deployment mode with your `InferenceService`, simply add the following annotation:

```yaml
metadata:
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
```

</TabItem>
</Tabs>

## Usage

To use node selector/node affinity and tolerations, you can use them directly in the `InferenceService` custom resource definition. The following examples apply to both serverless and raw deployment modes, as the configuration in the `InferenceService` is the same for both.

### Node Selector

Here is an example using node selector where `myLabelName` can be replaced by the name of the label that the specific node you want has, same thing for `myLabelValue`.
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

Note that this also works on other pod spec like `transformer`. Here is the equivalent for a `transformer`, we simply add it under the `transformer` spec:
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

<Tabs>
<TabItem value="serverless" label="Serverless Deployment" default>

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

</TabItem>
<TabItem value="raw" label="Raw Deployment">

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
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

</TabItem>
</Tabs>

### Tolerations

This example shows how to add a toleration to our `predictor`. This will make it possible (not mandatory) for the `predictor` pod to be scheduled on any node with the matching taint. You can replace `yourTaintKeyHere` with the taint key from your node taint.
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

#### Important Note On Tolerations for GPU Nodes

It's important to use the conventional taint `nvidia.com/gpu` for NVIDIA GPU nodes because if you use a custom taint, the **nvidia-device-plugin** will not be able to be scheduled on the GPU node. Therefore your node would not be able to expose its GPUs to kubernetes making it a plain CPU only node. This would prevent you from scheduling any GPU workload on it.

The nvidia-device-plugin automatically tolerates the `nvidia.com/gpu` taint, see [this commit](https://github.com/NVIDIA/k8s-device-plugin/commit/2d569648dac03252088b67f6333cb9df7c4059a7). Therefore by using this conventional taint, you ensure that the nvidia-device-plugin will work and allow your node to expose its GPUs.

Using this taint on a GPU node also has the advantage that every pod scheduled on this GPU node will automatically have the toleration for this taint **if it requests GPU resources.**

For instance, if you deploy an `InferenceService` with a `predictor` that requests 1 GPU, then kubernetes will detect a request of 1 GPU and add to the `predictor` pod the `nvidia.com/gpu` toleration automatically. If on the other hand, your `predictor` (or other pod spec like `transformer`) does not request GPUs and has a node affinity/node selector for the GPU node, then since the pod did not request GPUs, the toleration to `nvidia.com/gpu` will not be added to the pod. This is to prevent CPU only workload from preventing the GPU node to scale down for instance. Note that this feature of automatically adding toleration to pods requesting GPU resources is enabled via the **ExtendedResourceToleration admission controller** which was added in kubernetes 1.19.

You can learn more about dedicated node pools and ExtendedResourceToleration admission controller [here](https://notes.rohitagarwal.org/2017/12/17/dedicated-node-pools-and-ExtendedResourceToleration-admission-controller.html).

### Node Selector + Tolerations

As described in the [Overview](./overview.md#putting-it-all-together), you can combine node selector/node affinity and tolerations to force a pod to be scheduled on a node and to force a node to only accept pods with a matching toleration.

Here is an example where we want our `transformer` to run on a node with the label `myLabel1=true`, we also want our `transformer` to tolerate nodes with the taint `myTaint1`. We want our predictor to run on a node with the label `myLabel2=true`, we also want our `predictor` to tolerate nodes with the taint `myTaint2`.
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

This applies to other pod spec like `transformer` but if you want your `predictor` to run on a GPU node and if the `predictor` requests GPUs, then you should make sure your GPU node has the taint `nvidia.com/gpu`. As described [earlier](#important-note-on-tolerations-for-gpu-nodes), this allows you to leverage kubernetes ExtendedResourceToleration and simply omit the toleration for your GPU pod given that you have a kubernetes version that supports it.

The result is the same as before but we removed the toleration for the pod requesting GPUs (here the `predictor`):
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
