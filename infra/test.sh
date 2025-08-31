#!/bin/bash

# Oreka Crypto v2 Test Script
# This script tests the core functionality of the platform

set -e

# Configuration
ACCOUNT_ADDRESS=${ACCOUNT_ADDRESS:-"0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d"}
NETWORK=${NETWORK:-"mainnet"}
TEST_MARKET_ID="test_market_001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Starting Oreka Crypto v2 Testing${NC}"
echo "Network: $NETWORK"
echo "Account: $ACCOUNT_ADDRESS"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo "Command: $command"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        return 1
    fi
}

# Function to check module state
check_module_state() {
    local module_name="$1"
    local function_name="$2"
    
    echo -e "${YELLOW}Checking $module_name state...${NC}"
    
    aptos move view \
        --function-id "$ACCOUNT_ADDRESS::$module_name::$function_name" \
        --network $NETWORK \
        --profile default
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $module_name state check successful${NC}"
    else
        echo -e "${RED}❌ $module_name state check failed${NC}"
        return 1
    fi
}

# Test 1: Check if all modules are deployed
echo -e "${BLUE}📋 Test 1: Module Deployment Check${NC}"
echo ""

# Check crypto_market module
run_test "Crypto Market Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::crypto_market::get_market_registry' --network $NETWORK --profile default"

# Check treasury_pool module
run_test "Treasury Pool Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::treasury_pool::get_treasury_stats' --network $NETWORK --profile default"

# Check payment_router module
run_test "Payment Router Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::payment_router::get_payment_router_stats' --network $NETWORK --profile default"

# Check USDC payment module
run_test "USDC Payment Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::payment_usdc::get_vault_balance' --network $NETWORK --profile default"

# Check CLMM router module
run_test "CLMM Router Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::clmm_router::get_clmm_stats' --network $NETWORK --profile default"

# Check reward manager module
run_test "Reward Manager Module Check" \
    "aptos move view --function-id '$ACCOUNT_ADDRESS::reward_manager::get_reward_manager_stats' --network $NETWORK --profile default"

echo ""

# Test 2: Test market creation
echo -e "${BLUE}📋 Test 2: Market Creation Test${NC}"
echo ""

# Create a test market
echo -e "${YELLOW}Creating test market...${NC}"
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::crypto_market::create_market" \
    --args \
        vector:0x1234567890abcdef \
        vector:vector:0x0100000000000000000000000000000000000000000000000000000000000000 \
        u64:150 \
        u64:250 \
        u64:1000 \
        u64:$(date -u +%s) \
        u64:$(($(date -u +%s) + 3600)) \
        u8:2 \
    --network $NETWORK \
    --profile default

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test market created successfully${NC}"
else
    echo -e "${RED}❌ Test market creation failed${NC}"
fi

echo ""

# Test 3: Test betting functionality
echo -e "${BLUE}📋 Test 3: Betting Functionality Test${NC}"
echo ""

# Place a test bet (this would require a valid market address)
echo -e "${YELLOW}Note: Betting test requires a valid market address${NC}"
echo "To test betting, you need to:"
echo "1. Create a market first"
echo "2. Get the market address from the creation event"
echo "3. Use that address in the betting test"
echo ""

# Test 4: Test payment flows
echo -e "${BLUE}📋 Test 4: Payment Flow Test${NC}"
echo ""

# Test APT payment collection
echo -e "${YELLOW}Testing APT payment collection...${NC}"
# Note: This would require actual APT coins in the account
echo "Payment flow test requires actual APT coins for testing"
echo ""

# Test 5: Test CLMM operations
echo -e "${BLUE}📋 Test 5: CLMM Operations Test${NC}"
echo ""

# Test CLMM configuration
echo -e "${YELLOW}Testing CLMM configuration...${NC}"
aptos move run \
    --function-id "$ACCOUNT_ADDRESS::clmm_router::set_clmm_config" \
    --args \
        address:$ACCOUNT_ADDRESS \
        u8:1 \
        u64:1000000 \
        u64:10000000 \
        u64:500 \
        u64:3000 \
        u64:2000 \
    --network $NETWORK \
    --profile default

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CLMM configuration test successful${NC}"
else
    echo -e "${RED}❌ CLMM configuration test failed${NC}"
fi

echo ""

# Test 6: Test reward system
echo -e "${BLUE}📋 Test 6: Reward System Test${NC}"
echo ""

# Test reward manager operations
echo -e "${YELLOW}Testing reward manager operations...${NC}"
# Note: This would require actual market data
echo "Reward system test requires market data for testing"
echo ""

# Test 7: Test treasury operations
echo -e "${BLUE}📋 Test 7: Treasury Operations Test${NC}"
echo ""

# Test treasury fee deposit
echo -e "${YELLOW}Testing treasury fee deposit...${NC}"
# Note: This would require actual APT coins
echo "Treasury operations test requires actual APT coins for testing"
echo ""

# Summary
echo ""
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================="
echo "✅ Module deployment checks completed"
echo "✅ Market creation test completed"
echo "⚠️  Betting functionality test (requires market address)"
echo "⚠️  Payment flow test (requires APT coins)"
echo "✅ CLMM configuration test completed"
echo "⚠️  Reward system test (requires market data)"
echo "⚠️  Treasury operations test (requires APT coins)"
echo ""

echo -e "${GREEN}🎉 Basic testing completed!${NC}"
echo ""
echo "Next Steps:"
echo "1. Create a real market with actual data"
echo "2. Test betting with real APT coins"
echo "3. Test payment flows end-to-end"
echo "4. Test reward distribution"
echo "5. Test treasury operations"
echo ""
echo "For integration testing, see: infra/README.md"
