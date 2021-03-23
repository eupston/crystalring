#!/bin/bash

PROTO_DIR=./proto

# Generate Server GO Code
protoc \
      --go_out=.\
      --go_opt=paths=source_relative \
      --go-grpc_out=. \
      --go-grpc_opt=paths=source_relative ${PROTO_DIR}/*.proto

# Generate Client JS Code
./node_modules/.bin/grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:${PROTO_DIR}\
    --grpc_out=${PROTO_DIR} \
    --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
    -I ${PROTO_DIR} ${PROTO_DIR}/*.proto
#
# Generate Client TS Code (d.ts)
./node_modules/.bin/grpc_tools_node_protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --ts_out=${PROTO_DIR} \
    -I ${PROTO_DIR} ${PROTO_DIR}/*.proto
