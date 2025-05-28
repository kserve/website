# KServe Data Plane

KServe's inference data plane supports multiple protocols for serving predictions from machine learning models.

![Data Plane](../../images/dataplane.jpg)

**Note:** Protocol V2 uses /infer instead of :predict

## Concepts

**Component**: Each endpoint is composed of multiple components: "predictor", "explainer", and "transformer". The only required component is the predictor, which is the core of the system.

**Predictor**: The predictor is the core component which is responsible for running inference against a machine learning model.

**Transformer**: The transformer is responsible for pre/post processing alongside the predictor.

**Explainer**: The explainer enables an optional alternate data plane that can be used to provide model explanations in addition to predictions.

## Protocols

KServe supports multiple inference protocols:

- [V1 Protocol](v1_protocol) - TensorFlow Serving API compatible
- [V2 Protocol](v2_protocol) - Open Inference Protocol (Triton/NVIDIA)
