# Grafana Dashboards 

Some example Grafana dashboards are available in GrafanaLabs. 

## Knative HTTP Dashboard (if using serverless mode)

The [Knative HTTP Grafana dasbhoard](https://grafana.com/grafana/dashboards/18032-knative-serving-revision-http-requests/) was built from [Knative's sandbox monitoring example]https://github.com/knative-sandbox/monitoring().

## KServe ModelServer Latency Dashboard

A template dashboard for [KServe ModelServer Latency](https://grafana.com/grafana/dashboards/17969-kserve-modelserver-latency/) contains example queries using the prometheus metrics for pre/post-process, predict and explain in milliseconds. The query is a [histogram quantile](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile). A fifth graph shows the total number of requests to the predict endpoint. This graph covers all KServe's ModelServer runtimes - lgbserver, paddleserver, pmmlserver, sklearnserver, xgbserver, custom transformer/predictor.

## KServe TorchServe Latency Dashboard

A template dashboard for [KServe TorchServe Latency](https://grafana.com/grafana/dashboards/18026-kserve-torchserve-latency/) contains an inference latency graph which plots the [rate](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) of the TorchServe metric `ts_inference_latency_microseconds` in milliseconds. A second graph plots the rate of TorchServe's internal queue latency metric `ts_queue_latency_microseconds` in milliseconds. A third graph plots the total requests to the TorchServe Inference Service. 

## KServe Triton Latency Dashboard 

A template dashboard for [KServe Triton Latency](https://grafana.com/grafana/dashboards/18027-kserve-triton-latency/) contains five latency graphs with the rate of Triton's input (preprocess), infer (predict), output (postprocess), internal queue and total latency metrics plotted in milliseconds. Triton outputs metrics on GPU usage as well, and the template plots a gauge of the percentage of GPU memory usage in bytes.

## Debugging 

With these Grafana dashboards set up, debug latency issues with the following steps

First, (if in serverless mode) start with the Knative HTTP Dashboard to check if there is a queueing delay with queue-proxy

- [x] compare the gateway latency percentile metrics with your target SLO  
- [x] check the observed concurrency metrics to see if your service overloaded with a high number of inflight requests, indicating the service is over capacity and is unable to keep up with the number of requests 
- [x] check the GPU/CPU memory metrics to see if the service is close to its limits - if your service has a high number of inflight requests/high CPU/GPU usage, then a possible solution is to add more resources/replicas

Next, take a look at the appropriate serving runtime dashboard to see if there is a bottleneck in the code

- [x] check the latencies for pre/post-process, predict, explain - are latencies higher than expected at any one step? If so, you may need to make changes/adjustments for this step (note: TorchServe does not currently expose this level of observability at the moment, only an inference latency graph which encompasses the steps together)
- [x] check the queue latency metrics (TorchServe and Triton) - if requests are stuck in the queue, the model is not able to keep up with the number of requests, consider adding more resources/replicas
- [x] (Triton) check the GPU utilization metrics to see if your service is at capacity and you need more GPU resources

If the numbers from the dashboards meet your SLO, check client side metrics to investigate if it is causing additional network latency. 
 

