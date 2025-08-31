#!/bin/bash

# Mainnet Deployment Script for Oreka Protocol
# This script deploys the complete Oreka protocol to Aptos mainnet

set -e

echo "🚀 Starting Mainnet Deployment for Oreka Protocol"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="mainnet"
PACKAGE_NAME="oreka"
ADMIN_PRIVATE_KEY=""
ADMIN_ACCOUNT=""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if aptos CLI is installed
    if ! command -v aptos &> /dev/null; then
        echo -e "${RED}❌ aptos CLI not found. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if Move.toml exists
    if [ ! -f "sources/Move.toml" ]; then
        echo -e "${RED}❌ Move.toml not found in sources directory.${NC}"
        exit 1
    fi
    
    # Check if admin private key is set
    if [ -z "$ADMIN_PRIVATE_KEY" ]; then
        echo -e "${YELLOW}⚠️  ADMIN_PRIVATE_KEY not set. Please set it in the script.${NC}"
        read -p "Enter admin private key: " ADMIN_PRIVATE_KEY
    fi
    
    # Check if admin account is set
    if [ -z "$ADMIN_ACCOUNT" ]; then
        echo -e "${YELLOW}⚠️  ADMIN_ACCOUNT not set. Please set it in the script.${NC}"
        read -p "Enter admin account address: " ADMIN_ACCOUNT
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to setup network
setup_network() {
    echo -e "${BLUE}Setting up network configuration...${NC}"
    
    # Set network to mainnet
    aptos init --profile mainnet --network mainnet --private-key $ADMIN_PRIVATE_KEY
    
    echo -e "${GREEN}✅ Network setup completed${NC}"
    echo ""
}

# Function to build package
build_package() {
    echo -e "${BLUE}Building package...${NC}"
    
    # Clean previous build
    aptos move clean --package-dir sources
    
    # Build package
    if aptos move build --package-dir sources; then
        echo -e "${GREEN}✅ Package build successful${NC}"
    else
        echo -e "${RED}❌ Package build failed${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}Running tests...${NC}"
    
    if aptos move test --package-dir sources; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed. Aborting deployment.${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to publish package
publish_package() {
    echo -e "${BLUE}Publishing package to mainnet...${NC}"
    
    # Publish the package
    if aptos move publish --package-dir sources --profile mainnet; then
        echo -e "${GREEN}✅ Package published successfully${NC}"
        
        # Get package address
        PACKAGE_ADDRESS=$(aptos move list --query tables --profile mainnet | grep "Package" | tail -1 | awk '{print $2}')
        echo -e "${BLUE}Package address: ${PACKAGE_ADDRESS}${NC}"
    else
        echo -e "${RED}❌ Package publication failed${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to initialize modules
initialize_modules() {
    echo -e "${BLUE}Initializing modules...${NC}"
    
    # Initialize access control
    echo "Initializing access control..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_access_control::initialize_access_control
    
    # Initialize ORK token
    echo "Initializing ORK token..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_token::initialize_ork_token
    
    # Initialize treasury pool
    echo "Initializing treasury pool..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::treasury_pool::initialize_treasury_pool
    
    # Initialize payment router
    echo "Initializing payment router..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::payment_router::initialize_payment_router
    
    # Initialize payment USDC
    echo "Initializing payment USDC..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::payment_usdc::initialize_usdc_payment
    
    # Initialize reward manager
    echo "Initializing reward manager..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::reward_manager::initialize_reward_manager
    
    # Initialize market registry
    echo "Initializing market registry..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::crypto_market::initialize_market_registry
    
    # Initialize profile registry
    echo "Initializing profile registry..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::profile_registry::init
    
    # Initialize ORK mint manager
    echo "Initializing ORK mint manager..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_mint_manager::initialize_ork_mint_manager
    
    # Initialize user stats
    echo "Initializing user stats..."
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::user_stats::initialize_user_stats
    
    echo -e "${GREEN}✅ All modules initialized${NC}"
    echo ""
}

# Function to setup initial configuration
setup_initial_config() {
    echo -e "${BLUE}Setting up initial configuration...${NC}"
    
    # Grant admin roles
    echo "Setting up admin roles..."
    
    # Grant owner role to admin
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_access_control::grant_role \
        --args u8:1 address:${ADMIN_ACCOUNT}
    
    # Grant governor role to admin
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_access_control::grant_role \
        --function-id ${PACKAGE_ADDRESS}::ork_access_control::grant_role \
        --args u8:2 address:${ADMIN_ACCOUNT}
    
    # Grant minter role to admin
    aptos move run --profile mainnet \
        --function-id ${PACKAGE_ADDRESS}::ork_access_control::grant_role \
        --args u8:3 address:${ADMIN_ACCOUNT}
    
    echo -e "${GREEN}✅ Initial configuration completed${NC}"
    echo ""
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}Verifying deployment...${NC}"
    
    # Check if all modules are accessible
    echo "Checking module accessibility..."
    
    # List all resources for admin account
    aptos account list --profile mainnet
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
    echo ""
}

# Function to display deployment summary
display_summary() {
    echo -e "${GREEN}🎉 Deployment Summary${NC}"
    echo "======================="
    echo -e "Network: ${NETWORK}"
    echo -e "Package: ${PACKAGE_NAME}"
    echo -e "Package Address: ${PACKAGE_ADDRESS}"
    echo -e "Admin Account: ${ADMIN_ACCOUNT}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Verify all modules are working correctly"
    echo "2. Test market creation and bidding"
    echo "3. Monitor for any issues"
    echo "4. Update frontend configuration with new addresses"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting deployment process..."
    echo ""
    
    check_prerequisites
    setup_network
    build_package
    run_tests
    publish_package
    initialize_modules
    setup_initial_config
    verify_deployment
    display_summary
    
    echo -e "${GREEN}🎉 Oreka Protocol successfully deployed to mainnet!${NC}"
}

# Run main function
main
