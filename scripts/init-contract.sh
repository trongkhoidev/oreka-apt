#!/bin/bash

# Initialize Oreka Market Contract
# This script initializes the market registry and config

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing Oreka Market Contract...${NC}"

# Check if profile exists
if ! aptos account list | grep -q "oreka_mainnet"; then
    echo -e "${RED}❌ Profile oreka_mainnet not found. Please run setup first.${NC}"
    exit 1
fi

# Use the correct account address
ACCOUNT_ADDRESS="0x288411cf0c7d7fe21fde828a8958f1971934dd9237fb69be36e15470b857449d"
echo -e "${BLUE}📋 Account Address: $ACCOUNT_ADDRESS${NC}"

# Step 1: Initialize market registry
echo -e "${BLUE}📊 Step 1: Initializing market registry...${NC}"
aptos move run \
    --function-id $ACCOUNT_ADDRESS::market_core_v2::initialize_market_registry \
    --profile oreka_mainnet \
    --skip-fetch-latest-git-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Market registry initialized successfully${NC}"
else
    echo -e "${RED}❌ Failed to initialize market registry${NC}"
    exit 1
fi

# Step 2: Initialize market config
echo -e "${BLUE}⚙️  Step 2: Initializing market config...${NC}"
aptos move run \
    --function-id $ACCOUNT_ADDRESS::market_core_v2::initialize_market_config \
    --args address:$ACCOUNT_ADDRESS \
    --profile oreka_mainnet \
    --skip-fetch-latest-git-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Market config initialized successfully${NC}"
else
    echo -e "${RED}❌ Failed to initialize market config${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Contract initialization completed!${NC}"
echo -e "${YELLOW}📝 You can now create markets using the frontend${NC}"
