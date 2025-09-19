---
title: Configurations
description: "Global ConfigMap configurations for KServe InferenceService components"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Configurations

KServe provides a comprehensive ConfigMap (`inferenceservice-config`) that allows administrators to configure global defaults for various components and behaviors. These configurations are applied at the cluster level and affect all InferenceServices unless overridden by per-service annotations.

The ConfigMap is located in the `kserve` namespace and contains configuration sections for different components including ingress, storage, deployment modes, resource limits, and more.

Many of these global configurations can be overridden at the individual Service level using specific annotations or labels.

## Ingress Configuration

Controls network ingress settings for serving external traffic to InferenceServices.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  ingress: |-
    {   
        "enableGatewayApi": false,
        "kserveIngressGateway": "kserve/kserve-ingress-gateway",
        "ingressGateway" : "knative-serving/knative-ingress-gateway",
        "localGateway" : "knative-serving/knative-local-gateway",
        "localGatewayService" : "knative-local-gateway.istio-system.svc.cluster.local",
        "ingressDomain"  : "example.com",
        "additionalIngressDomains": ["additional-example.com"],
        "ingressClassName" : "istio",
        "domainTemplate": "{{ .Name }}-{{ .Namespace }}.{{ .IngressDomain }}",
        "urlScheme": "http",
        "disableIstioVirtualHost": false,
        "disableIngressCreation": false,
        "pathTemplate": "/serving/{{ .Namespace }}/{{ .Name }}"
    }
