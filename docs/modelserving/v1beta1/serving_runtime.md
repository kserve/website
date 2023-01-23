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

| Model Serving Runtime  | Exported model| Prediction Protocol | HTTP | gRPC | Versions | Examples |
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| [Triton Inference Server](https://github.com/triton-inference-server/server) | [TensorFlow,TorchScript,ONNX](https://github.com/triton-inference-server/server/blob/r21.09/docs/model_repository.md)| v2 | :heavy_check_mark: | :heavy_check_mark: | [Compatibility Matrix](https://docs.nvidia.com/deeplearning/frameworks/support-matrix/index.html)| [Torchscript cifar](triton/torchscript) |
| [TFServing](https://www.tensorflow.org/tfx/guide/serving) | [TensorFlow SavedModel](https://www.tensorflow.org/guide/saved_model) | v1 | :heavy_check_mark: | :heavy_check_mark: | [TFServing Versions](https://github.com/tensorflow/serving/releases) | [TensorFlow flower](./tensorflow)  |
| [TorchServe](https://pytorch.org/serve/server.html) | [Eager Model/TorchScript](https://pytorch.org/docs/master/generated/torch.save.html) | v1/v2 REST | :heavy_check_mark: | :heavy_check_mark: | 0.6.0 | [TorchServe mnist](./torchserve)  |
| [SKLearn MLServer](https://github.com/SeldonIO/MLServer) | [Pickled Model](https://scikit-learn.org/stable/modules/model_persistence.html) | v2 | :heavy_check_mark: | :heavy_check_mark: | 1.0.1 | [SKLearn Iris V2](./sklearn/v2)  |
| [XGBoost MLServer](https://github.com/SeldonIO/MLServer) | [Saved Model](https://xgboost.readthedocs.io/en/latest/tutorials/saving_model.html) | v2 | :heavy_check_mark: | :heavy_check_mark: | 1.5.0 | [XGBoost Iris V2](./xgboost)  |
| [SKLearn ModelServer](https://github.com/kserve/kserve/tree/master/python/sklearnserver) | [Pickled Model](https://scikit-learn.org/stable/modules/model_persistence.html) | v1 | :heavy_check_mark: | -- | 1.0.1 | [SKLearn Iris](./sklearn/v1)  |
| [XGBoost ModelServer](https://github.com/kserve/kserve/tree/master/python/xgbserver) | [Saved Model](https://xgboost.readthedocs.io/en/latest/tutorials/saving_model.html) | v1 | :heavy_check_mark: | -- | 1.5.0 | [XGBoost Iris](./xgboost/v1)  |
| [PMML ModelServer](https://github.com/kserve/kserve/tree/master/python/pmmlserver) | [PMML](http://dmg.org/pmml/v4-4-1/GeneralStructure.html) | v1 | :heavy_check_mark: | -- | [PMML4.4.1](https://github.com/autodeployai/pypmml) | [SKLearn PMML](./pmml)  |
| [LightGBM ModelServer](https://github.com/kserve/kserve/tree/master/python/lightgbm) | [Saved LightGBM Model](https://lightgbm.readthedocs.io/en/latest/pythonapi/lightgbm.Booster.html#lightgbm.Booster.save_model) | v1 | :heavy_check_mark: | -- | 3.2.0 | [LightGBM Iris](./lightgbm)  |
| [Custom ModelServer](https://github.com/kserve/kserve/tree/master/python/kserve/kserve) | -- | v1 | :heavy_check_mark: | -- | -- | [Custom Model](custom/custom_model) |

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
