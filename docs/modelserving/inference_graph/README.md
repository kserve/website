# Inference Graph

## Motivation

ML inference systems are getting bigger and more complex, they often consist of many models to make a single prediction. Some common use cases are image classification and natural language processing pipelines.
For example, a face recognition pipeline may need to first locate faces in a image, then compute the features of the faces to match records in a database. An NLP pipeline needs to first run document classification, then perform named entity detection downstream based on the previous classification results.

KServe has unique strengths for building a distributed inference graph: an autoscaling graph router, native integration with individual `InferenceServices`, and a standard inference protocol for chaining models. KServe leverages these strengths to build an `InferenceGraph` and enable users to deploy complex ML inference pipelines to production in a declarative and scalable way.

## Concepts

![image](images/inference_graph.png)

* **InferenceGraph**: Made up of a list of routing `Nodes`, where each `Node` consists of a set of routing `Steps`.
  Each `Step` can either route to an `InferenceService` or another `Node` defined on the graph which makes the `InferenceGraph`
  highly composable. The graph router is deployed behind an HTTP endpoint and can be scaled dynamically based on request volume.
  The `InferenceGraph` supports four different types of Routing `Nodes`: **Sequence**, **Switch**, **Ensemble**, **Splitter**.


* **Sequence Node**: Allows users to define multiple `Steps` with `InferenceServices` or `Nodes` as routing targets in a sequence.
  The `Steps` are executed in sequence and the request/response from the previous step can be passed to the next step as input based on
  configuration.


* **Switch Node**: Enables users to define routing conditions and select a step to execute if it matches a condition. The response
  is returned as soon it finds the first step that matches the condition. If no condition is matched, the graph returns the original request.


* **Ensemble Node**: A model ensemble requires scoring each model separately and then combining the results into a single prediction response.
  You can then use different combination methods to produce the final result. Multiple classification trees, for example, are commonly combined
  using a "majority vote" method. Multiple regression trees are often combined using various averaging techniques.


* **Splitter Node**: Allows users to split the traffic to multiple targets using a weighted distribution.