```
</TabItem>
</Tabs>

### Enable Gateway API

Specifies whether to use Gateway API instead of Ingress to serve external traffic. Only applies in raw deployment mode.

- **Global key:** `enableGatewayApi`  
- **Per-service annotation key:** Not supported  
- **Possible values:** `true`, `false`  
- **Default:** `false`

### KServe Ingress Gateway

The gateway resource used for external traffic in raw deployment mode.

- **Global key:** `kserveIngressGateway`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Gateway in format `<namespace>/<name>`  
- **Default:** `"kserve/kserve-ingress-gateway"`

### Ingress Gateway

The gateway used for external traffic in serverless deployment with Istio.

- **Global key:** `ingressGateway`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Gateway in format `<namespace>/<name>`  
- **Default:** `"knative-serving/knative-ingress-gateway"`

### Knative Local Gateway

Specifies the hostname of the Knative's local gateway service.
The default KServe configurations are re-using the Istio local gateways for Knative. In this case, this
`knativeLocalGatewayService` field can be left unset. When unset, the value of [`localGatewayService`](#local-gateway-service) will be used.

However, sometimes it may be better to have local gateways specifically for KServe (e.g. when enabling strict mTLS in Istio). Under such setups where KServe is needed to have its own local gateways, the values of the [`localGateway`](#local-gateway) and [`localGatewayService`](#local-gateway-service) should point to the KServe local gateways. Then, this `knativeLocalGatewayService` field should point to the Knative's local gateway service.

This configuration only applicable for serverless deployment with Istio configured as network layer.

- **Global key:** `knativeLocalGatewayService`
- **Per-service annotation key:** Not supported
- **Possible values:** Istio Gateway service cluster local hostname
- **Default:** `""`

### Local Gateway

Specifies the gateway which handles the network traffic within the cluster. This configuration only applicable for serverless deployment with Istio configured as network layer.

- **Global key:** `localGateway`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Istio Gateway in format `<namespace>/<name>`  
- **Default:** `"knative-serving/knative-local-gateway"`

### Local Gateway Service

The hostname of the local gateway service for cluster-internal traffic. This configuration only applicable for serverless deployment with Istio configured as network layer.

- **Global key:** `localGatewayService`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Istio Gateway service cluster local hostname
- **Default:** `"knative-local-gateway.istio-system.svc.cluster.local"`

### Ingress Domain

The domain name used for creating URLs in raw deployment mode. If ingressDomain is empty then "example.com" is used as default domain.

- **Global key:** `ingressDomain`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid domain name  
- **Default:** `"example.com"`

### Additional Ingress Domains

Additional domain names for creating URLs.

- **Global key:** `additionalIngressDomains`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Array of domain names  
- **Default:** `[]`

### Ingress Class Name

The ingress controller to use for ingress traffic when [gateway api](#enable-gateway-api) is disabled. This configuration only applicable in raw deployment mode.

- **Global key:** `ingressClassName`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid ingress class name  
- **Default:** `"istio"`

### Domain Template

Template for generating domain/URL for each InferenceService by combining variable from:
- Name of the inference service `{{ .Name }}`
- Namespace of the inference service `{{ .Namespace }}`
- Annotation of the inference service `{{ .Annotations.key }}`
- Label of the inference service `{{ .Labels.key }}`
- IngressDomain `{{ .IngressDomain }}`

This configuration only applicable for raw deployment.

- **Global key:** `domainTemplate`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Go template string with variables: `{{ .Name }}`, `{{ .Namespace }}`, `{{ .IngressDomain }}`, `{{ .Annotations.key }}`, `{{ .Labels.key }}`  
- **Default:** `"{{ .Name }}-{{ .Namespace }}.{{ .IngressDomain }}"`

### URL Scheme

The URL scheme to use for InferenceService and InferenceGraph. This configuration only applicable for raw deployment.

- **Global key:** `urlScheme`
- **Per-service annotation key:** Not supported
- **Possible values:** `"http"`, `"https"`
- **Default:** `"http"`

### Disable Istio Virtual Host

Controls whether to use Istio as the network layer for serverless deployment. 
By default istio is used as the network layer. When DisableIstioVirtualHost is true, KServe does not
create the top level virtual service thus Istio is no longer required for serverless mode.
By setting this field to true, user can use other networking layers supported by knative.
For more info https://github.com/kserve/kserve/pull/2380, https://kserve.github.io/website/master/admin/serverless/kourier_networking/.

- **Global key:** `disableIstioVirtualHost`
- **Per-service annotation key:** Not supported
- **Possible values:** `true`, `false`
- **Default:** `false`

### Disable Ingress Creation

Controls whether to disable ingress creation for raw deployment mode.

- **Global key:** `disableIngressCreation`
- **Possible values:** `true`, `false`
- **Default:** `false`
- **Per-service label key:** `"networking.kserve.io/visibility"`
- **Possible label values:** `""cluster-local""`

### Path Template

Template for generating path-based URLs for serverless deployment.
The following variables can be used in the template for generating url.
- Name of the inference service `{{ .Name}}`
- Namespace of the inference service `{{ .Namespace }}`

Empty string means no path based URL is generated. For more info https://github.com/kserve/kserve/issues/2257.

- **Global key:** `pathTemplate`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Go template string with variables: `{{ .Name }}`, `{{ .Namespace }}`  
- **Default:** `""`

## Storage Initializer Configuration

Configures the storage initializer component responsible for downloading models from various storage backends.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  storageInitializer: |-
    {
        "image" : "kserve/storage-initializer:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1",
        "caBundleConfigMapName": "",
        "caBundleVolumeMountPath": "/etc/ssl/custom-certs",
        "enableDirectPvcVolumeMount": true,
        "enableModelcar": true,
        "cpuModelcar": "10m",
        "memoryModelcar": "15Mi",
        "uidModelcar": 1010
    }
```
</TabItem>
</Tabs>

### Storage Initializer Image

The container image used for the storage initializer init container. This will be overridden by the `image` field in the [`ClusterStorageContainer`](../model-serving/storage/storage-containers/storage-containers.md) if the resource is available.

- **Global key:** `image`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid container image URI  
- **Default:** `"kserve/storage-initializer:v{{kserveDocsVersion}}.0"`

### Memory Request

The memory request for the storage initializer init container. This will be overridden by the [`ClusterStorageContainer`](../model-serving/storage/storage-containers/storage-containers.md) if the resource is available.

- **Global key:** `memoryRequest`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"100Mi"`

### Memory Limit

The memory limit for the storage initializer init container. This will be overridden by the [`ClusterStorageContainer`](../model-serving/storage/storage-containers/storage-containers.md) if the resource is available.

- **Global key:** `memoryLimit`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"1Gi"`

### CPU Request

The CPU request for the storage initializer init container. This will be overridden by the [`ClusterStorageContainer`](../model-serving/storage/storage-containers/storage-containers.md) if the resource is available.

