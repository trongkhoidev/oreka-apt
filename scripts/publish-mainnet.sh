#!/bin/bash
set -euo pipefail

# Publish Move package to Aptos Mainnet
# Usage: ./publish-mainnet.sh <yugo_address>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <yugo_address>" >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
YUGO_ADDR="$1"

export APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1

aptos move publish \
  --package-dir "$PROJECT_DIR" \
  --profile oreka_mainnet \
  --skip-fetch-latest-git-deps \
  --named-addresses yugo=$YUGO_ADDR,pyth=0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387,deployer=0xb31e712b26fd295357355f6845e77c888298636609e93bc9b05f0f604049f434,wormhole=0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625

echo "Note: If you see BACKWARD_INCOMPATIBLE_MODULE_UPDATE, choose a new publisher address or keep struct layouts compatible with the on-chain version."


