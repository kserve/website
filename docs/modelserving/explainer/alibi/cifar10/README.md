# CIFAR10 Image Classifier Explanations

We will use a Tensorflow classifier built on [CIFAR10 image dataset](https://www.cs.toronto.edu/~kriz/cifar.html) which is a 10 class image dataset to show the example
of explanation on image data.

## Create the InferenceService with Alibi Explainer
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "cifar10"
spec:
  predictor:
    tensorflow:
      storageUri: "gs://seldon-models/tfserving/cifar10/resnet32"
      resources:
        requests:
          cpu: 0.1
          memory: 5Gi   
        limits:
          memory: 10Gi
  explainer:
    alibi:
      type: AnchorImages
      storageUri: "gs://kfserving-examples/models/tensorflow/cifar/explainer-0.9.1"
      config:
        batch_size: "40"
        stop_on_first: "True"
      resources:
        requests:
          cpu: 0.1
          memory: 5Gi 
        limits:
          memory: 10Gi
```
!!! Note
    The InferenceService resource describes:

    * A pretrained tensorflow model stored on a Google bucket
    * An AnchorImage [Seldon Alibi](https://github.com/SeldonIO/alibi) Explainer, see the [Alibi Docs](https://docs.seldon.io/projects/alibi/en/stable/) for further details.

## Test on notebook
Run this example using the [Jupyter notebook](cifar10_explanations.ipynb).

Once created you will be able to test the predictions:

![prediction](prediction.png)

And then get an explanation for it:

![explanation](explanation.png)

