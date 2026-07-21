import argparse
import base64
import io
from typing import Dict

from torchvision import models, transforms
import torch
from PIL import Image
from ray import serve
from kserve import Model, ModelServer, logging, model_server
from kserve.ray import RayModel


# the model handle name should match the model endpoint name
@serve.deployment(name="custom-model", num_replicas=1)
class AlexNetModel(Model):
    def __init__(self, name):
        super().__init__(name)
        self.ready = False
        self.load()

    def load(self):
        self.model = models.alexnet(pretrained=True, progress=False)
        self.model.eval()
        # The ready flag is used by model ready endpoint for readiness probes,
        # set to True when model is loaded successfully without exceptions.
        self.ready = True

    async def predict(self, payload: Dict, headers: Dict[str, str] = None) -> Dict:
        inputs = payload["instances"]

        # Input follows the Tensorflow V1 HTTP API for binary values
        # https://www.tensorflow.org/tfx/serving/api_rest#encoding_binary_values
        data = inputs[0]["image"]["b64"]
        raw_img_data = base64.b64decode(data)
        input_image = Image.open(io.BytesIO(raw_img_data))
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
        input_batch = input_tensor.unsqueeze(0)
        output = self.model(input_batch)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        return {"predictions": values.tolist()}


parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    # Configure kserve and uvicorn logger
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)
    app = AlexNetModel.bind(name=args.model_name)
    handle = serve.run(app)
    model = RayModel(name=args.model_name, handle=handle)
    model.load()
    ModelServer().start([model])
