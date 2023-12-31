# KServe Python Runtime API
KServe's python runtime API implements a standardized python model server API following [open inference protocol](https://github.com/kserve/open-inference-protocol).
It encapsulates data plane API definitions and storage retrieval for models.

It provides many functionalities, including among others:

* Implements the data plane API following open inference protocol.
* Provide extensible model server and model API.
* Allow customizing pre-processing, prediction and post-processing handlers.
* Readiness and liveness Handlers.

## Installation

KServe Python SDK can be installed by `pip` or `poetry`.

### pip install

```sh
pip install kserve
```

### Poetry

Checkout KServe GitHub repository and Install via [poetry](https://python-poetry.org/).

```sh
cd kserve/python/kserve
peotry install
```

## API Reference
::: kserve.model_server
::: kserve.model

## Storage API
The storage API is used by KServe `Storage Initializer` which supports the following cloud storage providers.

The storage package is optional and can be installed via
```sh
pip install kserve[storage]
```

* Google Cloud Storage with a prefix: "gs://"
    * By default, it uses `GOOGLE_APPLICATION_CREDENTIALS` environment variable for user authentication.
    * If `GOOGLE_APPLICATION_CREDENTIALS` is not provided, anonymous client will be used to download the artifacts.
* S3 Compatible Object Storage with a prefix "s3://"
    * For static credentials it uses `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` environment variables for authentication.
* Azure Blob Storage with the format: `https://{$STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{$CONTAINER}/{$PATH}`
    * By default, it uses anonymous client to download the artifacts.
    * For e.g. https://kfserving.blob.core.windows.net/triton/simple_string/
* Persistent Volume Claim (PVC) with the format `pvc://{$pvcname}/[path]`.
    * The `pvcname` is the name of the PVC that contains the model.
    * The `[path]` is the relative path to the model on the PVC.
    * For e.g. `pvc://mypvcname/model/path/on/pvc`
* Generic URI over either `HTTP` prefixed with `http://` or `HTTPS` prefixed with `https://`. 
  For example:
    * `https://<some_url>.com/model.joblib`
    * `http://<some_url>.com/model.zip`
