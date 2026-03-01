// Aptos contract configuration (env-first). Defaults to TESTNET values.

export const market_core_v2_MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME || 'market_core_v2';

// Publisher/module address (yugo) - MAINNET
export const market_core_v2_MODULE_ADDRESS =
  process.env.NEXT_PUBLIC_MODULE_ADDR || '0x288411cf0c7d7fe21fde828a8958f1971934dd9237fb69be36e15470b857449d';

// Network configuration - MAINNET
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
export const APTOS_NODE_URL =
  process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';

// Contract addresses for current network
export const DEPLOYED_ADDRESSES = {
  binaryOptionMarket: market_core_v2_MODULE_ADDRESS,
};

export const FACTORY_MODULE_ADDRESS = market_core_v2_MODULE_ADDRESS;