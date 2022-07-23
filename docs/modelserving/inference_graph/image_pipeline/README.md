# Deploy Image Processing Inference pipeline with InferenceGraph

The tutorial demonstrates how to deploy an image processing inference pipeline with multiple stages using `InferenceGraph`.
The example chains the two models, the first model is to classify if an image is a dog or a cat, if it is a dog the second model then does
the dog breed classification.

## InferenceGraph Flow
In the `InferenceGraph` request flow, the image is encoded with base64 format and first sent to the `dog-cat-classifier` model,
the image input for the `dog-cat-classifier` InferenceService are then forwarded to send to the model on the next stage
to classify the breed if the previous model prediction is a dog.

## Deploy the individual InferenceServices

### Train the models
You can refer to [dog-cat classification](https://github.com/pytorch/serve/blob/master/examples/Workflows/dog_breed_classification/cat_dog_classification.ipynb)
and [dog breed classification](https://github.com/pytorch/serve/blob/master/examples/Workflows/dog_breed_classification/dog_breed_classification.ipynb) to train
the image classifier models for different stages.

### Deploy the InferenceServices
Before deploying the graph router with `InferenceGraph` custom resource, you need to first deploy the individual `InferenceServices`
with the models trained from previous step.

The models should be packaged with the following commands and then upload to your model storage along with the [configuration](./config/config.properties):
```bash
torch-model-archiver -f --model-name cat_dog_classification --version 1.0 \
--model-file cat_dog_classification_arch.py \
--serialized-file cat_dog_classification.pth \
--handler cat_dog_classification_handler.py \
--extra-files index_to_name.json --export-path model_store

torch-model-archiver -f --model-name dog_breed_classification --version 1.0 \
--model-file dog_breed_classification_arch.py \
--serialized-file dog_breed_classification.pth \
--handler dog_breed_classification_handler.py \
--extra-files index_to_name.json --export-path model_store
```

You can then deploy the models to KServe with following `InferenceService` custom resources.

=== "InferenceService"
```bash
kubectl apply -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "cat-dog-classifier"
spec:
  predictor:
    pytorch:
      resources:
        requests:
          cpu: 100m
      storageUri: gs://kfserving-examples/models/torchserve/cat_dog_classification
---
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "dog-breed-classifier"
spec:
  predictor:
    pytorch:
      resources:
        requests:
          cpu: 100m
      storageUri: gs://kfserving-examples/models/torchserve/dog_breed_classification
EOF
```

Please check more details on [PyTorch Tutorial](../../../modelserving/v1beta1/torchserve/README.md) for how to package the model and deploy
with `InferenceService`.

## Deploy InferenceGraph
After the `InferenceServices` are in ready state, you can now deploy the `InferenceGraph` to chain these two models to produce the final inference result.

=== "InferenceGraph"
```bash
kubectl apply -f - <<EOF
apiVersion: "serving.kserve.io/v1alpha1"
kind: "InferenceGraph"
metadata:
  name: "dog-breed-pipeline"
spec:
  nodes:
    root:
      routerType: Sequence
      steps:
      - serviceName: cat-dog-classifier
        name: cat_dog_classifier # step name
      - serviceName: dog-breed-classifier
        name: dog_breed_classifier
        data: $request
        condition: "[@this].#(predictions.0==\"dog\")"
EOF
```

The `InferenceGraph` defines the two steps and each step targets the `InferenceServices` deployed above. The steps
are executed in sequence: it first sends the image as request to `cat-dog-classifier` model and then send to the
`dog-breed-classifier` if it is classified as a dog from the first model.

* Note that `$request` is specified on the `data` field to indicate that you want to forward the request from the previous step and send as input to the next step.
* `condition` is specified on the second step so that the request is only sent to the current step if the `response` data matches the defined condition.
  When the condition is not matched the graph short circuits and returns the response from the previous step. Refer to [gjson syntax](https://github.com/tidwall/gjson/blob/master/SYNTAX.md)
  for how to express the condition and currently KServe only supports this with REST protocol.

## Test the InferenceGraph
Before testing the `InferenceGraph`, first check if the graph is in the ready state and then get the router url for sending the request.
```bash
kubectl get ig  dog-breed-pipeline
NAME                 URL                                             READY   AGE
dog-breed-pipeline   http://dog-breed-pipeline.default.example.com   True    17h
```

Now you can test the inference graph by sending the cat and dog image data.
```bash
SERVICE_HOSTNAME=$(kubectl get inferencegraph dog-breed-pipeline -o jsonpath='{.status.url}' | cut -d "/" -f 3)
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT} -d @./cat.json
{"predictions": ["It's a cat!"]}

curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT} -d @./dog.json
{"predictions": [{"Kuvasz": 0.9854059219360352, "American_water_spaniel": 0.006928909569978714, "Glen_of_imaal_terrier": 0.004635687451809645, "Manchester_terrier": 0.0011041086399927735, "American_eskimo_dog": 0.0003261661622673273}]}
```
You can see that if the first model classifies the image as dog it then sends to the second model and further classifies the dog breed,
if the image is classified as cat the `InferenceGraph` router returns the response from the first model.

