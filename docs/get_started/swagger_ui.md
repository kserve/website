## InferenceService Swagger UI

KServe ModelServer is built on top of [FastAPI](https://github.com/tiangolo/fastapi), which brings out-of-box support for [OpenAPI specification](https://www.openapis.org/) and [Swagger UI](https://swagger.io/tools/swagger-ui/).

Swagger UI allows visualizing and interacting with the KServe InferenceService API directly **in the browser**, making it easy for exploring the endpoints and validating the outputs without using any command-line tool.

![KServe ModelServer Swagger UI](../images/swagger/kserve-swagger-ui.png)

## Enable Swagger UI

!!! warning "Warning"

    Be careful when enabling this for your **production** InferenceService deployments
    since the endpoint does not require authentication at this time.

    Currently, `POST` request only work for `v2` endpoints in the UI.

To enable, simply add an extra argument to the InferenceService YAML example from [First Inference](../first_isvc) chapter:

```bash hl_lines="9"
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

After the InferenceService becomes ready the Swagger UI will be served at **`/docs`**. 
In our example above, the Swagger UI will be available at `http://sklearn-iris.kserve-test.example.com/docs`.

## Interact with InferenceService

Click one of the V2 endpoints like `/v2`, it will expand and display the description and response from this API endpoint:

![V2 Metadata](../images/swagger/v2-metadata.png)

Now, when you click "Try it out" and then "Execute", Swagger UI will send a `GET` request to the `/v2` endpoint. The server response body and headers will be displayed at the bottom:

![V2 Metadata](../images/swagger/v2-metadata-try-out.png)

Similarly, we can use Swagger UI to send request to check the model metadata and make prediction using the `/v2/models/{model_name}/infer` endpoint.

For more reference, please check out [Model Serving Data Plane](../modelserving/data_plane.md) for detailed documentation on the Inference Protocol.
