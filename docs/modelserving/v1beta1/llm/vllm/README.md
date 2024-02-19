## Deploy the LLaMA model with vLLM Runtime
Serving LLM models can be surprisingly slow even on high end GPUs, [vLLM](https://github.com/vllm-project/vllm) is a fast and easy-to-use LLM inference engine. It can achieve 10x-20x higher throughput than Huggingface transformers.
It supports [continuous batching](https://www.anyscale.com/blog/continuous-batching-llm-inference) for increased throughput and GPU utilization,
[paged attention](https://vllm.ai) to address the memory bottleneck where in the autoregressive decoding process all the attention key value tensors(KV Cache) are kept in the GPU memory to generate next tokens.

You can deploy the LLaMA model with built vLLM inference server container image using the `InferenceService` yaml API spec. 
We have work in progress integrating `vLLM` with `Open Inference Protocol` and KServe observability stack.

The LLaMA model can be downloaded from [huggingface](https://huggingface.co/meta-llama/Llama-2-7b) and upload to your cloud storage.

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
              value: gs://kfserving-examples/llm/huggingface/llama
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

!!! Warning
    vLLM runtime is still experimental, please expect API changes and further integration in the next KServe release.

=== "kubectl"
```bash
kubectl apply -f ./vllm.yaml
```

## Benchmarking vLLM Runtime

You can download the benchmark testing data set by running
```bash
wget https://huggingface.co/datasets/anon8231489123/ShareGPT_Vicuna_unfiltered/resolve/main/ShareGPT_V3_unfiltered_cleaned_split.json
```

The tokenizer can be found from the downloaded llama model.

Now, assuming that your ingress can be accessed at
`${INGRESS_HOST}:${INGRESS_PORT}` or you can follow [this instruction](../../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out your ingress IP and port.

You can run the [benchmarking script](./benchmark.py) and send the inference request to the exposed URL.

```bash
python benchmark.py --backend vllm --port ${INGRESS_PORT} --host ${INGRESS_HOST} --dataset ./ShareGPT_V3_unfiltered_cleaned_split.json --tokenizer ./tokenizer --request-rate 5
```

!!! success "Expected Output"

    ```{ .json .no-copy }
       Total time: 216.81 s
       Throughput: 4.61 requests/s
       Average latency: 7.96 s
       Average latency per token: 0.02 s
       Average latency per output token: 0.04 s
    ```
