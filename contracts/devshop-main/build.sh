#!/bin/sh

echo ">> Building contract"

near-sdk-js build src/contract.ts build/devshop_main.wasm
