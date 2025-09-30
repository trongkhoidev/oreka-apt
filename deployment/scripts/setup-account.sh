#!/bin/bash

# Account Setup Script for Oreka Deployment
# Usage: ./setup-account.sh [profile] [network]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROFILE=${1:-oreka_mainnet}
NETWORK=${2:-mainnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="$SCRIPT_DIR/../keys"

echo -e "${BLUE}🔧 Setting up Aptos account for Oreka deployment...${NC}"
echo -e "${BLUE}Profile: $PROFILE${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"

# Create keys directory
mkdir -p "$KEYS_DIR"

# Function to generate new account
generate_account() {
    echo -e "${BLUE}🔑 Generating new Aptos account...${NC}"
    
    # Generate account
    aptos init --profile "$PROFILE" --assume-yes
    
    # Get account info
    local address=$(aptos account list --profile "$PROFILE" --query "account" --output json | jq -r '.')
    local private_key=$(aptos account list --profile "$PROFILE" --query "private_key" --output json | jq -r '.')
    
    echo -e "${GREEN}✅ Account generated successfully${NC}"
    echo -e "${BLUE}Address: $address${NC}"
    echo -e "${BLUE}Private Key: $private_key${NC}"
    
    # Save to file
    local key_file="$KEYS_DIR/$PROFILE.key"
    cat > "$key_file" << EOF
# Aptos Account Information
# Profile: $PROFILE
# Network: $NETWORK
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

ADDRESS=$address
PRIVATE_KEY=$private_key
PROFILE=$PROFILE
NETWORK=$NETWORK
EOF
    
    echo -e "${GREEN}✅ Account info saved to: $key_file${NC}"
    
    # Update config file
    update_config_file "$address" "$private_key"
    
    return 0
}

# Function to update config file
update_config_file() {
    local address="$1"
    local private_key="$2"
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    
    if [ -f "$config_file" ]; then
        echo -e "${BLUE}📝 Updating config file...${NC}"
        
        # Backup original config
        cp "$config_file" "$config_file.backup"
        
        # Update config
        sed -i.tmp "s/APTOS_PROFILE=.*/APTOS_PROFILE=$PROFILE/" "$config_file"
        sed -i.tmp "s/APTOS_PRIVATE_KEY=.*/APTOS_PRIVATE_KEY=$private_key/" "$config_file"
        sed -i.tmp "s/MODULE_ADDRESS=.*/MODULE_ADDRESS=$address/" "$config_file"
        
        # Remove temp file
        rm "$config_file.tmp"
        
        echo -e "${GREEN}✅ Config file updated: $config_file${NC}"
    else
        echo -e "${YELLOW}⚠️  Config file not found: $config_file${NC}"
        echo -e "${BLUE}Creating new config file...${NC}"
        
        cat > "$config_file" << EOF
# Configuration for $PROFILE
APTOS_PROFILE=$PROFILE
APTOS_PRIVATE_KEY=$private_key
MODULE_ADDRESS=$address

# Network URLs
EOF
        
        if [ "$NETWORK" = "mainnet" ]; then
            cat >> "$config_file" << EOF
APTOS_REST_URL=https://fullnode.mainnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.mainnet.aptoslabs.com
EOF
        elif [ "$NETWORK" = "testnet" ]; then
            cat >> "$config_file" << EOF
APTOS_REST_URL=https://fullnode.testnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
EOF
        else
            cat >> "$config_file" << EOF
APTOS_REST_URL=https://fullnode.devnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.devnet.aptoslabs.com
EOF
        fi
        
        echo -e "${GREEN}✅ New config file created: $config_file${NC}"
    fi
}

# Function to fund account
fund_account() {
    local address="$1"
    
    echo -e "${BLUE}💰 Funding account with faucet...${NC}"
    
    if [ "$NETWORK" = "mainnet" ]; then
        echo -e "${RED}❌ Cannot use faucet on mainnet${NC}"
        echo -e "${YELLOW}Please fund your account manually with APT tokens${NC}"
        return 1
    fi
    
    # Fund with faucet
    aptos account fund-with-faucet --profile "$PROFILE" --account "$address"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Account funded successfully${NC}"
        
        # Check balance
        local balance=$(aptos account list --profile "$PROFILE" --query "apt_coin.coin.value" --output json | jq -r '.')
        echo -e "${BLUE}Current balance: $balance octas${NC}"
    else
        echo -e "${RED}❌ Failed to fund account${NC}"
        return 1
    fi
}

# Function to verify account setup
verify_account() {
    local address="$1"
    
    echo -e "${BLUE}🔍 Verifying account setup...${NC}"
    
    # Check if account exists
    if aptos account list --profile "$PROFILE" | grep -q "$address"; then
        echo -e "${GREEN}✅ Account exists${NC}"
    else
        echo -e "${RED}❌ Account not found${NC}"
        return 1
    fi
    
    # Check balance
    local balance=$(aptos account list --profile "$PROFILE" --query "apt_coin.coin.value" --output json | jq -r '.')
    echo -e "${BLUE}Account balance: $balance octas${NC}"
    
    if [ "$balance" -gt 0 ]; then
        echo -e "${GREEN}✅ Account has sufficient balance${NC}"
    else
        echo -e "${YELLOW}⚠️  Account has zero balance${NC}"
        if [ "$NETWORK" != "mainnet" ]; then
            fund_account "$address"
        fi
    fi
    
    # Check if account can sign transactions
    echo -e "${BLUE}Testing transaction signing...${NC}"
    if aptos account list --profile "$PROFILE" --query "sequence_number" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Account can sign transactions${NC}"
    else
        echo -e "${RED}❌ Account cannot sign transactions${NC}"
        return 1
    fi
}

# Main setup flow
main() {
    echo -e "${BLUE}🎯 Starting account setup...${NC}"
    
    # Check if profile already exists
    if aptos account list --profile "$PROFILE" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Profile $PROFILE already exists${NC}"
        local address=$(aptos account list --profile "$PROFILE" --query "account" --output json | jq -r '.')
        echo -e "${BLUE}Existing address: $address${NC}"
        
        read -p "Do you want to use the existing account? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Generating new account...${NC}"
            generate_account
        else
            echo -e "${BLUE}Using existing account...${NC}"
            verify_account "$address"
        fi
    else
        echo -e "${BLUE}Creating new account...${NC}"
        generate_account
    fi
    
    echo -e "${GREEN}🎉 Account setup completed successfully!${NC}"
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${BLUE}  1. Review the config file: $SCRIPT_DIR/../config/$PROFILE.env${NC}"
    echo -e "${BLUE}  2. Update any additional configuration as needed${NC}"
    echo -e "${BLUE}  3. Run deployment: ./deploy.sh $NETWORK $PROFILE${NC}"
}

# Run main function
main "$@"
