/**
 * PriceService class for Aptos
 * Manages price data fetching and WebSocket subscriptions
 */
export interface PriceData {
  price: number;
  symbol: string;
  timestamp: number;
}

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
   * Helper function to format symbol for APIs
   * @param symbol - The symbol to format
   * @returns The formatted symbol
   */
  private formatSymbolForCoinbase(symbol: string): string {
    if (!symbol.includes('-')) {
      if (symbol.includes('/')) return symbol.replace('/', '-');
  
      const base = symbol.slice(0, -3);
      const quote = symbol.slice(-3);
      return `${base}-${quote}`;
    }
    return symbol;
  }
  
  /**
   * Helper function to format symbol for Binance API
   * @param symbol - The symbol to format
   * @returns The formatted symbol
   */
  private formatSymbolForBinance(symbol: string): string {
    return symbol.replace('-', '').replace('/', '');
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
      console.error('Error fetching price from Coinbase:', error);
      
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
    this.initializeWebSocket(formattedSymbols);

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
  private initializeWebSocket(symbols: string[] = []): void {
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
      const symbols = Array.from(this.webSocketSubscriptions.keys());
      this.initializeWebSocket(symbols);
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
   * Fetch klines/candlestick data from Binance
   * @param symbol - Trading symbol
   * @param interval - Time interval
   * @param limit - Number of candles
   * @returns Array of candlestick data
   */
  public async fetchKlines(symbol: string, interval: string = '1m', limit: number = 100): Promise<any[]> {
    try {
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
      const data = await response.json();

      return data.map((candle: any[]) => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  /**
   * Sample data to reduce number of points for charting
   * @param data - Original data array
   * @param targetCount - Target number of points
   * @returns Sampled data array
   */
  private sampleData(data: any[], targetCount: number): any[] {
    if (data.length <= targetCount) {
      return data;
    }

    const step = data.length / targetCount;
    const sampled: any[] = [];

    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      sampled.push(data[index]);
    }

    return sampled;
  }
} 