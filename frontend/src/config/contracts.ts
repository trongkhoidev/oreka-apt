// Aptos contract configuration for MAINNET
// Update these addresses after deploying to mainnet!
export const CRYPTO_MARKET_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const CRYPTO_MARKET_MODULE_NAME = "crypto_market";

export const TREASURY_POOL_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const TREASURY_POOL_MODULE_NAME = "treasury_pool";

export const ORK_TOKEN_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const ORK_TOKEN_MODULE_NAME = "ork_token";

export const ORK_MINT_MANAGER_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const ORK_MINT_MANAGER_MODULE_NAME = "ork_mint_manager";

export const PAYMENT_ROUTER_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const PAYMENT_ROUTER_MODULE_NAME = "payment_router";

export const PAYMENT_USDC_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const PAYMENT_USDC_MODULE_NAME = "payment_usdc";

export const REWARD_MANAGER_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const REWARD_MANAGER_MODULE_NAME = "reward_manager";

export const USER_STATS_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const USER_STATS_MODULE_NAME = "user_stats";

export const CLMM_ROUTER_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const CLMM_ROUTER_MODULE_NAME = "clmm_router";

export const PYTH_PRICE_ADAPTER_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const PYTH_PRICE_ADAPTER_MODULE_NAME = "pyth_price_adapter";

export const CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const CIRCLE_USDC_INTEGRATION_MODULE_NAME = "circle_usdc_integration";

export const HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const HYPERION_CLMM_INTEGRATION_MODULE_NAME = "hyperion_clmm_integration";

export const NODIT_INDEXING_INTEGRATION_MODULE_ADDRESS = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
export const NODIT_INDEXING_INTEGRATION_MODULE_NAME = "nodit_indexing_integration";

// Network configuration (MAINNET)
export const APTOS_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';

// Contract addresses for MAINNET - Updated for new modules
export const DEPLOYED_ADDRESSES = {
  cryptoMarket: CRYPTO_MARKET_MODULE_ADDRESS,
  treasuryPool: TREASURY_POOL_MODULE_ADDRESS,
  orkToken: ORK_TOKEN_MODULE_ADDRESS,
  orkMintManager: ORK_MINT_MANAGER_MODULE_ADDRESS,
  paymentRouter: PAYMENT_ROUTER_MODULE_ADDRESS,
  paymentUsdc: PAYMENT_USDC_MODULE_ADDRESS,
  rewardManager: REWARD_MANAGER_MODULE_ADDRESS,
  userStats: USER_STATS_MODULE_ADDRESS,
  clmmRouter: CLMM_ROUTER_MODULE_ADDRESS,
  pythPriceAdapter: PYTH_PRICE_ADAPTER_MODULE_ADDRESS,
  circleUsdcIntegration: CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS,
  hyperionClmmIntegration: HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS,
  noditIndexingIntegration: NODIT_INDEXING_INTEGRATION_MODULE_ADDRESS,
};

// Legacy factory address for backward compatibility (deprecated)
export const FACTORY_MODULE_ADDRESS = CRYPTO_MARKET_MODULE_ADDRESS;
export const BINARY_OPTION_MARKET_MODULE_ADDRESS = CRYPTO_MARKET_MODULE_ADDRESS;
export const BINARY_OPTION_MARKET_MODULE_NAME = CRYPTO_MARKET_MODULE_NAME;

// Pyth Oracle configuration
export const PYTH_ORACLE_ADDRESS = "0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387";

// Circle USDC configuration
export const CIRCLE_USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17d9";

// Hyperion CLMM configuration
export const HYPERION_CLMM_ADDRESS = "0x190d44266241744264b962a0b6b1a74b4d7b4e3b";

// Nodit Indexing configuration
export const NODIT_INDEXER_URL = process.env.NEXT_PUBLIC_NODIT_INDEXER_URL || 'https://indexer.nodit.io';
export const NODIT_WEBHOOK_URL = process.env.NEXT_PUBLIC_NODIT_WEBHOOK_URL || 'https://webhook.nodit.io';