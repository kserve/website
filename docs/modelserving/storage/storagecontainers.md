# Storage Containers

KServe downloads models using a storage initializer (initContainer). For example, this is [the default storage initializer implementation](https://github.com/kserve/kserve/blob/79f2a48d0c9c72b034127170e38d6b29b927f03a/python/kserve/kserve/storage/storage.py). KServe introduced **ClusterStorageContainer** CRD in 0.11 which allows users to specify a custom container spec for some Uri formats. 

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

In a _ClusterStorageContainer_ spec, you can specify container resource requests and limits, and a list of Uri formats that this image supports. KServe can match the Uri with `prefix` and `regex` .

If a storage URI is supported by two or more _ClusterStorageContainer_ CRs, there is no guarantee which one will be used. **Please make sure that the URI format is only supported by one ClusterStorageContainer CR**.

If you would like to use a custom protocol `abc://`, for example, you can create a custom image and add a new ClusterStorageContainer CR like this:

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

## Spec Attributes

Spec attributes are in [API Reference](/website/reference/api/#serving.kserve.io/v1alpha1.ClusterStorageContainer) doc.