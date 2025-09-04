---
title: "Serverless Installation Guide"
description: "Deploy KServe with request-based autoscaling and scale-to-zero capabilities for predictive inference workloads"
---

# Serverless Installation Guide

:::info
Serverless Deployment is recommended primarily for predictive inference workloads.
:::

KServe Serverless installation enables autoscaling based on request volume and supports scale down to and from zero. It also supports revision management
and canary rollout based on revisions.

## Applicability for Predictive Inference

Serverless deployment is particularly well-suited for predictive inference workloads because:

- Predictive inference typically has shorter response times that work well with Knative's concurrency model
- CPU-based models can efficiently scale to zero when not in use
- Knative's request-based scaling aligns with the traffic patterns of many predictive workloads
- Canary deployments and revisions enable safe updates to predictive models

For generative inference workloads that typically require GPU resources and have longer processing times, the [Standard Kubernetes Deployment](../kubernetes-deployment.md) approach is recommended.

Kubernetes 1.30 is the minimally required version and please check the following recommended Knative, Istio versions for the corresponding
Kubernetes version.

## Recommended Version Matrix
| Kubernetes Version | Recommended Istio Version | Recommended Knative Version |
|:-------------------|:--------------------------|:----------------------------|
| 1.30               | 1.22,1.23                 | 1.15,1.16                   |
| 1.31               | 1.24,1.25                 | 1.16,1.17                   |
| 1.32               | 1.25,1.26                 | 1.17,1.18                   |

## 1. Install Knative Serving
Please refer to [Knative Serving install guide](https://knative.dev/docs/admin/install/serving/install-serving-with-yaml/).

:::tip
If you are looking to use PodSpec fields such as nodeSelector, affinity or tolerations which are now supported in the v1beta1 API spec, 
you need to turn on the corresponding [feature flags](https://knative.dev/docs/admin/serving/feature-flags) in your Knative configuration.
:::
    
:::warning
Knative 1.13.1 requires Istio 1.20+, gRPC routing does not work with previous Istio releases, see [release notes](https://github.com/knative/serving/releases/tag/knative-v1.13.1).
:::

## 2. Install Networking Layer
The recommended networking layer for KServe is [Istio](https://istio.io/) as currently it works best with KServe, please refer to the [Istio install guide](https://knative.dev/docs/admin/install/installing-istio).
Alternatively you can also choose other networking layers like [Kourier](https://github.com/knative-sandbox/net-kourier) or [Contour](https://projectcontour.io/), see [how to install Kourier with KServe guide](./kourier-networking/index.md).

## 3. Install Cert Manager
The minimally required Cert Manager version is 1.15.0 and you can refer to [Cert Manager](https://cert-manager.io/docs/installation/).

:::note
Cert manager is required to provision webhook certs for production grade installation, alternatively you can run self signed certs generation script.
:::
    
## 4. Install KServe

### Install using Helm

Install KServe CRDs
```bash
helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version v0.12.0
```

Install KServe Resources
```bash
helm install kserve oci://ghcr.io/kserve/charts/kserve --version v0.12.0
```

### Install using YAML
Install KServe CRDs and Controller, `--server-side` option is required as the InferenceService CRD is large, see [this issue](https://github.com/kserve/kserve/issues/3487) for details.

```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml
```

Install KServe Built-in ClusterServingRuntimes
```bash
kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.12.0/kserve-cluster-resources.yaml
```

:::note
**ClusterServingRuntimes** are required to create InferenceService for built-in model serving runtimes with KServe v0.8.0 or higher.
:::
