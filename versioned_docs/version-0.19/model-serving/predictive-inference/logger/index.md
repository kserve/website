---
title: Inference Logger Overview
description: "Overview of KServe's inference logging capabilities for monitoring and tracking model predictions"
---

# Inference Logger

Inference logging allows you to capture and monitor your model's inference requests and responses in KServe. This feature is useful for monitoring model performance, debugging issues, auditing predictions, and collecting data for model improvement.

## Prerequisites

Before setting up inference logging, make sure you have:

* A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
* [kubectl](https://kubernetes.io/docs/tasks/tools/) CLI tool installed and configured.
* Basic knowledge of Kubernetes and KServe concepts.

## Logger Configurations

KServe offers several configurations for logging inference data:

1. [Basic Inference Logger](./basic-logger.md) - A simple logger using a message dumper Knative Service
2. [Request Header Metadata Logger](./request-header-logger.md) - Log request headers along with inference data
3. [TLS Enabled Logger](./tls-logger.md) - Secure your logs with TLS encryption
4. [Payload Logger with Knative Eventing](./knative-eventing-logger.md) - Log through Knative Eventing infrastructure
5. [Store Logs in Blob Storage](./blob-storage-logger.md) - Store logs in cloud blob storage

Each configuration has its own use cases, advantages, and requirements. Choose the most suitable one based on your specific needs.
