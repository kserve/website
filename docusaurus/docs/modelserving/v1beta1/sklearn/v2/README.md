# Scikit-learn Runtime

KServe's Scikit-learn serving runtime provides simple and efficient deployment for scikit-learn models with support for popular Python ML libraries.

## Overview

The Scikit-learn runtime supports:
- **Pickle/Joblib Models**: Standard scikit-learn serialization formats
- **Pipeline Support**: Full scikit-learn pipeline compatibility
- **Feature Engineering**: Integrated preprocessing and transformations
- **Multiple Algorithms**: Support for all scikit-learn estimators
- **Custom Transformers**: Deploy custom preprocessing logic

## Quick Start

### Simple Model Deployment

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    sklearn:
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

### Test Prediction

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -X POST https://$SERVICE_HOSTNAME/v1/models/sklearn-iris:predict \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      [6.8, 2.8, 4.8, 1.4],
      [6.0, 3.4, 4.5, 1.6]
    ]
  }'
```

## Supported Model Types

### Classification Models
- LogisticRegression
- RandomForestClassifier  
- SVC (Support Vector Classifier)
- GradientBoostingClassifier
- DecisionTreeClassifier

### Regression Models
- LinearRegression
- RandomForestRegressor
- SVR (Support Vector Regressor)
- GradientBoostingRegressor
- Ridge/Lasso Regression

### Clustering Models
- KMeans
- DBSCAN
- AgglomerativeClustering

### Pipelines
```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

# Create pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier())
])

# Train and save
pipeline.fit(X_train, y_train)
joblib.dump(pipeline, 'model.pkl')
```

## Model Format

### Supported Serialization
- **Pickle**: `model.pkl`
- **Joblib**: `model.joblib` (recommended)

### Directory Structure
```
model/
├── model.pkl        # or model.joblib
└── metadata.json    # optional
```

## Configuration Examples

### Basic Configuration
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-model"
spec:
  predictor:
    sklearn:
      storageUri: "s3://my-bucket/sklearn-model"
      resources:
        requests:
          cpu: 100m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi
```

### With Environment Variables
```yaml
spec:
  predictor:
    sklearn:
      storageUri: "s3://my-bucket/model"
      env:
      - name: SKLEARN_NTHREADS
        value: "4"
      - name: OMP_NUM_THREADS
        value: "4"
```

## Request/Response Examples

### Classification
```json
// Request
{
  "instances": [
    [5.1, 3.5, 1.4, 0.2],
    [4.9, 3.0, 1.4, 0.2]
  ]
}

// Response
{
  "predictions": [0, 0]
}
```

### Regression
```json
// Request
{
  "instances": [
    [1.5, 2.8, 3.2],
    [2.1, 1.9, 4.5]
  ]
}

// Response  
{
  "predictions": [12.3, 18.7]
}
```

### Named Features
```json
// Request
{
  "instances": [
    {
      "sepal_length": 5.1,
      "sepal_width": 3.5,
      "petal_length": 1.4,
      "petal_width": 0.2
    }
  ]
}
```

## Best Practices

1. **Use Joblib**: Preferred over pickle for scikit-learn models
2. **Include Pipelines**: Bundle preprocessing with models
3. **Feature Names**: Use consistent feature naming
4. **Model Validation**: Test models before deployment
5. **Resource Limits**: Set appropriate CPU/memory limits

## Next Steps

- Learn about [XGBoost Runtime](../xgboost/README.md)
- Explore [Custom Predictors](../custom/custom_model/README.md)
- Configure [Model Transformers](../../transformer/feast/README.md)