- **Global key:** `cpuRequest`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"100m"`

### CPU Limit

The CPU limit for the storage initializer init container. This will be overridden by the [`ClusterStorageContainer`](../model-serving/storage/storage-containers/storage-containers.md) if the resource is available.

- **Global key:** `cpuLimit`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"1"`

### CA Bundle ConfigMap Name

The ConfigMap containing CA certificates to be copied to storage initializer.

- **Global key:** `caBundleConfigMapName`  
- **Per-service annotation key:** Not supported  
- **Possible values:** ConfigMap name or empty string  
- **Default:** `""`

### CA Bundle Volume Mount Path

The mount point for the CA bundle ConfigMap in the storage initializer container.

- **Global key:** `caBundleVolumeMountPath`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid filesystem path  
- **Default:** `"/etc/ssl/custom-certs"`

### Enable Direct PVC Volume Mount

Controls whether users can mount PVC volumes directly instead of using symlinks. If a PVC volume is provided as the storage URI, then the PVC volume is directly mounted to `/mnt/models` in the user container rather than symlinked to a shared volume. For more information, see the [PVC model storage documentation](../model-serving/storage/providers/pvc.md).

- **Global key:** `enableDirectPvcVolumeMount`
- **Per-service annotation key:** Not supported  
- **Possible values:** `true`, `false`  
- **Default:** `true`

### Mount PVC Volume with Read-Write
Controls whether the PVC volume is mounted with read-write permissions. If set to `false`, the PVC volume will be mounted as read-write, allowing write operations on the model storage. For more information, see the [PVC model storage documentation](../model-serving/storage/providers/pvc.md).

- **Global key:** Not supported
- **Per-service annotation key:** `storage.kserve.io/readonly`
- **Possible values:** `true`, `false`
- **Default:** `true`

### Enable Modelcar

Controls whether to enable support for downloading models from OCI registries using the `oci://` URI schema. When enabled, you can specify model storage paths as OCI image references. For more information, see [OCI model storage documentation](../model-serving/storage/providers/oci.md).

- **Global key:** `enableModelcar`  
- **Per-service annotation key:** Not supported  
- **Possible values:** `true`, `false`  
- **Default:** `true`

### CPU Modelcar

The CPU request and limit for the passive modelcar container.

- **Global key:** `cpuModelcar`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"10m"`

### Memory Modelcar

The memory request and limit for the passive modelcar container.

- **Global key:** `memoryModelcar`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Kubernetes resource quantity  
- **Default:** `"15Mi"`

### UID Modelcar

The user ID under which the modelcar process and main container run.

- **Global key:** `uidModelcar`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid UID number  
- **Default:** `1010`

### Storage Initializer UID
The user ID under which the storage initializer init container runs. This is useful for the case where ISTIO CNI with DNS proxy is enabled. See for more details: https://istio.io/latest/docs/setup/additional-setup/cni/#compatibility-with-application-init-containers.

- **Global key:** Not supported
- **Per-service annotation key:** `serving.kserve.io/storage-initializer-uid`
- **Possible values:** Valid UID number
- **Default:** `1000`

## Credentials Configuration

Configures authentication and storage credentials for downloading models from cloud storage.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  credentials: |-
    {
       "storageSpecSecretName": "storage-config",
       "storageSecretNameAnnotation": "serving.kserve.io/storageSecretName",
       "gcs": {
           "gcsCredentialFileName": "gcloud-application-credentials.json"
       },
       "s3": {
           "s3AccessKeyIDName": "AWS_ACCESS_KEY_ID",
           "s3SecretAccessKeyName": "AWS_SECRET_ACCESS_KEY",
           "s3Endpoint": "",
           "s3UseHttps": "",
           "s3Region": "",
           "s3VerifySSL": "",
           "s3UseVirtualBucket": "",
           "s3UseAccelerate": "",
           "s3UseAnonymousCredential": "",
           "s3CABundle": ""
       }
    }
```
</TabItem>
</Tabs>

### Storage Spec Secret Name

The default secret name containing credentials for downloading models when using storageSpec in InferenceService.

- **Global key:** `storageSpecSecretName`  
- **Per-service annotation key:** `serving.kserve.io/storageSecretName`  
- **Possible values:** Valid Kubernetes secret name  
- **Default:** `"storage-config"`

