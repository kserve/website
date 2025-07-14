# Inference Graph Overview

This page serves as a quick reference to the Inference Graph feature. It briefly shows the relevant parts of the API to configure the different graph constructs. Make sure to review the [API Reference](../../reference/crd-api.mdx##inferencegraph) page to learn the full spec.

## InferenceGraph general spec

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: string
spec:
  nodes:
    <node-name>:
      routerType: Sequence|Switch|Ensemble|Splitter
      steps:
      - serviceName: string          # (Target) InferenceService name
        serviceUrl: string           # (Target) URL for external services
        nodeName: string             # (Target) Reference to another node in this Inference Graph
        name: string                 # Step name. If specified, it should be unique within the node
        condition: string            # GJSON expression
        data: string                 # Data to pass to next step
        weight: integer              # For Splitter nodes (0-100)
```

### Router Types

| Type       | Description                      | Required Fields (under `steps`) | Optional Fields (under `steps`) |
|------------|----------------------------------|---------------------------------|---------------------------------|
| `Sequence` | Execute steps in order           | -                               | `condition`, `data`             |
| `Switch`   | Execute first matching condition | `condition`                     | -                               |
| `Ensemble` | Execute all steps in parallel    | -                               | -                               |
| `Splitter` | Distribute traffic by weight     | `weight`                        | -                               |

:::tip
- The node that will be the entrypoint of the graph must be named `root`.
- Only one target is allowed per step: `serviceName`, `serviceUrl`, or `nodeName`.
- Check [GJSON repository](https://github.com/tidwall/gjson) for the available `condition` syntax.
- The `data` field specifies what data to pass to the target:
    - Currently, only `$response` is supported to pass the previous step response as input to the target.
    - Otherwise, the default is to use the original input received on the `node` as input to the target; i.e. the same input for the first step is used.
- On a Splitter node, weights across all steps must sum to 100.
:::

## Sequence router type

Sequence nodes execute steps in order, making them suitable for multi-stage pipelines where each step depends on the previous one. The steps can have a conditional.

An example of the structure of a Sequence is as follows:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: sequential-processing-pipeline
spec:
  nodes:
    root:
      routerType: Sequence
      steps:
      - serviceName: preprocessor
        name: preprocess_step
      - serviceName: classifier
        name: classify
        data: $response
      - serviceName: text-classifier
        name: classify_text
        condition: "[@this].#(predictions.0.class==\"news\")"
      - serviceName: named-entity-recognition
        name: classify_news
        condition: "[@this].#(predictions.0.class==\"sports\")"
```

:::tip
- Notice that only the `classify` step specifies `data: $response`. It is the only one that will receive the output of the previous step (the `preprocess_step`) as its input. The remaining steps will use the same request data.
- If the conditional of the `classify_text` step is not fulfilled, any subsequent steps will not execute (in this example, the `classify_news`).
:::

## Switch router type

Switch nodes enable conditional routing where only one path is executed based on conditions on the input.

An example of the structure of a Switch is as follows:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: conditional-routing-pipeline
spec:
  nodes:
    root:
      routerType: Switch
      steps:
      - serviceName: upper
        condition: "[@this].#(instances.0.data>0.9)"
      - serviceName: lower
        condition: "[@this].#(instances.0.data<=0.5)"
      - nodeName: middle
        condition: "[@this].#(instances.0.data>0.5 && instances.0.data<=0.9)"
```

## Ensemble router type

Ensemble nodes execute multiple steps in parallel and combine their responses.

An example of the structure of an Ensemble is as follows:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: model-ensemble
spec:
  nodes:
    root:
      routerType: Ensemble
      steps:
      - serviceName: model-a
        name: model_a
      - serviceName: model-b
        name: model_b
      - serviceName: model-c
        name: model_c
```

### Response Combination

Ensemble responses are automatically combined in a key-value array. The keys are the names of the steps in the ensemble:

```json
{
  "model_a": {
    ...
  },
  "model_b": {
    ...
  },
  "model_c": {
    ...
  }
}
```

## Splitter router type

Splitter nodes distribute traffic across multiple targets based on weights. The weights must sum to 100, and each request is routed to exactly one target based on the probability distribution defined by the weights.

An example of the structure of a Splitter is as follows:

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: traffic-splitter
spec:
  nodes:
    root:
      routerType: Splitter
      steps:
      - serviceName: model-a
        name: target_a
        weight: 50
      - serviceName: model-b
        name: target_b
        weight: 30
      - serviceName: model-c
        name: target_c
        weight: 20
```

## Referencing other nodes in the graph

The steps on a node can refer to other nodes in the Inference Graph, allowing the combination of different node types to create complex pipelines: 

```yaml
apiVersion: serving.kserve.io/v1alpha1
kind: InferenceGraph
metadata:
  name: combined-nodes
spec:
  nodes:
    root:
      routerType: Sequence
      steps:
      - nodeName: choose
        name: split
      - nodeName: parallel
        name: ensemble

    choose:
      routerType: Splitter
      steps: [...]

    parallel:
      routerType: Ensemble
      steps: [...]
```
