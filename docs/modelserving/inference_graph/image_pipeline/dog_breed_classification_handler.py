from ts.torch_handler.image_classifier import ImageClassifier
import json

class DogBreedClassifier(ImageClassifier):
    def preprocess(self, data):
        print(data)
        self.is_dogs = [False] * len(data)
        inp_imgs = []
        for idx, row in enumerate(data):
            cat_dog_response = row.get("predictions")
            input_data = row.get("data")
            if cat_dog_response == "dog":
                self.is_dogs[idx] = True
                # Wrap the input data into a format that is expected by the parent
                # preprocessing method
                inp_imgs.append({"body": input_data})
        if len(inp_imgs) > 0:
            return ImageClassifier.preprocess(self, inp_imgs)

    def inference(self, data, *args, **kwargs):
        if data is not None:
            return ImageClassifier.inference(self, data, *args, **kwargs)

    def postprocess(self, data):
       response = ["It's a cat!"] * len(self.is_dogs)
       if data is None:
           return response
       post_resp = ImageClassifier.postprocess(self, data)
       idx2 = 0
       for idx, is_dog in enumerate(self.is_dogs):
           if is_dog:
               response[idx] = post_resp[idx2]
               idx2+=1
       return response
