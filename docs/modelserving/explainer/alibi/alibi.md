## Deploy InferenceService with Alibi Explainer

Model explainability answers the question: "Why did my model make this prediction" for a given instance. KServe 
integrates with [Alibi Explainer](https://github.com/SeldonIO/alibi) which implements a black-box algorithm by generating a lot of similar looking intances 
for a given instance and send out to the model server to produce an explanation.

Additionally KServe also integrates with The [AI Explainability 360 (AIX360)](https://ai-explainability-360.org/) toolkit, an LF AI Foundation incubation project, which is an open-source library that supports the interpretability and explainability of datasets and machine learning models. The AI Explainability 360 Python package includes a comprehensive set of algorithms that cover different dimensions of explanations along with proxy explainability metrics. In addition to native algorithms, AIX360 also provides algorithms from LIME and Shap.

| Features  | Examples |
| ------------- | ------------- |
| Deploy Alibi Image Explainer| [Imagenet Explainer](./cifar10/README.md)  |
| Deploy Alibi Income Explainer| [Income Explainer](./income/README.md)  |
| Deploy Alibi Text Explainer| [Alibi Text Explainer](./moviesentiment/README.md) |