### Storage Secret Name Annotation

The annotation key used to specify a custom secret name for storage credentials. 

When using storageUri the order of the precedence is: secret name reference annotation > secret name references from service account. 

When using storageSpec the order of the precedence is: secret name reference annotation > storageSpecSecretName in configmap

- **Global key:** `storageSecretNameAnnotation`  
- **Per-service annotation key:** N/A (this defines the annotation key itself)  
- **Possible values:** Valid annotation key  
- **Default:** `"serving.kserve.io/storageSecretName"`

### GCS Configurations

#### GCS Credential File Name

The filename of the GCS credential file within the secret.

- **Global key:** `gcs.gcsCredentialFileName`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid filename  
- **Default:** `"gcloud-application-credentials.json"`

### S3 Configurations

 The global S3 configuration can be overridden by specifying the annotations on service account or static secret. For more details, see [S3 model storage documentation](../model-serving/storage/providers/s3/s3.md).

For a quick reference about AWS ENV variables:
  - AWS Cli: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
  - Boto: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/configuration.html#using-environment-variables

The `s3AccessKeyIDName` and `s3SecretAccessKeyName` fields are only used when static credentials (IAM User Access Key Secret) are used as the authentication method for AWS S3.
The rest of the fields are used in both authentication methods (IAM Role for Service Account & IAM User Access Key Secret) if a non-empty value is provided.

#### S3 Access Key ID Name

The environment variable name for S3 access key ID.

- **Global key:** `s3.s3AccessKeyIDName`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid environment variable name  
- **Default:** `"AWS_ACCESS_KEY_ID"`

#### S3 Secret Access Key Name

The environment variable name for S3 secret access key.

- **Global key:** `s3.s3SecretAccessKeyName`  
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid environment variable name  
- **Default:** `"AWS_SECRET_ACCESS_KEY"`

#### S3 Endpoint

The S3 endpoint URL for custom S3-compatible storage.

- **Global key:** `s3.s3Endpoint`  
- **Per-service annotation key:** `serving.kserve.io/s3-endpoint`
- **Possible values:** Valid URL
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Use HTTPS

Controls whether to use HTTPS for S3 connections.

- **Global key:** `s3.s3UseHttps`
- **Per-service annotation key:** `serving.kserve.io/s3-usehttps`
- **Possible values:** `"0"`, `"1"`
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Region

The AWS region for S3 bucket access.

- **Global key:** `s3.s3Region`
- **Per-service annotation key:** `serving.kserve.io/s3-region`
- **Possible values:** Valid AWS region
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Verify SSL

Controls SSL certificate verification for S3 connections.

- **Global key:** `s3.s3VerifySSL`
- **Per-service annotation key:** `serving.kserve.io/s3-verifyssl`
- **Possible values:** `"0"`, `"1"`
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Use Virtual Bucket

Configures virtual bucket style for S3 access.

- **Global key:** `s3.s3UseVirtualBucket`
- **Per-service annotation key:** `serving.kserve.io/s3-usevirtualbucket`
- **Possible values:** `"0"`, `"1"`
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Use Accelerate

Configures S3 transfer acceleration.

- **Global key:** `s3.s3UseAccelerate`
- **Per-service annotation key:** `serving.kserve.io/s3-useaccelerate`
- **Possible values:** `"0"`, `"1"`
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 Use Anonymous Credential

Configures anonymous access to public S3 buckets.

- **Global key:** `s3.s3UseAnonymousCredential`
- **Per-service annotation key:** `serving.kserve.io/s3-useanoncredential`
- **Possible values:** `"0"`, `"1"`
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

#### S3 CA Bundle

Path to a certificate bundle for HTTPS certificate validation.

- **Global key:** `s3.s3CABundle`
- **Per-service annotation key:** `serving.kserve.io/s3-cabundle`
- **Possible values:** Valid file path
- **Default:** `""`

:::note

The annotation should be used in `ServiceAccount` or `Secret` to override the global S3 endpoint.

:::

## Deployment Configuration

Configures the default deployment mode for InferenceServices.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  deploy: |-
    {
      "defaultDeploymentMode": "Knative"
    }
