/**
 * PriceService class for Aptos
 * Manages price data fetching and WebSocket subscriptions
 */
export interface PriceData {
  price: number;
  symbol: string;
  timestamp: number;
}

// Types for klines data
export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type KlineArray = [number, string, string, string, string, string, number, string, number, string, string, string];

import { getAvailableTradingPairs } from '../config/tradingPairs';

export class PriceService {
  private static instance: PriceService;
  private priceSubscribers: ((data: PriceData) => void)[] = [];
  private currentInterval: NodeJS.Timeout | null = null;
  
  /**
   * WebSocket support
   * Manages WebSocket connection and subscriptions
   */
  private webSocket: WebSocket | null = null;
  private webSocketSubscriptions: Map<string, Set<(data: PriceData) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() { }

  public static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  /**
   * Helper function to format symbol for Coinbase API
   * Chuyển từ SOLUSDT => SOL-USDT, APTUSDT => APT-USDT, ETHUSDT => ETH-USDT, v.v.
   * @param symbol - The symbol to format (ex: SOLUSDT)
   * @returns The formatted symbol (ex: SOL-USDT)
   */
  private formatSymbolForCoinbase(symbol: string): string {
    const QUOTES = ['USDT', 'USD', 'BTC', 'ETH', 'BNB', 'EUR'];
    for (const quote of QUOTES) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length).replace(/[-/]+$/, '');
        return `${base}-${quote}`;
      }
    }
    return symbol;
  }
  
  private formatSymbolForBinance(symbol: string): string {
    if (/^[A-Z]{3,}USDT$/.test(symbol)) return symbol;
    const match = symbol.match(/^([A-Z]{3,})[\/-]USDT$/i);
    if (match) return `${match[1].toUpperCase()}USDT`;
    if (/^[A-Z]{3,}USD$/.test(symbol)) return symbol + 'T';
    return symbol.replace(/[^A-Za-z0-9]/g, '');
  }

  /**
   * Fetch price data from Coinbase API
   * @param chartSymbol - The symbol to fetch price for
   * @returns The price data
   */
  public async fetchPrice(chartSymbol: string): Promise<PriceData> {
    try {
      // Format symbol for Coinbase API
      const coinbaseSymbol = this.formatSymbolForCoinbase(chartSymbol);
      
      // Use formatted symbol to fetch price
      const response = await fetch(`https://api.coinbase.com/v2/prices/${coinbaseSymbol}/spot`);
      const data = await response.json();

      return {
        price: parseFloat(data.data.amount),
        symbol: chartSymbol,
        timestamp: Date.now()
      };
    } catch (error) {
      //console.error('Error fetching price from Coinbase:', error);
      
      // Fallback if Coinbase API is not working
      try {
        const binanceSymbol = this.formatSymbolForBinance(chartSymbol);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
        const data = await response.json();
        return {
          price: parseFloat(data.price),
          symbol: chartSymbol,
          timestamp: Date.now()
        };
      } catch (backupError) {
        console.error('Error fetching backup price from Binance:', backupError);
        throw error;
      }
    }
  }

  /**
   * Add WebSocket functionality
   * Manages WebSocket connection and subscriptions
   */
  public subscribeToWebSocketPrices(callback: (data: PriceData) => void, symbols: string[] = ['BTC-USD']): () => void {
    // Make sure all symbols are in correct format for Coinbase
    const formattedSymbols = symbols.map(symbol => this.formatSymbolForCoinbase(symbol));

    // Store subscription for each symbol
    formattedSymbols.forEach(symbol => {
      if (!this.webSocketSubscriptions.has(symbol)) {
        this.webSocketSubscriptions.set(symbol, new Set());
      }
      this.webSocketSubscriptions.get(symbol)?.add(callback);
    });

    // Initialize WebSocket if not already done
    this.initializeWebSocket();

    // Fetch initial prices immediately
    formattedSymbols.forEach(async (symbol) => {
      try {
        const priceData = await this.fetchPrice(symbol);
        callback(priceData);
      } catch (error) {
        console.error(`Error fetching initial price for ${symbol}:`, error);
      }
    });

    // Return unsubscribe function
    return () => {
      formattedSymbols.forEach(symbol => {
        const subscribers = this.webSocketSubscriptions.get(symbol);
        if (subscribers) {
          subscribers.delete(callback);
          if (subscribers.size === 0) {
            this.webSocketSubscriptions.delete(symbol);
          }
        }
      });

      // Close WebSocket if no more subscriptions
      if (this.webSocketSubscriptions.size === 0) {
        this.closeWebSocket();
      } else {
        // Update subscriptions
        this.updateWebSocketSubscriptions();
      }
    };
  }
  
  /**
   * Initialize WebSocket connection
   * Manages WebSocket connection and subscriptions
   */
  private initializeWebSocket(): void {
    // Return early if WebSocket is already initialized
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.updateWebSocketSubscriptions();
      return;
    }

    // Close existing WebSocket if it exists
    this.closeWebSocket();

    // Create new WebSocket connection
    this.webSocket = new WebSocket('wss://ws-feed.exchange.coinbase.com');

    this.webSocket.onopen = () => {
      console.log('Coinbase WebSocket connection established');
      this.reconnectAttempts = 0;
      this.updateWebSocketSubscriptions();
    };
    
    /**
     * Handle WebSocket messages
     * Manages WebSocket message processing
     */
    this.webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle price updates from ticker messages
        if (data.type === 'ticker' && data.product_id && data.price) {
          const symbol = data.product_id;
          const subscribers = this.webSocketSubscriptions.get(symbol);

          if (subscribers) {
            const priceData: PriceData = {
              price: parseFloat(data.price),
              symbol: symbol,
              timestamp: Date.now()
            };

            subscribers.forEach(callback => {
              try {
                callback(priceData);
              } catch (error) {
                console.error('Error in price subscriber callback:', error);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.webSocket.onclose = () => {
      console.log('WebSocket connection closed');
      this.webSocket = null;
      
      // Attempt to reconnect if there are active subscriptions
      if (this.webSocketSubscriptions.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Update WebSocket subscriptions
   * Manages WebSocket subscription updates
   */
  private updateWebSocketSubscriptions(): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const symbols = Array.from(this.webSocketSubscriptions.keys());
    
    // Subscribe to all symbols
    const subscribeMessage = {
      type: 'subscribe',
      product_ids: symbols,
      channels: ['ticker']
    };

    this.webSocket.send(JSON.stringify(subscribeMessage));
  }

  /**
   * Close WebSocket connection
   * Manages WebSocket connection closure
   */
  private closeWebSocket(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   * Manages WebSocket reconnection attempts
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.initializeWebSocket();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)); // Exponential backoff with max 30s
  }

  /**
   * Subscribe to price updates with polling
   * @param callback - Callback function to receive price updates
   * @param symbol - Trading symbol
   * @param interval - Polling interval in milliseconds
   */
  public subscribeToPriceUpdates(callback: (data: PriceData) => void, symbol: string = 'BTC-USD', interval: number = 5000) {
    const intervalId = setInterval(async () => {
      try {
        const priceData = await this.fetchPrice(symbol);
        callback(priceData);
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }, interval);

    this.priceSubscribers.push(callback);

    return () => {
      clearInterval(intervalId);
      const index = this.priceSubscribers.indexOf(callback);
      if (index > -1) {
        this.priceSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Unsubscribe from price updates
   * @param callback - Callback function to unsubscribe
   */
  public unsubscribeFromPriceUpdates(callback: (data: PriceData) => void) {
    const index = this.priceSubscribers.indexOf(callback);
    if (index > -1) {
      this.priceSubscribers.splice(index, 1);
    }
  }

  /**
   * Fetch klines/candlestick data from Binance with fallback to Coinbase
   * @param symbol - Trading symbol
   * @param interval - Time interval
   * @param limit - Number of candles
   * @returns Array of candlestick data
   */
  public async fetchKlines(symbol: string, interval: string = '1d', limit: number = 100): Promise<KlineData[]> {
    try {
      // Try Binance first
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }
      
      const data = await response.json();

      return data.map((candle: KlineArray) => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      //console.error('Error fetching klines from Binance:', error);
      
      // Fallback to Coinbase API for basic price data
      try {
        //console.log('Falling back to Coinbase API for price data');
        const coinbaseSymbol = this.formatSymbolForCoinbase(symbol);
        
        // For Coinbase fallback, we'll create synthetic klines from spot prices
        const syntheticKlines: KlineData[] = [];
        const now = Date.now();
        const intervalMs = this.getIntervalMs(interval);
        
        for (let i = limit - 1; i >= 0; i--) {
          const time = now - (i * intervalMs);
          try {
            const priceData = await this.fetchPrice(coinbaseSymbol);
            syntheticKlines.push({
              time: time,
              open: priceData.price,
              high: priceData.price,
              low: priceData.price,
              close: priceData.price,
              volume: 0
            });
          } catch (priceError) {
            console.error('Error fetching fallback price:', priceError);
            // Use a default price if API fails
            syntheticKlines.push({
              time: time,
              open: 100,
              high: 100,
              low: 100,
              close: 100,
              volume: 0
            });
          }
        }
        
        return syntheticKlines;
      } catch (fallbackError) {
        console.error('Error with Coinbase fallback:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Get milliseconds for interval
   * @param interval - Time interval string
   * @returns Milliseconds
   */
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1m': return 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      case '1w': return 7 * 24 * 60 * 60 * 1000;
      case '1M': return 30 * 24 * 60 * 60 * 1000;
      case '1y': return 365 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default to 1 day
    }
  }

  /**
   * Sample data to reduce number of points for charting
   * @param data - Original data array
   * @param targetCount - Target number of points
   * @returns Sampled data array
   */
  private sampleData(data: KlineData[], targetCount: number): KlineData[] {
    if (data.length <= targetCount) {
      return data;
    }

    const step = data.length / targetCount;
    const sampled: KlineData[] = [];

    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      sampled.push(data[index]);
    }

    return sampled;
  }
} 