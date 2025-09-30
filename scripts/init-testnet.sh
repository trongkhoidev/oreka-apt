#!/bin/bash
set -euo pipefail

# Initialize on-chain resources on Aptos Testnet

YUGO=${1:-0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41}

export APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1

echo "Init GlobalPool..."
aptos move run \
  --function-id ${YUGO}::global_pool::init_global_pool \
  --profile oreka_testnet \
  --assume-yes

echo "Init MarketRegistry..."
aptos move run \
  --function-id ${YUGO}::market_core::initialize_market_registry \
  --profile oreka_testnet \
  --assume-yes

echo "Init MarketConfig..."
aptos move run \
  --function-id ${YUGO}::market_core::initialize_market_config \
  --args address:${YUGO} \
  --profile oreka_testnet \
  --assume-yes

echo "Done."


