import argparse
import base64
import io
import time

from fastapi.middleware.cors import CORSMiddleware
from torchvision import models, transforms
from typing import Dict
import torch
from PIL import Image

import kserve
from kserve import Model, ModelServer, logging
from kserve.model_server import app
from kserve.utils.utils import generate_uuid


class AlexNetModel(Model):
    def __init__(self, name: str):
        super().__init__(name, return_response_headers=True)
        self.load()
        self.ready = False

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        # The ready flag is used by model ready endpoint for readiness probes,
        # set to True when model is loaded successfully without exceptions.
        self.ready = True

    async def predict(
        self,
        payload: Dict,
        headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> Dict:
        start = time.time()
        # Input follows the Tensorflow V1 HTTP API for binary values
        # https://www.tensorflow.org/tfx/serving/api_rest#encoding_binary_values
        img_data = payload["instances"][0]["image"]["b64"]
        raw_img_data = base64.b64decode(img_data)
        input_image = Image.open(io.BytesIO(raw_img_data))
        preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        input_tensor = preprocess(input_image).unsqueeze(0)
        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.flatten().tolist()
        end = time.time()
        response_id = generate_uuid()

        # Custom response headers can be added to the inference response
        if response_headers is not None:
            response_headers.update(
                {"prediction-time-latency": f"{round((end - start) * 1000, 9)}"}
            )

        return {"predictions": result}


parser = argparse.ArgumentParser(parents=[kserve.model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    # Configure kserve and uvicorn logger
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)
    model = AlexNetModel(args.model_name)
    model.load()
    # Custom middlewares can be added to the model
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ModelServer().start([model])
