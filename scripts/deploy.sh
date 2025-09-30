#!/bin/bash

# Oreka Smart Contract Deployment Script
# Usage: ./deploy.sh [network] [profile]
# Example: ./deploy.sh mainnet production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK=${1:-mainnet}
PROFILE=${2:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
CONFIG_FILE="$PROJECT_ROOT/deployment/config/$PROFILE.env"
KEYS_DIR="$PROJECT_ROOT/deployment/keys"

echo -e "${BLUE}🚀 Starting Oreka deployment...${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"
echo -e "${BLUE}Profile: $PROFILE${NC}"
echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    echo -e "${YELLOW}Please create the config file first.${NC}"
    exit 1
fi

# Load configuration
source "$CONFIG_FILE"

# Validate required environment variables
required_vars=("APTOS_PROFILE" "APTOS_PRIVATE_KEY" "APTOS_REST_URL" "APTOS_FAUCET_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

# Set Aptos CLI environment
export APTOS_PROFILE="$APTOS_PROFILE"
export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
export APTOS_REST_URL="$APTOS_REST_URL"
export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"

echo -e "${GREEN}✅ Configuration loaded successfully${NC}"

# Function to check if account exists and has sufficient balance
check_account() {
    local address="$1"
    local min_balance="${2:-100000000}" # 0.1 APT default
    
    echo -e "${BLUE}🔍 Checking account: $address${NC}"
    
    # Check if account exists
    if ! aptos account list --profile "$APTOS_PROFILE" | grep -q "$address"; then
        echo -e "${YELLOW}⚠️  Account $address does not exist, creating...${NC}"
        aptos account create --profile "$APTOS_PROFILE" --assume-yes
    fi
    
    # Check balance
    local balance=$(aptos account list --profile "$APTOS_PROFILE" --query "apt_coin.coin.value" --output json | jq -r '.')
    if [ "$balance" -lt "$min_balance" ]; then
        echo -e "${YELLOW}⚠️  Account balance ($balance) is below minimum ($min_balance)${NC}"
        if [ "$NETWORK" != "mainnet" ]; then
            echo -e "${BLUE}💰 Requesting faucet...${NC}"
            aptos account fund-with-faucet --profile "$APTOS_PROFILE" --account "$address"
        else
            echo -e "${RED}❌ Insufficient balance for mainnet deployment${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Account balance sufficient: $balance octas${NC}"
    fi
}

# Function to compile and publish module
publish_module() {
    local module_name="$1"
    local module_path="$2"
    
    echo -e "${BLUE}📦 Publishing module: $module_name${NC}"
    
    # Compile first
    echo -e "${BLUE}🔨 Compiling $module_name...${NC}"
    aptos move compile --package-dir "$PROJECT_ROOT" --named-addresses yugo="$APTOS_PROFILE"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Compilation failed for $module_name${NC}"
        exit 1
    fi
    
    # Publish module
    echo -e "${BLUE}🚀 Publishing $module_name to $NETWORK...${NC}"
    aptos move publish \
        --package-dir "$PROJECT_ROOT" \
        --named-addresses yugo="$APTOS_PROFILE" \
        --profile "$APTOS_PROFILE" \
        --assume-yes
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully published $module_name${NC}"
    else
        echo -e "${RED}❌ Failed to publish $module_name${NC}"
        exit 1
    fi
}

# Function to initialize modules
initialize_modules() {
    echo -e "${BLUE}🔧 Initializing modules...${NC}"
    
    # Initialize global pool
    echo -e "${BLUE}🏦 Initializing global pool...${NC}"
    aptos move run \
        --function-id "$APTOS_PROFILE::global_pool::init_global_pool" \
        --profile "$APTOS_PROFILE" \
        --assume-yes
    
    # Initialize market registry
    echo -e "${BLUE}📊 Initializing market registry...${NC}"
    aptos move run \
        --function-id "$APTOS_PROFILE::market_core::initialize_market_registry" \
        --profile "$APTOS_PROFILE" \
        --assume-yes
    
    # Initialize market config
    echo -e "${BLUE}⚙️  Initializing market config...${NC}"
    aptos move run \
        --function-id "$APTOS_PROFILE::market_core::initialize_market_config" \
        --args address:"$APTOS_PROFILE" \
        --profile "$APTOS_PROFILE" \
        --assume-yes
    
    echo -e "${GREEN}✅ All modules initialized successfully${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    # Check if modules are published
    local modules=("global_pool" "market_core" "pyth_price_adapter" "types")
    
    for module in "${modules[@]}"; do
        echo -e "${BLUE}Checking module: $module${NC}"
        if aptos account list --profile "$APTOS_PROFILE" --query "modules" --output json | jq -r '.[] | select(.name == "'$module'")' | grep -q "$module"; then
            echo -e "${GREEN}✅ Module $module is published${NC}"
        else
            echo -e "${RED}❌ Module $module not found${NC}"
            exit 1
        fi
    done
    
    # Check if resources are initialized
    echo -e "${BLUE}Checking resources...${NC}"
    aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type | contains("GlobalPool"))'
    aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type | contains("MarketRegistry"))'
    aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type | contains("MarketConfig"))'
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Function to save deployment info
save_deployment_info() {
    local deployment_file="$SCRIPT_DIR/../deployments/$NETWORK-$PROFILE.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    mkdir -p "$(dirname "$deployment_file")"
    
    cat > "$deployment_file" << EOF
{
  "network": "$NETWORK",
  "profile": "$PROFILE",
  "deployer": "$APTOS_PROFILE",
  "timestamp": "$timestamp",
  "modules": {
    "global_pool": "$APTOS_PROFILE::global_pool",
    "market_core": "$APTOS_PROFILE::market_core",
    "pyth_price_adapter": "$APTOS_PROFILE::pyth_price_adapter",
    "types": "$APTOS_PROFILE::types"
  },
  "initialized_resources": [
    "$APTOS_PROFILE::global_pool::GlobalPool",
    "$APTOS_PROFILE::market_core::MarketRegistry",
    "$APTOS_PROFILE::market_core::MarketConfig"
  ]
}
EOF
    
    echo -e "${GREEN}✅ Deployment info saved to: $deployment_file${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🎯 Starting deployment process...${NC}"
    
    # Step 1: Check account
    check_account "$APTOS_PROFILE"
    
    # Step 2: Publish modules
    publish_module "oreka" "$PROJECT_ROOT"
    
    # Step 3: Initialize modules
    initialize_modules
    
    # Step 4: Verify deployment
    verify_deployment
    
    # Step 5: Save deployment info
    save_deployment_info
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo -e "${BLUE}  Network: $NETWORK${NC}"
    echo -e "${BLUE}  Deployer: $APTOS_PROFILE${NC}"
    echo -e "${BLUE}  Modules: global_pool, market_core, pyth_price_adapter, types${NC}"
    echo -e "${BLUE}  Resources: GlobalPool, MarketRegistry, MarketConfig${NC}"
}

# Run main function
main "$@"
