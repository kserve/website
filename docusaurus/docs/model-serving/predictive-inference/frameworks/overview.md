---
title: Overview
description: Overview of model serving frameworks supported by KServe
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Model Serving Frameworks Overview

KServe provides a simple Kubernetes CRD to enable deploying single or multiple trained models onto various model serving runtimes. This page provides an overview of the supported frameworks and their capabilities.

## Introduction

KServe supports multiple model serving runtimes including:

- **[TensorFlow Serving](https://www.tensorflow.org/tfx/guide/serving)** - Google's serving system for TensorFlow models.
- **[Triton Inference Server](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs)** - NVIDIA's inference server supporting multiple frameworks
- **[Hugging Face Server](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver)** - Specialized for transformer models with Open Inference and OpenAI Protocol support with [vLLM](https://github.com/vllm-project/vllm).
- **[LightGBM ModelServer](https://github.com/kserve/kserve/tree/master/python/lightgbmserver)** - Specialized for LightGBM models.
- **[XGBoost ModelServer](https://github.com/kserve/kserve/tree/master/python/xgboostserver)** - Specialized for XGBoost models.
- **[PMML ModelServer](https://github.com/kserve/kserve/tree/master/python/pmmlserver)** - Specialized for PMML models.
- **[SKLearn ModelServer](https://github.com/kserve/kserve/tree/master/python/sklearnserver)** - Specialized for SKLearn models.
- **[PaddlePaddle ModelServer](https://github.com/kserve/kserve/tree/master/python/paddlepaddle)** - Specialized for PaddlePaddle models.

These runtimes provide out-of-the-box model serving capabilities. For more complex use cases, you can build [custom model servers](../../predictive-inference/frameworks/custom-predictor/custom-predictor.md) using KServe's API primitives or tools like [BentoML](https://docs.bentoml.org/en/latest).

## Key Features

When you deploy models with InferenceService, you automatically get these serverless features:

### Scalability
- **Scale to and from Zero** - Automatic scaling based on traffic
- **Request-based Autoscaling** - Support for both CPU and GPU scaling
- **Optimized Containers** - Performance-optimized runtime containers

### Management
- **Revision Management** - Track and manage different model versions
- **Traffic Management** - Advanced routing and canary deployments
- **Batching** - Automatic request batching for improved throughput

### Observability
- **Request/Response Logging** - Comprehensive logging capabilities
- **Distributed Tracing** - End-to-end request tracing
- **Out-of-the-box Metrics** - Built-in monitoring and metrics

### Security
- **Authentication/Authorization** - Secure access controls
- **Ingress/Egress Control** - Network traffic management

## Supported Frameworks

The following tables show model serving runtimes supported by KServe, split into predictive and generative inference capabilities:

:::tip Protocol Support
- **HTTP/gRPC columns** indicate the prediction protocol version (v1 or v2)
- **Asterisk (*)** indicates custom prediction protocols in addition to KServe's standard protocols
- **Default Runtime Version** shows the source and version of the serving runtime
:::

<Tabs
  groupId="inference-type"
  defaultValue="generative"
>
<TabItem value="generative" label="Generative Inference" default>
| Framework                                                                                             | Exported Model Format                                                                                                                                                                          | HTTP           | gRPC | Default Runtime Version         | Supported Framework (Major) Version(s)                                       | Examples                                                                                         |
|-------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------|------|---------------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| [HuggingFace ModelServer](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver)      | [Saved Model](https://huggingface.co/docs/transformers/v4.39.2/en/main_classes/model#transformers.PreTrainedModel.save_pretrained), [Huggingface Hub Model_Id](https://huggingface.co/models) | OpenAI | --   | v{{kserveDocsVersion}} (KServe) | 4 ([Transformers](https://pypi.org/project/transformers/4.43.4/)) | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/huggingface) |
| [HuggingFace VLLM ModelServer](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver) | [Saved Model](https://huggingface.co/docs/transformers/v4.43.4/en/main_classes/model#transformers.PreTrainedModel.save_pretrained), [Huggingface Hub Model_Id](https://huggingface.co/models) | OpenAI     | --   | v{{kserveDocsVersion}} (KServe) | 0 ([VLLM](https://docs.vllm.ai/en/latest/))            | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/huggingface) |
</TabItem>

<TabItem value="predictive" label="Predictive Inference">

| Framework                                                                                        | Exported Model Format                                                                                                                                                                          | HTTP   | gRPC        | Default Runtime Version                                                      | Supported Framework (Major) Version(s)                                                                                                                               | Examples                                                                                         |
|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|-------------|------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| [Custom ModelServer](https://github.com/kserve/kserve/tree/master/python/kserve/kserve)          | Custom implementation                                                                                                                                                                          | v1, v2 | v2          | User-defined                                                                 | User-defined                                                                                                                                               | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/custom)      |
| [LightGBM ModelServer](https://github.com/kserve/kserve/tree/master/python/lgbserver)            | [Saved LightGBM Model (.bst)](https://lightgbm.readthedocs.io/en/latest/pythonapi/lightgbm.Booster.html#lightgbm.Booster.save_model)                                                                  | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 4                                                                                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/lightgbm)    |
| [MLFlow ModelServer](https://mlserver.readthedocs.io/en/latest/runtimes/mlflow.html)             | [Saved MLFlow Model](https://www.mlflow.org/docs/latest/python_api/mlflow.sklearn.html#mlflow.sklearn.save_model)                                                                              | v2     | v2          | v1.5.0 (MLServer)                                                            | 2                                                                                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/mlflow)      |
| [PMML ModelServer](https://github.com/kserve/kserve/tree/master/python/pmmlserver)               | [PMML (.pmml)](http://dmg.org/pmml/v4-4-1/GeneralStructure.html)                                                                                                                                       | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 3, 4 ([PMML4.4.1](https://github.com/autodeployai/pypmml)), 3 (Spark MLlib)                                                                                                 | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/pmml)        |
| [SKLearn ModelServer](https://github.com/kserve/kserve/tree/master/python/sklearnserver)         | [Pickled Model (.pkl, .pickle)](https://scikit-learn.org/stable/modules/model_persistence.html), [Joblib (.joblib)](https://joblib.readthedocs.io/en/latest/generated/joblib.dump.html)                                                                                                                | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 1.5                                                                                                                                                        | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/sklearn)     |
| [TensorFlow Serving](https://www.tensorflow.org/tfx/guide/serving)                               | [TensorFlow SavedModel](https://www.tensorflow.org/guide/saved_model)                                                                                                                          | v1     | *tensorflow | 2.6.2 ([TFServing Versions](https://github.com/tensorflow/serving/releases)) | 2                                                                                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/tensorflow)  |
| [Triton Inference Server](https://github.com/triton-inference-server/server)                     | [TensorFlow, TorchScript, ONNX, TensorRT](https://github.com/triton-inference-server/server/blob/r23.05/docs/user_guide/model_repository.md)                                                                        | v2     | v2          | 23.05-py3 (Triton)                                                           | 8 (TensorRT), 1, 2 (TensorFlow), 2 (PyTorch), 2 (Triton) [Compatibility Matrix](https://docs.nvidia.com/deeplearning/frameworks/support-matrix/index.html) | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/triton)      |
| [XGBoost ModelServer](https://github.com/kserve/kserve/tree/master/python/xgbserver)             | [Saved Model (.bst, .json, .ubj)](https://xgboost.readthedocs.io/en/latest/tutorials/saving_model.html)                                                                                                            | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 2                                                                                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/xgboost)     |
| [PaddlePaddle ModelServer](https://github.com/kserve/kserve/tree/master/python/paddleserver)     | [Saved Model (.pdmodel)](https://www.paddlepaddle.org.cn/documentation/docs/zh/develop/guides/serving/quick_start.html)                                                                                                   | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 2                                                                                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/paddlepaddle) |
| [HuggingFace ModelServer](https://github.com/kserve/kserve/tree/master/python/huggingfaceserver) | [Saved Model](https://huggingface.co/docs/transformers/v4.39.2/en/main_classes/model#transformers.PreTrainedModel.save_pretrained), [Huggingface Hub Model_Id](https://huggingface.co/models) | v1, v2 | v2          | v{{kserveDocsVersion}} (KServe)                                              | 4 ([Transformers](https://huggingface.co/docs/transformers/en/index))                                                                                          | [GitHub Examples](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/huggingface) |

### Protocol Notes

- **\*tensorflow**: TensorFlow implements its own prediction protocol in addition to KServe's standard protocols. See the [TensorFlow Serving Prediction API](https://github.com/tensorflow/serving/blob/master/tensorflow_serving/apis/prediction_service.proto) documentation.

</TabItem>
</Tabs>

### Version Information

The framework versions and runtime configurations can be found in several locations:

- **Runtime versions**: Check the [runtime kustomization YAML](https://github.com/kserve/kserve/blob/master/config/runtimes/kustomization.yaml)
- **Supported formats**: See individual [runtime YAML files](https://github.com/kserve/kserve/tree/master/config/runtimes) under the `supportedModelFormats` field
- **KServe native runtimes**: Find specific versions in [kserve/python](https://github.com/kserve/kserve/tree/master/python) subdirectories' `pyproject.toml` files

For example, the LightGBM server version can be found in the [pyproject.toml](https://github.com/kserve/kserve/blob/master/python/lgbserver/pyproject.toml) file, which specifies `lightgbm ~= 3.3.2`.

## Runtime Version Configuration

:::tip[Production Recommendation]
For production services, we highly recommend explicitly setting the `runtimeVersion` field in your InferenceService specification to ensure consistent deployments and avoid unexpected version changes.
:::

You can override the default model serving runtime version using the `runtimeVersion` field:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "torchscript-cifar"
spec:
  predictor:
    model:
      modelFormat:
        name: "pytorch"
      storageUri: "gs://kfserving-examples/models/torchscript"
      runtimeVersion: 23.08-py3
```

## Next Steps

- Explore the [KServe GitHub repository](https://github.com/kserve/kserve) for more examples
- Learn about [custom model serving](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1/custom) 
- Check out the [sample implementations](https://github.com/kserve/kserve/tree/master/docs/samples/v1beta1) for hands-on tutorials
- Read the [KServe developer guide](https://github.com/kserve/kserve/blob/master/docs/DEVELOPER_GUIDE.md)
