# Interact with InferenceService using Swagger UI

KServe provides a Swagger UI for interacting with InferenceService APIs. This allows you to test your deployed models directly from the browser.

## Accessing Swagger UI

When you deploy an InferenceService, KServe automatically generates OpenAPI specifications and provides a Swagger UI endpoint.

### Get the InferenceService URL

First, get the URL of your deployed InferenceService:

```bash
kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}'
```

### Access the Swagger UI

The Swagger UI is available at the `/docs` endpoint of your InferenceService:

```
http://your-inference-service-url/docs
```

For example, if your InferenceService URL is `http://sklearn-iris.default.example.com`, the Swagger UI would be available at:

```
http://sklearn-iris.default.example.com/docs
```

## Using Swagger UI

The Swagger UI provides an interactive interface where you can:

1. **View API Documentation** - See all available endpoints and their parameters
2. **Test API Calls** - Make requests directly from the browser
3. **Explore Response Formats** - See example responses and schemas

### Available Endpoints

Common endpoints include:

- `GET /` - Health check endpoint
- `GET /v1/models/{model_name}` - Get model metadata
- `POST /v1/models/{model_name}:predict` - Make predictions
- `GET /v1/models/{model_name}/versions/{version}` - Get specific version metadata

### Making Predictions

To make a prediction using Swagger UI:

1. Navigate to the prediction endpoint (usually `/v1/models/{model_name}:predict`)
2. Click **"Try it out"**
3. Enter your request body in the appropriate format
4. Click **"Execute"**

#### Example Request Body

For a scikit-learn model:

```json
{
  "instances": [
    [6.8, 2.8, 4.8, 1.4],
    [6.0, 3.4, 4.5, 1.6]
  ]
}
```

## Inference Protocols

KServe supports multiple inference protocols:

### V1 Inference Protocol

The V1 protocol follows TensorFlow Serving API format:

```json
{
  "instances": [
    // Your input data
  ]
}
```

### V2 Inference Protocol (Open Inference Protocol)

The V2 protocol provides more metadata and flexibility:

```json
{
  "inputs": [
    {
      "name": "input_1",
      "shape": [2, 4],
      "datatype": "FP32",
      "data": [[6.8, 2.8, 4.8, 1.4], [6.0, 3.4, 4.5, 1.6]]
    }
  ]
}
```

## Authentication

If your cluster requires authentication, you may need to:

1. Set up proper ingress with authentication
2. Use kubectl port-forward to access the service locally
3. Configure authentication headers in Swagger UI

## Troubleshooting

### Cannot Access Swagger UI

If you cannot access the Swagger UI:

1. **Check InferenceService Status**:
   ```bash
   kubectl get inferenceservice
   ```

2. **Verify Ingress Configuration**:
   ```bash
   kubectl get ingress
   ```

3. **Use Port Forward** (for local testing):
   ```bash
   kubectl port-forward service/sklearn-iris-predictor-default 8080:80
   ```
   Then access: `http://localhost:8080/docs`

### API Requests Failing

If API requests fail:

1. Check the request format matches the expected protocol
2. Verify the model is ready and healthy
3. Check the model's input/output specifications

## Next Steps

- Learn about [V1 Inference Protocol](../modelserving/data_plane/v1_protocol.md)
- Explore [V2 Inference Protocol](../modelserving/data_plane/v2_protocol.md)
- Understand [Model Serving Concepts](../modelserving/control_plane.md)
