---
title: Overview
description: An overview of model explainability in KServe
---

# InferenceService Explainer

Model explainability answers the question: "Why did my model make this prediction" for a given instance. KServe 
integrates with [Alibi Explainer](https://github.com/SeldonIO/alibi) which implements a black-box algorithm by generating a lot of similar looking instances 
for a given instance and send out to the model server to produce an explanation.

Additionally, KServe also integrates with the [AI Explainability 360 (AIX360)](https://ai-explainability-360.org/) toolkit, an LF AI Foundation incubation project,
which is an open-source library that supports the interpretability and explainability of datasets and machine learning models. The AI Explainability 360 Python package includes a comprehensive set of algorithms that cover different dimensions of explanations along with proxy explainability metrics.
In addition to native algorithms, AIX360 also provides algorithms from LIME and Shap.

| Explainer                     | Examples                                                             |
|-------------------------------|----------------------------------------------------------------------|
| Deploy Alibi Image Explainer  | [Image Explainer](./alibi/image-explainer/image-explainer.md)        |
| Deploy Alibi Income Explainer | [Tablular Explainer](./alibi/tabular-explainer/tabular-explainer.md) |
| Deploy Alibi Text Explainer   | [Text Explainer](./alibi/text-explainer/text-explainer.md)           |
| Deploy TrustyAI Explainer     | [TrustyAI Explainer](./trustyai/trustyai.md)                         |

