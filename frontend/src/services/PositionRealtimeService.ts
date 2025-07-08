import { getMarketDetails } from './aptosMarketService';

export interface PositionData {
  time: number;
  long: number;
  short: number;
  longPercent: number;
  shortPercent: number;
  total: number;
}

export interface BidEvent {
  time: number;
  side: 'long' | 'short';
  amount: number;
  user: string;
  marketAddress: string;
}

export interface PositionUpdate {
  marketAddress: string;
  position: PositionData;
  isRealtime: boolean;
  bidEvent?: BidEvent; // Optional bid event that caused this update
}

type PositionSubscriber = (update: PositionUpdate) => void;

class PositionRealtimeService {
  private static instance: PositionRealtimeService;
  private subscribers: Map<string, Set<PositionSubscriber>> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private positionHistory: Map<string, PositionData[]> = new Map();
  private bidEvents: Map<string, BidEvent[]> = new Map(); // NEW: Store bid events
  private lastUpdateTime: Map<string, number> = new Map();
  
  // Configuration
  private readonly POLLING_INTERVAL = 3000; // 3 seconds
  private readonly MAX_HISTORY_POINTS = 1000; // Max history points per market
  private readonly MAX_BID_EVENTS = 500; // Max bid events per market
  private readonly HISTORY_KEY_PREFIX = 'position_history_';
  private readonly BID_EVENTS_KEY_PREFIX = 'bid_events_'; // NEW: Key for bid events
  private readonly LAST_UPDATE_KEY_PREFIX = 'position_last_update_';

  private constructor() {
    this.loadPersistedData();
  }

  public static getInstance(): PositionRealtimeService {
    if (!PositionRealtimeService.instance) {
      PositionRealtimeService.instance = new PositionRealtimeService();
    }
    return PositionRealtimeService.instance;
  }

