// EventListenerService: Listen to on-chain events and notify subscribers
import { FACTORY_MODULE_ADDRESS } from '../config/contracts';

export type MarketEventType = 'BidEvent' | 'ResolveEvent' | 'ClaimEvent' | 'WithdrawFeeEvent' | 'InitializeEvent';

export interface MarketEvent {
  type: MarketEventType;
  data: any;
  sequence_number: string;
  timestamp: string;
}

export type MarketEventCallback = (events: MarketEvent[]) => void;

class EventListenerService {
  private static instance: EventListenerService;
  private listeners: Map<string, Set<MarketEventCallback>> = new Map();
  private lastSeq: Map<string, string> = new Map();
  private polling: Map<string, NodeJS.Timeout> = new Map();
  private eventTypes: MarketEventType[] = [
    'BidEvent', 'ResolveEvent', 'ClaimEvent', 'WithdrawFeeEvent', 'InitializeEvent'
  ];

  static getInstance() {
    if (!EventListenerService.instance) {
      EventListenerService.instance = new EventListenerService();
    }
    return EventListenerService.instance;
  }

  subscribe(marketAddress: string, callback: MarketEventCallback) {
    if (!this.listeners.has(marketAddress)) {
      this.listeners.set(marketAddress, new Set());
      this.startPolling(marketAddress);
    }
    this.listeners.get(marketAddress)!.add(callback);
    return () => this.unsubscribe(marketAddress, callback);
  }

  unsubscribe(marketAddress: string, callback: MarketEventCallback) {
    const set = this.listeners.get(marketAddress);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(marketAddress);
        this.stopPolling(marketAddress);
      }
    }
  }

  private startPolling(marketAddress: string) {
    const poll = async () => {
      const allEvents: MarketEvent[] = [];
      for (const type of this.eventTypes) {
        const events = await this.fetchEvents(marketAddress, type);
        allEvents.push(...events);
      }
      if (allEvents.length > 0) {
        // Sort by sequence_number
        allEvents.sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number));
        this.listeners.get(marketAddress)?.forEach(cb => cb(allEvents));
      }
    };
    poll();
    const interval = setInterval(poll, 10000); // 10s
    this.polling.set(marketAddress, interval);
  }

  private stopPolling(marketAddress: string) {
    const interval = this.polling.get(marketAddress);
    if (interval) clearInterval(interval);
    this.polling.delete(marketAddress);
  }

  private async fetchEvents(marketAddress: string, eventType: MarketEventType): Promise<MarketEvent[]> {
    const eventTypeStr = `${FACTORY_MODULE_ADDRESS}::binary_option_market::${eventType}`;
    const url = `https://fullnode.mainnet.aptoslabs.com/v1/events/by_event_type/${eventTypeStr}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const events = await res.json();
      if (!Array.isArray(events)) return [];
      // Filter by market_address in data
      return events.filter((e: any) => e.data && e.data.market_address && e.data.market_address.toLowerCase() === marketAddress.toLowerCase())
        .map((e: any) => ({
          type: eventType,
          data: e.data,
          sequence_number: e.sequence_number,
          timestamp: e.timestamp,
        }));
    } catch {
      return [];
    }
  }
}

export default EventListenerService; 