```
</TabItem>
<TabItem value="per-service" label="Per-Service (Annotation)">

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-inferenceservice
  annotations:
    serving.kserve.io/deploymentMode: "Standard"
spec:
  predictor:
    model:
      modelFormat:
        name: "tensorflow"
      storageUri: "gs://my-bucket/my-model"
```
</TabItem>
</Tabs>

### Default Deployment Mode

The default deployment mode for KServe resources.

- **Global key:** `defaultDeploymentMode`  
- **Per-service annotation key:** `serving.kserve.io/deploymentMode`
- **Possible values:** `"Knative"`, `"Standard"`, `"ModelMesh"`
- **Default:** `"Knative"`

## InferenceService Configuration

Global resource defaults and service-level configurations for InferenceServices.
To configure unlimited resources (no bounds on limits and requests), you can:
- Set the value to `null` 
- Set the value to an empty string `""`
- Remove the specific field from the configuration entirely

Any of these approaches will result in the resource constraint being unbound for the respective component.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  inferenceService: |-
    {
      "resource": {
          "cpuLimit": "1",
          "memoryLimit": "2Gi",
          "cpuRequest": "1",
          "memoryRequest": "2Gi"
        },
      "serviceAnnotationDisallowedList": [
        "autoscaling.knative.dev/min-scale",
        "autoscaling.knative.dev/max-scale"
      ],
      "serviceLabelDisallowedList": []
    }
```
</TabItem>
</Tabs>

### Default CPU Limit

The default CPU limit for InferenceService containers.

- **Global key:** `resource.cpuLimit`  
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** Kubernetes resource quantity or `null`/`""`
- **Default:** `"1"`

### Default Memory Limit

The default memory limit for InferenceService containers. 

- **Global key:** `resource.memoryLimit`  
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** Kubernetes resource quantity or `null`/`""`
- **Default:** `"2Gi"`

### Default CPU Request

The default CPU request for InferenceService containers.

- **Global key:** `resource.cpuRequest`  
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** Kubernetes resource quantity or `null`/`""`
- **Default:** `"1"`

### Default Memory Request

The default memory request for InferenceService containers.

- **Global key:** `resource.memoryRequest`  
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** Kubernetes resource quantity or `null`/`""`
- **Default:** `"2Gi"`

### Service Annotation Disallowed List

List of annotations that are not allowed to be propagated to Knative revisions which prevents the reconciliation loop to be triggered if the annotations configured here are used.

- **Global key:** `serviceAnnotationDisallowedList`
- **Per-service annotation key:** Not supported
- **Possible values:** Array of annotation keys
- **Default:** `["autoscaling.knative.dev/min-scale", "autoscaling.knative.dev/max-scale", "internal.serving.kserve.io/storage-initializer-sourceuri", "kubectl.kubernetes.io/last-applied-configuration"]`

### Service Label Disallowed List

List of labels that are not allowed to be propagated to Knative revisions which prevents the reconciliation loop to be triggered if the labels configured here are used.

- **Global key:** `serviceLabelDisallowedList`
- **Per-service annotation key:** Not supported
- **Possible values:** Array of label keys
- **Default:** `[]`

## Logger Configuration

Configures the logging sidecar container for request/response logging.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  logger: |-
    {
        "image" : "kserve/agent:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1",
        "defaultUrl": "http://default-broker"
    }
```
</TabItem>
</Tabs>

### Logger Image

The container image used for the logger sidecar.

- **Global key:** `image`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid container image URI
- **Default:** `"kserve/agent:v{{kserveDocsVersion}}.0"`

### Logger Memory Request

The memory request for the logger container.

- **Global key:** `memoryRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100Mi"`

### Logger Memory Limit

The memory limit for the logger container.

- **Global key:** `memoryLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1Gi"`

### Logger CPU Request

The CPU request for the logger container.

- **Global key:** `cpuRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100m"`

### Logger CPU Limit

The CPU limit for the logger container.

- **Global key:** `cpuLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1"`

### Logger Default URL

The default URL for sending logs when logger is enabled but no specific URL is provided.

- **Global key:** `defaultUrl`
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** Valid HTTP/HTTPS URL
- **Default:** `"http://default-broker"`

## Batcher Configuration

