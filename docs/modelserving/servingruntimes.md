# Serving Runtimes

KServe makes use of two CRDs for defining model serving environments:

**ServingRuntimes** and **ClusterServingRuntimes**

The only difference between the two is that one is namespace-scoped and the other is cluster-scoped.

A _ServingRuntime_ defines the templates for Pods that can serve one or more particular model formats.
Each ServingRuntime defines key information such as the container image of the runtime and a list of the model formats that the runtime supports.
Other configuration settings for the runtime can be conveyed through environment variables in the container specification.

These CRDs allow for improved flexibility and extensibility, enabling users to quickly define or customize reusable runtimes without having to modify
any controller code or any resources in the controller namespace.

The following is an example of a ServingRuntime:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: example-runtime
spec:
  supportedModelFormats:
    - name: example-format
      version: "1"
      autoSelect: true
  containers:
    - name: kserve-container
      image: examplemodelserver:latest
      args:
        - --model_dir=/mnt/models
        - --http_port=8080
```

Several out-of-the-box _ClusterServingRuntimes_ are provided with KServe so that users can quickly deploy common model formats without having to define the runtimes themselves.

| Name                      | Supported Model Formats             |
|---------------------------|-------------------------------------|
| kserve-lgbserver          | LightGBM                            |
| kserve-mlserver           | SKLearn, XGBoost, LightGBM, MLflow  |
| kserve-paddleserver       | Paddle                              |
| kserve-pmmlserver         | PMML                                |
| kserver-sklearnserver     | SKLearn                             |
| kserve-tensorflow-serving | TensorFlow                          |
| kserve-torchserve         | PyTorch                             |
| kserve-tritonserver       | TensorFlow, ONNX, PyTorch, TensorRT |
| kserve-xgbserver          | XGBoost                             |

## Spec Attributes

Available attributes in the `ServingRuntime` spec:

| Attribute                          | Description                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `multiModel`                       | Whether this ServingRuntime is ModelMesh-compatible and intended for multi-model usage (as opposed to KServe single-model serving). Defaults to false                                      |
| `disabled`                         | Disables this runtime                                                                                                                                                                      |
| `containers`                       | List of containers associated with the runtime                                                                                                                                             |
| `containers[ ].image`              | The container image for the current container                                                                                                                                              |
| `containers[ ].command`            | Executable command found in the provided image                                                                                                                                             |
| `containers[ ].args`               | List of command line arguments as strings                                                                                                                                                  |
| `containers[ ].resources`          | Kubernetes [limits or requests](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits)                                                        |
| `containers[ ].env `               | List of environment variables to pass to the container                                                                                                                                     |
| `containers[ ].imagePullPolicy`    | The container image pull policy                                                                                                                                                            |
| `containers[ ].workingDir`         | The working directory for current container                                                                                                                                                |
| `containers[ ].livenessProbe`      | Probe for checking container liveness                                                                                                                                                      |
| `containers[ ].readinessProbe`     | Probe for checking container readiness                                                                                                                                                     |
| `supportedModelFormats`            | List of model types supported by the current runtime                                                                                                                                       |
| `supportedModelFormats[ ].name`    | Name of the model format                                                                                                                                                                   |
| `supportedModelFormats[ ].version` | Version of the model format. Used in validating that a predictor is supported by a runtime. It is recommended to include only the major version here, for example "1" rather than "1.15.4" |
| `storageHelper.disabled`           | Disables the storage helper                                                                                                                                                                |
| `nodeSelector`                     | Influence Kubernetes scheduling to [assign pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)                                                        |
| `affinity`                         | Influence Kubernetes scheduling to [assign pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)                             |
| `tolerations`                      | Allow pods to be scheduled onto nodes [with matching taints](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration)                                                 |

ModelMesh leverages additional fields not listed here. More information [here](https://github.com/kserve/modelmesh-serving/blob/main/docs/runtimes/custom_runtimes.md#spec-attributes).

>**Note:** `ServingRuntimes` support the use of template variables of the form `{{.Variable}}` inside the container spec. These should map to fields inside an
InferenceService's [metadata object](https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1#ObjectMeta). The primary use of this is for passing in
InferenceService-specific information, such as a name, to the runtime environment. Several of the out-of-box ClusterServingRuntimes make use of this by having `--model_name={{.Name}}` inside the
runtime container args to ensure that when a user deploys an InferenceService, the name is passed to the server.

## Using ServingRuntimes

ServingRuntimes can be be used both explicitly and implicitly.

### Explicit: Specify a runtime

When users define predictors in their InferenceServices, they can explicitly specify the name of a _ClusterServingRuntime_ or _ServingRuntime_. For example:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: example-sklearn-isvc
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: s3://bucket/sklearn/mnist.joblib
      runtime: kserve-mlserver
```

