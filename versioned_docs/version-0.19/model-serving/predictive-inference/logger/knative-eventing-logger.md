---
title: Payload Logger with Knative Eventing
description: "Configure KServe logging with Knative Eventing infrastructure"
---

# Payload Logger with Knative Eventing

This document explains how to set up advanced inference logging in KServe using Knative Eventing. With Knative Eventing, you can route prediction request and response events to various consumers for monitoring, analysis, or auditing purposes. This approach provides more flexibility than the basic logger by leveraging Knative's event-driven architecture.

## Prerequisites

- A cluster running with [Knative Eventing installed](https://knative.dev/docs/admin/install/eventing/install-eventing-with-yaml/).
- Have Familiarity with [Kserve Inference Logger](./basic-logger.md).

:::note

This was tested using Knative Eventing v0.17.

:::

## Setup Process

### 1. Create Message Dumper

Create a message dumper Knative service which will print out the CloudEvents it receives.

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: message-dumper
spec:
  template:
    spec:
      containers:
      - image: gcr.io/knative-releases/knative.dev/eventing-contrib/cmd/event_display
```

```bash
kubectl apply -f message-dumper.yaml
```

### 2. Create Channel Broker

Create a [Broker](https://knative.dev/docs/eventing/broker/) which allows you to route events to consumers like InferenceService.

```yaml
apiVersion: eventing.knative.dev/v1
kind: broker
metadata:
  name: default
```

```bash
kubectl apply -f broker.yaml

kubectl get broker default
```
Take note of the broker **URL** as that is what we'll be using in the InferenceService later on.

### 3. Create Trigger

We now create a [trigger](https://knative.dev/docs/eventing/triggers/) to forward the events to message-dumper service.
The trigger can specify a filter that enables selection of relevant events based on the Cloud Event context attributes.

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: message-dumper-trigger
spec:
  broker: default
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: message-dumper
```

```bash
kubectl create -f trigger.yaml
```

### 4. Create an InferenceService with Logger

Create a sklearn predictor with the `logger url` pointing to the Knative eventing multi-tenant broker in `knative-eventing` namespace.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
spec:
  predictor:
    minReplicas: 1
    logger:
      mode: all
      url: http://broker-ingress.knative-eventing.svc.cluster.local/default/default
    model:
      modelFormat:
        name: sklearn
      storageUri: gs://kfserving-examples/models/sklearn/1.0/model
```

Apply the `sklearn-knative-eventing.yaml`.

```bash
kubectl create -f sklearn-knative-eventing.yaml
```

## Testing the Logger

We can now send a request to the sklearn model. The first step is to [determine the ingress IP and ports](../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`.

Create an input file named `input.json` with the following content:

```json
{
  "instances": [
    [6.8, 2.8, 4.8, 1.4],
    [6.0, 3.4, 4.5, 1.6]
  ]
}
```

Then send a request:

```bash
MODEL_NAME=sklearn-iris
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip Expected Output

```json
{
    "predictions": [1, 1]
}
```

:::

### Check CloudEvents

Check the logs of the message dumper, we can see the CloudEvents associated with our previous curl request.

```bash
kubectl logs $(kubectl get pod -l serving.knative.dev/service=message-dumper -o jsonpath='{.items[0].metadata.name}') user-container
```

:::tip[Expected Output]

```bash
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: org.kubeflow.serving.inference.request
  source: http://localhost:9081/
  id: defb5816-35f7-4947-a2b1-b9e5d7764ad2
  time: 2021-04-10T01:22:16.498917288Z
  datacontenttype: application/json
Extensions,
  endpoint:
  inferenceservicename: sklearn-iris
  knativearrivaltime: 2021-04-10T01:22:16.500656431Z
  knativehistory: default-kne-trigger-kn-channel.default.svc.cluster.local
  namespace: default
  traceparent: 00-16456300519c5227ffe5f784a88da2f7-2db26af1daae870c-00
Data,
  {
    "instances": [
      [
        6.8,
        2.8,
        4.8,
        1.4
      ],
      [
        6.0,
        3.4,
        4.5,
        1.6
      ]
    ]
  }
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: org.kubeflow.serving.inference.response
  source: http://localhost:9081/
  id: defb5816-35f7-4947-a2b1-b9e5d7764ad2
  time: 2021-04-10T01:22:16.500492939Z
  datacontenttype: application/json
Extensions,
  endpoint:
  inferenceservicename: sklearn-iris
  knativearrivaltime: 2021-04-10T01:22:16.501931207Z
  knativehistory: default-kne-trigger-kn-channel.default.svc.cluster.local
  namespace: default
  traceparent: 00-2156a24451a4d4ea575fcf6c4f52a672-2b6ea035c83d3200-00
Data,
  {
    "predictions": [
      1,
      1
    ]
  }
```

:::
