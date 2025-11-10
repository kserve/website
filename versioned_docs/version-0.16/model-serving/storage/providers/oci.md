---
title: OCI
description: Deploy models to KServe InferenceService from OCI images, leveraging Modelcars for efficient model serving.
---

# Serving Models with OCI Images

KServe's traditional approach for model initialization involves fetching models from sources like [S3 buckets](s3/s3.md) or [URIs](uri.md). This process is adequate for small models but becomes a bottleneck for larger ones like used for large language models, significantly delaying startup times in auto-scaling scenarios.

"Modelcars" is a KServe feature designed to address these challenges. It streamlines model fetching using OCI images, offering several advantages:

- **Reduced Startup Times:** By avoiding repetitive downloads of large models, startup delays are significantly minimized.
- **Lower Disk Space Usage:** The feature decreases the need for duplicated local storage, conserving disk space.
- **Enhanced Performance:** Modelcars allows for advanced techniques like pre-fetching images and lazy-loading, improving efficiency.
- **Compatibility and Integration:** It seamlessly integrates with existing KServe infrastructure, ensuring ease of adoption.

Modelcars represents a step forward in efficient model serving, particularly beneficial for handling large models and dynamic serving environments.

## Enabling Modelcars

Modelcars feature in KServe is not enabled by default. To take advantage of this new model serving method, it needs to be activated in the KServe configuration. Follow the steps below to enable Modelcars in your environment.

Modelcars can be enabled by modifying the `storageInitializer` configuration in the `inferenceservice-config` ConfigMap. This can be done manually using `kubectl edit` or by executing the script provided below, with the current namespace set to the namespace where the `kserve-controller-manager` is installed (depends on the way how KServe is installed.)

```bash
# Script to enable Modelcars
# Fetch the current storageInitializer configuration
config=$(kubectl get configmap inferenceservice-config -n kserve -o jsonpath='{.data.storageInitializer}')
# Enable modelcars and set the UID for the containers to run (required for minikube)
newValue=$(echo $config | jq -c '. + {"enableModelcar": true, "uidModelcar": 1010}')

# Create a temporary directory for the patch file
tmpdir=$(mktemp -d)
cat <<EOT > $tmpdir/patch.txt
[{
  "op": "replace",
  "path": "/data/storageInitializer",
  "value": '$newValue'
}]
EOT

# Apply the patch to the ConfigMap
kubectl patch configmap -n kserve inferenceservice-config --type=json --patch-file=$tmpdir/patch.txt

# Restart the KServe controller to apply changes
kubectl delete pod -n kserve -l control-plane=kserve-controller-manager
```

## Prepare an OCI Image with Model Data

To utilize Modelcars for serving models, you need to prepare an OCI (Open Container Initiative) image containing your model data. This process involves creating a Dockerfile and building an OCI image that houses your model in a specific directory. Below are the steps and an example to guide you through this process.

1. **Create a Dockerfile:** 
   Start by creating a Dockerfile that uses a base image containing the necessary commands like `ln` (for creating symbolic links) and `sleep` (for keeping the container running). The Dockerfile should also include steps to create a directory `/model` for your model data and copy the data into this directory.
   Here's an example Dockerfile where the `data/` directory contains your model data. This data will later be mounted in `/mnt/models` by the runtime:
   ```dockerfile
   FROM busybox
   RUN mkdir /models && chmod 775 /models
   COPY data/ /models/
   ```

2. **Build and Push the Image to a Registry**: Once your Dockerfile is ready, use either docker or podman to build and push the image to a container registry like Docker Hub or quay.io
   ```bash
   docker build -t myuser/mymodel:1.0 .
   docker push myuser/mymodel:1.0
   ```

By completing these steps, you'll have an OCI image ready with your model data, which can then be used with the Modelcars feature in KServe for efficient model serving.

## Using Modelcars

With Modelcars enabled and your OCI image containing the model data prepared, integrating this setup into your `InferenceService` is straightforward. The key step involves specifying the `storageURI` with the `oci://` schema in your `InferenceService` configuration to point to your OCI image.

Here's an example of how an `InferenceService` configuration would look when using the Modelcars feature:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-inference-service
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: oci://myuser/mymodel:1.0
```

In order to fully leverage the local caching capabilities of OCI images in the Modelcars setup, it is crucial to use a specific tag for your model image, rather than relying on the default `latest` tag. For instance, in the provided example, the tag `1.0` is utilized. This approach ensures that the modelcar image is pulled with a `IfNotPresent` policy, allowing for efficient use of local cache. On the other hand, using the `latest` tag, or omitting a tag altogether, defaults to a `Always` pull policy. This means the image would be re-downloaded every time a Pod restarts or scales up, negating the benefits of local caching and potentially leading to increased startup times.

## Example

Let's see how modecars work by deploying the [getting started example](../../../getting-started/predictive-first-isvc.md) by using an OCI image and check how it is different to the startup with a storage-initalizer init-container.

Assuming you have setup a namespace `kserve-test` that is KServe enabled, create an `InferenceService` that uses an `oci://` storage URL:

