## Deploy the LLaMA model with vLLM Runtime

You can deploy the LLaMA model with built `vLLM` inference server container image using the `InferenceService` yaml API spec. 
We have work in progress integrating `vLLM` with `Open Inference Protocol` and KServe observability stack.

=== "Yaml"
    ```yaml
    kubectl apply -n kserve-test -f - <<EOF
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    metadata:
      name: llama-2-7b
    spec:
      predictor:
        containers:
          - args:
            - --port
            - "8080"
            - --model
            - /mnt/models
          command:
            - python3
            - -m
            - vllm.entrypoints.api_server
          env:
            - name: STORAGE_URI
              value: gcs://kfserving-examples/llm/huggingface/llama
          image: kserve/vllmserver:latest
          name: kserve-container
          resources:
            limits:
              cpu: "4"
              memory: 50Gi
              nvidia.com/gpu: "1"
            requests:
              cpu: "1"
              memory: 50Gi
              nvidia.com/gpu: "1"
    ```

!!! Warning!
    vLLM runtime is still experimental, please expect API changes and further integration in the next KServe release.

=== "kubectl"
```bash
kubectl apply -f ./vllm.yaml
```

## Benchmarking vLLM Runtime

You can download the benchmark testing data set from

Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

You can run the benchmarking test and send the inference request to the exposed URL.

```bash
python benchmark.py --backend vllm --port ${INGRESS_PORT} --host ${INGRESS_HOST} --dataset ./ShareGPT_V3_unfiltered_cleaned_split.json --tokenizer ./ --request-rate 5
```

!!! success "Expected Output"

    ```{ .json .no-copy }
       Total time: 216.81 s
       Throughput: 4.61 requests/s
       Average latency: 7.96 s
       Average latency per token: 0.02 s
       Average latency per output token: 0.04 s
    ```
