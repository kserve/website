# TrustyAI explainer

This is an example of how to use the [TrustyAI project](https://github.com/trustyai-explainability)'s KServe custom explainer.

The TrustyAI KServe explainer includes two explainer types: LIME (Local Interpretable Model-agnostic Explanations) and SHAP (SHapley Additive exPlanations) supporting tabular data models.

In this example, we will use the "California Housing Dataset". This dataset is available as part of `scikit-learn` and targets the median house value for California districts (scaled to 100k USD units), from eight input features including median income, average number of rooms per household and block group population.

For example purposes, we trained a Random Forest regression and provide it ready for deployment with the following `InferenceService`:
To enable the TrustyAI explainer in your `InferenceService`, simply use

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "housing"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: https://github.com/trustyai-explainability/model-collection/raw/main/housing-data/model.joblib
  explainer:
    containers:
      - name: explainer
        image: quay.io/trustyai/trustyai-kserve-explainer:latest
```

=== "kubectl"
```bash
export NAMESPACE="kserve-explainer"

kubectl create namespace ${NAMESPACE}
kubectl create -f housing.yaml -n ${NAMESPACE}
```

To verify that the `InferenceService` is deployed you can run:

!!! success "Expected Output"
    ```{ .bash .no-copy }
    $ namespace/kserve-explainer created
    $ inferenceservice.serving.kserve.io/housing created

    kubectl get pods -n ${NAMESPACE}
    NAME                                                  READY   STATUS    RESTARTS   AGE
    housing-explainer-00001-deployment-75c56fdc65-wc2p5   2/2     Running   0          4m13s
    housing-predictor-00001-deployment-85fc685954-lp8z2   2/2     Running   0          4m13s
    ```

Once the `InferenceService` is deployed and ready, we can start by issuing an inference request.
Here we will assume that the gateway service is available via port-forward, for simplicity.

=== "Port Forward"
    Alternatively you can do `Port Forward` for testing purposes.
    ```bash
    INGRESS_GATEWAY_SERVICE=$(kubectl get svc --namespace istio-system --selector="app=istio-ingressgateway" --output jsonpath='{.items[0].metadata.name}')
    kubectl port-forward --namespace istio-system svc/${INGRESS_GATEWAY_SERVICE} 8080:80
    ```
    Open another terminal, and enter the following:
    ```bash
    export INGRESS_HOST=localhost
    export INGRESS_PORT=8080
    export SERVICE_HOSTNAME=$(kubectl get inferenceservice housing -n $NAMESPACE -o jsonpath='{.status.url}' | cut -d "/" -f 3)
    ```


We can create a payload JSON file `payload.json` with the following contents as an example:

```json
{
    "instances": [
        [
            6.6227,
            20.0,
            6.282147315855181,
            1.0087390761548065,
            2695.0,
            3.3645443196004994,
            37.42,
            -121.86
        ]
    ]
}
```

```shell
curl -sv -X POST -H "Content-Type: application/json" \
    -H "Host: ${SERVICE_HOSTNAME}" \
    http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/housing:predict \
    -d @payload.json
```

We will get the following result, indicating a predicted house value of approximately $291k.

!!! success "Expected Output"
```json
{"predictions":[2.9168394017053823]}
```

By default, the TrustyAI explainer returns both a SHAP and a LIME explanation.
These explanations will consist of a feature saliency map in the case of LIME, and a breakdown of individual feature contributions to the final result (relative to a dataset background value) for SHAP. The way in which the TrustyAI explainer creates the background dataset (especially in the "cold start" case in detailed in the [SHAP background generation](#shap-background-generation) section). We can request the explanation by using the same payload and the `:explain` endpoint.

```shell
curl -sv -X POST -H "Content-Type: application/json" \
    -H "Host: ${SERVICE_HOSTNAME}" \
    http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/housing:explain \
    -d @payload.json
```

!!! success "Expected Output"
```json
{
    "timestamp": "2024-08-14T10:39:25.439+00:00",
    "type": "explanation",
    "saliencies": {
        "LIME": {
            "outputs-0": [
                {
                    "name": "inputs-4",
                    "score": 0.8752282972400102,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-1",
                    "score": 0.8510641096679439,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-7",
                    "score": 0.0,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-5",
                    "score": 0.06190946209542338,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-3",
                    "score": 0.045357719680479414,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-2",
                    "score": 0.04814487416008339,
                    "confidence": 0.0
                }
            ]
        },
        "SHAP": {
            "outputs-0": [
                {
                    "name": "inputs-0",
                    "score": -0.0883804018056985,
                    "confidence": 0.04304153489780625
                },
                {
                    "name": "inputs-1",
                    "score": 0.0,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-2",
                    "score": 0.05919873703962664,
                    "confidence": 0.04304153489780624
                },
                {
                    "name": "inputs-3",
                    "score": 0.0,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-4",
                    "score": 0.0,
                    "confidence": 0.0
                },
                {
                    "name": "inputs-5",
                    "score": -0.2214697499218062,
                    "confidence": 0.04304153489780625
                },
                {
                    "name": "inputs-6",
                    "score": 0.056336605210644264,
                    "confidence": 0.04304153489780625
                },
                {
                    "name": "inputs-7",
                    "score": 0.054585492932784946,
                    "confidence": 0.0860830697956125
                },
                {
                    "name": "Background",
                    "score": 3.056568718249831,
                    "confidence": 0.0
                }
            ]
        }
    }
}
```

## Aditional configuration

Additional explainer configuration can be made via environment variables on the `InferenceService`.
For instance, to have only SHAP explanations we could use:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "housing"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: https://github.com/trustyai-explainability/model-collection/raw/main/housing-data/model.joblib
  explainer:
    containers:
      - name: explainer
        image: quay.io/trustyai/trustyai-kserve-explainer:latest
        env:
          - name: EXPLAINER_TYPE
            value: "SHAP"
```

Through environment variables, we can also configure several explainer parameters such as

* Number of samples used by the explainers to explore the decision boundary
* Use of weighted liner regressions
* Weight normalization
* SHAP background data size
* SHAP backbround diversity

A full list of the available configuration options is available at the [explainer's repository](https://github.com/trustyai-explainability/trustyai-kserve-explainer/blob/main/README.md).

## SHAP background generation

For SHAP to produce meaningful explanations, it requires a diverse set of baseline data (or "background" data).
This can be problematic in the "cold start" scenario, where very few observations are available.

The TrustyAI explainer tries to mitigate this problem by keeping a fixed size storage of past data (size configurable via `EXPLAINER_SHAP_BACKGROUND_QUEUE`) and populating the missing observations that make up the queue with samples from an empirical distribution created from the data observed so far.
The more data is passed to the `InferenceService`, the less the explainer will rely on synthetic data, keeping only a number of synthetic samples for diversity purposes (configurable with `EXPLAINER_SHAP_BACKGROUND_DIVERSITY`).
