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
| kserve-sklearnserver      | SKLearn                             |
| kserve-tensorflow-serving | TensorFlow                          |
| kserve-torchserve         | PyTorch                             |
| kserve-tritonserver       | TensorFlow, ONNX, PyTorch, TensorRT |
| kserve-xgbserver          | XGBoost                             |

In addition to these included runtimes, you can extend your KServe installation by adding custom runtimes.
This is demonstrated in the example for the [AMD Inference Server](./v1beta1/amd/README.md).

## Spec Attributes

Available attributes in the `ServingRuntime` spec:

| Attribute                             | Description                                                                                                                                                                                                                                                                                                                                                                                                          |
|---------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `multiModel`                          | Whether this ServingRuntime is ModelMesh-compatible and intended for multi-model usage (as opposed to KServe single-model serving). Defaults to false                                                                                                                                                                                                                                                                |
| `disabled`                            | Disables this runtime                                                                                                                                                                                                                                                                                                                                                                                                |
| `containers`                          | List of containers associated with the runtime                                                                                                                                                                                                                                                                                                                                                                       |
| `containers[ ].image`                 | The container image for the current container                                                                                                                                                                                                                                                                                                                                                                        |
| `containers[ ].command`               | Executable command found in the provided image                                                                                                                                                                                                                                                                                                                                                                       |
| `containers[ ].args`                  | List of command line arguments as strings                                                                                                                                                                                                                                                                                                                                                                            |
| `containers[ ].resources`             | Kubernetes [limits or requests](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits)                                                                                                                                                                                                                                                                                  |
| `containers[ ].env `                  | List of environment variables to pass to the container                                                                                                                                                                                                                                                                                                                                                               |
| `containers[ ].imagePullPolicy`       | The container image pull policy                                                                                                                                                                                                                                                                                                                                                                                      |
| `containers[ ].workingDir`            | The working directory for current container                                                                                                                                                                                                                                                                                                                                                                          |
| `containers[ ].livenessProbe`         | Probe for checking container liveness                                                                                                                                                                                                                                                                                                                                                                                |
| `containers[ ].readinessProbe`        | Probe for checking container readiness                                                                                                                                                                                                                                                                                                                                                                               |
| `supportedModelFormats`               | List of model types supported by the current runtime                                                                                                                                                                                                                                                                                                                                                                 |
| `supportedModelFormats[ ].name`       | Name of the model format                                                                                                                                                                                                                                                                                                                                                                                             |
| `supportedModelFormats[ ].version`    | Version of the model format. Used in validating that a predictor is supported by a runtime. It is recommended to include only the major version here, for example "1" rather than "1.15.4"                                                                                                                                                                                                                           |
| `supportedModelFormats[ ].autoselect` | Set to true to allow the ServingRuntime to be used for automatic model placement if this model format is specified with no explicit runtime. The default value is false.                                                                                                                                                                                                                                             |
| `supportedModelFormats[ ].priority`   | Priority of this serving runtime for auto selection. This is used to select the serving runtime if more than one serving runtime supports the same model format. <br/>The value should be greater than zero. The higher the value, the higher the priority. Priority is not considered if AutoSelect is either false or not specified. Priority can be overridden by specifying the runtime in the InferenceService. |
| `storageHelper.disabled`              | Disables the storage helper                                                                                                                                                                                                                                                                                                                                                                                          |
| `nodeSelector`                        | Influence Kubernetes scheduling to [assign pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)                                                                                                                                                                                                                                                                                  |
| `affinity`                            | Influence Kubernetes scheduling to [assign pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)                                                                                                                                                                                                                                                       |
| `tolerations`                         | Allow pods to be scheduled onto nodes [with matching taints](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration)                                                                                                                                                                                                                                                                           |

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

In each entry of the `supportedModelFormats` list, `autoSelect: true` can optionally be specified to indicate that the given `ServingRuntime` can be
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

#### Priority

If more than one serving runtime supports the same `model format` with same `version` and also supports the same `protocolVersion` then, we can optionally specify `priority` for the serving runtime. 
Based on the `priority` the runtime is automatically selected if no runtime is explicitly specified. Note that, `priority` is valid only if `autoSelect` is `true`. Higher value means higher priority.

For example, let's consider the serving runtimes `mlserver` and `kserve-sklearnserver`. Both the serving runtimes supports the `sklearn` model format with version `1` and both supports
the `protocolVersion` v2. Also note that `autoSelect` is enabled in both the serving runtimes.

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterServingRuntime
metadata:
  name: kserve-sklearnserver
spec:
  protocolVersions:
    - v1
    - v2
  supportedModelFormats:
    - name: sklearn
      version: "1"
      autoSelect: true
      priority: 1
...
```

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterServingRuntime
metadata:
  name: mlserver
spec:
  protocolVersions:
    - v2
  supportedModelFormats:
    - name: sklearn
      version: "1"
      autoSelect: true
      priority: 2
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
      protocolVersion: v2
      modelFormat:
        name: sklearn
      storageUri: s3://bucket/sklearn/mnist.joblib
```
The controller will find the two runtimes `kserve-sklearnserver` and `mlserver` as both has an entry in its `supportedModelFormats` list with `sklearn` and `autoSelect: true`. 
Now the runtime is sorted based on the priority by the controller as there are more than one supported runtime available. Since the `mlserver` has the higher `priority` value, this ClusterServingRuntime
will be used for model deployment.

**Constraints of priority**

- The higher priority value means higher precedence. The value must be greater than 0.
- The priority is valid only if auto select is enabled otherwise the priority is not considered.
- The serving runtime with priority takes precedence over the serving runtime with priority not specified.
- Two model formats with same name and same model version cannot have the same priority.
- If more than one serving runtime supports the model format and none of them specified the priority then, there is no guarantee _which_ runtime will be selected.
- If multiple versions of a modelFormat are supported by a serving runtime, then it should have the same priority.
  For example, Below shown serving runtime supports two versions of sklearn. It should have the same priority.
  ```yaml
    apiVersion: serving.kserve.io/v1alpha1
    kind: ClusterServingRuntime
    metadata:
      name: mlserver
    spec:
        protocolVersions:
          - v2
        supportedModelFormats:
          - name: sklearn
            version: "0"
            autoSelect: true
            priority: 2
          - name: sklearn
            version: "1"
            autoSelect: true
            priority: 2
  ...
  ```

!!! warning
    If multiple runtimes list the same format and/or version as auto-selectable and the priority is not specified, the runtime is selected based on the `creationTimestamp` i.e. the most recently created runtime is selected. So there is no guarantee _which_ runtime will be selected.
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


!!! warning
    The old schema will eventually be removed in favor of the new Model spec, where a user can specify a model format and optionally a corresponding version.
    In previous versions of KServe, supported predictor formats and container images were defined in a [ConfigMap](https://github.com/kserve/kserve/blob/release-0.9/config/configmap/inferenceservice.yaml#L7) in the control plane namespace.
    Existing _InferenceServices_ upgraded from v0.7, v0.8, v0.9 need to be converted to the new model spec as the predictor configurations are phased out in v0.10.
