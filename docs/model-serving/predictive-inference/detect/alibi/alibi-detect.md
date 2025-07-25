---
title: "Alibi Outlier/Drift Detection"
description: "Learn how to deploy InferenceService with Alibi Outlier/Drift Detector"
---

# Deploy InferenceService with Alibi Outlier/Drift Detector

In order to trust and reliably act on model predictions, it is crucial to monitor the distribution of the incoming
requests via various different type of detectors. KServe integrates [Alibi Detect](https://github.com/SeldonIO/alibi-detect) with the following
components:

- Drift detector checks when the distribution of incoming requests is diverging from a reference distribution such as that of the training data. 
- Outlier detector flags single instances which do not follow the training distribution.

The architecture used is shown below and links the payload logging available within KServe with asynchronous processing of those payloads in
KNative to detect outliers.

![Architecture](./architecture.png)

## Prerequisites
- Ensure you have a Kubernetes cluster with [KServe installed](../../../../getting-started/quickstart-guide.md).
- The code sample for this example is available in the [KServe GitHub repository](https://github.com/kserve/kserve/tree/release-0.15/docs/samples/drift-detection/alibi-detect/cifar10).

## CIFAR10 Outlier Detector

A [CIFAR10](https://www.cs.toronto.edu/~kriz/cifar.html) Outlier Detector. Run the [notebook demo](https://github.com/kserve/kserve/blob/master/docs/samples/outlier-detection/alibi-detect/cifar10/cifar10_outlier.ipynb) to test.

:::tip
The notebook requires KNative Eventing >= 0.18.
:::

## CIFAR10 Drift Detector

A [CIFAR10](https://www.cs.toronto.edu/~kriz/cifar.html) Drift Detector. Run the [notebook demo](https://github.com/kserve/kserve/blob/master/docs/samples/drift-detection/alibi-detect/cifar10/cifar10_drift.ipynb) to test.

:::tip
The notebook requires KNative Eventing >= 0.18.
:::
