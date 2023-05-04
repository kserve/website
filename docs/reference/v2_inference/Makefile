# REF: https://github.com/SeldonIO/seldon-core/blob/master/proto/v2/Makefile

.PHONY: README.md grpc_predict_v2.proto

KSERVE_BASE := https://raw.githubusercontent.com/kserve/kserve/master/python/kserve/kserve

grpc_predict_v2.proto:
	curl -s -L ${KSERVE_BASE}/protocol/grpc/grpc_predict_v2.proto > ./grpc_predict_v2.proto

README.md: grpc_predict_v2.proto
	docker run -it \
		-v $(CURDIR):/out \
		-v $(CURDIR):/templates \
		-v $(CURDIR):/protos \
		pseudomuto/protoc-gen-doc \
		--doc_opt=/templates/template.md,README.md
