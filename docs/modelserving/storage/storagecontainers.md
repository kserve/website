# Storage Containers

KServe downloads models using a storage initializer (initContainer). For example, this is [the default storage initializer implementation](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/python/kserve/kserve/storage/storage.py). KServe introduced **ClusterStorageContainer** CRD in 0.11 which allows users to specify a custom container spec for a list of supported URI formats. 

A _ClusterStorageContainer_ defines the container spec for one or more storage URI formats. Here is an example of a ClusterStorageContainer that corresponds to the default storage initializer. Note that this is incluced in the [helm chart](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/charts/kserve-resources/templates/clusterstoragecontainer.yaml). 

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
```

In a _ClusterStorageContainer_ spec, you can specify container resource requests and limits, and a list of supported URI formats that this image supports. KServe can match the URI either with `prefix` or `regex` .

`spec.container.name` field must be `storage-initializer` otherwise KServe can not recognize the initContainer which can cause duplicate value errors.

!!! warning

    If a storage URI is supported by two or more _ClusterStorageContainer_ CRs, there is no guarantee which one will be used. **Please make sure that the URI format is only supported by one ClusterStorageContainer CR**.

## Custom Protocol Example

If you would like to use a custom protocol `model-registry://`, for example, you can create a custom image and add a new `ClusterStorageContainer` CR to make it available to KServe.

### Create the `Custom Storage Initializer` Image

The first step is to create a custom container image that will be injected into the KServe deployment, as init container, and that will be in charge to download the model.

The only requirement is that the `Entrypoint` of this container image should take (and properly manage) 2 positional arguments:
1. __Source URI__: identifies the `storageUri` set in the `InferenceService`
2. __Destination Path__: the location where the model should be stored, e.g., `/mnt/models`

!!! note
    KServe controller will take care of properly injecting your container image and invoking it with those proper arguments.

A more concrete example can be found [here](https://github.com/kubeflow/model-registry/tree/main/csi#model-registry-custom-storage-initializer), where the storage initializer query an existing `model registry` service in order to retrieve the original location of the model that the user requested to deploy.

###  Create the `ClusterStorageContainer` CR

Once the Custom Storage Initializer image is ready, you just need to create a new `ClusterStorageContainer` CR to make it available in the cluster. You just need to provide 2 essential information:
1. The _container spec definition_, this is strictly dependent on your own custom storage initializer image.
2. The _supported uri formats_ for which your custom storage initializer should be injected, in this case just `model-registry://`.

=== "kubectl"
```bash
kubectl apply -f - <<EOF
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

EOF
```

### Deploy the Model with `InferenceService`

Create the `InferenceService` with the `model-registry` specific URI format.

=== "kubectl"
```bash
kubectl apply -n kserve-test -f - <<EOF
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
EOF
```

!!! note
    The only assumption here is that the ML model you are going to deploy has been already registered in the Model Registry, more information can be found in the [kubeflow/model-registry](https://github.com/kubeflow/model-registry) repository.

In this specific example the `model-registry://iris/v1` model is referring to a registered model pointing to `gs://kfserving-examples/models/sklearn/1.0/model`. The crucial point here is that this information needs to be provided just during the registration process, whereas during every deployment action you just need to provide the `model-registry` specific URI that identifies that model (in this case `model-registry://${MODEL_NAME}/${MODEL_VERSION}`).

## Spec Attributes

Spec attributes are in [API Reference](../../reference//api.md#serving.kserve.io/v1alpha1.ClusterStorageContainer) doc.