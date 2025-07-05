import { PriceService, KlineData } from './PriceService';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_EMPTY_DURATION = 60 * 1000; // 1 minute for empty data retry
const INTERVALS = [
  { value: '24h', binance: '1m', limit: 200 },
  { value: '7d', binance: '15m', limit: 672 },
  { value: '1m', binance: '1h', limit: 720 },
  { value: '1y', binance: '1d', limit: 365 },
];

type IntervalValue = '24h' | '7d' | '1m' | '1y';

type ChartCache = {
  [symbol: string]: {
    [interval in IntervalValue]?: { data: KlineData[]; ts: number; fallback?: boolean }
  }
};

class ChartDataPrefetchService {
  private static instance: ChartDataPrefetchService;
  private cache: ChartCache = {};

  private constructor() {}

  public static getInstance(): ChartDataPrefetchService {
    if (!ChartDataPrefetchService.instance) {
      ChartDataPrefetchService.instance = new ChartDataPrefetchService();
    }
    return ChartDataPrefetchService.instance;
  }

  // Prefetch all intervals for a symbol
  public async prefetchAll(symbol: string) {
    await Promise.all(
      INTERVALS.map(i => this.prefetch(symbol, i.value as IntervalValue))
    );
  }

  // Prefetch a single interval for a symbol
  public async prefetch(symbol: string, interval: IntervalValue) {
    const intv = INTERVALS.find(i => i.value === interval);
    if (!intv) return;
    const cacheKey = `${symbol}_${interval}`;
    // Check localStorage
    const localCache = localStorage.getItem(cacheKey);
    if (localCache) {
      try {
        const { data, ts, fallback } = JSON.parse(localCache);
        if (Array.isArray(data) && data.length > 0 && Date.now() - ts < CACHE_DURATION) {
          this.setCache(symbol, interval, data, ts, fallback);
          return;
        }
        // If data is empty, only use cache if < 1 minute old
        if (Array.isArray(data) && data.length === 0 && Date.now() - ts < RETRY_EMPTY_DURATION) {
          this.setCache(symbol, interval, data, ts, fallback);
          return;
        }
      } catch {}
    }
    // Fetch from API
    const { klines, fallback } = await this.fetchWithLog(symbol, intv.binance, intv.limit);
    if (klines.length > 0) {
      this.setCache(symbol, interval, klines, Date.now(), fallback);
      localStorage.setItem(cacheKey, JSON.stringify({ data: klines, ts: Date.now(), fallback }));
    } else {
      // Only cache empty for 1 minute
      this.setCache(symbol, interval, [], Date.now(), fallback);
      localStorage.setItem(cacheKey, JSON.stringify({ data: [], ts: Date.now(), fallback }));
      setTimeout(() => {
        // After 1 minute, allow refetch
        if (this.cache[symbol]?.[interval]?.data.length === 0) {
          delete this.cache[symbol]?.[interval];
          localStorage.removeItem(cacheKey);
        }
      }, RETRY_EMPTY_DURATION);
    }
  }

  // Get chart data (from cache or fetch if needed)
  public async getChartData(symbol: string, interval: IntervalValue): Promise<KlineData[]> {
    // Check memory cache
    const cached = this.cache[symbol]?.[interval];
    if (cached && ((cached.data.length > 0 && Date.now() - cached.ts < CACHE_DURATION) || (cached.data.length === 0 && Date.now() - cached.ts < RETRY_EMPTY_DURATION))) {
      return cached.data;
    }
    // Check localStorage
    const cacheKey = `${symbol}_${interval}`;
    const localCache = localStorage.getItem(cacheKey);
    if (localCache) {
      try {
        const { data, ts, fallback } = JSON.parse(localCache);
        if (Array.isArray(data) && data.length > 0 && Date.now() - ts < CACHE_DURATION) {
          this.setCache(symbol, interval, data, ts, fallback);
          return data;
        }
        if (Array.isArray(data) && data.length === 0 && Date.now() - ts < RETRY_EMPTY_DURATION) {
          this.setCache(symbol, interval, data, ts, fallback);
          return data;
        }
      } catch {}
    }
    // Fetch from API
    await this.prefetch(symbol, interval);
    return this.cache[symbol]?.[interval]?.data || [];
  }

  private setCache(symbol: string, interval: IntervalValue, data: KlineData[], ts: number, fallback?: boolean) {
    if (!this.cache[symbol]) this.cache[symbol] = {};
    this.cache[symbol][interval] = { data, ts, fallback };
  }

  // Fetch with logging and fallback detection
  private async fetchWithLog(symbol: string, binanceInterval: string, limit: number): Promise<{ klines: KlineData[]; fallback: boolean }>{
    const binanceSymbol = symbol.replace('-', '').replace('/', '');
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`;
    console.log(`[ChartDataPrefetchService] Fetching: symbol=${symbol}, binanceSymbol=${binanceSymbol}, interval=${binanceInterval}, limit=${limit}`);
    console.log(`[ChartDataPrefetchService] API URL: ${url}`);
    try {
      const klines = await PriceService.getInstance().fetchKlines(symbol, binanceInterval, limit);
      // Detect fallback: if all open==close==high==low, likely fallback
      const fallback = klines.length > 0 && klines.every(k => k.open === k.close && k.open === k.high && k.open === k.low);
      if (fallback) {
        console.warn(`[ChartDataPrefetchService] Fallback to Coinbase or synthetic data for symbol=${symbol}, interval=${binanceInterval}`);
      }
      return { klines, fallback };
    } catch (e) {
      console.error(`[ChartDataPrefetchService] Error fetching klines for symbol=${symbol}, interval=${binanceInterval}:`, e);
      return { klines: [], fallback: false };
    }
  }
}

export default ChartDataPrefetchService; 