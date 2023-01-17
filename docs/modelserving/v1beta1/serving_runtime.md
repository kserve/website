# Model Serving Runtimes

KServe provides a simple Kubernetes CRD to enable deploying single or multiple trained models onto model serving runtimes such as [TFServing](https://www.tensorflow.org/tfx/guide/serving),
[TorchServe](https://pytorch.org/serve/server.html), [Triton Inference Server](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs).
In addition [ModelServer](https://github.com/kserve/kserve/tree/master/python/kserve/kserve) is the Python model serving runtime implemented in KServe itself with prediction v1 protocol,
[MLServer](https://github.com/SeldonIO/MLServer) implements the [prediction v2 protocol](https://github.com/kserve/kserve/tree/master/docs/predict-api/v2) with both REST and gRPC.
These model serving runtimes are able to provide out-of-the-box model serving, but you could also choose to build your own model server for more complex use case.
KServe provides basic API primitives to allow you easily build custom model serving runtime, you can use other tools like [BentoML](https://docs.bentoml.org/en/latest) to build your custom model serving image.

After models are deployed with InferenceService, you get all the following serverless features provided by KServe.

- Scale to and from Zero
- Request based Autoscaling on CPU/GPU
- Revision Management
- Optimized Container
- Batching
- Request/Response logging
- Traffic management
- Security with AuthN/AuthZ
- Distributed Tracing
- Out-of-the-box metrics
- Ingress/Egress control


---

The table below identifies each of the model serving runtimes supported by KServe. The HTTP and gRPC columns indicate the prediction protocol version that the serving runtime supports. The KServe prediction protocol is noted as either "v1" or "v2". Some serving runtimes also support their own prediction protocol, these are noted with an `*`. The default serving runtime version column defines the source and version of the serving runtime - MLServer, KServe or its own. These versions can also be found in the [runtime kustomization YAML](https://github.com/kserve/kserve/blob/master/config/runtimes/kustomization.yaml). All KServe native model serving runtimes use the current KServe release version (v0.10). The supported framework version column lists the **major** version of the model that is supported. These can also be found in the respective [runtime YAML](https://github.com/kserve/kserve/tree/master/config/runtimes) under the `supportedModelFormats` field. For model frameworks using the KServe serving runtime, the specific default version can be found in [kserve/python](https://github.com/kserve/kserve/tree/master/python). In a given serving runtime directory the setup.py file contains the exact model framework version used. For example, in [kserve/python/lgbserver](https://github.com/kserve/kserve/tree/master/python/lgbserver) the [setup.py](https://github.com/kserve/kserve/blob/master/python/lgbserver/setup.py) file sets the model framework version to 3.3.2, `lightgbm == 3.3.2`.

| Model Serving Runtime  | Exported model | HTTP | gRPC  | Default Serving Runtime Version | Supported Framework (Major) Version(s) | Examples                             |
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |--------------------------------------|
| [Custom ModelServer](https://github.com/kserve/kserve/tree/master/python/kserve/kserve) | -- | v1, v2 | v2 | -- | -- | [Custom Model](custom/custom_model)  |
| [LightGBM MLServer](https://mlserver.readthedocs.io/en/latest/runtimes/lightgbm.html) | [Saved LightGBM Model](https://lightgbm.readthedocs.io/en/latest/pythonapi/lightgbm.Booster.html#lightgbm.Booster.save_model) | v2 | v2 | v1.0.0 (MLServer) | 3 | [LightGBM Iris V2](./lightgbm)  |
| [LightGBM ModelServer](https://github.com/kserve/kserve/tree/master/python/lgbserver) | [Saved LightGBM Model](https://lightgbm.readthedocs.io/en/latest/pythonapi/lightgbm.Booster.html#lightgbm.Booster.save_model) | v1 | -- | v0.10.0 (KServe) | 3 | [LightGBM Iris](./lightgbm)          |
| [MLFlow ModelServer](https://docs.seldon.io/projects/seldon-core/en/latest/servers/mlflow.html) | [Saved MLFlow Model](https://www.mlflow.org/docs/latest/python_api/mlflow.sklearn.html#mlflow.sklearn.save_model) | v2 | v2 | v1.0.0 (MLServer) | 1 | [MLFLow wine-classifier](./mlflow)          |
| [PMML ModelServer](https://github.com/kserve/kserve/tree/master/python/pmmlserver) | [PMML](http://dmg.org/pmml/v4-4-1/GeneralStructure.html) | v1 | -- | v0.10.0 (KServe) | 3, 4 ([PMML4.4.1](https://github.com/autodeployai/pypmml)) | [SKLearn PMML](./pmml)               |
| [SKLearn MLServer](https://github.com/SeldonIO/MLServer) | [Pickled Model](https://scikit-learn.org/stable/modules/model_persistence.html) | v2 | v2| v1.0.0 (MLServer) | 1 | [SKLearn Iris V2](./sklearn/v2)      |
| [SKLearn ModelServer](https://github.com/kserve/kserve/tree/master/python/sklearnserver) | [Pickled Model](https://scikit-learn.org/stable/modules/model_persistence.html) | v1 | -- | v0.10.0 (KServe) | 1 | [SKLearn Iris](./sklearn/v2)         |
| [TFServing](https://www.tensorflow.org/tfx/guide/serving) | [TensorFlow SavedModel](https://www.tensorflow.org/guide/saved_model) | v1 | *tensorflow | 2.6.2 ([TFServing Versions](https://github.com/tensorflow/serving/releases)) | 2 | [TensorFlow flower](./tensorflow)    |
| [TorchServe](https://pytorch.org/serve/server.html) | [Eager Model/TorchScript](https://pytorch.org/docs/master/generated/torch.save.html) |  v1, v2, *torchserve  | *torchserve | 0.7.0 (TorchServe) | 1 | [TorchServe mnist](./torchserve)     |
| [Triton Inference Server](https://github.com/triton-inference-server/server) | [TensorFlow,TorchScript,ONNX](https://github.com/triton-inference-server/server/blob/r21.09/docs/model_repository.md)| v2 | v2 | 21.09-py3 (Triton) | 8 (TensoRT), 1, 2 (TensorFlow), 1 (PyTorch), 2 (Triton) [Compatibility Matrix](https://docs.nvidia.com/deeplearning/frameworks/support-matrix/index.html)| [Torchscript cifar](triton/torchscript) |
| [XGBoost MLServer](https://github.com/SeldonIO/MLServer) | [Saved Model](https://xgboost.readthedocs.io/en/latest/tutorials/saving_model.html) | v2 | v2 | v1.0.0 (MLServer) | 1 | [XGBoost Iris V2](./xgboost)         |
| [XGBoost ModelServer](https://github.com/kserve/kserve/tree/master/python/xgbserver) | [Saved Model](https://xgboost.readthedocs.io/en/latest/tutorials/saving_model.html) | v1 |  -- | v0.10.0 (KServe) | 1 | [XGBoost Iris](./xgboost)            |



*tensorflow - Tensorflow implements its own prediction protocol in addition to KServe's. See: [Tensorflow Serving Prediction API](https://github.com/tensorflow/serving/blob/master/tensorflow_serving/apis/prediction_service.proto) documentation

*torchserve - PyTorch implements its own predicition protocol in addition to KServe's. See: [Torchserve gRPC API](https://pytorch.org/serve/grpc_api.html#) documentation

!!! Note
    The model serving runtime version can be overwritten with the `runtimeVersion` field on InferenceService yaml and we highly recommend
    setting this field for production services.

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "torchscript-cifar"
    spec:
      predictor:
        triton:
          storageUri: "gs://kfserving-examples/models/torchscript"
          runtimeVersion: 21.08-py3
    ```
