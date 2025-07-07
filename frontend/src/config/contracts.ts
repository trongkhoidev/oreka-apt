// Aptos contract configuration
// Update these addresses after deploying to devnet!
export const FACTORY_MODULE_ADDRESS = "0x8ae5bfd0cf11ff50af3ddb9f5ef5b631224023878e3f26334e918710215a9e9f";
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
  factory: "0x8ae5bfd0cf11ff50af3ddb9f5ef5b631224023878e3f26334e918710215a9e9f",
  binaryOptionMarket: "0x8ae5bfd0cf11ff50af3ddb9f5ef5b631224023878e3f26334e918710215a9e9f",
};