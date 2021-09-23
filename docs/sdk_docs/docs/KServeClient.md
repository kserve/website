# KServeClient

> KServeClient(config_file=None, context=None, client_configuration=None, persist_config=True)

User can loads authentication and cluster information from kube-config file and stores them in kubernetes.client.configuration. Parameters are as following:

parameter |  Description
------------ | -------------
config_file | Name of the kube-config file. Defaults to `~/.kube/config`. Note that for the case that the SDK is running in cluster and you want to operate KServe in another remote cluster, user must set `config_file` to load kube-config file explicitly, e.g. `KServeClient(config_file="~/.kube/config")`. |
context |Set the active context. If is set to None, current_context from config file will be used.|
client_configuration | The kubernetes.client.Configuration to set configs to.|
persist_config | If True, config file will be updated when changed (e.g GCP token refresh).|


The APIs for KServeClient are as following:

Class | Method |  Description
------------ | ------------- | -------------
KServeClient | [set_credentials](#set_credentials) | Set Credentials|
KServeClient | [create](#create) | Create InferenceService|
KServeClient | [get](#get)    | Get or watch the specified InferenceService or all InferenceServices in the namespace |
KServeClient | [patch](#patch)  | Patch the specified InferenceService|
KServeClient | [replace](#replace) | Replace the specified InferenceService|
KServeClient | [delete](#delete) | Delete the specified InferenceService |
KServeClient | [wait_isvc_ready](#wait_isvc_ready) | Wait for the InferenceService to be ready |
KServeClient | [is_isvc_ready](#is_isvc_read) | Check if the InferenceService is ready |

## set_credentials
> set_credentials(storage_type, namespace=None, credentials_file=None, service_account='kfserving-service-credentials', **kwargs):

Create or update a `Secret` and `Service Account` for GCS and S3 for the provided credentials. Once the `Service Account` is applied, it may be used in the `Service Account` field of a InferenceService's [V1beta1ModelSpec](V1beta1ModelSpec.md).

### Example

Example for creating GCP credentials.
```python
from kserve import KServeClient

kserve = KServeClient()
kserve.set_credentials(storage_type='GCS',
                          namespace='kubeflow',
                          credentials_file='/tmp/gcp.json',
                          service_account='user_specified_sa_name')
```

The API supports specifying a Service Account by `service_account`, or using default Service Account `kfserving-service-credentials`, if the Service Account does not exist, the API will create it and attach the created secret with the Service Account, if exists, only patch it to attach the created Secret.

Example for creating S3 credentials.
```python
from kserve import KServeClient

kserve = KServeClient()
kserve.set_credentials(storage_type='S3',
                          namespace='kubeflow',
                          credentials_file='/tmp/awcredentials',
                          s3_profile='default',
                          s3_endpoint='s3.us-west-amazonaws.com',
                          s3_region='us-west-2',
                          s3_use_https='1',
                          s3_verify_ssl='0')
```

Example for creating Azure credentials.
```python
from kserve import KServeClient

kserve = KServeClient()
kserve.set_credentials(storage_type='Azure',
                          namespace='kubeflow',
                          credentials_file='/path/azure_credentials.json')
```

The created or patched `Secret` and `Service Account` will be shown as following:
```
INFO:kfserving.api.set_credentials:Created Secret: kfserving-secret-6tv6l in namespace kubeflow
INFO:kfserving.api.set_credentials:Created (or Patched) Service account: kfserving-service-credentials in namespace kubeflow
```

### Parameters
Name | Type | Storage Type | Description
------------ | ------------- | ------------- | -------------
storage_type | str | All |Required. Valid values: GCS, S3 or Azure |
namespace | str | All |Optional. The kubernetes namespace. Defaults to current or default namespace.|
credentials_file | str | All |Optional. The path for the credentials file. The default file for GCS is `~/.config/gcloud/application_default_credentials.json`, see the [instructions](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login) on creating the GCS credentials file. For S3 is `~/.aws/credentials`, see the [instructions](https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/setup-credentials.html) on creating the S3 credentials file. For Azure is `~/.azure/azure_credentials.json`, see the [instructions](https://docs.microsoft.com/en-us/azure/python/python-sdk-azure-authenticate#mgmt-auth-file) on creating the Azure credentials file. |
service_account  | str | All |Optional. The name of service account. Supports specifying the `service_account`, or using default Service Account `kfserving-service-credentials`. If the Service Account does not exist, the API will create it and attach the created Secret with the Service Account, if exists, only patch it to attach the created Secret.|
s3_endpoint  | str | S3 only |Optional. The S3 endpoint. |
s3_region  | str | S3 only|Optional. The S3 region By default, regional endpoint is used for S3.| |
s3_use_https  | str | S3 only |Optional. HTTPS is used to access S3 by default, unless `s3_use_https=0` |
s3_verify_ssl  | str | S3 only|Optional. If HTTPS is used, SSL verification could be disabled with `s3_verify_ssl=0` |


## create
> create(inferenceservice, namespace=None, watch=False, timeout_seconds=600)

Create the provided InferenceService in the specified namespace

### Example

```python
from kubernetes import client

from kserve import KServeClient
from kserve import constants
from kserve import V1beta1PredictorSpec
from kserve import V1beta1TFServingSpec
from kserve import V1beta1InferenceServiceSpec
from kserve import V1beta1InferenceService

default_model_spec = V1beta1InferenceServiceSpec(predictor=V1beta1PredictorSpec(tensorflow=V1beta1TFServingSpec(
    storage_uri='gs://kfserving-samples/models/tensorflow/flowers')))

isvc = V1beta1InferenceService(api_version=constants.KSERVE_V1BETA1,
                          kind=constants.KSERVE_KIND,
                          metadata=client.V1ObjectMeta(name='flower-sample', namespace='kserve-models'),
                          spec=default_model_spec)


kserve = KServeClient()
kserve.create(isvc)

# The API also supports watching the created InferenceService status till it's READY.
# kserve.create(isvc, watch=True)
```


### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
inferenceservice  | [V1beta1InferenceService](V1beta1InferenceService.md) | InferenceService defination| Required |
namespace | str | Namespace for InferenceService deploying to. If the `namespace` is not defined, will align with InferenceService definition, or use current or default namespace if namespace is not specified in InferenceService definition.  | Optional |
watch | bool | Watch the created InferenceService if `True`, otherwise will return the created InferenceService object. Stop watching if InferenceService reaches the optional specified `timeout_seconds` or once the InferenceService overall status `READY` is `True`. | Optional |
timeout_seconds | int | Timeout seconds for watching. Defaults to 600. | Optional |

### Return type
object

## get
> get(name=None, namespace=None, watch=False, timeout_seconds=600)

Get the created InferenceService in the specified namespace

### Example

```python
from kserve import KServeClient

kserve = KServeClient()
kserve.get('flower-sample', namespace='kubeflow')
```
The API also support watching the specified InferenceService or all InferenceService in the namespace.
```python
from kserve import KServeClient

kserve = KServeClient()
kserve.get('flower-sample', namespace='kubeflow', watch=True, timeout_seconds=120)
```
The outputs will be as following. Stop watching if InferenceService reaches the optional specified `timeout_seconds` or once the InferenceService overall status `READY` is `True`.
```sh
NAME                 READY      DEFAULT_TRAFFIC CANARY_TRAFFIC  URL                                               
flower-sample        Unknown                                    http://flower-sample.kubeflow.example.com         
flower-sample        Unknown    90               10             http://flower-sample.kubeflow.example.com         
flower-sample        True       90               10             http://flower-sample.kubeflow.example.com         
```


### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
name  | str | InferenceService name. If the `name` is not specified, it will get or watch all InferenceServices in the namespace.| Optional. |
namespace | str | The InferenceService's namespace. Defaults to current or default namespace.| Optional |
watch | bool | Watch the specified InferenceService or all InferenceService in the namespace if `True`, otherwise will return object for the specified InferenceService or all InferenceService in the namespace. Stop watching if InferenceService reaches the optional specified `timeout_seconds` or once the speficed InferenceService overall status `READY` is `True` (Only if the `name` is speficed). | Optional |
timeout_seconds | int | Timeout seconds for watching. Defaults to 600. | Optional |

### Return type
object


## patch
> patch(name, inferenceservice, namespace=None, watch=False, timeout_seconds=600)

Patch the created InferenceService in the specified namespace.

Note that if you want to set the field from existing value to `None`, `patch` API may not work, you need to use [replace](#replace) API to remove the field value.

### Example

```python
from kubernetes import client
from kserve import constants
from kserve import V1beta1PredictorSpec
from kserve import V1beta1TFServingSpec
from kserve import V1beta1InferenceServiceSpec
from kserve import V1beta1InferenceService
from kserve import KServeClient

service_name = 'flower-sample'
kserve = KServeClient()

default_model_spec = V1beta1InferenceServiceSpec(predictor=V1beta1PredictorSpec(tensorflow=V1beta1TFServingSpec(
    storage_uri='gs://kfserving-samples/models/tensorflow/flowers')))

isvc = V1beta1InferenceService(api_version=constants.KSERVE_V1BETA1,
                                   kind=constants.KSERVE_KIND,
                                   metadata=client.V1ObjectMeta(
                                        name=service_name, namespace='kserve-models'),
                                   spec=default_model_spec)

kserve.create(isvc)
kserve.wait_isvc_ready(service_name, namespace='kserve-models')

canary_model_spec = V1beta1InferenceServiceSpec(predictor=V1beta1PredictorSpec(canary_traffic_percent=10,
    tensorflow=V1beta1TFServingSpec(
    storage_uri='gs://kfserving-samples/models/tensorflow/flowers-2')))

isvc = V1beta1InferenceService(api_version= constants.KSERVE_V1BETA1,
                          kind=constants.KSERVE_KIND,
                          metadata=client.V1ObjectMeta(name='flower-sample', namespace='kserve-models'),
                          spec=canary_model_spec)


kserve.patch(service_name, isvc)

# The API also supports watching the patached InferenceService status till it's READY.
# kserve.patch('flower-sample', isvc, watch=True)
```

### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
inferenceservice  | [V1beta1InferenceService](V1beta1InferenceService.md) | InferenceService defination| Required |
namespace | str | The InferenceService's namespace for patching. If the `namespace` is not defined, will align with InferenceService definition, or use current or default namespace if namespace is not specified in InferenceService definition. | Optional|
watch | bool | Watch the patched InferenceService if `True`, otherwise will return the patched InferenceService object. Stop watching if InferenceService reaches the optional specified `timeout_seconds` or once the InferenceService overall status `READY` is `True`. | Optional |
timeout_seconds | int | Timeout seconds for watching. Defaults to 600. | Optional |

### Return type
object

## replace
> replace(name, inferenceservice, namespace=None, watch=False, timeout_seconds=600)

Replace the created InferenceService in the specified namespace. Generally use the `replace` API to update whole InferenceService or remove a field such as canary or other components of the InferenceService.

### Example

```python
from kubernetes import client
from kserve import constants
from kserve import V1beta1PredictorSpec
from kserve import V1beta1TFServingSpec
from kserve import V1beta1InferenceServiceSpec
from kserve import V1beta1InferenceService
from kserve import KServeClient

service_name = 'flower-sample'
kserve = KServeClient()

default_model_spec = V1beta1InferenceServiceSpec(predictor=V1beta1PredictorSpec(tensorflow=V1beta1TFServingSpec(
    storage_uri='gs://kfserving-samples/models/tensorflow/flowers')))

isvc = V1beta1InferenceService(api_version=constants.KSERVE_V1BETA1,
                                   kind=constants.KSERVE_KIND,
                                   metadata=client.V1ObjectMeta(
                                        name=service_name, namespace='kserve-models'),
                                   spec=default_model_spec)

kserve.create(isvc)
kserve.wait_isvc_ready(service_name, namespace='kserve-models')

canary_model_spec = V1beta1InferenceServiceSpec(predictor=V1beta1PredictorSpec(canary_traffic_percent=0,
    tensorflow=V1beta1TFServingSpec(
    storage_uri='gs://kfserving-samples/models/tensorflow/flowers-2')))

isvc = V1beta1InferenceService(api_version= constants.KSERVE_V1BETA1,
                          kind=constants.KSERVE_KIND,
                          metadata=client.V1ObjectMeta(name=service_name, namespace='kserve-models'),
                          spec=canary_model_spec)

kserve.replace(service_name, isvc)

# The API also supports watching the replaced InferenceService status till it's READY.
# kserve.replace('flower-sample', isvc, watch=True)
```

### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
inferenceservice  | [V1beta1InferenceService](V1beta1InferenceService.md) | InferenceService defination| Required |
namespace | str | The InferenceService's namespace. If the `namespace` is not defined, will align with InferenceService definition, or use current or default namespace if namespace is not specified in InferenceService definition. | Optional|
watch | bool | Watch the patched InferenceService if `True`, otherwise will return the replaced InferenceService object. Stop watching if InferenceService reaches the optional specified `timeout_seconds` or once the InferenceService overall status `READY` is `True`. | Optional |
timeout_seconds | int | Timeout seconds for watching. Defaults to 600. | Optional |

### Return type
object

## delete
> delete(name, namespace=None)

Delete the created InferenceService in the specified namespace

### Example

```python
from kserve import KServeClient

kserve = KServeClient()
kserve.delete('flower-sample', namespace='kubeflow')
```

### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
name  | str | InferenceService name| |
namespace | str | The inferenceservice's namespace. Defaults to current or default namespace. | Optional|

### Return type
object


## wait_isvc_ready
> wait_isvc_ready(name, namespace=None, watch=False, timeout_seconds=600, polling_interval=10):

Wait for the InferenceService to be ready.

### Example

```python
from kserve import KServeClient

kserve = KServeClient()
kserve.wait_isvc_ready('flower-sample', namespace='kubeflow')
```

### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
name  | str | The InferenceService name.| |
namespace | str | The InferenceService namespace. Defaults to current or default namespace. | Optional|
watch | bool | Watch the specified InferenceService if `True`. | Optional |
timeout_seconds | int | How long to wait for the InferenceService, default wait for 600 seconds. | Optional|
polling_interval | int | How often to poll for the status of the InferenceService.| Optional|

### Return type
object


## is_isvc_ready
> is_isvc_ready(name, namespace=None)

Returns True if the InferenceService is ready; false otherwise.

### Example

```python
from kserve import KServeClient

kserve = KServeClient()
kserve.is_isvc_ready('flower-sample', namespace='kubeflow')
```

### Parameters
Name | Type |  Description | Notes
------------ | ------------- | ------------- | -------------
name  | str | The InferenceService name.| |
namespace | str | The InferenceService namespace. Defaults to current or default namespace.| Optional |

### Return type
Bool
