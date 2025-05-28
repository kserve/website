# API Reference

KServe provides a comprehensive API for managing machine learning model serving on Kubernetes.

## Core APIs

### InferenceService

The `InferenceService` is the primary resource for deploying machine learning models with KServe.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  predictor:
    # Model runtime configuration
  transformer:
    # Optional: data preprocessing
  explainer:
    # Optional: model explanations
```

#### Predictor Runtimes

KServe supports multiple model runtimes:

- **Sklearn**: Scikit-learn models
- **XGBoost**: XGBoost models  
- **PyTorch**: PyTorch models
- **TensorFlow**: TensorFlow SavedModel
- **ONNX**: ONNX models
- **Triton**: NVIDIA Triton Inference Server
- **Custom**: Custom model servers

### ClusterServingRuntime

Defines cluster-wide model runtimes:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ClusterServingRuntime
metadata:
  name: custom-runtime
spec:
  supportedModelFormats:
  - name: sklearn
    version: "1"
  containers:
  - name: kserve-container
    image: custom/model-server:latest
```

### ServingRuntime

Namespace-scoped model runtime definitions:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: my-runtime
spec:
  supportedModelFormats:
  - name: custom
    version: "1"
  containers:
  - name: kserve-container
    image: my-org/custom-server:v1.0
```

## V1 Protocol

KServe implements the V1 inference protocol for standardized model serving:

### Prediction Request

```bash
POST /v1/models/{MODEL_NAME}:predict
Content-Type: application/json

{
  "instances": [
    {
      "feature1": 1.0,
      "feature2": 2.0
    }
  ]
}
```

### Prediction Response

```json
{
  "predictions": [
    {
      "class": "positive",
      "probability": 0.85
    }
  ]
}
```

## V2 Protocol

KServe also supports the V2 inference protocol:

### Model Metadata

```bash
GET /v2/models/{MODEL_NAME}
```

### Model Inference

```bash
POST /v2/models/{MODEL_NAME}/infer
Content-Type: application/json

{
  "inputs": [
    {
      "name": "input_tensor",
      "shape": [1, 4],
      "datatype": "FP32",
      "data": [1.0, 2.0, 3.0, 4.0]
    }
  ]
}
```

## Model Formats

### Storage URI Formats

KServe supports various storage backends:

- **Google Cloud Storage**: `gs://bucket/path/to/model`
- **Amazon S3**: `s3://bucket/path/to/model`
- **Azure Blob**: `https://account.blob.core.windows.net/container/path`
- **HTTP/HTTPS**: `https://example.com/models/my-model`
- **Persistent Volume**: `pvc://my-pvc/path/to/model`

## Authentication & Authorization

### Model Storage Authentication

Configure credentials for private model storage:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
  annotations:
    serving.kserve.io/s3-endpoint: s3.amazonaws.com
    serving.kserve.io/s3-usehttps: "1"
data:
  AWS_ACCESS_KEY_ID: <base64-encoded-access-key>
  AWS_SECRET_ACCESS_KEY: <base64-encoded-secret-key>
```

## Configuration

### Global Configuration

KServe configuration is managed through the `inferenceservice-config` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  predictors: |
    {
      "tensorflow": {
        "image": "tensorflow/serving:2.6.2",
        "defaultImageVersion": "2.6.2"
      }
    }
```

## Error Codes

Common HTTP status codes returned by KServe:

- `200`: Successful prediction
- `400`: Bad request (invalid input)
- `404`: Model not found
- `500`: Internal server error
- `503`: Service unavailable (model loading)

## SDK Support

KServe provides SDKs for popular programming languages:

- **Python**: `pip install kserve`
- **Go**: Available in the KServe repository
- **Java**: Community-maintained

For detailed API specifications, visit our [GitHub repository](https://github.com/kserve/kserve) or explore the [OpenAPI specifications](https://github.com/kserve/kserve/tree/master/docs/apis).
