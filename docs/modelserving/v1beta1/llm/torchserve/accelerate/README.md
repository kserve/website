# Serve Large Language Model with Huggingface Accelerate

This documentation explains how KServe supports large language model serving via `TorchServe`.
The large language refers to the models that are not able to fit into one GPU so they need
to be sharded in multiple partitions over multiple GPUs.

Huggingface Accelerate can load sharded checkpoints and the maximum RAM usage will the size of
the largest shard. By setting `device_map` to true, `Accelerate` automatically determines where
to put each layer of the model depending on the available resources.


## Package the model

1. Download the model `bigscience/bloom-7b1` from Huggingface Hub

2. Compress the model
```bash
zip -r model.zip model/models--bigscience-bloom-7b1/snapshots/5546055f03398095e385d7dc625e636cc8910bf2/
```

3. Package the model
Create the `setup_config.json` file with accelerate settings:
* Enable low_cpu_mem_usage to use accelerate
* Recommended max_memory in setup_config.json is the max size of shard.
```json
{
    "revision": "main",
    "max_memory": {
        "0": "10GB",
        "cpu": "10GB"
    },
    "low_cpu_mem_usage": true,
    "device_map": "auto",
    "offload_folder": "offload",
    "offload_state_dict": true,
    "torch_dtype":"float16",
    "max_length":"80"
}
```

```bash
torch-model-archiver --model-name bloom --version 1.0 --handler custom_handler.py --extra-files model.zip,setup_config.json
```

4. Upload to the cloud storage

## Serve the large model with InferenceService

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: "bloom"
spec:
  predictor:
    pytorch:
      runtimeVersion: 0.8.0
      storageUri: gs://kfserving-samples/models/torchserve/Huggingface_accelerate/
      resources:
        limits:
          cpu: "2"
          memory: 32Gi
          nvidia.com/gpu: "2"
        requests:
          cpu: "2"
          memory: 32Gi
          nvidia.com/gpu: "2"
```

## Run the Inference

```bash
curl -v  https://${INGERSS_HOST}/v1/models/bloom:predict -d @./sample_text.txt

{"predictions":["My dog is cute.\nNice.\n- Hey, Mom.\n- Yeah?\nWhat color's your dog?\n- It's gray.\n- Gray?\nYeah.\nIt looks gray to me.\n- Where'd you get it?\n- Well, Dad says it's kind of...\n- Gray?\n- Gray.\nYou got a gray dog?\n- It's gray.\n- Gray.\nIs your dog gray?\nAre you sure?\nNo.\nYou sure"]}
```


