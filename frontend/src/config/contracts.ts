// Aptos contract configuration
export const FACTORY_MODULE_ADDRESS = "0xa8acbdde9b32669532958b41107bbd556c3ddd1cb66d5c0f3e90c227ee144abd";
export const FACTORY_MODULE_NAME = "factory";
export const FACTORY_FUNCTION_NAME = "deploy";

// Price feed mapping for Aptos (using Pyth or other oracle)
export const PRICE_FEED_MAPPING = {
  "BTC-USD": "0x1::pyth::BTC_USD",
  "ETH-USD": "0x1::pyth::ETH_USD", 
  "LINK-USD": "0x1::pyth::LINK_USD",
  "SNX-USD": "0x1::pyth::SNX_USD",
  "WSTETH-USD": "0x1::pyth::WSTETH_USD",
};

// Network configuration
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'localnet';
export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'http://localhost:8080';

// Contract addresses (will be updated after deployment)
export const DEPLOYED_ADDRESSES = {
  factory: "0xa8acbdde9b32669532958b41107bbd556c3ddd1cb66d5c0f3e90c227ee144abd",
  binaryOptionMarket: "0xa8acbdde9b32669532958b41107bbd556c3ddd1cb66d5c0f3e90c227ee144abd",
}; 