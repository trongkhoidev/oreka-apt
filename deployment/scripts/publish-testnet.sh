#!/bin/bash

set -euo pipefail

# Publish Move package to Aptos Testnet
# Usage: ./publish-testnet.sh [yugo_address]

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"

# Resolve yugo address: param > Move.toml
YUGO_ADDR="${1:-}"
if [ -z "$YUGO_ADDR" ]; then
  YUGO_ADDR=$(sed -n 's/^yugo\s*=\s*"\(0x\?[0-9a-fA-F]\+\)"/\1/p' "$PROJECT_DIR/Move.toml")
fi

if [ -z "$YUGO_ADDR" ]; then
  echo "Missing yugo address. Pass as arg or set in Move.toml"
  exit 1
fi

export APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1

echo "Using yugo=$YUGO_ADDR"

aptos move publish \
  --package-dir "$PROJECT_DIR" \
  --profile oreka_testnet \
  --skip-fetch-latest-git-deps \
  --named-addresses yugo=$YUGO_ADDR,pyth=0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387,deployer=0xb31e712b26fd295357355f6845e77c888298636609e93bc9b05f0f604049f434,wormhole=0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625


