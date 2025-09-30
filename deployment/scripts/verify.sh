#!/bin/bash

# Deployment Verification Script
# Usage: ./verify.sh [network] [profile]

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

# Configuration
CONFIG_FILE="$SCRIPT_DIR/../config/$PROFILE.env"
DEPLOYMENT_FILE="$SCRIPT_DIR/../deployments/$NETWORK-$PROFILE.json"

echo -e "${BLUE}🔍 Verifying Oreka deployment...${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"
echo -e "${BLUE}Profile: $PROFILE${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Load configuration
source "$CONFIG_FILE"

# Set Aptos CLI environment
export APTOS_PROFILE="$APTOS_PROFILE"
export APTOS_PRIVATE_KEY="$APTOS_PRIVATE_KEY"
export APTOS_REST_URL="$APTOS_REST_URL"
export APTOS_FAUCET_URL="$APTOS_FAUCET_URL"

# Function to check module deployment
check_modules() {
    echo -e "${BLUE}📦 Checking deployed modules...${NC}"
    
    local modules=("global_pool" "market_core" "pyth_price_adapter" "types")
    local all_found=true
    
    for module in "${modules[@]}"; do
        echo -e "${BLUE}Checking module: $module${NC}"
        
        if aptos account list --profile "$APTOS_PROFILE" --query "modules" --output json | jq -r '.[] | select(.name == "'$module'")' | grep -q "$module"; then
            echo -e "${GREEN}✅ Module $module is deployed${NC}"
            
            # Get module details
            local module_info=$(aptos account list --profile "$APTOS_PROFILE" --query "modules" --output json | jq -r '.[] | select(.name == "'$module'")')
            local module_address=$(echo "$module_info" | jq -r '.address')
            local module_name=$(echo "$module_info" | jq -r '.name')
            local module_version=$(echo "$module_info" | jq -r '.version')
            
            echo -e "${BLUE}  Address: $module_address${NC}"
            echo -e "${BLUE}  Name: $module_name${NC}"
            echo -e "${BLUE}  Version: $module_version${NC}"
        else
            echo -e "${RED}❌ Module $module not found${NC}"
            all_found=false
        fi
    done
    
    if [ "$all_found" = true ]; then
        echo -e "${GREEN}✅ All modules are deployed${NC}"
        return 0
    else
        echo -e "${RED}❌ Some modules are missing${NC}"
        return 1
    fi
}

# Function to check resource initialization
check_resources() {
    echo -e "${BLUE}🏦 Checking initialized resources...${NC}"
    
    local resources=(
        "$APTOS_PROFILE::global_pool::GlobalPool"
        "$APTOS_PROFILE::market_core::MarketRegistry"
        "$APTOS_PROFILE::market_core::MarketConfig"
    )
    
    local all_found=true
    
    for resource in "${resources[@]}"; do
        echo -e "${BLUE}Checking resource: $resource${NC}"
        
        if aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type == "'$resource'")' | grep -q "$resource"; then
            echo -e "${GREEN}✅ Resource $resource is initialized${NC}"
            
            # Get resource details
            local resource_info=$(aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json | jq -r '.[] | select(.type == "'$resource'")')
            echo -e "${BLUE}  Data: $(echo "$resource_info" | jq -r '.data')${NC}"
        else
            echo -e "${RED}❌ Resource $resource not found${NC}"
            all_found=false
        fi
    done
    
    if [ "$all_found" = true ]; then
        echo -e "${GREEN}✅ All resources are initialized${NC}"
        return 0
    else
        echo -e "${RED}❌ Some resources are missing${NC}"
        return 1
    fi
}

# Function to test module functions
test_functions() {
    echo -e "${BLUE}🧪 Testing module functions...${NC}"
    
    # Test global pool functions
    echo -e "${BLUE}Testing global pool functions...${NC}"
    
    # Get global pool summary
    if aptos move view \
        --function-id "$APTOS_PROFILE::global_pool::get_global_pool_summary" \
        --args address:"$APTOS_PROFILE" \
        --profile "$APTOS_PROFILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Global pool summary function works${NC}"
    else
        echo -e "${RED}❌ Global pool summary function failed${NC}"
        return 1
    fi
    
    # Test market registry functions
    echo -e "${BLUE}Testing market registry functions...${NC}"
    
    # Get all markets
    if aptos move view \
        --function-id "$APTOS_PROFILE::market_core::get_all_markets" \
        --profile "$APTOS_PROFILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Get all markets function works${NC}"
    else
        echo -e "${RED}❌ Get all markets function failed${NC}"
        return 1
    fi
    
    # Test market config functions
    echo -e "${BLUE}Testing market config functions...${NC}"
    
    # Get market config
    if aptos move view \
        --function-id "$APTOS_PROFILE::market_core::get_market_config" \
        --profile "$APTOS_PROFILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Get market config function works${NC}"
    else
        echo -e "${RED}❌ Get market config function failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All function tests passed${NC}"
    return 0
}

# Function to check account balance
check_balance() {
    echo -e "${BLUE}💰 Checking account balance...${NC}"
    
    local balance=$(aptos account list --profile "$APTOS_PROFILE" --query "apt_coin.coin.value" --output json | jq -r '.')
    echo -e "${BLUE}Account balance: $balance octas${NC}"
    
    if [ "$balance" -gt 0 ]; then
        echo -e "${GREEN}✅ Account has sufficient balance${NC}"
        return 0
    else
        echo -e "${RED}❌ Account has zero balance${NC}"
        return 1
    fi
}

# Function to generate verification report
generate_report() {
    local report_file="$SCRIPT_DIR/../reports/verification-$NETWORK-$PROFILE-$(date +%Y%m%d-%H%M%S).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    echo -e "${BLUE}📊 Generating verification report...${NC}"
    
    # Get account info
    local account_info=$(aptos account list --profile "$APTOS_PROFILE" --output json)
    local address=$(echo "$account_info" | jq -r '.account')
    local balance=$(echo "$account_info" | jq -r '.apt_coin.coin.value')
    
    # Get modules info
    local modules_info=$(aptos account list --profile "$APTOS_PROFILE" --query "modules" --output json)
    
    # Get resources info
    local resources_info=$(aptos account list --profile "$APTOS_PROFILE" --query "resources" --output json)
    
    cat > "$report_file" << EOF
{
  "verification": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "network": "$NETWORK",
    "profile": "$PROFILE",
    "deployer": "$address",
    "balance": "$balance",
    "status": "verified"
  },
  "modules": $modules_info,
  "resources": $resources_info
}
EOF
    
    echo -e "${GREEN}✅ Verification report saved to: $report_file${NC}"
}

# Main verification flow
main() {
    echo -e "${BLUE}🎯 Starting verification process...${NC}"
    
    local all_checks_passed=true
    
    # Check 1: Account balance
    if ! check_balance; then
        all_checks_passed=false
    fi
    
    # Check 2: Modules deployment
    if ! check_modules; then
        all_checks_passed=false
    fi
    
    # Check 3: Resources initialization
    if ! check_resources; then
        all_checks_passed=false
    fi
    
    # Check 4: Function testing
    if ! test_functions; then
        all_checks_passed=false
    fi
    
    # Generate report
    generate_report
    
    if [ "$all_checks_passed" = true ]; then
        echo -e "${GREEN}🎉 All verification checks passed!${NC}"
        echo -e "${GREEN}✅ Deployment is successful and ready for use${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some verification checks failed${NC}"
        echo -e "${RED}❌ Please review the deployment and fix any issues${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