```yaml    
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris-oci"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "oci://rhuss/kserving-example-sklearn:1.0"
EOF
```

After the `InferenceService` has been deployed successfully, you can follow the [steps of the getting started example](../../../getting-started/predictive-first-isvc.md) to verify the installation.

Finally, let's have a brief look under the covers for how this feature works.
Let's first check the runtime pod:

```shell
kubectl get pods
```

:::tip[Sample Output]

```
NAME                                                     READY   STATUS    RESTARTS      AGE
sklearn-iris-oci-predictor-00001-deployment-58fc6564d7   3/3     Running   1 (39m ago)   40m
```

:::

As you can see, the Pod has now one additional container. This container is running the modelcar image and runs a `ln -sf /proc/$$/root/models /mnt/` command to create a symbolic link on a shared empty volume that is mounted on `/mnt` in the modelcar container and the serving runtime container. The magic here is the symbolic link over proc filesystem, which is shared among all containers. This is possible on Kubernetes for the container's of a Pod if the field `.spec.shareProcessNamespace` is set to `true`, which is the case for all storageUri that leverages the `oci://` schema.

Let's jump into the runtime container and examine the mounted `/mnt` filesystem:

```shell
# InferenceService Pod
pod=$(kubectl get pods -l serving.kserve.io/inferenceservice=sklearn-iris-oci -o name)
# Verify that shareProcessNamespace is enabled
kubectl get $pod -o jsonpath="{.spec.shareProcessNamespace}"

# Jump into pod and check the model location
kubectl exec -it $pod -c kserve-container -- bash
```

:::tip[Sample In-Container Session]

```
sklearn-iris-oci-predictor:/$ cd /mnt
sklearn-iris-oci-predictor:/mnt$ ls -l
total 0
lrwxrwxrwx 1 1010 root 20 Jan 27 10:35 models -> /proc/38/root/models

sklearn-iris-oci-predictor:/mnt$ cd /mnt/models 
sklearn-iris-oci-predictor:/mnt/models$ ls -l
total 8
-rw-r--r-- 1 root root 5408 Jan 26 15:58 model.joblib
```

:::

As you can see, the runtime can directly access the data coming from the modelcar image, without prior copying it over in another volume.

## Configuration

Fine-tuning the behavior of Modelcars in KServe is possible through global configuration settings for inference services. These settings are located in the `inferenceservice-config` ConfigMap, which resides in the `kserve` namespace or the namespace where the KServe controller operates. This ConfigMap includes various subconfigurations, with the Modelcars configuration located under the `storageInitializer` entry.

To view the current configuration, use the following command:

```bash
kubectl get cm -n kserve inferenceservice-config --jsonpath "{.data.storageInitializer}"
```

:::tip[Sample Output]

```json
{
    "image" : "kserve/storage-initializer:latest",
    "memoryRequest": "100Mi",
    "memoryLimit": "1Gi",
    "cpuRequest": "100m",
    "cpuLimit": "1",
    "caBundleConfigMapName": "",
    "caBundleVolumeMountPath": "/etc/ssl/custom-certs",
    "enableModelcar": true,
    "cpuModelcar": "10m",
    "memoryModelcar": "15Mi",
    "uidModelcar": 1010
}
```

:::

The output is a JSON string representing the configuration. For Modelcars, several keys are available for customization:

| Key              | Description                                                                                                                                    | Example |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `enableModelcar` | Enables direct access to an OCI container image using a source URL with an "oci://" schema.                                                    | `true`  |
| `cpuModelcar`    | CPU request and limit for the modelcar container.                                                                                              | `10m`   |
| `memoryModelcar` | Memory request and limit for the modelcar container.                                                                                           | `15Mi`  |
| `uidModelcar`    | UID under which the modelcar process and the main container run. Set to `0` for root if needed. If not set, the UID of the containers is used. | `1042`  |

## References

* [Modelcar Design document](https://docs.google.com/document/d/1Bs4fnP8rhPMaoPoLSYVvuRq-z9vkGPQ0rKbmfH4I7js/edit#heading=h.xw1gqgyqs5b)
* [Original GitHub issue](https://github.com/kserve/kserve/issues/3043) (discusses also some alternative solutions)
* [12-minute demo](https://www.youtube.com/watch?v=KzWH8v6CcR0)
* [Code walkthrough](https://www.youtube.com/watch?v=axegGpQ6nHs) showing the implementation of Modelcars in KServe (for background information)
