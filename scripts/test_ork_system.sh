#!/bin/bash

# Test script for ORK Token and Reward System
# This script runs all tests for the new ORK token system

set -e

echo "🧪 Testing ORK Token and Reward System..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests
run_tests() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}Running $test_name tests...${NC}"
    
    if aptos move test --package-dir . --filter "$test_name"; then
        echo -e "${GREEN}✅ $test_name tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name tests failed!${NC}"
        return 1
    fi
}

# Function to run specific test file
run_test_file() {
    local test_file=$1
    local test_name=$(basename "$test_file" .move)
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    
    if aptos move test --package-dir . --filter "$test_name"; then
        echo -e "${GREEN}✅ $test_name passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed!${NC}"
        return 1
    fi
}

# Check if we're in the right directory
if [ ! -f "Move.toml" ]; then
    echo -e "${RED}Error: Move.toml not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo -e "${RED}Error: aptos CLI not found. Please install it first.${NC}"
    exit 1
fi

echo "📋 Test Plan:"
echo "1. ORK Token Module Tests"
echo "2. Reward Manager Tests"
echo "3. User Stats Tests"
echo "4. Types Module Tests"
echo "5. Integration Tests"
echo ""

# Initialize test results
total_tests=0
passed_tests=0
failed_tests=0

# Test 1: ORK Token Module
echo "🔸 Test 1: ORK Token Module"
if run_test_file "tests/ork_token_tests.move"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# Test 2: Reward Manager
echo "🔸 Test 2: Reward Manager"
if run_test_file "tests/reward_manager_tests.move"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# Test 3: User Stats
echo "🔸 Test 3: User Stats"
if run_test_file "tests/user_stats_tests.move"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo ""

# Test 4: Types Module (if exists)
echo "🔸 Test 4: Types Module"
if [ -f "tests/types_tests.move" ]; then
    if run_test_file "tests/types_tests.move"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
else
    echo -e "${YELLOW}⚠️  Types tests not found, skipping...${NC}"
fi

echo ""

# Test 5: Integration Tests (if exists)
echo "🔸 Test 5: Integration Tests"
if [ -f "tests/integration_tests.move" ]; then
    if run_test_file "tests/integration_tests.move"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
else
    echo -e "${YELLOW}⚠️  Integration tests not found, skipping...${NC}"
fi

echo ""
echo "=========================================="
echo "📊 Test Results Summary:"
echo "=========================================="

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! ($passed_tests/$total_tests)${NC}"
    echo ""
    echo "✅ ORK Token System is ready for deployment!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Deploy contracts to devnet"
    echo "2. Initialize ORK token and reward manager"
    echo "3. Test with real USDC integration"
    echo "4. Deploy to mainnet"
    exit 0
else
    echo -e "${RED}❌ Some tests failed! ($passed_tests passed, $failed_tests failed)${NC}"
    echo ""
    echo "🔧 Please fix the failing tests before proceeding."
    exit 1
fi
