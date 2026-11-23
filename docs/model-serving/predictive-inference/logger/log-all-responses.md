---
title: Log All Responses
description: "Log inference responses regardless of their status code in KServe"
---

# Log All Responses

By default the inference logger only emits a response CloudEvent when the predictor returns `200 OK`. Responses with any other status code are not logged, so a request that was rejected leaves no trace beyond its request event.

Setting `logAllResponses` to `true` logs the response regardless of its status code, and adds the status code to the response CloudEvent as the extension attribute `statuscode`.

This is useful when the response body carries the reason a call was rejected: a `422` from a model that validates its input usually explains exactly what the caller got wrong.

## Prerequisites
- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- Have familiarity with [KServe Inference Logger](./basic-logger.md).

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
      logAllResponses: true
    model:
      modelFormat:
        name: sklearn
      storageUri: gs://kfserving-examples/models/sklearn/1.0/model
```

## Effect on logged events

With `logAllResponses` enabled, a request rejected by the predictor produces both a request and a response CloudEvent, and the response event carries the status code:

```
Context Attributes,
  specversion: 1.0
  type: org.kubeflow.serving.inference.response
  source: http://localhost:9081/
  id: 0d3d1b3a-1d0b-4b6f-9a49-4b0d6f6c9e57
  time: 2025-01-15T10:32:11.472Z
Extensions,
  endpoint: default
  inferenceservicename: sklearn-iris
  namespace: default
  statuscode: 422
Data,
  {"error":"Failed to process request: unexpected feature count"}
```

## Notes

- The setting is opt-in. When it is unset, response events keep exactly the shape they have today and are still only emitted for `200` responses.
- `mode` and `logAllResponses` control different things: `mode` decides which events are emitted at all, while `logAllResponses` decides which status codes produce a response event. With `mode: request` no response event is produced in the first place, so `logAllResponses` has no effect.
- Because the filter is on the status code rather than on failure specifically, enabling this also logs other non-`200` success codes such as `201` and `204`. A `204 No Content` response has no body by definition, so its event carries an empty payload.
- Enabling it increases the number of events emitted for services that return non-`200` responses frequently.
