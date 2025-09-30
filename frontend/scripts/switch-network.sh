#!/bin/bash

# Network switching script for OREKA frontend
# Usage: ./switch-network.sh <mainnet|testnet|devnet>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Network configurations
declare -A NETWORKS
NETWORKS[mainnet]="https://fullnode.mainnet.aptoslabs.com/v1"
NETWORKS[testnet]="https://fullnode.testnet.aptoslabs.com/v1"
NETWORKS[devnet]="https://fullnode.devnet.aptoslabs.com/v1"

declare -A MODULE_ADDRESSES
MODULE_ADDRESSES[mainnet]="0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41"  # Mainnet address
MODULE_ADDRESSES[testnet]="0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41"  # Testnet address
MODULE_ADDRESSES[devnet]="0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41"  # Devnet address

declare -A FAUCET_URLS
FAUCET_URLS[mainnet]=""
FAUCET_URLS[testnet]="https://faucet.testnet.aptoslabs.com"
FAUCET_URLS[devnet]="https://faucet.devnet.aptoslabs.com"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to update a file with sed
update_file() {
    local file="$1"
    local pattern="$2"
    local replacement="$3"
    
    if [[ -f "$file" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|$pattern|$replacement|g" "$file"
        else
            # Linux
            sed -i "s|$pattern|$replacement|g" "$file"
        fi
        print_status "Updated: $file"
    else
        print_warning "File not found: $file"
    fi
}

# Function to create .env.local
create_env_file() {
    local network="$1"
    local node_url="${NETWORKS[$network]}"
    local module_addr="${MODULE_ADDRESSES[$network]}"
    local faucet_url="${FAUCET_URLS[$network]}"
    
    cat > .env.local << EOF
# Network Configuration
NEXT_PUBLIC_APTOS_NETWORK=$network
NEXT_PUBLIC_APTOS_NODE_URL=$node_url
NEXT_PUBLIC_MODULE_ADDR=$module_addr

# Optional: Backend API
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_BACKEND_API=http://localhost:3000

# Optional: GraphQL Endpoint
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
EOF
    
    print_status "Created: .env.local"
}

# Main function
main() {
    local target_network="$1"
    
    # Validate input
    if [[ -z "$target_network" ]]; then
        print_error "Usage: $0 <mainnet|testnet|devnet>"
        print_info "Available networks: mainnet, testnet, devnet"
        exit 1
    fi
    
    if [[ ! ${NETWORKS[$target_network]+_} ]]; then
        print_error "Invalid network: $target_network"
        print_info "Available networks: mainnet, testnet, devnet"
        exit 1
    fi
    
    print_info "Switching to ${target_network^^} network..."
    print_info "Node URL: ${NETWORKS[$target_network]}"
    print_info "Module Address: ${MODULE_ADDRESSES[$target_network]}"
    if [[ -n "${FAUCET_URLS[$target_network]}" ]]; then
        print_info "Faucet URL: ${FAUCET_URLS[$target_network]}"
    fi
    echo ""
    
    # Update network.ts
    update_file "src/config/network.ts" \
        "nodeUrl: 'https://fullnode\.[^']*\.aptoslabs\.com/v1'" \
        "nodeUrl: '${NETWORKS[$target_network]}'"
    
    # Update faucet URL in network.ts
    if [[ -n "${FAUCET_URLS[$target_network]}" ]]; then
        update_file "src/config/network.ts" \
            "faucetUrl: 'https://faucet\.[^']*\.aptoslabs\.com'" \
            "faucetUrl: '${FAUCET_URLS[$target_network]}'"
    else
        update_file "src/config/network.ts" \
            "faucetUrl: 'https://faucet\.[^']*\.aptoslabs\.com'" \
            "faucetUrl: null"
    fi
    
    # Update contracts.ts
    update_file "src/config/contracts.ts" \
        "process\.env\.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode\.[^']*\.aptoslabs\.com/v1'" \
        "process.env.NEXT_PUBLIC_APTOS_NODE_URL || '${NETWORKS[$target_network]}'"
    
    update_file "src/config/contracts.ts" \
        "process\.env\.NEXT_PUBLIC_MODULE_ADDR || '[^']*'" \
        "process.env.NEXT_PUBLIC_MODULE_ADDR || '${MODULE_ADDRESSES[$target_network]}'"
    
    # Update next.config.js
    update_file "next.config.js" \
        "NEXT_PUBLIC_APTOS_NETWORK: process\.env\.NEXT_PUBLIC_APTOS_NETWORK || '[^']*'" \
        "NEXT_PUBLIC_APTOS_NETWORK: process.env.NEXT_PUBLIC_APTOS_NETWORK || '$target_network'"
    
    update_file "next.config.js" \
        "NEXT_PUBLIC_APTOS_NODE_URL: process\.env\.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode\.[^']*\.aptoslabs\.com'" \
        "NEXT_PUBLIC_APTOS_NODE_URL: process.env.NEXT_PUBLIC_APTOS_NODE_URL || '${NETWORKS[$target_network]}'"
    
    # Update hardcoded URLs in other files
    update_file "src/services/positionHistoryService.ts" \
        "https://fullnode\.[^/]*\.aptoslabs\.com/v1/accounts" \
        "${NETWORKS[$target_network]}/accounts"
    
    update_file "src/components/customer/MarketTimeline.tsx" \
        "https://fullnode\.[^/]*\.aptoslabs\.com/v1/accounts" \
        "${NETWORKS[$target_network]}/accounts"
    
    update_file "src/components/customer/MarketTimeline.tsx" \
        "https://api\.[^/]*\.aptoslabs\.com/v1/transactions" \
        "https://api.${target_network}.aptoslabs.com/v1/transactions"
    
    update_file "pages/index.tsx" \
        "https://fullnode\.[^/]*\.aptoslabs\.com/v1" \
        "${NETWORKS[$target_network]}"
    
    # Create .env.local
    create_env_file "$target_network"
    
    echo ""
    print_status "Successfully switched to ${target_network^^}!"
    echo ""
    print_info "Next steps:"
    print_info "1. Restart your development server: npm run dev"
    print_info "2. Clear browser cache if needed"
    print_info "3. Update your wallet network to match"
    echo ""
    print_warning "Note: You may need to update module addresses manually if they differ between networks."
}

# Run main function
main "$@"
