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

class AvgVote(Model):
    def __init__(self, name: str):
       super().__init__(name)
       self.model = None
       self.ready = False
       self.load()

    def load(self):
        self.ready = True

    def predict(self, payload: Union[Dict, InferRequest], headers: Dict[str, str] = None) -> Union[Dict, InferResponse]:
        tmp = []
        for isvcName, output in payload.items():
          prediction = output['predictions']
          tmp.append(prediction)

        result = [sum(x)/len(tmp) for x in zip(*tmp)] # assume same number of label
        return get_predict_response(payload, result, self.name)

parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    if args.configure_logging:
       logging.configure_logging(args.log_config_file)

    model = AvgVote(args.model_name)
    ModelServer().start([model])
