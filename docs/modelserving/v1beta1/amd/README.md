# AMD Inference Server

The [AMD Inference Server](https://xilinx.github.io/inference-server/main/index.html) is an easy-to-use inferencing solution specially designed for AMD CPUs, GPUs, and FPGAs.
It can be deployed as a standalone executable or on a Kubernetes cluster with KServe or used to create custom applications by linking to its C++ API.
This example demonstrates how to deploy a Tensorflow GraphDef model on KServe with the AMD Inference Server to run inference on [AMD EPYC CPUs](https://www.amd.com/en/processors/epyc-server-cpu-family).

## Prerequisites

This example was tested on an Ubuntu 18.04 host machine using the Bash shell.

These instructions assume:

 - You have a machine with a modern version of Docker (>=18.09) and sufficient disk space to build the image

 - You have a Kubernetes cluster set up

 - KServe has been installed on the Kubernetes cluster

 - Some familiarity with Kubernetes / KServe

Refer to the installation instructions for these tools to install them if needed.

## Set up the image

This example uses the [AMD ZenDNN](https://developer.amd.com/zendnn/) backend to run inference on TensorFlow models on AMD EPYC CPUs.

### Build the image

To build a Docker image for the AMD Inference Server that uses this backend, download the `TF_v2.9_ZenDNN_v3.3_C++_API.zip` package from ZenDNN.
You must agree to the EULA to download this package.
You need a modern version of Docker (at least 18.09) to build this image.

```bash
# clone the inference server repository
git clone https://github.com/Xilinx/inference-server.git

# place the downloaded ZenDNN zip in the repository
mv TF_v2.9_ZenDNN_v3.3_C++_API.zip ./inference-server/

# build the image
cd inference-server
./amdinfer dockerize --production --tfzendnn=./TF_v2.9_ZenDNN_v3.3_C++_API.zip
```

This builds an image on your host: `<username>/amdinfer:latest`.
To use with KServe, you need to upload this image to a Docker registry server such as on a [local server](https://docs.docker.com/registry/deploying/).
You will also need to update the YAML files in this example to use this image.

More documentation for building a ZenDNN image for KServe is available: [ZenDNN + AMD Inference Server](https://xilinx.github.io/inference-server/main/zendnn.html) and [KServe + AMD Inference Server](https://xilinx.github.io/inference-server/main/kserve.html).

## Set up the model

In this example, you will use an [MNIST Tensorflow model](https://github.com/Xilinx/inference-server/blob/main/tests/assets/mnist.zip).
The AMD Inference Server also supports PyTorch, ONNX and [Vitis AI models](https://github.com/Xilinx/Vitis-AI/tree/master/model_zoo) models with the appropriate Docker images.
To prepare new models, look at the [KServe + AMD Inference Server documentation](https://xilinx.github.io/inference-server/main/kserve.html) for more information about the expected model format.

## Make an inference

The AMD Inference Server can be used in single model serving mode in KServe.
The code snippets below use the environment variables `INGRESS_HOST` and `INGRESS_PORT` to make requests to the cluster.
[Find the ingress host and port](https://kserve.github.io/website/master/get_started/first_isvc/#4-determine-the-ingress-ip-and-ports) for making requests to your cluster and set these values appropriately.

### Add the ClusterServingRuntime

To use the AMD Inference Server with KServe, add it as a [serving runtime](https://kserve.github.io/website/master/modelserving/servingruntimes/).
A `ClusterServingRuntime` configuration file is included in this example.
To apply it:

```bash
# update the kserve-amdserver.yaml to use the right image
# if you have a different image name, you'll need to edit it manually
sed -i "s/<image>/$(whoami)\/amdinfer:latest/" kserve-amdserver.yaml

kubectl apply -f kserve-amdserver.yaml
```

### Single model serving

Once the AMD Inference Server has been added as a serving runtime, you can start a service that uses it.

```bash
# download the inference service file and input data
curl -O https://raw.githubusercontent.com/kserve/website/master/docs/modelserving/v1beta1/amd/single_model.yaml
curl -O https://raw.githubusercontent.com/kserve/website/master/docs/modelserving/v1beta1/amd/input.json

# create the inference service
kubectl apply -f single_model.yaml

# wait for service to be ready
kubectl wait --for=condition=ready isvc -l app=example-amdserver-runtime-isvc

export SERVICE_HOSTNAME=$(kubectl get inferenceservice example-amdserver-runtime-isvc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

### Make a request with REST

Once the service is ready, you can make requests to it.
Assuming that `INGRESS_HOST`, `INGRESS_PORT`, and `SERVICE_HOSTNAME` have been defined as above, the following command runs an inference over REST to the example MNIST model.

```bash
export MODEL_NAME=mnist
export INPUT_DATA=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/${MODEL_NAME}/infer -d ${INPUT_DATA}
```

This shows the response from the server in KServe's v2 API format.
For this example, it will be similar to:

!!! success "Expected Output"
    ```{ .json .no-copy }
    {
      "id":"",
      "model_name":"TFModel",
      "outputs":
        [
          {
            "data": [
              0.11987821012735367,
              0.18648317456245422,
              -0.83796119689941406,
              -0.088459312915802002,
              0.030454874038696289,
              0.074872657656669617,
              -1.1334009170532227,
              -0.046301722526550293,
              -0.31683838367462158,
              0.32014602422714233
            ],
            "datatype":"FP32",
            "name":"input-0",
            "parameters":{},
            "shape":[10]
          }
        ]
    }
    ```

For MNIST, the data indicates the likely classification for the input image, which is the number 9.
In this response, the index with the highest value is the last one, indicating that the image was correctly classified as nine.
