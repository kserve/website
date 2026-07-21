import argparse
import io
from typing import Dict

import torch
from PIL import Image
from torchvision import models, transforms

from kserve import InferRequest, InferResponse, Model, ModelServer, logging, model_server
from kserve.utils.utils import get_predict_response

# This custom predictor example implements the custom model following KServe
# v2 inference gPPC protocol, the input can be raw image bytes or image tensor
# which is pre-processed by transformer and then passed to predictor, the
# output is the prediction response.
class AlexNetModel(Model):
    def __init__(self, name: str):
        super().__init__(name)
        self.load()
        self.ready = False

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        # The ready flag is used by model ready endpoint for readiness probes,
        # set to True when model is loaded successfully without exceptions.
        self.ready = True

    async def predict(
        self, payload: InferRequest,
        headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> InferResponse:
        req = payload.inputs[0]
        if req.datatype == "BYTES":
            input_image = Image.open(io.BytesIO(req.data[0]))
            preprocess = transforms.Compose(
                [
                    transforms.Resize(256),
                    transforms.CenterCrop(224),
                    transforms.ToTensor(),
                    transforms.Normalize(
                        mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                    ),
                ]
            )
            input_tensor = preprocess(input_image)
            input_tensor = input_tensor.unsqueeze(0)
        elif req.datatype == "FP32":
            np_array = payload.inputs[0].as_numpy()
            input_tensor = torch.Tensor(np_array)

        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.detach().numpy()
        return get_predict_response(payload, result, self.name)


parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    # Configure kserve and uvicorn logger
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)
    model = AlexNetModel(args.model_name)
    model.load()
    ModelServer().start([model])
