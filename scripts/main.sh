#!/bin/bash

# Main Deployment Script for Oreka
# Usage: ./main.sh [command] [network] [profile]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND=${1:-help}
NETWORK=${2:-mainnet}
PROFILE=${3:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 Oreka Deployment Manager${NC}"
echo -e "${BLUE}Command: $COMMAND${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"
echo -e "${BLUE}Profile: $PROFILE${NC}"

# Function to show help
show_help() {
    echo -e "${BLUE}📖 Oreka Deployment Commands:${NC}"
    echo ""
    echo -e "${GREEN}Account Management:${NC}"
    echo -e "  ${YELLOW}setup${NC}     [network] [profile]  - Setup Aptos account"
    echo -e "  ${YELLOW}balance${NC}   [network] [profile]  - Check account balance"
    echo -e "  ${YELLOW}info${NC}      [network] [profile]  - Show account info"
    echo ""
    echo -e "${GREEN}Deployment:${NC}"
    echo -e "  ${YELLOW}deploy${NC}    [network] [profile]  - Deploy contracts"
    echo -e "  ${YELLOW}verify${NC}    [network] [profile]  - Verify deployment"
    echo -e "  ${YELLOW}multisig${NC}  [network] [profile]  - Multisig deployment"
    echo ""
    echo -e "${GREEN}Testing:${NC}"
    echo -e "  ${YELLOW}test${NC}      [network] [profile]  - Run deployment tests"
    echo -e "  ${YELLOW}compile${NC}   [network] [profile]  - Compile contracts"
    echo ""
    echo -e "${GREEN}Utilities:${NC}"
    echo -e "  ${YELLOW}clean${NC}     [network] [profile]  - Clean deployment artifacts"
    echo -e "  ${YELLOW}logs${NC}      [network] [profile]  - Show deployment logs"
    echo -e "  ${YELLOW}status${NC}    [network] [profile]  - Show deployment status"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo -e "  ${YELLOW}./main.sh setup mainnet production${NC}"
    echo -e "  ${YELLOW}./main.sh deploy mainnet production${NC}"
    echo -e "  ${YELLOW}./main.sh verify mainnet production${NC}"
    echo ""
}

# Function to setup account
setup_account() {
    echo -e "${BLUE}🔧 Setting up account...${NC}"
    "$SCRIPT_DIR/setup-account.sh" "$PROFILE" "$NETWORK"
}

# Function to check balance
check_balance() {
    echo -e "${BLUE}💰 Checking account balance...${NC}"
    
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Config file not found: $config_file${NC}"
        exit 1
    fi
    
    source "$config_file"
    
    # Set Aptos CLI environment
    export APTOS_PROFILE="$APTOS_PROFILE"
    export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
    export APTOS_REST_URL="$APTOS_REST_URL"
    export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"
    
    local balance=$(aptos account list --profile "$APTOS_PROFILE" --query "apt_coin.coin.value" --output json | jq -r '.')
    local address=$(aptos account list --profile "$APTOS_PROFILE" --query "account" --output json | jq -r '.')
    
    echo -e "${GREEN}✅ Account: $address${NC}"
    echo -e "${GREEN}✅ Balance: $balance octas${NC}"
}

# Function to show account info
show_account_info() {
    echo -e "${BLUE}ℹ️  Showing account info...${NC}"
    
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Config file not found: $config_file${NC}"
        exit 1
    fi
    
    source "$config_file"
    
    # Set Aptos CLI environment
    export APTOS_PROFILE="$APTOS_PROFILE"
    export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
    export APTOS_REST_URL="$APTOS_REST_URL"
    export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"
    
    echo -e "${BLUE}Account Information:${NC}"
    aptos account list --profile "$APTOS_PROFILE" --output json | jq '.'
}

# Function to deploy contracts
deploy_contracts() {
    echo -e "${BLUE}🚀 Deploying contracts...${NC}"
    "$SCRIPT_DIR/deploy.sh" "$NETWORK" "$PROFILE"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    "$SCRIPT_DIR/verify.sh" "$NETWORK" "$PROFILE"
}

# Function to run multisig deployment
multisig_deployment() {
    echo -e "${BLUE}🔐 Running multisig deployment...${NC}"
    "$SCRIPT_DIR/multisig-deploy.sh" "$NETWORK" "$PROFILE"
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running deployment tests...${NC}"
    
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Config file not found: $config_file${NC}"
        exit 1
    fi
    
    source "$config_file"
    
    # Set Aptos CLI environment
    export APTOS_PROFILE="$APTOS_PROFILE"
    export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
    export APTOS_REST_URL="$APTOS_REST_URL"
    export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"
    
    # Run Move tests
    echo -e "${BLUE}Running Move tests...${NC}"
    aptos move test --package-dir "$(dirname "$(dirname "$SCRIPT_DIR")")" --named-addresses yugo="$APTOS_PROFILE"
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to compile contracts
compile_contracts() {
    echo -e "${BLUE}🔨 Compiling contracts...${NC}"
    
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Config file not found: $config_file${NC}"
        exit 1
    fi
    
    source "$config_file"
    
    # Set Aptos CLI environment
    export APTOS_PROFILE="$APTOS_PROFILE"
    export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
    export APTOS_REST_URL="$APTOS_REST_URL"
    export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"
    
    # Compile contracts
    aptos move compile --package-dir "$(dirname "$(dirname "$SCRIPT_DIR")")" --named-addresses yugo="$APTOS_PROFILE"
    
    echo -e "${GREEN}✅ Contracts compiled successfully${NC}"
}

# Function to clean deployment artifacts
clean_artifacts() {
    echo -e "${BLUE}🧹 Cleaning deployment artifacts...${NC}"
    
    local project_root="$(dirname "$(dirname "$SCRIPT_DIR")")"
    
    # Clean build artifacts
    rm -rf "$project_root/build"
    rm -rf "$project_root/.aptos"
    
    # Clean deployment artifacts
    rm -rf "$SCRIPT_DIR/../deployments"
    rm -rf "$SCRIPT_DIR/../reports"
    rm -rf "$SCRIPT_DIR/../logs"
    
    echo -e "${GREEN}✅ Deployment artifacts cleaned${NC}"
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Showing deployment logs...${NC}"
    
    local logs_dir="$SCRIPT_DIR/../logs"
    if [ -d "$logs_dir" ]; then
        echo -e "${BLUE}Recent deployment logs:${NC}"
        find "$logs_dir" -name "*.log" -type f -exec ls -la {} \; | head -10
    else
        echo -e "${YELLOW}⚠️  No logs directory found${NC}"
    fi
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Showing deployment status...${NC}"
    
    local config_file="$SCRIPT_DIR/../config/$PROFILE.env"
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Config file not found: $config_file${NC}"
        exit 1
    fi
    
    source "$config_file"
    
    # Set Aptos CLI environment
    export APTOS_PROFILE="$APTOS_PROFILE"
    export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
    export APTOS_REST_URL="$APTOS_REST_URL"
    export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"
    
    echo -e "${BLUE}Deployment Status:${NC}"
    echo -e "${BLUE}  Network: $NETWORK${NC}"
    echo -e "${BLUE}  Profile: $PROFILE${NC}"
    echo -e "${BLUE}  Deployer: $APTOS_PROFILE${NC}"
    
    # Check if modules are deployed
    local modules=("global_pool" "market_core" "pyth_price_adapter" "types")
    for module in "${modules[@]}"; do
        if aptos account list --profile "$APTOS_PROFILE" --query "modules" --output json | jq -r '.[] | select(.name == "'$module'")' | grep -q "$module"; then
            echo -e "${GREEN}  ✅ Module $module: Deployed${NC}"
        else
            echo -e "${RED}  ❌ Module $module: Not deployed${NC}"
        fi
    done
    
    # Check if resources are initialized
    local resources=(
        "$APTOS_PROFILE::global_pool::GlobalPool"
        "$APTOS_PROFILE::market_core::MarketRegistry"
        "$APTOS_PROFILE::market_core::MarketConfig"
    )
    
    for resource in "${resources[@]}"; do
        if aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type == "'$resource'")' | grep -q "$resource"; then
            echo -e "${GREEN}  ✅ Resource $resource: Initialized${NC}"
        else
            echo -e "${RED}  ❌ Resource $resource: Not initialized${NC}"
        fi
    done
}

# Main command dispatcher
main() {
    case "$COMMAND" in
        "help"|"-h"|"--help")
            show_help
            ;;
        "setup")
            setup_account
            ;;
        "balance")
            check_balance
            ;;
        "info")
            show_account_info
            ;;
        "deploy")
            deploy_contracts
            ;;
        "verify")
            verify_deployment
            ;;
        "multisig")
            multisig_deployment
            ;;
        "test")
            run_tests
            ;;
        "compile")
            compile_contracts
            ;;
        "clean")
            clean_artifacts
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
            echo -e "${YELLOW}Use 'help' to see available commands${NC}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
