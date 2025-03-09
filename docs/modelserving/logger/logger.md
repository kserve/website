# Inference Logger

## Basic Inference Logger

### Create Message Dumper

Create a message dumper `Knative Service` which will print out the CloudEvents it receives.

=== "yaml"
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

=== "kubectl"
```bash
kubectl create -f message-dumper.yaml
```

!!! Note
    You can create your own message-dumper service, in order to print during testing. Knative is not necessary for this feature.

### Create an InferenceService with Logger

Create a sklearn predictor with the logger which points at the message dumper url.

=== "New Schema"

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
        model:
          modelFormat:
            name: sklearn
          storageUri: gs://kfserving-examples/models/sklearn/1.0/model
    ```

=== "Old Schema"

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
        sklearn:
          storageUri: gs://kfserving-examples/models/sklearn/1.0/model
    ```

!!! Note
    Here we set the url explicitly, otherwise it defaults to the namespace knative broker or the value of `DefaultUrl` in the logger section of the inference service configmap.

=== "kubectl"
```bash
kubectl create -f sklearn-basic-logger.yaml
```

We can now send a request to the sklearn model. The first step is to [determine the ingress IP and ports](../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
MODEL_NAME=sklearn-iris
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
        "predictions": [1, 1]
    }
    ```

### Check CloudEvents

Check the logs of the message dumper, we can see the CloudEvents associated with our previous curl request.

=== "kubectl"
```bash
kubectl logs $(kubectl get pod -l serving.knative.dev/service=message-dumper -o jsonpath='{.items[0].metadata.name}') user-container
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    ☁️  cloudevents.Event
    Validation: valid
    Context Attributes,
      specversion: 1.0
      type: org.kubeflow.serving.inference.request
      source: http://localhost:9081/
      id: 0009174a-24a8-4603-b098-09c8799950e9
      time: 2021-04-10T00:23:26.0789529Z
      datacontenttype: application/json
    Extensions,
      endpoint:
      inferenceservicename: sklearn-iris
      namespace: default
      traceparent: 00-90bdf848647d50283394155d2df58f19-84dacdfdf07cadfc-00
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
      id: 0009174a-24a8-4603-b098-09c8799950e9
      time: 2021-04-10T00:23:26.080736102Z
      datacontenttype: application/json
    Extensions,
      endpoint:
      inferenceservicename: sklearn-iris
      namespace: default
      traceparent: 00-55de1514e1d23ee17eb50dda6167bb8c-b6c6e0f6dd8f741d-00
    Data,
      {
        "predictions": [
          1,
          1
        ]
      }
    ```

## Knative Eventing Inference Logger

A cluster running with [Knative Eventing installed](https://knative.dev/docs/admin/install/eventing/install-eventing-with-yaml/), along with KServe.

!!! note
    This was tested using Knative Eventing v0.17.

### Create Message Dumper

Create a message dumper Knative service which will print out the CloudEvents it receives.

=== "yaml"
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

=== "kubectl"
```bash
kubectl apply -f message-dumper.yaml
```

### Create Channel Broker

Create a [Broker](https://knative.dev/docs/eventing/broker/) which allows you route events to consumers like InferenceService.

=== "yaml"
```yaml
apiVersion: eventing.knative.dev/v1
kind: broker
metadata:
  name: default
```

=== "kubectl"
```bash
kubectl apply -f broker.yaml

kubectl get broker default
```

Take note of the broker **URL** as that is what we'll be using in the InferenceService later on.

### Create Trigger

We now create a [trigger](https://knative.dev/docs/eventing/triggers/) to forward the events to message-dumper service.
The trigger can specify a filter that enables selection of relevant events based on the Cloud Event context attributes.

=== "yaml"
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

=== "kubectl"
```bash
kubectl create -f trigger.yaml
```

### Create an InferenceService with Logger

Create a sklearn predictor with the `logger url` pointing to the Knative eventing multi-tenant broker in `knative-eventing` namespace.

=== "New Schema"

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

=== "Old Schema"

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
        sklearn:
          storageUri: gs://kfserving-examples/models/sklearn/1.0/model
    ```

Apply the `sklearn-knative-eventing.yaml`.

=== "kubectl"
```bash
kubectl create -f sklearn-knative-eventing.yaml
```

We can now send a request to the sklearn model. The first step is to [determine the ingress IP and ports](../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports) and set `INGRESS_HOST` and `INGRESS_PORT`

```bash
MODEL_NAME=sklearn-iris
INPUT_PATH=@./input.json
SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -o jsonpath='{.status.url}' | cut -d "/" -f 3)

curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
        "predictions": [1, 1]
    }
    ```

### Check CloudEvents

Check the logs of the message dumper, we can see the CloudEvents associated with our previous curl request.

=== "kubectl"
```bash
kubectl logs $(kubectl get pod -l serving.knative.dev/service=message-dumper -o jsonpath='{.items[0].metadata.name}') user-container
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
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
