---
title: Request Header Metadata Logger
description: "Log request headers along with inference data in KServe"
---

# Request Header Metadata Logger

The request metadata headers can be included in the log message by specifying the metadata header names in the `metadataHeaders` field of the InferenceService CRD. These headers are included in the CloudEvent extension attribute `metadata`.

## Prerequisites
- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- Have Familiarity with [Kserve Inference Logger](./basic-logger.md).

## Configuration

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
spec:
predictor:
  logger:
    mode: all
    url: http://message-dumper.default/
    metadataHeaders:
      - "x-request-id"
      - "x-b3-traceid"
      - "x-b3-spanid"
      - "x-b3-flags"
  model:
    modelFormat:
      name: sklearn
    storageUri: gs://kfserving-examples/models/sklearn/1.0/model
```

## Common Headers for Tracing

The example above includes headers commonly used for distributed tracing:

- `x-request-id`: A unique identifier for the request
- `x-b3-traceid`: The overall ID of the trace, shared by all spans in the trace
- `x-b3-spanid`: The ID of the current operation within the trace
- `x-b3-flags`: Additional flags for tracing information

You can include any other headers that might be relevant for your logging and monitoring needs.
