// Trading pairs configuration for Aptos
export interface TradingPairInfo {
  pair: string;
  symbol: string;
  priceFeedId?: string;
}

// Mapping price_feed_id (hex) <-> pair_name
export const PRICE_FEED_ID_TO_PAIR: Record<string, string> = {
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5": "APT/USD",
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
  "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d": "SOL/USD",
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744": "SUI/USD",
  "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f": "BNB/USD",
  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6": "WETH/USD",
};

export const PAIR_TO_PRICE_FEED_ID: Record<string, string> = {
  "APT/USD":   "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  "BTC/USD":   "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD":   "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "SOL/USD":   "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "SUI/USD":   "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  "BNB/USD":   "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "WETH/USD":  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6",
};

export function getPairNameFromPriceFeedId(input: string): string {
  const hex = input.startsWith('0x') ? input.slice(2) : input;
  return PRICE_FEED_ID_TO_PAIR[hex] || '';
}

import { getNetworkInfo } from './network';
import { PYTH_PRICE_IDS } from './geomi';

export function getPriceFeedIdFromPairName(pairName: string): string {
  const net = getNetworkInfo().name.toString().toLowerCase();
  const key = pairName.toUpperCase();
  const netMap = (PYTH_PRICE_IDS as Record<string, Record<string, string>>)[net] || {};
  const id = netMap[key] || PAIR_TO_PRICE_FEED_ID[pairName] || pairName;
  return id;
}

// Format symbol for API calls
export const formatSymbolForAPI = (symbol: string): string => {
  return symbol.replace('/', '-').toUpperCase();
};

// Lấy symbol Binance từ pair name
export function getBinanceSymbolFromPairName(pairName: string): string {
  const info = getTradingPairInfo(pairName);
  return info?.symbol || '';
}

export function getPairAndSymbolFromPriceFeedId(priceFeedId: string): { pair: string, symbol: string } {
  const hex = priceFeedId.startsWith('0x') ? priceFeedId.slice(2) : priceFeedId;
  const pair = getPairNameFromPriceFeedId(hex);
  const symbol = getBinanceSymbolFromPairName(pair);
  return { pair, symbol };
}

export function getAvailableTradingPairs(): TradingPairInfo[] {
  const net = getNetworkInfo().name.toString().toLowerCase();
  const netMap = (PYTH_PRICE_IDS as Record<string, Record<string, string>>)[net] || {};
  const idFor = (pair: string, fallback: string) => {
    const k = pair.toUpperCase();
    const id = netMap[k] || fallback;
    return id.startsWith('0x') ? id : `0x${id}`;
  };
  return [
    { pair: 'APT/USD', symbol: 'APTUSDT', priceFeedId: idFor('APT/USD', PAIR_TO_PRICE_FEED_ID['APT/USD']) },
    { pair: 'BTC/USD', symbol: 'BTCUSDT', priceFeedId: idFor('BTC/USD', PAIR_TO_PRICE_FEED_ID['BTC/USD']) },
    { pair: 'ETH/USD', symbol: 'ETHUSDT', priceFeedId: idFor('ETH/USD', PAIR_TO_PRICE_FEED_ID['ETH/USD']) },
    { pair: 'SOL/USD', symbol: 'SOLUSDT', priceFeedId: idFor('SOL/USD', PAIR_TO_PRICE_FEED_ID['SOL/USD']) },
    { pair: 'SUI/USD', symbol: 'SUIUSDT', priceFeedId: idFor('SUI/USD', PAIR_TO_PRICE_FEED_ID['SUI/USD']) },
    { pair: 'BNB/USD', symbol: 'BNBUSDT', priceFeedId: idFor('BNB/USD', PAIR_TO_PRICE_FEED_ID['BNB/USD']) },
    { pair: 'WETH/USD', symbol: 'WETHUSDT', priceFeedId: idFor('WETH/USD', PAIR_TO_PRICE_FEED_ID['WETH/USD']) },
  ];
}

export function getTradingPairInfo(pairName: string): TradingPairInfo | undefined {
  return getAvailableTradingPairs().find(pair => pair.pair === pairName);
} 