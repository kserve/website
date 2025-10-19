---
title: Overview
description: An overview of the different storage options available for model artifacts in KServe.
---

# Storage Options for Model Artifacts in KServe

KServe supports various storage options for serving machine learning models, allowing you to integrate with different storage systems based on your organizational needs, security requirements, and infrastructure setup. This document provides an overview of the supported storage providers and configurations in KServe.

## Storage URI Configuration

KServe supports two approaches for specifying model storage:

- **Single Storage URI** - The traditional `storageUri` field for single model artifacts
- **[Multiple Storage URIs](./multiple-storage-uris.md)** - The newer `storageUris` field for fetching artifacts from multiple locations with custom mount paths

## Storage Providers

KServe can serve models from various storage locations, including:

### Cloud Storage
- **[Amazon S3](./providers/s3/s3.md)** - Store and serve models from Amazon S3 buckets.
- **[Google Cloud Storage (GCS)](./providers/gcs.md)** - Store and serve models from Google Cloud Storage buckets.
- **[Azure Blob Storage](./providers/azure.md)** - Store and serve models from Azure Blob Storage containers.

### Other Storage Options
- **[URI/HTTP(S)](./providers/uri.md)** - Serve models from HTTP or HTTPS URIs.
- **[Persistent Volume Claims (PVC)](./providers/pvc.md)** - Use Kubernetes PVCs to store and serve models.
- **[Hugging Face](./providers/hf.md)** - Directly serve models from the Hugging Face model hub.
- **[OCI Images](./providers/oci.md)** - Package and serve models as OCI container images using Modelcars.

## Storage Initializer

KServe's storage initializer is responsible for downloading model artifacts from their source location to a local directory where the model server can access them. The storage initializer works as an init container that downloads the model and makes it available to the model server container.

Key capabilities of the storage initializer:

- Downloads models from different storage providers
- Handles authentication to secure storage systems
- Supports custom certificates for secure connections
- Provides options for direct volume mounting with PVCs
- Enables modelcars for efficient model serving from OCI images

## Security and Authentication

When accessing storage providers that require authentication, KServe supports various authentication methods:

- **[Self-Signed Certificates](./certificate/self-signed.md)** - For storage systems with self-signed SSL certificates
- **Service Account Credentials** - For cloud storage providers
- **Access Keys and Secrets** - For S3-compatible storage systems

## Custom Storage Configuration

For advanced use cases, KServe offers two main customization paths:

1. **[Storage Containers](./storage-containers/storage-containers.md)** - Define custom initialization logic using the ClusterStorageContainer CRD
2. **Storage Credentials** - Configure storage credentials using Kubernetes secrets