Configures the batching sidecar container for request batching.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  batcher: |-
    {
        "image" : "kserve/agent:latest",
        "memoryRequest": "1Gi",
        "memoryLimit": "1Gi",
        "cpuRequest": "1",
        "cpuLimit": "1",
        "maxBatchSize": "32",
        "maxLatency": "5000"
    }
```
</TabItem>
</Tabs>

### Batcher Image

The container image used for the batcher sidecar.

- **Global key:** `image`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid container image URI
- **Default:** `"kserve/agent:v{{kserveDocsVersion}}.0"`

### Batcher Memory Request

The memory request for the batcher container.

- **Global key:** `memoryRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1Gi"`

### Batcher Memory Limit

The memory limit for the batcher container.

- **Global key:** `memoryLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1Gi"`

### Batcher CPU Request

The CPU request for the batcher container.

- **Global key:** `cpuRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1"`

### Batcher CPU Limit

The CPU limit for the batcher container.

- **Global key:** `cpuLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1"`

### Max Batch Size

The default maximum batch size for request batching.

- **Global key:** `maxBatchSize`
- **Per-service annotation key:** Not supported
- **Possible values:** Positive integer as string
- **Default:** `"32"`

### Max Latency

The default maximum latency in milliseconds to wait before processing a batch.

- **Global key:** `maxLatency`
- **Per-service annotation key:** Not supported
- **Possible values:** Positive integer as string (milliseconds)
- **Default:** `"5000"`

## Agent Configuration

Configures the KServe agent container.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  agent: |-
    {
        "image" : "kserve/agent:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1"
    }
```
</TabItem>
</Tabs>

### Agent Image

The container image used for the KServe agent.

- **Global key:** `image`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid container image URI
- **Default:** `"kserve/agent:v{{kserveDocsVersion}}.0"`

### Agent Memory Request

The memory request for the agent container.

- **Global key:** `memoryRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100Mi"`

### Agent Memory Limit

The memory limit for the agent container.

- **Global key:** `memoryLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1Gi"`

### Agent CPU Request

The CPU request for the agent container.

- **Global key:** `cpuRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100m"`

### Agent CPU Limit

The CPU limit for the agent container.

- **Global key:** `cpuLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1"`

## Router Configuration

Configures the router component for InferenceGraph implementations.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  router: |-
    {
        "image" : "kserve/router:latest",
        "memoryRequest": "100Mi",
        "memoryLimit": "1Gi",
        "cpuRequest": "100m",
        "cpuLimit": "1",
        "headers": {
          "propagate": ["Authorization", "*Trace-Id*"]
        },
        "imagePullPolicy": "IfNotPresent",
        "imagePullSecrets": ["docker-secret"]
    }
```
</TabItem>
</Tabs>

### Router Image

The container image used for the router.

- **Global key:** `image`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid container image URI
- **Default:** `"kserve/router:v{{kserveDocsVersion}}.0"`

### Router Memory Request

The memory request for the router container.

- **Global key:** `memoryRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100Mi"`

### Router Memory Limit

The memory limit for the router container.

- **Global key:** `memoryLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1Gi"`

### Router CPU Request

The CPU request for the router container.

- **Global key:** `cpuRequest`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"100m"`

### Router CPU Limit

The CPU limit for the router container.

- **Global key:** `cpuLimit`
- **Per-service annotation key:** Not supported
- **Possible values:** Kubernetes resource quantity
- **Default:** `"1"`

### Header Propagation

Specifies which HTTP headers should be propagated to all steps in an InferenceGraph. You can list specific header names (like "Authorization") or use [Golang regex patterns](https://pkg.go.dev/regexp/syntax#hdr-Syntax) with wildcards (like "*Trace-Id*") to match multiple headers. Headers not in this list will be filtered out when requests are forwarded between graph components.

- **Global key:** `headers.propagate`
- **Per-service annotation key:** Not supported
- **Possible values:** Array of exact header names or Golang regex patterns
- **Default:** `[]`

### Image Pull Policy

Specifies when the router image should be pulled from the registry.

- **Global key:** `imagePullPolicy`
- **Per-service annotation key:** Not supported
- **Possible values:** `"Always"`, `"Never"`, `"IfNotPresent"`
- **Default:** `"IfNotPresent"`

### Image Pull Secrets

List of secrets used for pulling the router image from private registries.

- **Global key:** `imagePullSecrets`
- **Per-service annotation key:** Not supported
- **Possible values:** Array of secret names
- **Default:** `[]`

## Explainers Configuration

Configures explainer runtimes for model explanations.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  explainers: |-
    {
        "art": {
            "image" : "kserve/art-explainer",
            "defaultImageVersion": "latest"
        }
    }
```
</TabItem>
</Tabs>

