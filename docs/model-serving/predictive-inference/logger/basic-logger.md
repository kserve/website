---
title: "Basic Inference Logger"
description: "Setup basic inference logging with a message dumper"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Basic Inference Logger

This document explains how to set up basic inference logging in KServe. Inference logging allows you to capture and monitor prediction requests and responses, which is useful for debugging, auditing, and monitoring your machine learning models in production.

## Prerequisites

Before setting up inference logging, make sure you have:

* A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
* [kubectl](https://kubernetes.io/docs/tasks/tools/) CLI tool installed and configured.
* Basic knowledge of Kubernetes and KServe concepts.

## Create Message Dumper

First, you need to set up a message dumper service that will receive and log the inference events.

<Tabs groupId="deployment-type">
  <TabItem value="raw" label="Standard Deployment" default>

Create a standard Kubernetes deployment and service as the message dumper:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: message-dumper
spec:
  replicas: 1
  selector:
    matchLabels:
      app: message-dumper
  template:
    metadata:
      labels:
        app: message-dumper
    spec:
      containers:
      - name: message-dumper
        image: gcr.io/knative-releases/knative.dev/eventing-contrib/cmd/event_display
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: message-dumper
spec:
  selector:
    app: message-dumper
  ports:
  - port: 80
    targetPort: 8080
```

  </TabItem>
  <TabItem value="serverless" label="Knative Deployment (Knative)">

Create a Knative Service as the message dumper:

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

  </TabItem>
</Tabs>

Apply the configuration:

```bash
kubectl apply -f message-dumper.yaml
```

## Configure the InferenceService

Next, create an InferenceService with the logger configured:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kserve-examples/models/sklearn/1.0/model"
  logger:
    mode: all
    url: http://message-dumper.default.svc.cluster.local
```

Apply the InferenceService configuration:

```bash
kubectl apply -f sklearn-iris.yaml
```

Verify the InferenceService is ready:

```bash
kubectl get inferenceservices sklearn-iris
```

## Send Test Request

Create an `input.json` file with the following content:

```json
{
  "instances": [
    [6.8, 2.8, 4.8, 1.4],
    [6.0, 3.4, 4.5, 1.6]
  ]
}
```
First, [determine the ingress IP and ports](../../../getting-started/predictive-first-isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`:

```bash
Then send a request:

```bash
MODEL_NAME=sklearn-iris
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

:::tip[Expected Output]

```json
{
    "predictions": [1, 1]
}
```

:::

## Check CloudEvents

Check the logs of the message dumper to see the CloudEvents associated with your previous curl request. The command differs depending on your deployment type.

<Tabs groupId="deployment-type">
  <TabItem value="raw" label="Raw Kubernetes Deployment" default>

```bash
kubectl logs $(kubectl get pod -l app=message-dumper -o jsonpath='{.items[0].metadata.name}')
```

  </TabItem>
  <TabItem value="serverless" label="Knative Deployment (Knative)">

```bash
kubectl logs $(kubectl get pod -l serving.knative.dev/service=message-dumper -o jsonpath='{.items[0].metadata.name}') user-container
```

  </TabItem>
</Tabs>

You should see CloudEvents showing both the request and response payloads.

:::tip[Expected Output]

```
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: org.kubeflow.serving.inference.request
  source: http://localhost:9081/
  id: e58f1edd-43bc-42f6-a10a-d1adb5cab831
  time: 2023-01-30T10:45:00.000Z
  datacontenttype: application/json
Extensions,
  endpoint: 
  inferenceservicename: sklearn-iris
  namespace: default
  traceparent: 00-90a2951c292515b95056d5f778a7824b-d3c911c939c7bef6-00
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
  id: e58f1edd-43bc-42f6-a10a-d1adb5cab831
  time: 2023-01-30T10:45:00.000Z
  datacontenttype: application/json
Extensions,
  endpoint: 
  inferenceservicename: sklearn-iris
  namespace: default
  traceparent: 00-90a2951c292515b95056d5f778a7824b-d3c911c939c7bef6-00
Data,
  {
    "predictions": [
      1,
      1
    ]
  }
```

:::

## Cleanup

When you're done experimenting with the inference logger, clean up the resources depending on your deployment method:

<Tabs groupId="deployment-type">
  <TabItem value="raw" label="Raw Kubernetes Deployment" default>

```bash
kubectl delete isvc sklearn-iris
kubectl delete deploy message-dumper
kubectl delete svc message-dumper
```

  </TabItem>
  <TabItem value="serverless" label="Knative Deployment (Knative)">

```bash
kubectl delete isvc sklearn-iris
kubectl delete ksvc message-dumper
```

  </TabItem>
</Tabs>
