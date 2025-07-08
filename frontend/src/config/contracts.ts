// Aptos contract configuration
// Update these addresses after deploying to devnet!
export const FACTORY_MODULE_ADDRESS = "0xb7d3b3a4c887940576716c9d39f0b643b5c3f3fe08003e642ea194afd0bacbe4";
export const FACTORY_MODULE_NAME = "factory";
export const FACTORY_FUNCTION_NAME = "deploy";

// Price feed mapping for Aptos (using Pyth or other oracle)
export const PRICE_FEED_MAPPING = {
  "BTC-USD": "0x1::pyth::BTC_USD",
  "ETH-USD": "0x1::pyth::ETH_USD",
  "APT-USD": "0x1::pyth::APT_USD",
};

// Network configuration (default to devnet)
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'devnet';
export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com';

// Contract addresses (update after devnet deployment)
export const DEPLOYED_ADDRESSES = {
  factory: "0xb7d3b3a4c887940576716c9d39f0b643b5c3f3fe08003e642ea194afd0bacbe4",
  binaryOptionMarket: "0xb7d3b3a4c887940576716c9d39f0b643b5c3f3fe08003e642ea194afd0bacbe4",
};