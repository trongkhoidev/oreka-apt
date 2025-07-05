// Aptos contract configuration
// Update these addresses after deploying to devnet!
export const FACTORY_MODULE_ADDRESS = "0x75c694e08e177114044e54f34eb8d1c30b79dca22f0570c7a2c71f07bc047f93";
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
  factory: "0x75c694e08e177114044e54f34eb8d1c30b79dca22f0570c7a2c71f07bc047f93",
  binaryOptionMarket: "0x75c694e08e177114044e54f34eb8d1c30b79dca22f0570c7a2c71f07bc047f93",
};