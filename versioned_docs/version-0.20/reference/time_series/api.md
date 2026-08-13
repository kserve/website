# TimeSeries LLM Forecast API Reference

## Overview

A [time series](https://en.wikipedia.org/wiki/Time_series) records how a measurement changes over time, while [forecasting](https://en.wikipedia.org/wiki/Forecasting) estimates future values based on past behavior. Time series forecasting is commonly used for future-looking decisions in finance, supply chains, energy, and other operations that depend on reliable projections.

To ease and standardize the deployment of time series models in the LLM era, we designed the TimeSeries LLM Forecast API in Kserve so you can run forecasts with transformer-based models. This API supports both univariate and multivariate time series, provides quantile forecasting, and is designed to be extensible for future enhancements. The API is compatible with standard RESTful practices and allows for flexible options and metadata handling, making it suitable for a wide range of time series applications across industries.

## Table of Contents

* [Overview](#overview)
* [Quick Start](#quick-start)
* [Request Schema](#request-schema)
  * [ForecastRequest Fields](#forecastrequest-fields)
  * [TimeSeriesInput](#timeseriesinput)
  * [ForecastOptions](#forecastoptions)
  * [Metadata](#metadata)
* [Response Schema](#response-schema)
  * [ForecastResponse Fields](#forecastresponse-fields)
  * [ForecastOutput](#forecastoutput)
  * [TimeSeriesForecast](#timeseriesforecast)
  * [Usage](#usage)
  * [Error Handling](#error-handling)
* [Enumerations](#enumerations)
  * [Frequency](#frequency)
  * [Status](#status)
  * [TimeSeriesType](#timeseriestype)
* [Examples](#examples)
  * [Request Example](#request-example)
  * [Response Example](#response-example)
* [Best Practices](#best-practices)
* [FAQ](#faq)
* [Changelog](#changelog)


## Quick Start

### Endpoint

```
POST /v1/timeseries/forecast
```

### Typical Workflow

1. Prepare your input time series data and specify forecasting options (e.g., horizon, quantiles).
2. Compose a JSON request payload according to the [Request Schema](#request-schema).
3. Send a POST request to `/v1/timeseries/forecast`.
4. Parse the response for forecast results, quantiles, and usage metrics.


## Request Schema

### ForecastRequest Fields

| Field               | Type                   | Required | Description                                    |
| ------------------- | ---------------------- | -------- | ---------------------------------------------- |
| model               | string                 | Yes      | Name/ID of the model to use                    |
| inputs              | List\[TimeSeriesInput] | Yes      | List of input time series to forecast          |
| options             | ForecastOptions        | Yes      | Forecasting options (e.g., horizon, quantiles) |
| metadata            | Metadata               | No       | Arbitrary user metadata                        |
| other\_properties   | any                    | No       | Additional extensible fields                   |

#### JSON Structure

```json
{
  "model": "timesfm",
  "inputs": [...],
  "options": {...},
  "metadata": {...},        // optional
  "other_properties": ...   // optional
}
```


### TimeSeriesInput

| Field              | Type             | Required | Description                                                |
| ------------------ | ---------------- | -------- | ---------------------------------------------------------- |
| type               | TimeSeriesType   | Yes      | 'univariate\_time\_series' or 'multivariate\_time\_series' |
| name               | string           | Yes      | Name of the time series (unique in request)                |
| series             | TimeSeries       | Yes      | Observed data: List\[float] or List\[List\[float]]         |
| frequency          | Frequency        | Yes      | Frequency (see [Frequency](#frequency))                    |
| start\_timestamp   | string (ISO8601) | No       | Start timestamp of series (for aligning output)            |
| ...extra fields    | any              | No       | Additional extensible fields                               |


### ForecastOptions

| Field       | Type         | Required | Description                        |
| ----------- | ------------ | -------- | ---------------------------------- |
| horizon     | int          | Yes      | Number of steps to forecast        |
| quantiles   | List\[float] | No       | Quantiles (e.g., \[0.1, 0.5, 0.9]) |
| ...extra    | any          | No       | Additional extensible fields       |


### Metadata

* Arbitrary user-provided metadata. No required or fixed fields.


## Response Schema

### ForecastResponse Fields

| Field       | Type                  | Required | Description                       |
| ----------- | --------------------- | -------- | --------------------------------- |
| id          | string                | Yes      | Unique response identifier        |
| created\_at | int (unix ts)         | Yes      | Time of response creation         |
| status      | Status                | Yes      | Overall status of the request     |
| error       | Error                 | No       | Top-level error (if any)          |
| model       | string                | Yes      | The model used for forecasting    |
| outputs     | List\[ForecastOutput] | Yes      | Forecast results, one per input   |
| usage       | Usage                 | No       | Token usage metrics (if relevant) |
| ...extra    | any                   | No       | Additional extensible fields      |


### ForecastOutput

| Field    | Type                      | Required | Description                                   |
| -------- | ------------------------- | -------- | --------------------------------------------- |
| type     | string                    | Yes      | 'time\_series\_forecast'                      |
| id       | string                    | Yes      | Unique forecast output identifier             |
| status   | Status                    | Yes      | Status of this forecast result                |
| content  | List\[TimeSeriesForecast] | Yes      | One or more time series forecasts (per input) |
| error    | Error                     | No       | Error if this forecast failed                 |
| ...extra | any                       | No       | Additional extensible fields                  |


### TimeSeriesForecast

| Field            | Type                   | Required | Description                                                |
| ---------------- | ---------------------- | -------- | ---------------------------------------------------------- |
| type             | TimeSeriesType         | Yes      | 'univariate\_time\_series' or 'multivariate\_time\_series' |
| name             | string                 | Yes      | The name of the time series                                |
| mean\_forecast   | TimeSeries             | Yes      | Mean (expected) forecast values                            |
| frequency        | Frequency              | Yes      | Frequency of the forecasted time series                    |
| start\_timestamp | string (ISO8601)       | Yes      | Start timestamp for the forecast horizon                   |
| quantiles        | Dict\[str, TimeSeries] | No       | Map from quantile string (e.g., "0.1") to values           |
| ...extra         | any                    | No       | Additional extensible fields                               |


### Usage

| Field              | Type | Required | Description                                 |
| ------------------ | ---- | -------- | ------------------------------------------- |
| prompt\_tokens     | int  | Yes      | Number of tokens in prompt (if LLM-related) |
| completion\_tokens | int  | Yes      | Number of tokens in result                  |
| total\_tokens      | int  | Yes      | Total tokens used                           |
| ...extra           | any  | No       | Additional extensible fields                |


### Error Handling

If an error occurs, the response may contain a top-level `error` field, or errors may be reported per-forecast (in the corresponding output object). The structure is:

```json
{
  "error": {
    "code": "<string>",
    "message": "<description>",
    "param": "<string>",
    "type": "<string>"
  }
}
```


## Enumerations

### Frequency

* `SECOND`, `S`: second
* `MINUTE`, `T`: minute
* `HOUR`, `H`: hour
* `DAY`, `D`: day
* `WEEK`, `W`: week
* `MONTH`, `M`: month
* `QUARTER`, `Q`: quarter
* `YEAR`, `Y`: year

### Status

* `COMPLETED`: The forecast completed successfully
* `ERROR`: There was an error in processing
* `PENDING`: The forecast is still running
* `PARTIAL`: Partially completed

### TimeSeriesType

* `univariate_time_series`
* `multivariate_time_series`


## Examples

### Deploy on KServe

The steps below assume you already have a Kubernetes cluster with KServe installed and that you can pull the model weights from Hugging Face (set the `HUGGING_FACE_HUB_TOKEN` secret if the model is gated).

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: timeseries-forecast
  namespace: kserve-demo
spec:
  predictor:
    containers:
      - name: timesfm
        image: kserve/huggingfaceserver:latest
        args:
          - "--model_id=google/timesfm-2.0-500m-pytorch"
          - "--model_name=timesfm2"
          - "--http_port=8080"
        resources:
          requests:
            cpu: "4"
            memory: "8Gi"
          limits:
            cpu: "8"
            memory: "16Gi"
            nvidia.com/gpu: "1"
```

### Request Example

```bash
curl -X POST "${SERVICE_URL}/v1/timeseries/forecast" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "timesfm2",
    "inputs": [
      {
        "type": "univariate_time_series",
        "name": "stock_price",
        "series": [120, 122, 125, 127, 130, 133, 135],
        "frequency": "D",
        "start_timestamp": "2025-06-05T13:10:00Z"
      },
      {
        "type": "univariate_time_series",
        "name": "humidity",
        "series": [33, 34, 35, 36, 37],
        "frequency": "H",
        "start_timestamp": "2025-06-05T13:10:00Z"
      }
    ],
    "options": {
      "horizon": 4,
      "quantiles": [0.1, 0.5, 0.9],
      "other_options": "value"
    },
    "metadata": {
      "request_id": "user_defined_request_id",
      "other_data": "value"
    },
    "other_properties": "value"
  }'
```


### Response Example

```json
{
  "id": "resp_67ccd2bed1ec8190b14f964abc0542670bb6a6b452d3795b",
  "created_at": 1741476542,
  "status": "completed",
  "error": null,
  "model": "timesfm2",
  "outputs": [
    {
      "type": "time_series_forecast",
      "id": "ts_67ccd2bf17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
      "status": "completed",
      "content": [
        {
          "type": "univariate_time_series",
          "name": "stock_price",
          "mean_forecast": [138, 141, 144, 147],
          "frequency": "D",
          "start_timestamp": "2025-06-12T13:10:00Z",
          "quantiles": {
            "0.1": [135, 138, 140, 143],
            "0.5": [138, 141, 144, 147],
            "0.9": [142, 145, 148, 151]
          }
        }
      ]
    },
    {
      "type": "time_series_forecast",
      "id": "ts_67ccd2bsdf9q3wadfk439jngjmaphng0oswa34nm8we0ejrf",
      "status": "completed",
      "content": [
        {
          "type": "univariate_time_series",
          "name": "humidity",
          "mean_forecast": [39, 40, 41, 42],
          "frequency": "H",
          "start_timestamp": "2025-06-05T18:10:00Z",
          "quantiles": {
            "0.1": [37, 38, 39, 40],
            "0.5": [39, 40, 41, 42],
            "0.9": [41, 42, 43, 44]
          }
        }
      ]
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 2,
    "total_tokens": 6
  },
  "other_properties": "value"
}
```


## Best Practices

* Always include `start_timestamp` for correct alignment of output forecast horizon with input data.
* Quantiles are returned as string keys (e.g., "0.1").
* Make use of `metadata` to pass request-tracking info (e.g., request\_id).
* Check both top-level and per-output `status` and `error` fields to handle errors robustly.


## FAQ

**Q:** What happens if quantiles are not specified?
**A:** Only mean forecast will be returned.

**Q:** How is the forecast `start_timestamp` determined?
**A:** It is typically `input.start_timestamp + options.horizon` intervals, but the exact logic depends on the model and frequency.

**Q:** How are multivariate series represented?
**A:** As `List[List[float]]`, with the first dimension for time and the second for variables.

**Q:** Are additional fields allowed?
**A:** Yes, both request and response models allow arbitrary extra fields for forward compatibility.


## Changelog

* **2025-07-24**: Initial version of API documentation created.
* **2025-10-20**: Added Kubernetes deployment example.
