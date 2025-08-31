#!/bin/bash

# Oreka Crypto v2 Deployment Script
# This script deploys all modules and initializes the platform

set -e

# Configuration
ACCOUNT_ADDRESS=${ACCOUNT_ADDRESS:-"0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d"}
NETWORK=${NETWORK:-"mainnet"}
APTOS_NODE_URL=${APTOS_NODE_URL:-"https://fullnode.mainnet.aptoslabs.com"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Oreka Crypto v2 Deployment${NC}"
echo "Network: $NETWORK"
echo "Account: $ACCOUNT_ADDRESS"
echo "Node URL: $APTOS_NODE_URL"
echo ""

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo -e "${RED}❌ Aptos CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Move.toml" ]; then
    echo -e "${RED}❌ Move.toml not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Compile the project first
echo -e "${YELLOW}📦 Compiling Move modules...${NC}"
aptos move compile
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Compilation successful${NC}"
else
    echo -e "${RED}❌ Compilation failed${NC}"
    exit 1
fi

# Deploy all modules
echo -e "${YELLOW}🚀 Deploying modules to $NETWORK...${NC}"
aptos move publish \
    --named-addresses yugo=$ACCOUNT_ADDRESS \
    --network $NETWORK \
    --profile default

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Initialize modules
echo -e "${YELLOW}🔧 Initializing platform modules...${NC}"

# Initialize market registry
echo "Initializing market registry..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::crypto_market::initialize_market_registry" \
    --network $NETWORK \
    --profile default

# Initialize treasury pool
echo "Initializing treasury pool..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::treasury_pool::initialize_treasury_pool" \
    --network $NETWORK \
    --profile default

# Initialize payment router
echo "Initializing payment router..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::payment_router::initialize_payment_router" \
    --network $NETWORK \
    --profile default

# Initialize USDC payment
echo "Initializing USDC payment..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::payment_usdc::initialize_usdc_payment" \
    --network $NETWORK \
    --profile default

# Initialize CLMM router
echo "Initializing CLMM router..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::clmm_router::initialize_clmm_router" \
    --network $NETWORK \
    --profile default

# Initialize reward manager
echo "Initializing reward manager..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::reward_manager::initialize_reward_manager" \
    --network $NETWORK \
    --profile default

# Initialize user stats
echo "Initializing user stats..."
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::user_stats::initialize_user_stats" \
    --network $NETWORK \
    --profile default

echo -e "${GREEN}✅ All modules initialized successfully${NC}"

# Configure CLMM settings
echo -e "${YELLOW}⚙️  Configuring CLMM settings...${NC}"
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::clmm_router::set_clmm_config" \
    --args address:$ACCOUNT_ADDRESS u8:1 u64:1000000 u64:100000000 u64:500 u64:3000 u64:2000 \
    --network $NETWORK \
    --profile default

echo -e "${GREEN}✅ CLMM configuration completed${NC}"

# Display deployment summary
echo ""
echo -e "${GREEN}🎉 Oreka Crypto v2 Deployment Complete!${NC}"
echo ""
echo "Deployed Modules:"
echo "  - crypto_market: $ACCOUNT_ADDRESS::crypto_market"
echo "  - treasury_pool: $ACCOUNT_ADDRESS::treasury_pool"
echo "  - payment_router: $ACCOUNT_ADDRESS::payment_router"
echo "  - payment_usdc: $ACCOUNT_ADDRESS::payment_usdc"
echo "  - clmm_router: $ACCOUNT_ADDRESS::clmm_router"
echo "  - reward_manager: $ACCOUNT_ADDRESS::reward_manager"
echo "  - user_stats: $ACCOUNT_ADDRESS::user_stats"
echo "  - types: $ACCOUNT_ADDRESS::types"
echo "  - pyth_price_adapter: $ACCOUNT_ADDRESS::pyth_price_adapter"
echo "  - ork_token_new: $ACCOUNT_ADDRESS::ork_token_new"
echo ""
echo "Next Steps:"
echo "  1. Configure Circle USDC integration"
echo "  2. Set up Hyperion CLMM pools"
echo "  3. Configure Nodit indexing service"
echo "  4. Test market creation and betting flows"
echo ""
echo "For more information, see: infra/README.md"