### ART Explainer Image

The container image for the ART (Adversarial Robustness Toolbox) explainer.

- **Global key:** `art.image`
- **Per-service key:** Can be overridden via InferenceService explainer spec
- **Possible values:** Valid container image URI
- **Default:** `"kserve/art-explainer"`

### ART Explainer Default Image Version

The default image version for the ART explainer.

- **Global key:** `art.defaultImageVersion`
- **Per-service key:** Can be overridden via InferenceService explainer spec
- **Possible values:** Valid image tag
- **Default:** `"latest"`

## Metrics Aggregator Configuration

Configures metrics collection and Prometheus scraping.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  metricsAggregator: |-
    {
      "enableMetricAggregation": "false",
      "enablePrometheusScraping" : "false"
    }
```
</TabItem>
</Tabs>

### Enable Metric Aggregation

Enables metric aggregation in queue-proxy for Knative services in serverless deployment. This adds the annotation `serving.kserve.io/enable-metric-aggregation` to each InferenceService
service with the specified boolean value. If true enables metric aggregation in queue-proxy by setting env vars in the queue proxy container to configure scraping ports.

- **Global key:** `enableMetricAggregation`
- **Per-service annotation key:** `serving.kserve.io/enable-metric-aggregation`
- **Possible values:** `"true"`, `"false"`
- **Default:** `"false"`

### Enable Prometheus Scraping

Enables Prometheus scraping annotations on pods. If true, prometheus annotations are added to each InferenceService pod. If [`serving.kserve.io/enable-metric-aggregation`](#enable-metric-aggregation) is false, the Prometheus port is set with the default Prometheus scraping port 9090, otherwise the Prometheus port annotation is set with the metric aggregation port.

- **Global key:** `enablePrometheusScraping`
- **Per-service annotation key:** Not supported
- **Possible values:** `"true"`, `"false"`
- **Default:** `"false"`

## OpenTelemetry Collector Configuration

Configures OpenTelemetry metrics collection for autoscaling with KEDA in Standard mode.
For more details, see the [autoscaling with KEDA documentation](../model-serving/generative-inference/autoscaling/autoscaling.md).

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  opentelemetryCollector: |-
    {
      "scrapeInterval": "5s",
      "metricReceiverEndpoint": "keda-otel-scaler.keda.svc:4317",
      "metricScalerEndpoint": "keda-otel-scaler.keda.svc:4318"
    }
```
</TabItem>
</Tabs>

### Scrape Interval

The interval at which the OpenTelemetry Collector scrapes metrics.

- **Global key:** `scrapeInterval`
- **Per-service annotation key:** Not supported  
- **Possible values:** Valid duration string (e.g., "5s", "1m")  
- **Default:** `"5s"`

### Metric Receiver Endpoint

The endpoint from which the OpenTelemetry Collector will receive the metrics.

- **Global key:** `metricReceiverEndpoint`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid service endpoint
- **Default:** `"keda-otel-scaler.keda.svc:4317"`

### Metric Scaler Endpoint

The endpoint from which KEDA's ScaledObject scrapes metrics.

- **Global key:** `metricScalerEndpoint`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid service endpoint
- **Default:** `"keda-otel-scaler.keda.svc:4318"`

## Local Model Configuration

Configures local model storage and management.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  localModel: |-
    {
      "enabled": false,
      "jobNamespace": "kserve-localmodel-jobs",
      "defaultJobImage" : "kserve/storage-initializer:latest",
      "fsGroup": 1000,
      "jobTTLSecondsAfterFinished": 3600,
      "reconcilationFrequencyInSecs": 60,
      "disableVolumeManagement": false
    }
