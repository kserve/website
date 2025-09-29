---
title: Multiple Storage URIs
description: Use multiple storage URIs to fetch model artifacts from different storage backends and mount them at custom locations.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Multiple Storage URIs

This guide shows how to configure InferenceServices with multiple storage URIs, allowing you to fetch model artifacts from different storage backends and mount them at specific locations within the container.

## Overview

The multiple storage URIs feature enables you to:
- Fetch artifacts from multiple storage locations in a single InferenceService
- Specify custom mount paths for each storage URI
- Support complex model architectures like base models with adapters
- Access models and preprocessing data from different sources

## Use Cases

### Base Models with Adapters
Store Large Language Models (LLMs) and LoRA adapters in separate locations for better versioning and reuse:

```yaml
storageUris:
  - uri: hf://microsoft/DialoGPT-medium
    path: /mnt/models/base
  - uri: s3://my-bucket/lora-adapters/customer-service
    path: /mnt/models/adapters
```

### Multiple Preprocessing Artifacts
Access models and preprocessing data from different sources:

```yaml
storageUris:
  - uri: s3://bucket/trained-model
    path: /mnt/models/model
  - uri: s3://bucket/preprocessor
    path: /mnt/models/preprocessing
```

## Before you begin

1. Your `~/.kube/config` should point to a cluster with [KServe installed](../../getting-started/quickstart-guide.md).
2. Your cluster's Istio Ingress gateway must be [network accessible](../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports).
3. For Knative deployments, the Knative init container feature flag must be enabled.

## Basic Usage

### Simple Multiple URIs

Create an InferenceService with multiple storage URIs:

<Tabs>
<TabItem value="custom-paths" label="Custom Paths">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: multi-storage-example
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
    storageUris:
      - uri: s3://bucket/base-model
        path: /mnt/models/base
      - uri: s3://bucket/adapters
        path: /mnt/models/adapters
```

</TabItem>
<TabItem value="default-paths" label="Default Paths">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: multi-storage-default
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
    storageUris:
      - uri: s3://bucket/model
        # Downloads to /mnt/models (default)
      - uri: s3://bucket/preprocessing
        # Downloads to /mnt/models (default)
```

</TabItem>
<TabItem value="mixed-paths" label="Mixed Paths">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: multi-storage-mixed
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
    storageUris:
      - uri: s3://bucket/base-model
        path: /mnt/models/base
      - uri: s3://bucket/preprocessing
        # Uses default /mnt/models
```

</TabItem>
</Tabs>

Apply the InferenceService:
```bash
kubectl apply -f multi-storage.yaml
```

## Path Configuration

### Default Behavior
If no path is specified, models download to `/mnt/models`:

```yaml
storageUris:
  - uri: s3://bucket/model
    # Downloads to /mnt/models (default)
```

### Custom Paths
Specify explicit mount paths for downloaded artifacts:

```yaml
storageUris:
  - uri: s3://bucket/base-model
    path: /mnt/models/base
  - uri: s3://bucket/preprocessing
    path: /mnt/models/preprocessing
```

## Path Requirements

### Common Root Directory
All custom paths must share a common root directory (excluding filesystem root):

<Tabs>
<TabItem value="valid" label="✅ Valid">

```yaml
# Common root: /mnt/models
storageUris:
  - uri: s3://bucket/model-a
    path: /mnt/models/model-a
  - uri: s3://bucket/model-b
    path: /mnt/models/model-b
```

</TabItem>
<TabItem value="invalid" label="❌ Invalid">

```yaml
# Different roots
storageUris:
  - uri: s3://bucket/model-a
    path: /models/model-a     # Root: /models
  - uri: s3://bucket/model-b
    path: /other/model-b      # Root: /other
```

</TabItem>
</Tabs>

### Absolute Paths
All custom paths must be absolute paths:

```yaml
# ✅ Valid
path: /mnt/models/custom

# ❌ Invalid
path: models/custom
```

## Compatibility and Migration

### Mutual Exclusivity
The `storageUri` and `storageUris` properties are mutually exclusive:

<Tabs>
<TabItem value="valid-migration" label="✅ Valid">

```yaml
# Use either storageUri
predictor:
  model:
    storageUri: s3://bucket/model

# OR storageUris
predictor:
  model:
    storageUris:
      - uri: s3://bucket/model
