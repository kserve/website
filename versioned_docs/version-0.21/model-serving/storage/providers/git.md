---
title: Git
description: Deploy models to KServe InferenceService from git repository.
---

# Deploy InferenceService with a saved model from a URI

Git download supports https protocol only and no branches.

To use it, specify the model url in the following format: `https://github.com/kserve/kserve.git`

Specify username via either the environment variables `GIT_USERNAME`, or directly in the URL: `https://username@github.com/kserve/kserve.git`. When both present, username from URL takes precedence.

Specify password via the `GIT_PASSWORD` environment variable. Note that password via URL will be ignored.


# Password considerations

You should keep the password in a k8s `Secret`, e.g.:

```bash
kubectl create secret generic git-secret --from-literal=GIT_PASSWORD='yolo'
```

Which you can refer to like this:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
spec:
  predictor:
    model:
      env:
        - name: GIT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: git-secret
              key: GIT_PASSWORD
              optional: false
```
