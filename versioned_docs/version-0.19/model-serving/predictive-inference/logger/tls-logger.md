---
title: TLS Enabled Logger
description: "Configure secure logging with TLS in KServe"
---

# TLS Enabled Logger

The InferenceService logger can be configured to use TLS for secure communication. This ensures that logged data is encrypted during transit.

## Prerequisites
- A Kubernetes cluster with [KServe installed](../../../getting-started/quickstart-guide.md).
- Have Familiarity with [Kserve Inference Logger](./basic-logger.md).

## Configuration Steps

### 1. Create a ConfigMap with CA Certificate

Create a ConfigMap with the CaBundle certificate in the same namespace as the InferenceService. By default, the CA certificate file should be named `service-ca.crt`.

```shell
kubectl create configmap example-com-ca --from-file=service-ca.crt=/path/to/example-ca.crt -n <isvc-namespace> 
```

If you want to use a different name for the CA certificate file, update the `caCertFile` field in the logger configuration section of the `inferenceservice-config` ConfigMap.

### 2. Update the ConfigMap

Update the `caBundle` field with the name of the ConfigMap created in the previous step in the logger configuration section of the `inferenceservice-config` ConfigMap. The CaBundle will be mounted as a volume on the agent and the CA certificate will be used to configure the transport.

:::tip

You can skip the TLS verification by setting `tlsSkipVerify` to `true` in the logger configuration section of the `inferenceservice-config` ConfigMap.
But, note that this will be applied cluster-wide and will affect all the InferenceServices in the cluster.

:::

## Example Configuration

```yaml
logger: |-
    {
        "image" : "kserve/agent:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1",
        "defaultUrl": "http://default-broker",
        "caBundle": "example-com-ca",
        "caCertFile": "service-ca.crt",
        "tlsSkipVerify": false
    }
```

## Considerations

- If TLS is configured in ConfigMap, but the bundle is not available or the CA certificate is not found, the logger will use plain-text HTTP with no TLS. This preserves backward compatibility with older versions that do not support TLS.
- If TLS is configured, but the logger's endpoint protocol scheme is of type http, the inference logger will use plain-text HTTP with no TLS.

## Constraints

- The CA certificate file should be in the same namespace as the InferenceService.
- You can only specify one CA certificate per namespace.
- Since the `caBundle` name and the `caCertFile` name are cluster-wide configurations (configured in `inferenceservice-config` ConfigMap), the names cannot be changed for each namespace.
