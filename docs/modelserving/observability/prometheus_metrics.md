# Prometheus Metrics 

## Exposing a Prometheus metrics port

All supported serving runtimes support exporting prometheus metrics on a specified port in the inference service's pod. The appropriate port for the model server is defined in the [kserve/config/runtimes](https://github.com/kserve/kserve/tree/master/config/runtimes) YAML files. For example, torchserve defines its prometheus port as `8082` in `kserve-torchserve.yaml`. 

```yaml
metadata:
  name: kserve-torchserve
spec:
  annotations:
    prometheus.kserve.io/port: '8082'
    prometheus.kserve.io/path: "/metrics"
```

If needed, this value can be overridden in the InferenceService YAML. 

To enable prometheus metrics, add the annotation `serving.kserve.io/enable-prometheus-scraping` to the InferenceService YAML. 

```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-irisv2"
  annotations:
    serving.kserve.io/enable-prometheus-scraping: "true"
spec:
  predictor:
    sklearn:
      protocolVersion: v2
      storageUri: "gs://seldon-models/sklearn/iris"
```

The default values for `serving.kserve.io/enable-prometheus-scraping` can be set in the `inferenceservice-config` configmap. See [the docs](https://github.com/kserve/kserve/blob/master/qpext/README.md#configs) for more info.

There is not currently a unified set of metrics exported by the model servers. Each model server may implement its own set of metrics to export. 

## Metrics for lgbserver, paddleserver, pmmlserver, sklearnserver, xgbserver, custom transformer/predictor

Prometheus latency histograms are emitted for each of the steps (pre/postprocessing, explain, predict).
Additionally, the latencies of each step are logged per request. See also [modelserver prometheus label definitions](https://github.com/kserve/kserve/blob/master/python/kserve/kserve/metrics.py) and [metric implementation](https://github.com/kserve/kserve/blob/master/python/kserve/kserve/model.py#L94-L130).

| Metric Name                       | Description                    | Type      |
|-----------------------------------|--------------------------------|-----------| 
| request_preprocess_seconds        | pre-processing request latency | Histogram | 
| request_explain_seconds | explain request latency        | Histogram | 
| request_predict_seconds | prediction request latency     | Histogram |
| request_postprocess_seconds    | pre-processing request latency | Histogram | 

## Other serving runtime metrics

Some model servers define their own metrics. 

* [mlserver](https://docs.seldon.io/projects/seldon-core/en/latest/analytics/analytics.html)
* [torchserve](https://pytorch.org/serve/metrics_api.html)
* [triton](https://github.com/triton-inference-server/server/blob/main/docs/user_guide/metrics.md)
* [tensorflow](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/framework/metrics.cc) (Please see [Github Issue #2462](https://github.com/kserve/kserve/issues/2462))


## Exporting metrics

Exporting metrics in serverles mode requires that the queue-proxy extension image is used. 

For more information on how to export metrics, see [Queue Proxy Extension](https://github.com/kserve/kserve/blob/master/qpext/README.md) documentation.

## Knative/Queue-Proxy metrics 

Queue proxy emits metrics be default on port 9091. If aggregation metrics are set up with the queue proxy extension, the default port for the aggregated metrics will be 9088. See the [Knative documentation](https://knative.dev/development/serving/services/service-metrics/) (and [additional metrics defined in the code](https://github.com/vagababov/serving/blob/master/pkg/queue/prometheus_stats_reporter.go#L118)) for more information about the metrics queue-proxy exposes. 

## Grafana Dashboards 

Some example Grafana dashboards are available in GrafanaLabs. 

### KServe ModelServer Latency Dashboard

A template dashboard for [KServe ModelServer Latency](https://grafana.com/grafana/dashboards/17969-kserve-modelserver-latency/) contains example queries using the prometheus metrics for pre/post-process, predict and explain in milliseconds. The query is a [histogram quantile](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile). A fifth graph shows the total number of requests to the predict endpoint. This graph covers all KServe's ModelServer runtimes - lgbserver, paddleserver, pmmlserver, sklearnserver, xgbserver, custom transformer/predictor.

## KServe TorchServe Latency Dashboard

A template dashboard for [KServe TorchServe Latency](https://grafana.com/grafana/dashboards/18026-kserve-torchserve-latency/) contains an inference latency graph which plots the [rate](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) of the TorchServe metric `ts_inference_latency_microseconds` in milliseconds. A second graph plots the rate of TorchServe's internal queue latency metric `ts_queue_latency_microseconds` in milliseconds. A third graph plots the total requests to the TorchServe Inference Service. 

## KServe Triton Latency Dashboard 

A template dashboard for [KServe Triton Latency](https://grafana.com/grafana/dashboards/18027-kserve-triton-latency/) contains five latency graphs with the rate of Triton's input (preprocess), infer (predict), output (postprocess), internal queue and total latency metrics plotted in milliseconds. Triton outputs metrics on GPU usage as well, and the template plots a gauge of the percentage of GPU memory usage in bytes.
