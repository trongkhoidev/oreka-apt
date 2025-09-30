// Aptos contract configuration (env-first). Defaults to TESTNET values.

export const market_core_MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME || 'market_core_v2';

// Publisher/module address (yugo) - MAINNET
export const market_core_MODULE_ADDRESS =
  process.env.NEXT_PUBLIC_MODULE_ADDR || '0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d';

// Network configuration - MAINNET
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
export const APTOS_NODE_URL =
  process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';

// Contract addresses for current network
export const DEPLOYED_ADDRESSES = {
  binaryOptionMarket: market_core_MODULE_ADDRESS,
};

export const FACTORY_MODULE_ADDRESS = market_core_MODULE_ADDRESS;