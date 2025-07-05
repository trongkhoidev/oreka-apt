export type CoinGeckoCandle = { time: number; close: number };

const INTERVALS: Record<string, { days: string; interval: string }> = {
  '1h':   { days: '1', interval: 'hourly' },
  '6h':   { days: '1', interval: 'hourly' },
  '12h':  { days: '1', interval: 'hourly' },
  '24h':  { days: '1', interval: 'hourly' },
  '3d':   { days: '3', interval: 'hourly' },
  '7d':   { days: '7', interval: 'hourly' },
  '14d':  { days: '14', interval: 'hourly' },
  '1m':   { days: '30', interval: 'daily' },
  '3m':   { days: '90', interval: 'daily' },
  '6m':   { days: '180', interval: 'daily' },
  '1y':   { days: '365', interval: 'daily' },
  'max':  { days: 'max', interval: 'daily' },
};

export async function fetchCoinGeckoHistory(symbol: string, interval: string = '24h'): Promise<CoinGeckoCandle[]> {
  const intervalConfig = INTERVALS[interval];
  if (!intervalConfig) {
    console.warn(`[CoinGecko] Unsupported interval '${interval}', falling back to '24h'`);
    return fetchCoinGeckoHistory(symbol, '24h');
  }
  const { days, interval: cgInterval } = intervalConfig;
  const url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${days}&interval=${cgInterval}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[CoinGecko] API error: ${res.status} for url: ${url}`);
      if (res.status === 404) {
        console.error(`[CoinGecko] 404 Not Found. Possible wrong symbol: '${symbol}'.`);
      }
      return [];
    }
    const data = await res.json();
    return (data.prices || []).map(([time, price]: [number, number]) => ({ time, close: price }));
  } catch (e) {
    console.error(`[CoinGecko] Fetch error for url: ${url}`, e);
    return [];
  }
} 