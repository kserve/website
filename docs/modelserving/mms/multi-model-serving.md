# The model deployment scalability problem

With machine learning approaches becoming more widely adopted in organizations,
there is a trend to deploy a large number of models.
For example, a news classification service may train custom models for each news category.
Another important reason why organizations desire to train a lot of models is to protect data privacy,
as it is safer to isolate each user's data and train models separately.
While you get the benefit of better inference accuracy and data privacy by building models for each use case,
it is more challenging to deploy thousands to hundreds of thousands of models on a Kubernetes cluster.
Furthermore, there are an increasing number of use cases of serving neural network-based models.
To achieve reasonable latency, those models are better served on GPUs.
However, since GPUs are expensive resources, it is costly to serve many GPU-based models.

The original design of KServe deploys one model per InferenceService.
But, when dealing with a large number of models,  its 'one model, one server' paradigm presents challenges for a Kubernetes cluster.
To scale the number of models, we have to scale the number of InferenceServices,
something that can quickly challenge the cluster's limits.

Multi-model serving is designed to address three types of limitations KServe will run into:

- Compute resource limitation
- Maximum pods limitation
- Maximum IP address limitation.

## Compute resource limitation
Each InferenceService has a resource overhead because of the sidecars injected into each pod.
This normally adds about 0.5 CPU and 0.5G Memory resource per InferenceService replica.
For example, if we deploy 10 models, each with 2 replicas, then the resource overhead is 10 * 2 * 0.5 = 10 CPU and 10 * 2 * 0.5 = 10 GB memory.
Each model’s resource overhead is 1CPU and 1 GB memory.
Deploying many models using the current approach will quickly use up a cluster's computing resource.
With Multi-model serving, these models can be loaded in one InferenceService,
then each model's average overhead is 0.1 CPU and 0.1GB memory.
For GPU based models, the number of GPUs required grows linearly as the number of models grows, which is not cost efficient.
If multiple models can be loaded in one GPU enabled model server such as TritonServer, we need a lot less GPUs in the cluster.

## Maximum pods limitation
Kubelet has a maximum number of pods per node with the default limit set to [110](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/).
According to Kubernetes best [practice](https://kubernetes.io/docs/setup/best-practices/cluster-large/),
a node shouldn't run more than 100 pods.
With this limitation, a typical 50-node cluster with default pod limit can run at most 1000 models
 assuming each InferenceService has 4 pods on average (two transformer replicas and two predictor replicas).

## Maximum IP address limitation.
Kubernetes clusters also have an IP address limit per cluster.
Each pod in InferenceService needs an independent IP.
For example a cluster with 4096 IP addresses can deploy at most 1024 models assuming each InferenceService has 4 pods on average (two transformer replicas and two predictor replicas).

## Benefit of using ModelMesh for Multi-Model serving
Multi-model serving with ModelMesh addresses the three limitations above.
It decreases the average resource overhead per model so model deployment becomes more cost efficient.
And the number of models which can be deployed in a cluster will no longer be limited
by the maximum pods limitation and the maximum IP address limitation.

Learn more about ModelMesh [here]().
