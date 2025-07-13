// Mapping between price_feed_id (hex string) and trading pair name (e.g. BTC/USD)
// Always use this file for all conversions in frontend

// You can extend this mapping for new pairs easily
const PRICE_FEED_ID_TO_PAIR: Record<string, string> = {
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5": "APT/USD",
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
  "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d": "SOL/USD",
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744": "SUI/USD",
  "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f": "BNB/USD",
  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6": "WETH/USD",
};

const PAIR_TO_PRICE_FEED_ID: Record<string, string> = Object.fromEntries(
  Object.entries(PRICE_FEED_ID_TO_PAIR).map(([id, pair]) => [pair, id])
);

/**
 * Decode hex string (with or without 0x) from ASCII hex to string
 * E.g. '0x3033...' => '03ae4d...'
 */
function fromAsciiHex(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  let str = '';
  for (let i = 0; i < clean.length; i += 2) {
    str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
  }
  return str;
}

/**
 * Convert any input (price_feed_id, pair_name, symbol) to standard pair name (e.g. BTC/USD)
 * @param input string: price_feed_id (hex, ascii-hex), pair_name (BTC/USD), or symbol (BTCUSDT)
 * @returns string: standard pair name or '' if not found
 */
export function getStandardPairName(input: string): string {
  if (!input) return '';
  if (input.includes('/')) return input.toUpperCase();
  let normalized = input;
  if ((/^0x[0-9a-fA-F]{64,}$/.test(input) || /^[0-9a-fA-F]{64,}$/.test(input)) && input.length >= 64) {
    const decoded = fromAsciiHex(input);
    if (/^[0-9a-fA-F]{64}$/.test(decoded)) normalized = decoded;
    else normalized = decoded;
  }
  if (PRICE_FEED_ID_TO_PAIR[normalized]) return PRICE_FEED_ID_TO_PAIR[normalized];
  if (PRICE_FEED_ID_TO_PAIR[input]) return PRICE_FEED_ID_TO_PAIR[input];
  const found = Object.values(PRICE_FEED_ID_TO_PAIR).find(pair => pair.replace('/', '').toUpperCase() + 'T' === normalized.toUpperCase());
  if (found) return found;
  return '';
}

/**
 * Convert standard pair name to price_feed_id
 * @param pairName string: e.g. BTC/USD
 * @returns string: price_feed_id or ''
 */
export function getPriceFeedIdFromPairName(pairName: string): string {
  return PAIR_TO_PRICE_FEED_ID[pairName.toUpperCase()] || '';
} 