# Network Switching Guide

This guide explains how to switch between different Aptos networks (mainnet, testnet, devnet) in the OREKA frontend.

## Quick Start

### Using npm scripts (Recommended)

```bash
# Switch to testnet
npm run switch:testnet

# Switch to mainnet  
npm run switch:mainnet

# Switch to devnet
npm run switch:devnet
```

### Using shell script directly

```bash
# Make script executable (first time only)
chmod +x scripts/switch-network.sh

# Switch to testnet
./scripts/switch-network.sh testnet

# Switch to mainnet
./scripts/switch-network.sh mainnet

# Switch to devnet
./scripts/switch-network.sh devnet
```

### Using Node.js script directly

```bash
# Switch to testnet
node scripts/switch-network.js testnet

# Switch to mainnet
node scripts/switch-network.js mainnet

# Switch to devnet
node scripts/switch-network.js devnet
```

## What the Scripts Do

The network switching scripts automatically update:

### 1. Configuration Files
- `src/config/network.ts` - Network URLs and faucet URLs
- `src/config/contracts.ts` - Module addresses and node URLs
- `next.config.js` - Environment variables for Next.js

### 2. Hardcoded URLs
- `src/services/positionHistoryService.ts` - Event fetching URLs
- `src/components/customer/MarketTimeline.tsx` - Transaction and event URLs
- `pages/index.tsx` - Documentation links

### 3. Environment File
- Creates/updates `.env.local` with network-specific configuration

## Network Configurations

### Testnet
- **Node URL**: `https://fullnode.testnet.aptoslabs.com/v1`
- **Faucet URL**: `https://faucet.testnet.aptoslabs.com`
- **Module Address**: `0x1935e9a17ce12951f29d981c9fa0633111c02384b34051de6a9134c5f1e5e9c7`

### Mainnet
- **Node URL**: `https://fullnode.mainnet.aptoslabs.com/v1`
- **Faucet URL**: None (no faucet on mainnet)
- **Module Address**: `0x1935e9a17ce12951f29d981c9fa0633111c02384b34051de6a9134c5f1e5e9c7` (Update with actual mainnet address)

### Devnet
- **Node URL**: `https://fullnode.devnet.aptoslabs.com/v1`
- **Faucet URL**: `https://faucet.devnet.aptoslabs.com`
- **Module Address**: `0x1935e9a17ce12951f29d981c9fa0633111c02384b34051de6a9134c5f1e5e9c7` (Update with actual devnet address)

## After Switching Networks

1. **Restart Development Server**
   ```bash
   npm run dev
   ```

2. **Clear Browser Cache** (if needed)
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache manually

3. **Update Wallet Network**
   - Switch your wallet (Petra, etc.) to match the target network
   - Ensure you have the correct network selected

4. **Verify Connection**
   - Check that the frontend connects to the correct network
   - Verify that markets and transactions work as expected

## Manual Updates Required

Some items may need manual updates after switching:

### Module Addresses
If your smart contracts are deployed to different addresses on different networks, update the `MODULE_ADDRESSES` in the scripts:

```javascript
// In scripts/switch-network.js
const MODULE_ADDRESSES = {
  mainnet: "0xYOUR_MAINNET_ADDRESS",
  testnet: "0xYOUR_TESTNET_ADDRESS", 
  devnet: "0xYOUR_DEVNET_ADDRESS"
};
```

### Custom URLs
If you have custom API endpoints or services, update them manually in the respective files.

## Troubleshooting

### Script Not Working
- Ensure you're running from the frontend directory
- Check that Node.js is installed for the JS script
- Make sure the shell script is executable: `chmod +x scripts/switch-network.sh`

### Network Not Switching
- Restart the development server after switching
- Clear browser cache and localStorage
- Check browser console for errors
- Verify wallet is connected to the correct network

### Module Address Issues
- Update module addresses in the script if they differ between networks
- Check that contracts are deployed on the target network
- Verify the module address in your wallet's network settings

## Environment Variables

The scripts create a `.env.local` file with these variables:

```bash
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
NEXT_PUBLIC_MODULE_ADDR=0x1935e9a17ce12951f29d981c9fa0633111c02384b34051de6a9134c5f1e5e9c7
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_BACKEND_API=http://localhost:3000
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
```

You can override these by setting them in your environment or `.env.local` file.

## Development Workflow

1. **Start with testnet** for development and testing
2. **Switch to mainnet** for production deployment
3. **Use devnet** for experimental features

```bash
# Development workflow
npm run switch:testnet
npm run dev
# ... develop and test ...

# Switch to mainnet for production
npm run switch:mainnet
npm run build
npm run start
```
