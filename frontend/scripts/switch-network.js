#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Network configurations
const NETWORKS = {
  mainnet: {
    nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    faucetUrl: null,
    moduleAddress: '0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d', // Mainnet address
    apiUrl: 'https://api.mainnet.aptoslabs.com/v1'
  },
  testnet: {
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    moduleAddress: '0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41', // Testnet address
    apiUrl: 'https://api.testnet.aptoslabs.com/v1'
  },
  devnet: {
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    moduleAddress: '0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41', // Devnet address
    apiUrl: 'https://api.devnet.aptoslabs.com/v1'
  }
};

// Files to update with their patterns
const FILES_TO_UPDATE = [
  {
    path: 'src/config/network.ts',
    patterns: [
      {
        search: /nodeUrl:\s*'https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1'/g,
        replace: (network) => `nodeUrl: '${NETWORKS[network].nodeUrl}'`
      },
      {
        search: /faucetUrl:\s*'https:\/\/faucet\.(mainnet|testnet|devnet)\.aptoslabs\.com'/g,
        replace: (network) => NETWORKS[network].faucetUrl ? `faucetUrl: '${NETWORKS[network].faucetUrl}'` : 'faucetUrl: null'
      }
    ]
  },
  {
    path: 'src/config/contracts.ts',
    patterns: [
      {
        search: /process\.env\.NEXT_PUBLIC_APTOS_NODE_URL\s*\|\|\s*'https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1'/g,
        replace: (network) => `process.env.NEXT_PUBLIC_APTOS_NODE_URL || '${NETWORKS[network].nodeUrl}'`
      },
      {
        search: /process\.env\.NEXT_PUBLIC_MODULE_ADDR\s*\|\|\s*'[^']*'/g,
        replace: (network) => `process.env.NEXT_PUBLIC_MODULE_ADDR || '${NETWORKS[network].moduleAddress}'`
      }
    ]
  },
  {
    path: 'next.config.js',
    patterns: [
      {
        search: /NEXT_PUBLIC_APTOS_NETWORK:\s*process\.env\.NEXT_PUBLIC_APTOS_NETWORK\s*\|\|\s*'(mainnet|testnet|devnet)'/g,
        replace: (network) => `NEXT_PUBLIC_APTOS_NETWORK: process.env.NEXT_PUBLIC_APTOS_NETWORK || '${network}'`
      },
      {
        search: /NEXT_PUBLIC_APTOS_NODE_URL:\s*process\.env\.NEXT_PUBLIC_APTOS_NODE_URL\s*\|\|\s*'https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com'/g,
        replace: (network) => `NEXT_PUBLIC_APTOS_NODE_URL: process.env.NEXT_PUBLIC_APTOS_NODE_URL || '${NETWORKS[network].nodeUrl}'`
      }
    ]
  },
  {
    path: 'src/services/positionHistoryService.ts',
    patterns: [
      {
        search: /https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1\/accounts/g,
        replace: (network) => `${NETWORKS[network].nodeUrl}/accounts`
      }
    ]
  },
  {
    path: 'src/components/customer/MarketTimeline.tsx',
    patterns: [
      {
        search: /https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1\/accounts/g,
        replace: (network) => `${NETWORKS[network].nodeUrl}/accounts`
      },
      {
        search: /https:\/\/api\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1\/transactions/g,
        replace: (network) => `${NETWORKS[network].apiUrl}/transactions`
      }
    ]
  },
  {
    path: 'pages/index.tsx',
    patterns: [
      {
        search: /https:\/\/fullnode\.(mainnet|testnet|devnet)\.aptoslabs\.com\/v1/g,
        replace: (network) => NETWORKS[network].nodeUrl
      }
    ]
  }
];

function updateFile(filePath, patterns, targetNetwork) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  patterns.forEach(pattern => {
    const matches = content.match(pattern.search);
    if (matches) {
      content = content.replace(pattern.search, pattern.replace(targetNetwork));
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }

  return false;
}

function createEnvFile(network) {
  const moduleName = network === 'mainnet' ? 'market_core_v2' : 'market_core';
  const envContent = `# Network Configuration
NEXT_PUBLIC_APTOS_NETWORK=${network}
NEXT_PUBLIC_APTOS_NODE_URL=${NETWORKS[network].nodeUrl}
NEXT_PUBLIC_MODULE_ADDR=${NETWORKS[network].moduleAddress}
NEXT_PUBLIC_MODULE_NAME=${moduleName}

# Optional: Backend API
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_BACKEND_API=http://localhost:3000

# Optional: GraphQL Endpoint
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
`;

  const envPath = path.join(__dirname, '..', '.env.local');
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`✅ Created: .env.local`);
}

function main() {
  const targetNetwork = process.argv[2];

  if (!targetNetwork || !NETWORKS[targetNetwork]) {
    console.error('❌ Usage: node switch-network.js <mainnet|testnet|devnet>');
    console.error('Available networks:', Object.keys(NETWORKS).join(', '));
    process.exit(1);
  }

  console.log(`🔄 Switching to ${targetNetwork.toUpperCase()} network...`);
  console.log(`📡 Node URL: ${NETWORKS[targetNetwork].nodeUrl}`);
  console.log(`🏦 Module Address: ${NETWORKS[targetNetwork].moduleAddress}`);
  if (NETWORKS[targetNetwork].faucetUrl) {
    console.log(`🚰 Faucet URL: ${NETWORKS[targetNetwork].faucetUrl}`);
  }
  console.log('');

  let updatedFiles = 0;
  FILES_TO_UPDATE.forEach(file => {
    if (updateFile(file.path, file.patterns, targetNetwork)) {
      updatedFiles++;
    }
  });

  // Create .env.local file
  createEnvFile(targetNetwork);

  console.log('');
  console.log(`🎉 Successfully switched to ${targetNetwork.toUpperCase()}!`);
  console.log(`📝 Updated ${updatedFiles} files`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Clear browser cache if needed');
  console.log('3. Update your wallet network to match');
  console.log('');
  console.log('⚠️  Note: You may need to update module addresses manually if they differ between networks.');
}

main();
