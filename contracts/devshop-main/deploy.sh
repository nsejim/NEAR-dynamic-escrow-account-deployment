#!/bin/sh

./build.sh

if [ $? -ne 0 ]; then
  echo ">> Error building contract"
  exit 1
fi

echo ">> Deploying contract to " $CONTRACT_NAME

# https://docs.near.org/tools/near-cli#near-dev-deploy
near deploy --wasmFile build/devshop_main.wasm --accountId $CONTRACT_NAME