Here, the runtime specified is `kserve-mlserver`, so the KServe controller will first search the namespace for a ServingRuntime with that name. If
none exist, the controller will then search the list of ClusterServingRuntimes. If one is found, the controller will first
verify that the `modelFormat` provided in the predictor is in the list of `supportedModelFormats`. If it is, then the container and pod information provided
by the runtime will be used for model deployment.

### Implicit: Automatic selection

In each entry of the `supportedModelFormats` list, `autoSelect: true` can optionally be specified to indicate that that the given `ServingRuntime` can be
considered for automatic selection for predictors with the corresponding model format if no runtime is explicitly specified.
For example, the `kserve-sklearnserver` ClusterServingRuntime supports SKLearn version 1 and has `autoSelect` enabled:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterServingRuntime
metadata:
  name: kserve-sklearnserver
spec:
  supportedModelFormats:
    - name: sklearn
      version: "1"
      autoSelect: true
...
```

When the following InferenceService is deployed with no runtime specified, the controller will look for a runtime that supports `sklearn`:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: example-sklearn-isvc
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: s3://bucket/sklearn/mnist.joblib
```

Since `kserve-sklearnserver` has an entry in its `supportedModelFormats` list with `sklearn` and `autoSelect: true`, this ClusterServingRuntime
will be used for model deployment.

If a version is also specified:

```yaml
...
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
        version: "0"
...
```
Then, then the version of the `supportedModelFormat` must also match. In this example, `kserve-sklearnserver` would not be eligible for selection since
it only lists support for `sklearn` version `1`.


!!! warning
    If multiple runtimes list the same format and/or version as auto-selectable, then there is no guarantee _which_ runtime will be selected.
    So users and cluster-administrators should enable `autoSelect` with care.

### Previous schema

Currently, if a user uses the old schema for deploying predictors where you specify a framework/format as a key, then a KServe webhook will automatically map it to one of the out-of-the-box _ClusterServingRuntimes_. This is for backwards compatibility. For example:

=== "Previous Schema"
    ```yaml
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: example-sklearn-isvc
    spec:
      predictor:
        sklearn:
          storageUri: s3://bucket/sklearn/mnist.joblib
    ```
=== "Equivalent New Schema"
    ```yaml
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: example-sklearn-isvc
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: s3://bucket/sklearn/mnist.joblib
          runtime: kserve-sklearnserver
    ```

The previous schema would mutate into the new schema where the `kserve-sklearnserver` ClusterServingRuntime is explicitly specified.

> **Note**: The old schema will eventually be removed in favor of the new Model spec, where a user can specify a model format and optionally a corresponding version.

In previous versions of KServe, supported predictor formats and container images were defined in a
[ConfigMap](https://github.com/kserve/kserve/blob/release-0.7/config/configmap/inferenceservice.yaml#L7) in the control plane namespace.
Existing _InferenceServices_ upgraded from v0.7 will continue to make use of the configuration listed in this config map, but this will eventually be phased out.

