---
title: Overview
description: An overview of KServe node scheduling capabilities
---

import TaintsSvg from './images/taints.svg';
import TolerationsSvg from './images/tolerations.svg';
import NodeAffinitySvg from './images/nodeaffinity.svg';
import NodeSelectorSvg from './images/nodeaffinityandtaintstolerations.svg';

# Node Scheduling Overview

This document provides an overview of how node scheduling allows you to schedule a `predictor` or a `transformer` on a specific node from your cluster.

## Use Cases

To help illustrate when we would use node scheduling, here are some use cases that usually require the use of node scheduling:

- Run a `transformer` on a specific node with hardware that is better for pre/post-processing (e.g., CPU-only node if your processing is CPU-bounded).

- Run a `predictor` on a specific node with hardware that is better for inference (e.g., GPU node for heavy CNN models).

- Allow a cluster autoscaler to scale down a **node** back to zero after the inference. For instance, if you need to run the `predictor` on a costly GPU or CPU node but would also like to scale down the **node** to zero after the inference, then this is possible. To enable such scale down, you need to use a combination of [pod scale down to zero](../predictive-inference/autoscaling/kpa-autoscaler#enable-scale-to-zero) for the `predictor` pod and node scheduling to ensure only your `predictor` is scheduled on this node. As a result, once the inference is done, the `predictor` pod will scale down to zero and since you used node scheduling, only authorized pods were scheduled on this node. Therefore, if only your `predictor` pod was allowed and now it is scaled down to zero, it means there are no more pods running on this node and this allows the autoscaler to scale down the **node** to zero as well.

## Prerequisite Knowledge

### Node Selector/Node Affinity

In order to achieve node scheduling, KServe leverages Kubernetes ability to constrain a pod to a node (see [Assigning Pods to Node](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)). Using node selector or node affinity, you can ensure a pod (e.g., `predictor` pod) can only run on a particular node. Node selector provides a very simple way to constrain pods to nodes with particular labels. Node affinity is conceptually similar to node selector but node affinity has more advanced features that are described in the Kubernetes documentation. Feel free to use whichever one satisfies your needs.

You can think of node selector/node affinity as a way to ensure a pod is only scheduled on a node with a given label for instance.

Here is a diagram that represents a simple relationship when using node selector or node affinity:

<NodeAffinitySvg />

We can see that pod 1 has a node selector/node affinity, it only wants to run on node 1. Pod 2 does not have any node selector/node affinity, it accepts to run on any node.

You can learn more about node selector and node affinity from [this quick video](https://www.youtube.com/watch?v=6ZHjqpn9dck).

### Taints & Tolerations

Having node selector/node affinity is great to ensure a pod runs only on a node, but what if we don't want other pods to also run on this node? We could add pod anti-affinity to every other pod, but this quickly becomes hard to maintain. This is where Kubernetes taints & tolerations comes into play (see [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)). This feature is leveraged by KServe and it allows you to completely isolate a node so that only pods that are "authorized" or more precisely, that have the required **toleration** can run on it.

#### Taints

You can use a taint on a node to specify that only pods with a toleration to this taint can run on this node.

This can be illustrated as follows:

<TaintsSvg />

Here we can see that node 1 has a taint while node 2 and node 3 have no taint.
Since no pod has a toleration that matches node 1's taint, no pod can be scheduled on node 1.

#### Tolerations

Now if we add a toleration to pod 1 that matches the taint from node 1, then this makes it possible (not mandatory) for pod 1 to be scheduled on node 1. It does not prevent pod 1 from being scheduled on other nodes but because of the toleration to node 1's taint, it makes it possible for pod 1 to also be scheduled on node 1. Note that pod 2 is still restricted to being scheduled on node 2 and 3 since it does not have the toleration that is required to be scheduled on node 1.

<TolerationsSvg />

You can learn more about taints and tolerations from [this quick video](https://www.youtube.com/watch?v=-L1Mewq0nfA).

### Putting It All Together

You can combine node selector/node affinity with taints and tolerations to force a pod to only run on a node (via node selector/node affinity) and you can force this node to only accept pods with a specific toleration (via taints & tolerations).

The result is as follows:

<NodeSelectorSvg />

Pod 1 can only be scheduled on node 1, pod 1 has a toleration to node 1's taint and node 1 only accepts pods that have the required toleration to its taint. Pod 2 accepts to be scheduled on any node. Here node 1 only accepts pods with the required toleration therefore pod 2 cannot be scheduled on node 1. Since pod 2 does not have any node affinity, it accepts to be scheduled on any of the remaining nodes, so node 2 or node 3.
