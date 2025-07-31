.PHONY: gen-api-docs open-inference-grpc gen-oip-api-docs gen-crd-api-docs

PROTO_FILE_PATH := https://raw.githubusercontent.com/kserve/open-inference-protocol/refs/heads/main/specification/protocol/open_inference_grpc.proto

open-inference-grpc:
	curl -s -L ${PROTO_FILE_PATH} > ./open_inference_grpc.proto

# Generate Open Inference Protocol gRPC API documentation.
gen-oip-grpc-api-docs: open-inference-grpc
	@bash -c ' \
	  trap "rm -f ./open_inference_grpc.proto" EXIT; \
	  docker run -it --user $(id -u):$(id -g) \
	    -v $(PWD)/docs/reference/oip:/out \
	    -v $(PWD)/hack/oip-api-ref-docs:/templates \
	    -v $(PWD):/protos \
	    pseudomuto/protoc-gen-doc \
	    --doc_opt=/templates/template.md,grpc-api.mdx \
	'
# Generate Open Inference Protocol REST API documentation.
gen-oip-rest-api-docs:
	cd docusaurus && npm run docusaurus gen-api-docs oip
	

# Generate CRD API documentation for KServe master branch.
gen-crd-api-docs:
	./hack/crd-ref-docs/gen-crd-api-ref-docs.sh

# Generate Python Runtime SDK API documentation.
gen-py-runtime-sdk-api-docs:
	./hack/python-runtime-sdk/generate-api-docs.sh

# Generate all API documentation.
# This will generate OIP gRPC, REST, Python runtime sdk and CRD API documentation.
gen-api-docs: gen-oip-grpc-api-docs gen-oip-rest-api-docs gen-crd-api-docs gen-py-runtime-sdk-api-docs
	@echo "API documentation generated successfully."
