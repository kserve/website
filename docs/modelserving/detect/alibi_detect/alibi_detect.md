# Deploy InferenceService with Alibi Outlier/Drift Detector
In order to trust and reliably act on model predictions, it is crucial to monitor the distribution of the incoming
requests via various different type of detectors. KServe integrates [Alibi Detect](https://github.com/SeldonIO/alibi-detect) with the following
components:

- Drift detector checks when the distribution of incoming requests is diverging from a reference distribution such as that of the training data. 
- Outlier detector flags single instances which do not follow the training distribution.

The architecture used is shown below and links the payload logging available within KServe with asynchronous processing of those payloads in
KNative to detect outliers.

![Architetcure](architecture.png)


## CIFAR10 Outlier Detector

A [CIFAR10](https://www.cs.toronto.edu/~kriz/cifar.html) Outlier Detector. Run the [notebook demo](cifar10_outlier.ipynb) to test.

The notebook requires KNative Eventing >= 0.18.

## CIFAR10 Drift Detector

A [CIFAR10](https://www.cs.toronto.edu/~kriz/cifar.html) Drift Detector. Run the [notebook demo](cifar10_drift.ipynb) to test.

The notebook requires KNative Eventing >= 0.18.




