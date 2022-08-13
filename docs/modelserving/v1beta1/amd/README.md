# AMD Inference Server

The [AMD Inference Server](https://xilinx.github.io/inference-server/main/index.html) is an easy-to-use inferencing solution specially designed for AMD CPUs, GPUs, and FPGAs.
It can be deployed as a standalone executable or on a Kubernetes cluster with KServe or used to create custom applications by linking to its C++ API.
This example demonstrates how to deploy a Tensorflow GraphDef model on KServe with the AMD Inference Server.

## Prerequisites

These example was tested on an Ubuntu 18.04 host machine using the Bash shell.

These instructions assume:
- You have a machine with a modern version of Docker (>=18.09) and sufficient disk space to build the image
- You have a Kubernetes cluster set up
- KServe has been installed on the Kubernetes cluster
- Some familiarity with Kubernetes / KServe

Refer to the installation instructions for these tools to install them if needed.

## Set Up the Image

This example uses the [AMD ZenDNN](https://developer.amd.com/zendnn/) backend to run inference on TensorFlow models.
To build a Docker image for the AMD Inference Server that uses this backend, download the `TF_v2.9_ZenDNN_v3.3_C++_API.zip` package from ZenDNN.
You must agree to the EULA to download this package.
You need a modern version of Docker (at least 18.09) to build this image.

```bash
# clone the inference server repository
git clone https://github.com/Xilinx/inference-server.git

# place the downloaded ZenDNN zip in the repository
mv *.zip ./inference-server/

# build the image
cd inference-server
./proteus dockerize --production --tfzendnn=./TF_v2.9_ZenDNN_v3.3_C++_API.zip
```

This builds an image on your host: `<username>/proteus:latest`.
This image can now be uploaded to a [local Docker registry server](https://docs.docker.com/registry/deploying/) to use with KServe.
You will need to update the YAML files in this example to use this image.

More documentation for building a ZenDNN image for KServe is available: [ZenDNN + Inference Server](https://xilinx.github.io/inference-server/main/zendnn.html) and [KServe + Inference Server](https://xilinx.github.io/inference-server/main/kserve.html).

## Set up the model

In this example, you will use an [MNIST Tensorflow model](https://github.com/Xilinx/inference-server/blob/main/tests/assets/mnist.zip).

To use your own models, you first need a GraphDef model to serve.
One way to do this is to [freeze a checkpoint](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/tools/freeze_graph.py).
Once you have the model, you also need a `config.pbtxt`, which defines some metadata about your model such as its name and input/output tensors.
The `config.pbtxt` for our example MNIST model is the following:

```
name: "mnist"
platform: "tensorflow_graphdef"
inputs [
  {
    name: "images_in"
    datatype: "FP32"
    shape: [28,28,1]
  }
]
outputs [
  {
    name: "flatten/Reshape"
    datatype: "FP32"
    shape: [10]
  }
]
```

The name, platform, inputs and outputs must all be defined.
Some notes about the acceptable values:
- the name must uniquely identify a model for the server
- the platform must be one of `tfzendnn_graphdef` or `vitis_xmodel`
- for each input/output, the name, datatype, and shape must be defined
  - the name corresponds to the name of the input/output tensor(s). Multiple input/output tensors aren't currently supported
  - the shape must be a flat array describing the shape of the input/output tensor

The final model directory structure looks like:

```
/
├─ model_a/
│  ├─ 1/
│  │  ├─ saved_model.pb
│  ├─ config.pbtxt
```

The names for the files (`saved_model.x` and `config.pbtxt`) must match as above.
The file extension for `tfzendnn_graphdef` and `vitis_xmodel` models should be `.pb` and `.xmodel`, respectively.
This model can now be zipped and stored on a web server or made available on a cloud storage platform compatible with KServe.

## Make an inference

The AMD Inference Server can be used in single or multi-model serving mode in KServe.
The code snippets below use the environment variables `INGRESS_HOST` and `INGRESS_PORT` to make requests to the cluster.
[Find the ingress host and port](https://kserve.github.io/website/master/get_started/first_isvc/#4-determine-the-ingress-ip-and-ports) for making requests to your cluster and set these values appropriately.

### Single model serving

```bash
# download the inference service file and input data
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/amd/single_model.yaml
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/amd/input.json

# update the single_model.yaml to use your custom image
sed -i 's/<image>/some_new_image/' single_model.yaml

# create the inference service
kubectl apply -f single_model.yaml

# wait for service to be ready
kubectl wait --for=condition=ready isvc -l app=example-amdserver-single-isvc

export SERVICE_HOSTNAME=$(kubectl get inferenceservice example-amdserver-single-isvc -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

### Multi model serving

```bash
# download the inference service file and input data
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/amd/multi_model.yaml
curl -O https://raw.githubusercontent.com/kserve/kserve/master/docs/samples/v1beta1/amd/input.json

# update the multi_model.yaml to use the custom image
sed -i 's/<image>/some_new_image/' multi_model.yaml

# create the inference service
kubectl apply -f multi_model.yaml

# wait for service to be ready
kubectl wait --for=condition=ready isvc -l app=example-amdserver-multi-isvc

# add a model to serve: our MNIST model
kubectl apply -f trained_model.yaml

export SERVICE_HOSTNAME=$(kubectl get inferenceservice example-amdserver-multi-isvc -o jsonpath='{.status.url}' | cut -d "/" -f 3)

# wait until the model is ready
until curl --fail -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v2/models/mnist/ready &> /dev/null; do echo "Waiting for model..."; sleep 2; done
```

You can add additional models on the same `InferenceService` by applying more `TrainedModel` yaml files.

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

```{ .bash .no-copy }
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
