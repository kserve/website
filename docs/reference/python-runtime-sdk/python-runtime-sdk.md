---
title: Python Serving Runtime SDK
---

# KServe Python Serving Runtime SDK
KServe's python runtime API implements a standardized python model server API following [Open Inference Protocol](https://github.com/kserve/open-inference-protocol), [V1 protocol](../../concepts/architecture/data-plane/v1-protocol.md) and [OpenAI Protocol](https://platform.openai.com/docs/api-reference/introduction) using `FastAPI`.
It encapsulates data plane API definitions and storage retrieval for models.

It provides many functionalities, including among others:

* Implements the data plane API following open inference protocol.
* Provide extensible model server and model API.
* Allow customizing pre-processing, prediction and post-processing handlers.
* Readiness and liveness Handlers.

## Installation

KServe Python SDK can be installed by `pip` or `uv`.

### pip install

```sh
pip install kserve
```

### uv

Checkout KServe GitHub repository and Install via [uv](https://docs.astral.sh/uv/getting-started/installation/).

```sh
cd kserve/python/kserve
uv sync
```

## API Reference

For detailed API reference, please refer to the [Python Runtime SDK API Reference](python-runtime-sdk-api.md).

## Distributed Tracing

The Python ModelServer supports OpenTelemetry server instrumentation for REST and gRPC inference requests. Tracing dependencies are included in the `kserve` package; no separate tracing extra is needed. For controller-managed configuration and a deployment example, see [InferenceService distributed tracing](../../model-serving/predictive-inference/observability/distributed-tracing.md).

### Exporters and Sampling

Configure tracing through standard OpenTelemetry environment variables:

| Environment Variable | Purpose |
|----------------------|---------|
| `OTEL_SERVICE_NAME` | Service name attached to spans. The InferenceService controller sets a component-specific name. |
| `OTEL_TRACES_EXPORTER` | `otlp`, `console`, `otlp,console`, or `none`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP receiver endpoint. |
| `OTEL_TRACES_SAMPLER` | Sampling strategy, such as `always_on` or `parentbased_traceidratio`. |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument, such as `0.05` for ratio-based sampling. |
| `OTEL_SDK_DISABLED` | Set to `true` to disable SDK tracing instrumentation entirely. |

For example, export every inference request to the console when starting a custom Python model server:

```bash
OTEL_TRACES_EXPORTER=console OTEL_TRACES_SAMPLER=always_on python model.py
```

Setting an OTLP endpoint without `OTEL_TRACES_EXPORTER` selects the OTLP exporter. Without either setting, the SDK does not create an exporter. `OTEL_TRACES_EXPORTER=none` keeps instrumentation and context propagation enabled without exporting spans; it cannot be combined with another exporter. To disable instrumentation as well as export, use `OTEL_SDK_DISABLED=true`. See the guide's [current limitations](../../model-serving/predictive-inference/observability/distributed-tracing.md#connected-traces-and-limitations) for unconfigured-runtime behavior.

### OTLP Transport

The default OTLP transport is gRPC. To use HTTP/protobuf, set:

```bash
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

`OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` and `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` take precedence over the generic protocol and endpoint settings. TLS, authentication headers, and exporter timeouts use the standard [OpenTelemetry OTLP exporter settings](https://opentelemetry.io/docs/specs/otel/protocol/exporter/). Invalid exporter names or unsupported protocols cause the SDK to log a warning and disable tracing rather than prevent the model server from starting.

### Response Headers and Log Correlation

When a REST request has valid active trace context, the runtime returns a W3C `traceparent` response header and `tracestate` when available. Customize these response header names with `TRACE_RESPONSE_HEADER_NAME` and `TRACE_RESPONSE_TRACESTATE_HEADER_NAME`. These settings do not rename the standard incoming propagation headers.

The default KServe log format includes `trace_id` as a 32-character hexadecimal value, or `none` when no valid trace context is active. Custom logging configurations that use `%(trace_id)s` must attach the `kserve.logging.TraceIdFilter` filter to their handlers.

Instrumentation excludes selected non-inference routes, including REST `/`, `/metrics`, `/v2/health/live`, and `/v2/health/ready`, and the gRPC `ServerLive`, `ServerReady`, and `ModelReady` methods. Server instrumentation does not automatically instrument custom downstream clients or each application function.

## Storage API

### kserve-storage

A Python module for handling model storage and retrieval for KServe. This package provides a unified API to download models from various storage backends including cloud providers, file systems, and model hubs.

This module is mainly used by KServe `Storage Initializer` which supports the following cloud storage providers.

#### Features

- Support for multiple storage backends:
    - Local file system
    - Google Cloud Storage (GCS)
    - Amazon S3
    - Azure Blob Storage
    - Azure File Share
    - HTTP/HTTPS URLs
    - HDFS/WebHDFS
    - Hugging Face Hub
- Automatic extraction of compressed files (zip, tar.gz, tgz)
- Configuration via environment variables
- Logging and error handling

#### Installation

```sh
pip install kserve-storage
```

Or with Poetry:

```sh
uv add kserve-storage
```

#### Usage

The main entry point is the `Storage` class which provides a `download` method:

```python
from kserve_storage import Storage

# Download from GCS to a temporary directory
model_dir = Storage.download("gs://your-bucket/model")

# Download from S3 to a specific directory
model_dir = Storage.download("s3://your-bucket/model", "/path/to/destination")
```

#### Supported Storage Providers

##### Local File System

```python
model_dir = Storage.download("file:///path/to/model")
# or using direct path
model_dir = Storage.download("/path/to/model")
```

##### Google Cloud Storage

```python
model_dir = Storage.download("gs://bucket-name/model-path")
```

##### Amazon S3

```python
model_dir = Storage.download("s3://bucket-name/model-path")
```

##### Azure Blob Storage

```python
model_dir = Storage.download("https://account-name.blob.core.windows.net/container-name/model-path")
```

##### Azure File Share

```python
model_dir = Storage.download("https://account-name.file.core.windows.net/share-name/model-path")
```

##### HTTP/HTTPS URLs

```python
model_dir = Storage.download("https://example.com/path/to/model.zip")
```

##### HDFS

```python
model_dir = Storage.download("hdfs://path/to/model")
# or WebHDFS
model_dir = Storage.download("webhdfs://path/to/model")
```

##### Hugging Face Hub

```python
model_dir = Storage.download("hf://org-name/model-name")
# With specific revision
model_dir = Storage.download("hf://org-name/model-name:revision")
```

#### Environment Variables

##### Hugging Face Hub Configuration

These are all handled by the `huggingface_hub` package, you can see all the available environment variables [here](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables).

##### AWS/S3 Configuration / Environment variables

- `AWS_ENDPOINT_URL`: Custom endpoint URL for S3-compatible storage
- `AWS_ACCESS_KEY_ID`: Access key for S3
- `AWS_SECRET_ACCESS_KEY`: Secret access key for S3
- `AWS_DEFAULT_REGION`: AWS region
- `AWS_CA_BUNDLE`: Path to custom CA bundle
- `S3_VERIFY_SSL`: Enable/disable SSL verification
- `S3_USER_VIRTUAL_BUCKET`: Use virtual hosted-style URLs
- `S3_USE_ACCELERATE`: Use transfer acceleration
- `awsAnonymousCredential`: Use unsigned requests for public access

##### Azure Configuration

- `AZURE_STORAGE_ACCESS_KEY`: Storage account access key
- `AZ_TENANT_ID` / `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZ_CLIENT_ID` / `AZURE_CLIENT_ID`: Azure AD client ID
- `AZ_CLIENT_SECRET` / `AZURE_CLIENT_SECRET`: Azure AD client secret

##### HDFS Configuration

- `HDFS_SECRET_DIR`: Directory containing HDFS configuration files
- `HDFS_NAMENODE`: HDFS namenode address
- `USER_PROXY`: User proxy for HDFS
- `HDFS_ROOTPATH`: Root path in HDFS
- `KERBEROS_PRINCIPAL`: Kerberos principal for authentication
- `KERBEROS_KEYTAB`: Path to Kerberos keytab file
- `TLS_CERT`, `TLS_KEY`, `TLS_CA`: TLS configuration files
- `TLS_SKIP_VERIFY`: Skip TLS verification
- `N_THREADS`: Number of download threads

#### Storage Configuration

Storage configuration can be provided through environment variables:

- `STORAGE_CONFIG`: JSON string containing storage configuration
- `STORAGE_OVERRIDE_CONFIG`: JSON string to override storage configuration

## License

Apache License 2.0.
