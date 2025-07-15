// Aptos contract configuration for MAINNET
// Update these addresses after deploying to mainnet!
export const BINARY_OPTION_MARKET_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const BINARY_OPTION_MARKET_MODULE_NAME = "binary_option_market";

// Network configuration (MAINNET)
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';

// Contract addresses for MAINNET
export const DEPLOYED_ADDRESSES = {
  binaryOptionMarket: "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d",
};

// Legacy factory address for backward compatibility (if needed)
export const FACTORY_MODULE_ADDRESS = BINARY_OPTION_MARKET_MODULE_ADDRESS;