```

</TabItem>
<TabItem value="invalid-both" label="❌ Invalid">

```yaml
# Cannot use both
predictor:
  model:
    storageUri: s3://bucket/model
    storageUris:
      - uri: s3://bucket/other-model
```

</TabItem>
</Tabs>

### Equivalent Configurations
These configurations are functionally equivalent:

<Tabs>
<TabItem value="legacy" label="Legacy Single URI">

```yaml
storageUri: s3://bucket/model
```

</TabItem>
<TabItem value="new-default" label="New with Default Path">

```yaml
storageUris:
  - uri: s3://bucket/model
```

</TabItem>
<TabItem value="new-explicit" label="New with Explicit Path">

```yaml
storageUris:
  - uri: s3://bucket/model
    path: /mnt/models
```

</TabItem>
</Tabs>

## Advanced Examples

### LLM with LoRA Adapter

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llm-with-adapter
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
    storageUris:
      - uri: hf://microsoft/DialoGPT-medium
        path: /mnt/models/base
      - uri: s3://my-bucket/lora-adapters/customer-service
        path: /mnt/models/adapters
```

### Preprocessing Pipeline

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: preprocessing-pipeline
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
    storageUris:
      - uri: s3://bucket/trained-model
        path: /mnt/models/model
      - uri: s3://bucket/preprocessor
        path: /mnt/models/preprocessing
      - uri: s3://bucket/feature-store
        path: /mnt/models/features
```

## Supported Storage Types

Multiple storage URIs support all existing [storage providers](./overview.md) supported by KServe.

## File Conflicts and Resolution

### Avoiding Conflicts
When multiple URIs download to the same path, files may overwrite each other non-deterministically:

<Tabs>
<TabItem value="conflict-prone" label="⚠️ Conflict-Prone">

```yaml
# Both contain model.pt - one will overwrite the other
storageUris:
  - uri: s3://bucket/model-a  # Contains model.pt
    path: /mnt/models
  - uri: s3://bucket/model-b  # Contains model.pt
    path: /mnt/models
```

**Result:**
```
/mnt/models
└── model.pt  # Undefined which URI this came from
```

</TabItem>
<TabItem value="conflict-free" label="✅ Conflict-Free">

```yaml
# Separate paths prevent conflicts
storageUris:
  - uri: s3://bucket/model-a
    path: /mnt/models/model-a
  - uri: s3://bucket/model-b
    path: /mnt/models/model-b
```

**Result:**
```
/mnt/models
├── model-a
│   └── model.pt
└── model-b
    └── model.pt
```

</TabItem>
</Tabs>

### Directory Merging
When downloading to the same path without filename conflicts, directories merge successfully:

```yaml
storageUris:
  - uri: s3://bucket/model-a     # Contains model.pt
  - uri: s3://bucket/preprocessing  # Contains preprocessing.csv
```

**Result:**
```
/mnt/models
├── model.pt
└── preprocessing.csv
```

## Component Support

Multiple storage URIs are available on predictor, transformer, and explainer components:

<Tabs>
<TabItem value="predictor" label="Predictor">

```yaml
spec:
  predictor:
    storageUris:
      - uri: s3://bucket/predictor-model
        path: /mnt/models/predictor
```

</TabItem>
<TabItem value="transformer" label="Transformer">

```yaml
spec:
  transformer:
    storageUris:
      - uri: s3://bucket/transformer-model
        path: /mnt/models/transformer
```

</TabItem>
<TabItem value="explainer" label="Explainer">

```yaml
spec:
  explainer:
    storageUris:
      - uri: s3://bucket/explainer-model
        path: /mnt/models/explainer
```

</TabItem>
</Tabs>

## Run a Prediction

Once your InferenceService is deployed, you can run predictions as usual. The model containers will have access to all configured storage artifacts at their specified mount paths.

Determine the ingress IP and port by following [this instruction](../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports).

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice multi-storage-example -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=multi-storage-example
curl -v -H "Host: ${SERVICE_HOSTNAME}" \
     -H "Content-Type: application/json" \
     http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict \
     -d @input.json
```

## Limitations

### Environment Variable Support
Multiple storage URIs using the `STORAGE_URI` environment variable is **not supported**. The `STORAGE_URI` environment variable exists for legacy transformer compatibility but is no longer needed with the `storageUris` property.

### Knative Requirements
For Knative deployments, ensure the Knative init container feature flag is enabled in your cluster configuration.

### Path Validation
The system validates paths to prevent directory traversal attacks and ensure all paths share a common root for security and operational consistency.