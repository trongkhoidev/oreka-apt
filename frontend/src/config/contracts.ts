// Aptos contract configuration for MAINNET
// Update these addresses after deploying to mainnet!
export const FACTORY_MODULE_ADDRESS = "0x575c0433eebe118c0593b50ae325599f845ba066ee6d4058a618e07fd31c7edb";
export const FACTORY_MODULE_NAME = "factory";
export const FACTORY_FUNCTION_NAME = "deploy";

// Price feed mapping for Aptos (using Pyth or other oracle)
export const PRICE_FEED_MAPPING = {
  "BTC-USD": "0x1::pyth::BTC_USD",
  "ETH-USD": "0x1::pyth::ETH_USD",
  "APT-USD": "0x1::pyth::APT_USD",
};

// Network configuration (MAINNET)
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com';

// Contract addresses for MAINNET
export const DEPLOYED_ADDRESSES = {
  factory: "0x575c0433eebe118c0593b50ae325599f845ba066ee6d4058a618e07fd31c7edb",
  binaryOptionMarket: "0x575c0433eebe118c0593b50ae325599f845ba066ee6d4058a618e07fd31c7edb",
};