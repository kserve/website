# REF: https://github.com/SeldonIO/seldon-core/blob/master/proto/v2/Makefile

.PHONY: README.md grpc_predict_v2.proto

PROTO_FILE_PATH := https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol

open_inference_grpc:
	curl -s -L ${PROTO_FILE_PATH}/open_inference_grpc.proto > ./open_inference_grpc.proto

README.md: open_inference_grpc
	docker run -it \
		-v $(PWD):/out \
		-v $(PWD):/templates \
		-v $(PWD):/protos \
		pseudomuto/protoc-gen-doc \
		--doc_opt=/templates/template.md,README.md
