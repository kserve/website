---
title: Storage Containers
description: Learn how to use custom storage containers in KServe for model serving, including ClusterStorageContainer CRD configuration and custom protocol implementations.
---

# Storage Containers

KServe downloads models using a storage initializer (initContainer). For example, this is [the default storage initializer implementation](https://github.com/kserve/kserve/tree/master/python/storage). KServe introduced **ClusterStorageContainer** CRD in 0.11 which allows users to specify a custom container spec for a list of supported URI formats. 

A _ClusterStorageContainer_ defines the container spec for one or more storage URI formats. Here is an example of a ClusterStorageContainer that corresponds to the default storage initializer. Note that this is included in the [helm chart](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/charts/kserve-resources/templates/clusterstoragecontainer.yaml). 

```yaml
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: default
spec:
  container:
    name: storage-initializer
    image: kserve/storage-initializer:latest
    resources:
      requests:
        memory: 100Mi
        cpu: 100m
      limits:
        memory: 1Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: gs://
    - prefix: s3://
    - prefix: hdfs://
    - prefix: webhdfs://
    - regex: "https://(.+?).blob.core.windows.net/(.+)"
    - regex: "https://(.+?).file.core.windows.net/(.+)"
    - regex: "https?://(.+)/(.+)"
    - regex: "hf://"
```

In a _ClusterStorageContainer_ spec, you can specify credentials for cloud storage, container resource requests and limits, and a list of supported URI formats that this image supports. KServe can match the URI either with `prefix` or `regex`.

:::warning

`spec.container.name` field must be `storage-initializer` otherwise KServe can not recognize the Init Container which can cause duplicate value errors.

:::

:::warning

If a storage URI is supported by two or more _ClusterStorageContainer_ CRs, there is no guarantee which one will be used. **Please make sure that the URI format is only supported by one ClusterStorageContainer CR**.

:::

## Custom Protocol Example

If you would like to use a custom protocol `model-registry://`, for example, you can create a custom image and add a new `ClusterStorageContainer` CR to make it available to KServe.

### Create the `Custom Storage Initializer` Image

The first step is to create a custom container image that will be injected into the KServe deployment, as init container, and that will be in charge to download the model.

The only requirement is that the `Entrypoint` of this container image should take (and properly manage) 2 positional arguments:
1. __Source URI__: identifies the `storageUri` set in the `InferenceService`
2. __Destination Path__: the location where the model should be stored, e.g., `/mnt/models`

:::tip

KServe controller will take care of properly injecting your container image and invoking it with those proper arguments.

:::

A more concrete example can be found in [Kubeflow model registry](https://github.com/kubeflow/model-registry/tree/main/csi#model-registry-custom-storage-initializer), where the storage initializer query an existing `model registry` service in order to retrieve the original location of the model that the user requested to deploy.

###  Create the `ClusterStorageContainer` CR

Once the Custom Storage Initializer image is ready, you just need to create a new `ClusterStorageContainer` CR to make it available in the cluster. You just need to provide 2 essential information:
1. The _container spec definition_, this is strictly dependent on your own custom storage initializer image.
2. The _supported uri formats_ for which your custom storage initializer should be injected, in this case just `model-registry://`.

```yaml
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: abc
spec:
  container:
    name: storage-initializer
    image: kubeflow/model-registry-storage-initializer:latest
    env:
    - name: MODEL_REGISTRY_BASE_URL
      value: "$MODEL_REGISTRY_SERVICE.model-registry.svc.cluster.local:$MODEL_REGISTRY_REST_PORT"
    - name: MODEL_REGISTRY_SCHEME
      value: "http"
    resources:
      requests:
        memory: 100Mi
        cpu: 100m
      limits:
        memory: 1Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: model-registry://
```

### Deploy the Model with `InferenceService`

Create the `InferenceService` with the `model-registry` specific URI format.

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "iris-model"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "model-registry://iris/v1"
```

:::tip

The only assumption here is that the ML model you are going to deploy has been already registered in the Model Registry, more information can be found in the [kubeflow/model-registry](https://github.com/kubeflow/model-registry) repository.

:::

In this specific example the `model-registry://iris/v1` model is referring to a registered model pointing to `gs://kfserving-examples/models/sklearn/1.0/model`. The crucial point here is that this information needs to be provided just during the registration process, whereas during every deployment action you just need to provide the `model-registry` specific URI that identifies that model (in this case `model-registry://${MODEL_NAME}/${MODEL_VERSION}`).

## Providing Credentials
If you need to provide secrets for cloud storage, you can specify them in the `ClusterStorageContainer` spec. For example, if you are using [Huggingface Hub](https://huggingface.co/models), you can provide the necessary credentials as follows:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterStorageContainer
metadata:
  name: hf-hub
spec:
  container:
    name: storage-initializer
    image: 'kserve/storage-initializer:latest'
    env:
      - name: HF_TOKEN
        valueFrom:
          secretKeyRef:
            name: hf-secret
            key: HF_TOKEN
            optional: false
    resources:
      requests:
        memory: 2Gi
        cpu: '1'
      limits:
        memory: 4Gi
        cpu: '1'
  supportedUriFormats:
    - prefix: 'hf://'
```

The respective secret should be created in the same namespace as the `InferenceService` that is using this `ClusterStorageContainer`:

```shell
kubectl create secret generic hf-secret --from-literal=HF_TOKEN=<your_huggingface_token>
```

## Spec Attributes

Spec attributes are in [API Reference](../../../reference/crd-api.mdx#clusterstoragecontainer) doc.
