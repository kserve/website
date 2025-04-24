import argparse
from typing import Dict, Union
import numpy as np
from kserve import (
    Model,
    ModelServer,
    model_server,
    InferRequest,
    InferOutput,
    InferResponse,
    logging,
)
from kserve.utils.utils import get_predict_response


class DummyClassifier2(Model):
    def __init__(self, name: str):
       super().__init__(name)
       self.model = None
       self.ready = False
       self.load()

    def load(self):
        self.ready = True

    def predict(self, payload: Union[Dict, InferRequest], headers: Dict[str, str] = None) -> Union[Dict, InferResponse]:
        return {"predictions": [0.6, 0.4]}

parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    if args.configure_logging:
       logging.configure_logging(args.log_config_file)
    
    model = DummyClassifier2(args.model_name)
    ModelServer().start([model])
