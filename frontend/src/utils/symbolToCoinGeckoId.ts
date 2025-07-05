const symbolToId: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  APT: 'aptos',
  LINK: 'chainlink',
  SUI: 'sui',
  WETH: 'weth',
  USDT: 'tether',
  USDC: 'usd-coin',
  // Add more as needed
};

export function getCoinGeckoId(symbol: string): string {
  return symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();
} 