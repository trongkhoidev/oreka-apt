#!/bin/bash

# Multi-signature Deployment Script for Oreka
# Usage: ./multisig-deploy.sh [network] [profile]

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

echo -e "${BLUE}🔐 Multi-signature deployment for Oreka...${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"
echo -e "${BLUE}Profile: $PROFILE${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Load configuration
source "$CONFIG_FILE"

# Function to create multisig account
create_multisig_account() {
    local multisig_name="$1"
    local threshold="$2"
    local signers="$3"
    
    echo -e "${BLUE}🔐 Creating multisig account: $multisig_name${NC}"
    
    # Create multisig account
    aptos account create \
        --profile "$multisig_name" \
        --assume-yes
    
    local multisig_address=$(aptos account list --profile "$multisig_name" --query "account" --output json | jq -r '.')
    
    echo -e "${GREEN}✅ Multisig account created: $multisig_address${NC}"
    
    # Initialize multisig
    aptos multisig create \
        --profile "$multisig_name" \
        --threshold "$threshold" \
        --signers "$signers" \
        --assume-yes
    
    echo -e "${GREEN}✅ Multisig initialized with threshold: $threshold${NC}"
    
    return 0
}

# Function to propose deployment
propose_deployment() {
    local multisig_name="$1"
    local proposer="$2"
    
    echo -e "${BLUE}📝 Proposing deployment transaction...${NC}"
    
    # Create deployment proposal
    local proposal_id=$(aptos multisig propose \
        --profile "$multisig_name" \
        --proposer "$proposer" \
        --function-id "$multisig_name::deployment::propose_deployment" \
        --assume-yes \
        --output json | jq -r '.proposal_id')
    
    echo -e "${GREEN}✅ Deployment proposal created: $proposal_id${NC}"
    
    return 0
}

# Function to approve proposal
approve_proposal() {
    local multisig_name="$1"
    local approver="$2"
    local proposal_id="$3"
    
    echo -e "${BLUE}✅ Approving proposal: $proposal_id${NC}"
    
    aptos multisig approve \
        --profile "$multisig_name" \
        --approver "$approver" \
        --proposal-id "$proposal_id" \
        --assume-yes
    
    echo -e "${GREEN}✅ Proposal approved by: $approver${NC}"
    
    return 0
}

# Function to execute proposal
execute_proposal() {
    local multisig_name="$1"
    local executor="$2"
    local proposal_id="$3"
    
    echo -e "${BLUE}🚀 Executing proposal: $proposal_id${NC}"
    
    aptos multisig execute \
        --profile "$multisig_name" \
        --executor "$executor" \
        --proposal-id "$proposal_id" \
        --assume-yes
    
    echo -e "${GREEN}✅ Proposal executed successfully${NC}"
    
    return 0
}

# Function to check multisig status
check_multisig_status() {
    local multisig_name="$1"
    local proposal_id="$2"
    
    echo -e "${BLUE}🔍 Checking multisig status...${NC}"
    
    local status=$(aptos multisig show \
        --profile "$multisig_name" \
        --proposal-id "$proposal_id" \
        --output json | jq -r '.status')
    
    echo -e "${BLUE}Proposal status: $status${NC}"
    
    case "$status" in
        "pending")
            echo -e "${YELLOW}⚠️  Proposal is pending approval${NC}"
            ;;
        "approved")
            echo -e "${GREEN}✅ Proposal is approved and ready for execution${NC}"
            ;;
        "executed")
            echo -e "${GREEN}✅ Proposal has been executed${NC}"
            ;;
        "rejected")
            echo -e "${RED}❌ Proposal has been rejected${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️  Unknown status: $status${NC}"
            ;;
    esac
    
    return 0
}

# Function to list pending proposals
list_pending_proposals() {
    local multisig_name="$1"
    
    echo -e "${BLUE}📋 Listing pending proposals...${NC}"
    
    aptos multisig list \
        --profile "$multisig_name" \
        --output json | jq -r '.[] | select(.status == "pending") | {proposal_id: .proposal_id, proposer: .proposer, created_at: .created_at}'
    
    return 0
}

# Function to get multisig members
get_multisig_members() {
    local multisig_name="$1"
    
    echo -e "${BLUE}👥 Getting multisig members...${NC}"
    
    aptos multisig show \
        --profile "$multisig_name" \
        --output json | jq -r '.members[] | {address: .address, weight: .weight}'
    
    return 0
}

# Main multisig deployment flow
main() {
    echo -e "${BLUE}🎯 Starting multisig deployment process...${NC}"
    
    # Check if multisig is required
    if [ "$REQUIRE_MULTISIG" != "true" ]; then
        echo -e "${YELLOW}⚠️  Multisig is not required for this deployment${NC}"
        echo -e "${BLUE}Use regular deployment script instead${NC}"
        exit 0
    fi
    
    # Check if multisig accounts are configured
    if [ -z "$MULTISIG_ACCOUNTS" ]; then
        echo -e "${RED}❌ Multisig accounts not configured${NC}"
        echo -e "${YELLOW}Please set MULTISIG_ACCOUNTS in config file${NC}"
        exit 1
    fi
    
    # Parse multisig accounts
    IFS=',' read -ra ACCOUNTS <<< "$MULTISIG_ACCOUNTS"
    local multisig_name="oreka_multisig_$NETWORK"
    
    echo -e "${BLUE}Multisig accounts: ${ACCOUNTS[*]}${NC}"
    echo -e "${BLUE}Threshold: $MULTISIG_THRESHOLD${NC}"
    
    # Create multisig account if it doesn't exist
    if ! aptos account list --profile "$multisig_name" > /dev/null 2>&1; then
        create_multisig_account "$multisig_name" "$MULTISIG_THRESHOLD" "$MULTISIG_ACCOUNTS"
    else
        echo -e "${GREEN}✅ Multisig account already exists${NC}"
    fi
    
    # Get multisig members
    get_multisig_members "$multisig_name"
    
    # List pending proposals
    list_pending_proposals "$multisig_name"
    
    echo -e "${GREEN}🎉 Multisig deployment setup completed!${NC}"
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${BLUE}  1. Propose deployment transaction${NC}"
    echo -e "${BLUE}  2. Get required approvals${NC}"
    echo -e "${BLUE}  3. Execute the proposal${NC}"
    echo -e "${BLUE}  4. Verify deployment${NC}"
}

# Run main function
main "$@"
