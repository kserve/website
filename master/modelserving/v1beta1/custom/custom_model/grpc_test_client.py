from kserve import InferRequest, InferInput, InferenceServerClient
import json
import base64
import os

client = InferenceServerClient(url=os.environ.get("INGRESS_HOST", "localhost")+":"+os.environ.get("INGRESS_PORT", "8081"),
                               channel_args=(('grpc.ssl_target_name_override', os.environ.get("SERVICE_HOSTNAME", "")),))
json_file = open("./input.json")
data = json.load(json_file)
infer_input = InferInput(name="input-0", shape=[1], datatype="BYTES", data=[base64.b64decode(data["instances"][0]["image"]["b64"])])
request = InferRequest(infer_inputs=[infer_input], model_name=os.environ["MODEL_NAME"])
res = client.infer(infer_request=request)
print(res)
