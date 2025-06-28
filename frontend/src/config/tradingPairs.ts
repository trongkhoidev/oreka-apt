// Trading pairs configuration for Aptos
export interface TradingPairInfo {
  pair: string;
  symbol: string;
  priceFeedId?: string;
}

// Default trading pairs for Aptos
const DEFAULT_PAIRS: { [key: string]: TradingPairInfo } = {
  "APT-USD":   { pair: "APT/USD",   symbol: "APTUSDT",   priceFeedId: "0x1::pyth::APT_USD" },
  "BTC-USD":   { pair: "BTC/USD",   symbol: "BTCUSDT",   priceFeedId: "0x1::pyth::BTC_USD" },
  "ETH-USD":   { pair: "ETH/USD",   symbol: "ETHUSDT",   priceFeedId: "0x1::pyth::ETH_USD" },
  "SOL-USD":   { pair: "SOL/USD",   symbol: "SOLUSDT",   priceFeedId: "0x1::pyth::SOL_USD" },
  "SUI-USD":   { pair: "SUI/USD",   symbol: "SUIUSDT",   priceFeedId: "0x1::pyth::SUI_USD" },
  "BNB-USD":   { pair: "BNB/USD",   symbol: "BNBUSDT",   priceFeedId: "0x1::pyth::BNB_USD" },
  "WETH-USD":  { pair: "WETH/USD",  symbol: "WETHUSDT",  priceFeedId: "0x1::pyth::WETH_USD" },
};

// Get trading pair info by symbol
export const getTradingPairInfo = (symbol: string): TradingPairInfo | null => {
  const normalizedSymbol = symbol.toUpperCase();
  return DEFAULT_PAIRS[normalizedSymbol] || null;
};

// Get all available trading pairs
export const getAvailableTradingPairs = (): TradingPairInfo[] => {
  return Object.values(DEFAULT_PAIRS);
};

// Get trading pair by price feed ID
export const getTradingPairByPriceFeedId = (priceFeedId: string): TradingPairInfo | null => {
  const pair = Object.values(DEFAULT_PAIRS).find(p => p.priceFeedId === priceFeedId);
  return pair || null;
};

// Format symbol for API calls
export const formatSymbolForAPI = (symbol: string): string => {
  return symbol.replace('/', '-').toUpperCase();
};

// Get chart symbol for trading view
export const getChartSymbol = (symbol: string): string => {
  const pairInfo = getTradingPairInfo(symbol);
  return pairInfo?.symbol || 'BTCUSDT';
}; 