# Data Plane (V1)
KServe's V1 protocol offers a standardized prediction workflow across all model frameworks. This protocol version is still supported, but it is recommended that users migrate to the [V2 protocol](./v2_protocol.md) for better performance and standardization among serving runtimes. However, if a use case requires a more flexibile schema than protocol v2 provides, v1 protocol is still an option. 

| API  | Verb | Path | Request Payload | Response Payload |
| ------------- | ------------- | ------------- | ------------- | ------------- |
| List Models | GET | /v1/models | | {"models": \[\<model_name\>\]} | 
| Model Ready| GET   | /v1/models/\<model_name>     |     | {"name": \<model_name\>,"ready": $bool}  |
| Predict  | POST  | /v1/models/\<model_name\>:predict  | {"instances": []} ** | {"predictions": []} |
| Explain  | POST  | /v1/models/\<model_name\>:explain  | {"instances": []} **| {"predictions": [], "explanations": []}   | |

** = payload is optional

Note: The response payload in V1 protocol is not strictly enforced. A custom server define and return its own response payload. We encourage using the KServe defined response payload for consistency.

TODO: make sure list models/model ready is correct. 

## API Definitions

| API  | Definition | 
| --- | --- |
| Predict | The "predict" API performs inference on a model. The response is the prediction result. All InferenceServices speak the [Tensorflow V1 HTTP API](https://www.tensorflow.org/tfx/serving/api_rest#predict_api). | 
| Explain | The "explain" API is an optional component that provides model explanations in addition to predictions. The standardized explainer interface is identical to the Tensorflow V1 HTTP API with the addition of an ":explain" verb.| 
| Model Ready | The “model ready” health API indicates if a specific model is ready for inferencing. If the model(s) is downloaded and ready to serve requests, the model ready endpoint returns the list of accessible <model_name>(s). | 
| List Models | The "models" API exposes a list of models in the model registry. |

<!-- TODO: ## Examples -->
