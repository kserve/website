# V1 Protocol

The V1 protocol implements the TensorFlow Serving API with some standardized extensions for pre/post processing.

## API Definitions

| API         | Definition                                                                                                                                                                                                                       |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Predict     | The "predict" API performs inference on a model. The response is the prediction result. All InferenceServices speak the TensorFlow V1 HTTP API.                                                                                  |
| Explain     | The "explain" API is an optional component that provides model explanations in addition to predictions. The standardized explainer interface is identical to the TensorFlow V1 HTTP API with the addition of an ":explain" verb. |
| Model Ready | The "model ready" health API indicates if a specific model is ready for inferencing. If the model is downloaded and ready to serve requests, the model ready endpoint returns success.                                           |
| List Models | The "models" API exposes a list of models in the model registry.                                                                                                                                                                 |

## Example Request

```json
{
  "instances": [
    {
      "data": [1, 2, 3, 4]
    }
  ]
}
```

## Example Response

```json
{
  "predictions": [
    {
      "result": [0.1, 0.9]
    }
  ]
}
```
