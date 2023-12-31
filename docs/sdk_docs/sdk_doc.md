# KServe Python SDK
Python SDK for KServe controller plane client and data plane serving runtime API.

## Installation

KServe Python SDK can be installed by `pip` or `poetry`.

### pip install

```sh
pip install kserve
```

### Poetry

Checkout KServe GitHub repository and Install via [poetry](https://python-poetry.org/).

```sh
cd kserve/python/kserve
peotry install
```

## KServe Serving Runtime API
KServe's python serving runtime API implements the [open inference protocol](https://github.com/kserve/open-inference-protocol) 
using `FastAPI`, see [Serving Runtime API docs](../python_runtime_api/docs/index.md) for more details.

## KServe Client API
KServe's python client interacts with KServe control plane APIs for executing operations on a remote KServe cluster,
such as creating, patching and deleting of a InferenceService instance.

### Getting Started

Please see the [Sample for Python SDK Client](./samples/kserve_sdk_v1beta1_sample.ipynb) to get started.

### KServe Client API Reference

| Class                                | Method                                                  | Description                                                                           |
|--------------------------------------|---------------------------------------------------------|---------------------------------------------------------------------------------------|
| [KServeClient](docs/KServeClient.md) | [set_credentials](docs/KServeClient.md#set_credentials) | Set Credentials                                                                       |
| [KServeClient](docs/KServeClient.md) | [create](docs/KServeClient.md#create)                   | Create InferenceService                                                               |
| [KServeClient](docs/KServeClient.md) | [get](docs/KServeClient.md#get)                         | Get or watch the specified InferenceService or all InferenceServices in the namespace |
| [KServeClient](docs/KServeClient.md) | [patch](docs/KServeClient.md#patch)                     | Patch the specified InferenceService                                                  |
| [KServeClient](docs/KServeClient.md) | [replace](docs/KServeClient.md#replace)                 | Replace the specified InferenceService                                                |
| [KServeClient](docs/KServeClient.md) | [delete](docs/KServeClient.md#delete)                   | Delete the specified InferenceService                                                 |
| [KServeClient](docs/KServeClient.md) | [wait_isvc_ready](docs/KServeClient.md#wait_isvc_ready) | Wait for the InferenceService to be ready                                             |
| [KServeClient](docs/KServeClient.md) | [is_isvc_ready](docs/KServeClient.md#is_isvc_ready)     | Check if the InferenceService is ready                                                |

### Reference for Generated Data Models

 - [KnativeAddressable](docs/KnativeAddressable.md)
 - [KnativeCondition](docs/KnativeCondition.md)
 - [KnativeURL](docs/KnativeURL.md)
 - [KnativeVolatileTime](docs/KnativeVolatileTime.md)
 - [NetUrlUserinfo](docs/NetUrlUserinfo.md)
 - [V1beta1AIXExplainerSpec](docs/V1beta1AIXExplainerSpec.md)
 - [V1beta1AlibiExplainerSpec](docs/V1beta1AlibiExplainerSpec.md)
 - [V1beta1Batcher](docs/V1beta1Batcher.md)
 - [V1beta1ComponentExtensionSpec](docs/V1beta1ComponentExtensionSpec.md)
 - [V1beta1ComponentStatusSpec](docs/V1beta1ComponentStatusSpec.md)
 - [V1beta1CustomExplainer](docs/V1beta1CustomExplainer.md)
 - [V1beta1CustomPredictor](docs/V1beta1CustomPredictor.md)
 - [V1beta1CustomTransformer](docs/V1beta1CustomTransformer.md)
 - [V1beta1ExplainerSpec](docs/V1beta1ExplainerSpec.md)
 - [V1beta1InferenceService](docs/V1beta1InferenceService.md)
 - [V1beta1InferenceServiceList](docs/V1beta1InferenceServiceList.md)
 - [V1beta1InferenceServiceSpec](docs/V1beta1InferenceServiceSpec.md)
 - [V1beta1InferenceServiceStatus](docs/V1beta1InferenceServiceStatus.md)
 - [V1alpha1InferenceGraph](docs/V1alpha1InferenceGraph.md)
 - [V1alpha1InferenceGraphList](docs/V1alpha1InferenceGraphList.md)
 - [V1alpha1InferenceGraphSpec](docs/V1alpha1InferenceGraphSpec.md)
 - [V1alpha1InferenceGraphStatus](docs/V1alpha1InferenceGraphStatus.md)
 - [V1beta1LightGBMSpec](docs/V1beta1LightGBMSpec.md)
 - [V1beta1LoggerSpec](docs/V1beta1LoggerSpec.md)
 - [V1beta1ModelSpec](docs/V1beta1ModelSpec.md)
 - [V1beta1ModelStatus](docs/V1beta1ModelStatus.md)
 - [V1beta1ONNXRuntimeSpec](docs/V1beta1ONNXRuntimeSpec.md)
 - [V1beta1PaddleServerSpec](docs/V1beta1PaddleServerSpec.md)
 - [V1beta1PMMLSpec](docs/V1beta1PMMLSpec.md)
 - [V1beta1PodSpec](docs/V1beta1PodSpec.md)
 - [V1beta1PredictorExtensionSpec](docs/V1beta1PredictorExtensionSpec.md)
 - [V1beta1PredictorSpec](docs/V1beta1PredictorSpec.md)
 - [V1beta1SKLearnSpec](docs/V1beta1SKLearnSpec.md)
 - [V1beta1TFServingSpec](docs/V1beta1TFServingSpec.md)
 - [V1beta1TorchServeSpec](docs/V1beta1TorchServeSpec.md)
 - [V1beta1TransformerSpec](docs/V1beta1TransformerSpec.md)
 - [V1beta1TritonSpec](docs/V1beta1TritonSpec.md)
 - [V1beta1XGBoostSpec](docs/V1beta1XGBoostSpec.md)