  /**
   * Subscribe to realtime position updates for a market
   * @param marketAddress - The market address to subscribe to
   * @param callback - Callback function to receive updates
   * @returns Unsubscribe function
   */
  public subscribe(marketAddress: string, callback: PositionSubscriber): () => void {
    if (!this.subscribers.has(marketAddress)) {
      this.subscribers.set(marketAddress, new Set());
    }
    
    const marketSubscribers = this.subscribers.get(marketAddress)!;
    marketSubscribers.add(callback);

    // Start polling if this is the first subscriber
    if (marketSubscribers.size === 1) {
      this.startPolling(marketAddress);
    }

    // Send current data immediately
    const currentHistory = this.positionHistory.get(marketAddress) || [];
    if (currentHistory.length > 0) {
      const latest = currentHistory[currentHistory.length - 1];
      callback({
        marketAddress,
        position: latest,
        isRealtime: false
      });
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(marketAddress);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.stopPolling(marketAddress);
          this.subscribers.delete(marketAddress);
        }
      }
    };
  }

  /**
   * Get historical position data for a market
   * @param marketAddress - The market address
   * @param interval - Time interval to filter by
   * @returns Array of position data points
   */
  public getPositionHistory(marketAddress: string, interval: '24h' | '7d' | '30d' | 'all' = 'all'): PositionData[] {
    const history = this.positionHistory.get(marketAddress) || [];
    
    if (interval === 'all') return history;
    
    const now = Date.now();
    let cutoffTime = now;
    
    switch (interval) {
      case '24h':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }
    
    return history.filter(point => point.time >= cutoffTime);
  }

  /**
   * Get bid events for a market
   * @param marketAddress - The market address
   * @param startTime - Optional start time filter
   * @param endTime - Optional end time filter
   * @returns Array of bid events
   */
  public getBidEvents(marketAddress: string, startTime?: number, endTime?: number): BidEvent[] {
    const events = this.bidEvents.get(marketAddress) || [];
    
    if (!startTime && !endTime) return events;
    
    return events.filter(event => {
      if (startTime && event.time < startTime) return false;
      if (endTime && event.time > endTime) return false;
      return true;
    });
  }

  /**
   * Add a bid event and update position accordingly
   * @param marketAddress - The market address
   * @param bidEvent - The bid event to add
   */
  public addBidEvent(marketAddress: string, bidEvent: Omit<BidEvent, 'marketAddress'>): void {
    const event: BidEvent = {
      ...bidEvent,
      marketAddress
    };

    // Add to bid events history
    if (!this.bidEvents.has(marketAddress)) {
      this.bidEvents.set(marketAddress, []);
    }
    
    const marketBidEvents = this.bidEvents.get(marketAddress)!;
    marketBidEvents.push(event);
    
    // Sort by time and limit to max events
    marketBidEvents.sort((a, b) => a.time - b.time);
    if (marketBidEvents.length > this.MAX_BID_EVENTS) {
      marketBidEvents.splice(0, marketBidEvents.length - this.MAX_BID_EVENTS);
    }

    // Calculate new position based on bid event
    const currentPosition = this.getCurrentPosition(marketAddress);
    const currentLong = currentPosition?.long || 0;
    const currentShort = currentPosition?.short || 0;
    
    let newLong = currentLong;
    let newShort = currentShort;
    
    if (bidEvent.side === 'long') {
      newLong += bidEvent.amount;
    } else {
      newShort += bidEvent.amount;
    }
    
    const total = newLong + newShort;
    const newPosition: PositionData = {
      time: bidEvent.time,
      long: newLong,
      short: newShort,
      longPercent: total > 0 ? (newLong / total) * 100 : 50,
      shortPercent: total > 0 ? (newShort / total) * 100 : 50,
      total
    };

    // Add to position history
    this.addToHistory(marketAddress, newPosition);
    
    // Notify subscribers with bid event
    this.notifySubscribers(marketAddress, {
      marketAddress,
      position: newPosition,
      isRealtime: true,
      bidEvent: event
    });

    // Persist data
    this.persistData(marketAddress);
  }

  /**
   * Manually trigger a position update for a market
   * @param marketAddress - The market address
   */
  public async refreshPosition(marketAddress: string): Promise<void> {
    await this.updatePosition(marketAddress);
  }

  /**
   * Start polling for position updates
   */
  private startPolling(marketAddress: string): void {
    if (this.pollingIntervals.has(marketAddress)) {
      return; // Already polling
    }

    const interval = setInterval(async () => {
      await this.updatePosition(marketAddress);
    }, this.POLLING_INTERVAL);

    this.pollingIntervals.set(marketAddress, interval);
    
    // Initial update
    this.updatePosition(marketAddress);
  }

  /**
   * Stop polling for position updates
   */
  private stopPolling(marketAddress: string): void {
    const interval = this.pollingIntervals.get(marketAddress);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(marketAddress);
    }
  }

  /**
   * Update position data for a market
   */
  private async updatePosition(marketAddress: string): Promise<void> {
    try {
      // Get current market data
      const market = await getMarketDetails(marketAddress);
      if (!market) {
        console.warn(`[PositionRealtimeService] Market not found: ${marketAddress}`);
        return;
      }

      const now = Date.now();
      const long = Number(market.long_amount) / 1e8;
      const short = Number(market.short_amount) / 1e8;
      const total = long + short;
      
      const positionData: PositionData = {
        time: now,
        long,
        short,
        longPercent: total > 0 ? (long / total) * 100 : 50,
        shortPercent: total > 0 ? (short / total) * 100 : 50,
        total
      };

      // Check if position has changed significantly (more than 0.1% change)
      const lastPosition = this.positionHistory.get(marketAddress)?.slice(-1)[0];
      const hasSignificantChange = !lastPosition || 
        Math.abs(lastPosition.longPercent - positionData.longPercent) > 0.1 ||
        Math.abs(lastPosition.shortPercent - positionData.shortPercent) > 0.1 ||
        Math.abs(lastPosition.total - positionData.total) > 0.01;

      if (hasSignificantChange) {
        // Add to history
        this.addToHistory(marketAddress, positionData);
        
        // Notify subscribers
        this.notifySubscribers(marketAddress, {
          marketAddress,
          position: positionData,
          isRealtime: true
        });

        // Persist to localStorage
        this.persistData(marketAddress);
      }

      this.lastUpdateTime.set(marketAddress, now);
    } catch (error) {
      console.error(`[PositionRealtimeService] Error updating position for ${marketAddress}:`, error);
    }
  }

  /**
   * Add position data to history
   */
  private addToHistory(marketAddress: string, positionData: PositionData): void {
    if (!this.positionHistory.has(marketAddress)) {
      this.positionHistory.set(marketAddress, []);
    }
    
    const history = this.positionHistory.get(marketAddress)!;
    history.push(positionData);
    
    // Sort by time and limit to max points
    history.sort((a, b) => a.time - b.time);
    if (history.length > this.MAX_HISTORY_POINTS) {
      history.splice(0, history.length - this.MAX_HISTORY_POINTS);
    }
  }

  /**
   * Notify all subscribers for a market
   */
  private notifySubscribers(marketAddress: string, update: PositionUpdate): void {
    const subscribers = this.subscribers.get(marketAddress);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(`[PositionRealtimeService] Error in subscriber callback:`, error);
        }
      });
    }
  }

  /**
   * Load persisted data from localStorage
   */
  private loadPersistedData(): void {
    try {
      // Load position history
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.HISTORY_KEY_PREFIX)) {
          const marketAddress = key.replace(this.HISTORY_KEY_PREFIX, '');
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const history = JSON.parse(data) as PositionData[];
              this.positionHistory.set(marketAddress, history);
            } catch (error) {
              console.warn(`[PositionRealtimeService] Failed to parse history for ${marketAddress}:`, error);
            }
          }
        }
      }

      // Load bid events
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.BID_EVENTS_KEY_PREFIX)) {
          const marketAddress = key.replace(this.BID_EVENTS_KEY_PREFIX, '');
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const events = JSON.parse(data) as BidEvent[];
              this.bidEvents.set(marketAddress, events);
            } catch (error) {
              console.warn(`[PositionRealtimeService] Failed to parse bid events for ${marketAddress}:`, error);
            }
          }
        }
      }

      // Load last update times
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.LAST_UPDATE_KEY_PREFIX)) {
          const marketAddress = key.replace(this.LAST_UPDATE_KEY_PREFIX, '');
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const lastUpdate = JSON.parse(data) as number;
              this.lastUpdateTime.set(marketAddress, lastUpdate);
            } catch (error) {
              console.warn(`[PositionRealtimeService] Failed to parse last update for ${marketAddress}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('[PositionRealtimeService] Failed to load persisted data:', error);
    }
  }

  /**
   * Persist data to localStorage
   */
  private persistData(marketAddress: string): void {
    try {
      // Persist position history
      const history = this.positionHistory.get(marketAddress);
      if (history) {
        localStorage.setItem(
          `${this.HISTORY_KEY_PREFIX}${marketAddress}`,
          JSON.stringify(history)
        );
      }

      // Persist bid events
      const events = this.bidEvents.get(marketAddress);
      if (events) {
        localStorage.setItem(
          `${this.BID_EVENTS_KEY_PREFIX}${marketAddress}`,
          JSON.stringify(events)
        );
      }

      // Persist last update time
      const lastUpdate = this.lastUpdateTime.get(marketAddress);
      if (lastUpdate) {
        localStorage.setItem(
          `${this.LAST_UPDATE_KEY_PREFIX}${marketAddress}`,
          JSON.stringify(lastUpdate)
        );
      }
    } catch (error) {
      console.warn(`[PositionRealtimeService] Failed to persist data for ${marketAddress}:`, error);
    }
  }

  /**
   * Clear all data for a market
   */
  public clearMarketData(marketAddress: string): void {
    this.positionHistory.delete(marketAddress);
    this.bidEvents.delete(marketAddress);
    this.lastUpdateTime.delete(marketAddress);
    
    // Clear from localStorage
    try {
      localStorage.removeItem(`${this.HISTORY_KEY_PREFIX}${marketAddress}`);
      localStorage.removeItem(`${this.BID_EVENTS_KEY_PREFIX}${marketAddress}`);
      localStorage.removeItem(`${this.LAST_UPDATE_KEY_PREFIX}${marketAddress}`);
    } catch (error) {
      console.warn('[PositionRealtimeService] Failed to clear localStorage:', error);
    }
  }

  /**
   * Get current position for a market
   * @param marketAddress - The market address
   * @returns Current position data or null if not found
   */
  public getCurrentPosition(marketAddress: string): PositionData | null {
    const history = this.positionHistory.get(marketAddress);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Manually update position data (for demo/testing purposes)
   * @param marketAddress - The market address
   * @param positionData - The new position data
   */
  public updatePositionManually(marketAddress: string, positionData: PositionData): void {
    this.addToHistory(marketAddress, positionData);
    this.notifySubscribers(marketAddress, {
      marketAddress,
      position: positionData,
      isRealtime: true
    });
    this.persistData(marketAddress);
  }

  /**
   * Clear history for a market (for demo/testing purposes)
   * @param marketAddress - The market address
   */
  public clearHistory(marketAddress: string): void {
    this.positionHistory.delete(marketAddress);
    this.bidEvents.delete(marketAddress);
    this.lastUpdateTime.delete(marketAddress);
    
    // Clear from localStorage
    try {
      localStorage.removeItem(`${this.HISTORY_KEY_PREFIX}${marketAddress}`);
      localStorage.removeItem(`${this.BID_EVENTS_KEY_PREFIX}${marketAddress}`);
      localStorage.removeItem(`${this.LAST_UPDATE_KEY_PREFIX}${marketAddress}`);
    } catch (error) {
      console.warn('[PositionRealtimeService] Failed to clear localStorage:', error);
    }
  }

  /**
   * Check if polling is active for a market
   * @param marketAddress - The market address
   * @returns True if polling is active
   */
  public isPolling(marketAddress: string): boolean {
    return this.pollingIntervals.has(marketAddress);
  }

  /**
   * Get list of active markets
   * @returns Array of market addresses
   */
  public getActiveMarkets(): string[] {
    return Array.from(this.subscribers.keys());
  }
}

export default PositionRealtimeService; 