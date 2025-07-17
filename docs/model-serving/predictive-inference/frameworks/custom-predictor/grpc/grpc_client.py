import asyncio
import json
import base64
import os

from kserve import InferRequest, InferInput
from kserve.inference_client import InferenceGRPCClient


async def main():
    client = InferenceGRPCClient(
        url=os.environ.get("INGRESS_HOST", "localhost") + ":" + os.environ.get("INGRESS_PORT", "8081"),
        channel_args=[('grpc.ssl_target_name_override', os.environ.get("SERVICE_HOSTNAME", ""))]
    )
    with open("../input.json") as json_file:
        data = json.load(json_file)
    infer_input = InferInput(name="input-0", shape=[1], datatype="BYTES",
                             data=[base64.b64decode(data["instances"][0]["image"]["b64"])])
    request = InferRequest(infer_inputs=[infer_input], model_name=os.environ.get("MODEL_NAME", "custom-model"))
    res = await client.infer(infer_request=request)
    print(res)

asyncio.run(main())
