# Storage Containers

KServe downloads models in an initContainer using [the default storage initializer image](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/python/storage-initializer.Dockerfile). KServe introduced **ClusterStorageContainer** CRD in 0.11 which allows users to use a custom container spec for a specific protocol. 

A _ClusterStorageContainer_ defines the container spec for one or more storage URI formats. Here is an example of a ClusterStorageContainer that specifies URI formats that the default storage initializer image supports. Note that this is incluced in the [helm chart](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/charts/kserve-resources/templates/clusterstoragecontainer.yaml). 

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

If you would like to use a custom protocol `abc://`, for example, feel free to create a custom image and add a new ClusterStorageContainer CR like this:

```yaml
apiVersion: "serving.kserve.io/v1alpha1"
kind: ClusterStorageContainer
metadata:
  name: abc
spec:
  container:
    name: storage-initializer
    image: abc/custom-storage-initializer:latest
    resources:
      requests:
        memory: 100Mi
        cpu: 100m
      limits:
        memory: 1Gi
        cpu: "1"
  supportedUriFormats:
    - prefix: abc://
```

If a storage URI is supported by two or more ClusterStorageContainer CRs, there is no guarantee which spec will be picked up. **Please make sure that the URI format is only supported by one ClusterStorageContainer CR**.

## Spec Attributes

Click [here](/website/reference/api/#serving.kserve.io/v1alpha1.ClusterStorageContainer) for details.