from ts.torch_handler.image_classifier import ImageClassifier
import json

class DogBreedClassifier(ImageClassifier):
    def preprocess(self, data):
        inp_imgs = []
        for idx, row in enumerate(data):
            input_data = row.get("data")
            # Wrap the input data into a format that is expected by the parent
            # preprocessing method
            inp_imgs.append({"body": input_data})
        if len(inp_imgs) > 0:
            return ImageClassifier.preprocess(self, inp_imgs)

    def inference(self, data, *args, **kwargs):
        if data is not None:
            return ImageClassifier.inference(self, data, *args, **kwargs)

    def postprocess(self, data):
       response = ["It's a dog!"] * len(data)
       if data is None:
           return response
       post_resp = ImageClassifier.postprocess(self, data)
       for idx, is_dog in enumerate(data):
           response[idx] = post_resp[idx]
       return response