```
</TabItem>
</Tabs>

### Enable Local Model

Enables local model Cache functionality.

- **Global key:** `enabled`
- **Per-service annotation key:** `serving.kserve.io/disable-localmodel`
- **Possible values:** `true`, `false`
- **Default:** `false`

### Job Namespace

The namespace where model download jobs are created.

- **Global key:** `jobNamespace`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid Kubernetes namespace name
- **Default:** `"kserve-localmodel-jobs"`

### Default Job Image

The default image used for download jobs.

- **Global key:** `defaultJobImage`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid container image URI
- **Default:** `"kserve/storage-initializer:v{{kserveDocsVersion}}.0"`

### Filesystem Group

The filesystem group ID for attached local model cache volumes.

- **Global key:** `fsGroup`
- **Per-service annotation key:** Not supported
- **Possible values:** Valid group ID number
- **Default:** `1000`

### Job TTL Seconds After Finished

TTL for download jobs after completion.

- **Global key:** `jobTTLSecondsAfterFinished`
- **Per-service annotation key:** Not supported
- **Possible values:** Positive integer (seconds)
- **Default:** `3600`

### Reconciliation Frequency

Frequency for local model agent reconciliation to detect missing models in local model cache volume.

- **Global key:** `reconcilationFrequencyInSecs`
- **Per-service annotation key:** Not supported
- **Possible values:** Positive integer (seconds)
- **Default:** `60`

### Disable Volume Management

Disables PV and PVC management for namespaces without InferenceServices.

- **Global key:** `disableVolumeManagement`
- **Per-service annotation key:** Not supported
- **Possible values:** `true`, `false`
- **Default:** `false`

## MultiNode Configuration

Configures multi-node inference.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  multiNode: |-
    {
      "customGPUResourceTypeList": [
        "custom.com/gpu"
      ]
    }
```
</TabItem>
</Tabs>

### Custom GPU Resource Type List

List of custom GPU resource types intended to identify the GPU type of a resource, not to restrict the user from using a specific GPU type. The MultiNode runtime pod will dynamically add GPU resources based on the registered GPU types.

- **Global key:** `customGPUResourceTypeList`
- **Per-service annotation key:** `serving.kserve.io/gpu-resource-types`
- **Possible values:** Array of custom resource names
- **Default:** `[]`

## Service Configuration

Configures Kubernetes service creation settings.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  service: |-
    {
      "serviceClusterIPNone":  false
    }
```
</TabItem>
</Tabs>

### Service Cluster IP None

Controls whether services should have clusterIP set to None. This is useful for creating headless services where you want to manage the service endpoints manually. This configuration is only applicable to Standard mode.

- **Global key:** `serviceClusterIPNone`
- **Per-service annotation key:** Not supported
- **Possible values:** `true`, `false`
- **Default:** `false`

## Security Configuration

Configures security-related settings for InferenceServices.

<Tabs>
<TabItem value="global" label="Global (ConfigMap)">

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inferenceservice-config
  namespace: kserve
data:
  security: |-
    {
      "autoMountServiceAccountToken": true
    }
```
</TabItem>
</Tabs>

### Auto Mount Service Account Token

Controls whether service account tokens are automatically mounted in pods.

- **Global key:** `autoMountServiceAccountToken`
- **Per-service key:** Can be overridden via InferenceService spec
- **Possible values:** `true`, `false`
- **Default:** `true`

## Autoscaling

Configures autoscaling settings for InferenceServices.

### Autoscaler Class

The type of the autoscaler to use for scaling InferenceServices. This configuration is only applicable to Standard mode. Prefer "none" when disabling KServe-managed autoscaling entirely. Use "external" only when another controller will manage the HPA.

- **Global key:** Not supported
- **Per-service key:** `serving.kserve.io/autoscaler-class`
- **Possible values:** `"hpa"`, `"keda"`, `"external"`, `"none"`
- **Default:** `"hpa"`

## Serving Runtime Configuration

Configures the serving runtime settings for InferenceServices.

### Auto Update Deployment

Controls whether the InferenceService deployment should be automatically updated when the [`ServingRuntime`](../concepts/resources/servingruntime.md) spec changes. This is useful for ensuring that the latest configurations are always served without manual intervention.

- **Global key:** Not supported
- **Per-service key:** `serving.kserve.io/disable-auto-update`
- **Possible values:** `true`, `false`
- **Default:** `false`
