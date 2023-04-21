# Example Anchors Text Explaination for Movie Sentiment

This example uses a [movie sentiment dataset](http://www.cs.cornell.edu/people/pabo/movie-review-data/) to show the explanation on text data, for a more visual walkthrough please try the [Jupyter notebook](movie_review_explanations.ipynb).

## Deploy InferenceService with AnchorText Explainer
We can create a InferenceService with a trained sklearn predictor for this dataset and an associated explainer. 
The black box explainer algorithm we will use is the Text version of Anchors from the [Alibi open source library](https://github.com/SeldonIO/alibi).
More details on this algorithm and configuration settings that can be set can be found in the [Seldon Alibi documentation](https://docs.seldon.io/projects/alibi/en/stable/).

The InferenceService is shown below:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "moviesentiment"
spec:
  predictor:
    minReplicas: 1
    sklearn:
      storageUri: "gs://seldon-models/v1.16.0/sklearn/moviesentiment"
      resources:
        requests:
          cpu: 0.1
          memory: 1Gi       
        limits:
          cpu: 1
          memory: 1Gi         
  explainer:
    minReplicas: 1
    alibi:
      type: AnchorText
      resources:
        requests:
          cpu: 0.1
          memory: 6Gi
        limits:
          memory: 6Gi
```

Create this InferenceService:

=== "kubectl"
```bash
kubectl create -f moviesentiment.yaml
```

## Run Inference and Explanation
Set up some environment variables for the model name and cluster entrypoint.

```bash
MODEL_NAME=moviesentiment
SERVICE_HOSTNAME=$(kubectl get inferenceservice moviesentiment -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```

Test the predictor on an example sentence:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```

You should receive the response showing negative sentiment:

!!! success "Expected Output"
    ```{ .json .no-copy }
    {"predictions": [0]}
    ```

Test on another sentence:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d '{"instances":["a touching , sophisticated film that almost seems like a documentary in the way it captures an italian immigrant family on the brink of major changes ."]}'
```

You should receive the response showing positive sentiment:

!!! success "Expected Output"
    ```{ .json .no-copy }
    {"predictions": [1]}
    ```

Now lets get an explanation for the first sentence:


```bash
curl -v -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:explain -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "names": [
        "exercise"
      ],
      "precision": 1,
      "converage": 0.5005,
      "raw": {
        "feature": [
          9
        ],
        "mean": [
          1
        ],
        "precision": [
          1
        ],
        "coverage": [
          0.5005
        ],
        "examples": [
          {
            "covered": [
              [
                "a visually UNK UNK UNK opaque and emotionally vapid exercise UNK"
              ],
              [
                "a visually flashy but UNK UNK and emotionally UNK exercise ."
              ],
              [
                "a visually flashy but narratively UNK UNK UNK UNK exercise ."
              ],
              [
                "UNK UNK flashy UNK narratively opaque UNK UNK vapid exercise ."
              ],
              [
                "UNK visually UNK UNK UNK UNK and UNK vapid exercise UNK"
              ],
              [
                "UNK UNK UNK but UNK opaque UNK emotionally UNK exercise UNK"
              ],
              [
                "a UNK flashy UNK UNK UNK and emotionally vapid exercise ."
              ],
              [
                "UNK UNK flashy UNK narratively opaque UNK emotionally UNK exercise ."
              ],
              [
                "UNK UNK flashy UNK narratively opaque UNK UNK vapid exercise UNK"
              ],
              [
                "a visually UNK but narratively opaque UNK UNK vapid exercise UNK"
              ]
            ],
            "covered_true": [
              [
                "UNK visually flashy but UNK UNK and emotionally vapid exercise ."
              ],
              [
                "UNK visually UNK UNK UNK UNK and UNK UNK exercise ."
              ],
              [
                "a UNK UNK UNK narratively opaque UNK UNK UNK exercise UNK"
              ],
              [
                "a visually UNK UNK narratively opaque UNK UNK UNK exercise UNK"
              ],
              [
                "a UNK UNK UNK UNK UNK and emotionally vapid exercise UNK"
              ],
              [
                "a UNK flashy UNK narratively UNK and UNK vapid exercise UNK"
              ],
              [
                "UNK visually UNK UNK narratively UNK and emotionally UNK exercise ."
              ],
              [
                "UNK visually flashy UNK narratively opaque UNK emotionally UNK exercise UNK"
              ],
              [
                "UNK UNK flashy UNK UNK UNK and UNK vapid exercise UNK"
              ],
              [
                "a UNK flashy UNK UNK UNK and emotionally vapid exercise ."
              ]
            ],
            "covered_false": [],
            "uncovered_true": [],
            "uncovered_false": []
          }
        ],
        "all_precision": 0,
        "num_preds": 1000101,
        "names": [
          "exercise"
        ],
        "positions": [
          63
        ],
        "instance": "a visually flashy but narratively opaque and emotionally vapid exercise .",
        "prediction": 0
      }
    }
    
    ```

This shows the key word "bad" was identified and examples show it in context using the default "UKN" placeholder for surrounding words.


## Custom Configuration

You can add custom configuration for the Anchor Text explainer in the 'config' section. For example, we can change the text explainer to sample from the corpus rather than use UKN placeholders:

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "moviesentiment"
spec:
  predictor:
    sklearn:
      storageUri: "gs://seldon-models/v1.16.0/sklearn/moviesentiment"
      resources:
        requests:
          cpu: 0.1
  explainer:
    alibi:
      type: AnchorText
      config:
        use_unk: "false"
        sample_proba: "0.5"	  
      resources:
        requests:
          cpu: 0.1
```

If we apply this:

=== "kubectl"
```bash
kubectl create -f moviesentiment2.yaml
```

and then ask for an explanation:

```bash
curl -H "Host: ${SERVICE_HOSTNAME}" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:explain -d '{"instances":["a visually flashy but narratively opaque and emotionally vapid exercise ."]}'
```

!!! success "Expected Output"

    ```{ .json .no-copy }
    {
      "names": [
        "exercise"
      ],
      "precision": 0.9918032786885246,
      "coverage": 0.5072,
      "raw": {
        "feature": [
          9
        ],
        "mean": [
          0.9918032786885246
        ],
        "precision": [
          0.9918032786885246
        ],
        "coverage": [
          0.5072
        ],
        "examples": [
          {
            "covered": [
              [
                "each visually playful but enormously opaque and academically vapid exercise ."
              ],
              [
                "each academically trashy but narratively pigmented and profoundly vapid exercise ."
              ],
              [
                "a masterfully flashy but narratively straightforward and verbally disingenuous exercise ."
              ],
              [
                "a visually gaudy but interestingly opaque and emotionally vapid exercise ."
              ],
              [
                "some concurrently flashy but philosophically voxel and emotionally vapid exercise ."
              ],
              [
                "a visually flashy but delightfully sensible and emotionally snobby exercise ."
              ],
              [
                "a surprisingly bland but fantastically seamless and hideously vapid exercise ."
              ],
              [
                "both visually classy but nonetheless robust and musically vapid exercise ."
              ],
              [
                "a visually fancy but narratively robust and emotionally uninformed exercise ."
              ],
              [
                "a visually flashy but tastefully opaque and weirdly vapid exercise ."
              ]
            ],
            "covered_true": [
              [
                "another visually flashy but narratively opaque and emotionally vapid exercise ."
              ],
              [
                "the visually classy but narratively opaque and emotionally vapid exercise ."
              ],
              [
                "the visually arty but overshadow yellowish and emotionally vapid exercise ."
              ],
              [
                "a objectively flashy but genuinely straightforward and emotionally vapid exercise ."
              ],
              [
                "a visually flashy but tastefully opaque and weirdly vapid exercise ."
              ],
              [
                "a emotionally crafty but narratively opaque and emotionally vapid exercise ."
              ],
              [
                "some similarly eclectic but narratively dainty and emotionally illogical exercise ."
              ],
              [
                "a nicely flashy but psychologically opaque and emotionally vapid exercise ."
              ],
              [
                "a visually flashy but narratively colorless and emotionally vapid exercise ."
              ],
              [
                "every properly lavish but logistically opaque and someway incomprehensible exercise ."
              ]
            ],
            "covered_false": [
              [
                "another enormously inventive but socially opaque and somewhat idiotic exercise ."
              ],
              [
                "each visually playful but enormously opaque and academically vapid exercise ."
              ]
            ],
            "uncovered_true": [],
            "uncovered_false": []
          }
        ],
        "all_precision": 0,
        "num_preds": 1000101,
        "names": [
          "exercise"
        ],
        "positions": [
          63
        ],
        "instance": "a visually flashy but narratively opaque and emotionally vapid exercise .",
        "prediction": 0
      }
    }
    
    ```

## Run on Notebook

You can also run this example on [notebook](./movie_review_explanations.ipynb)
