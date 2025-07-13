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
      }
    }
  }

  // Fetch all events for a market ONCE (no polling)
  async fetchEventsOnce(marketAddress: string): Promise<MarketEvent[]> {
    const allEvents: MarketEvent[] = [];
    for (const type of this.eventTypes) {
      try {
        const events = await this.fetchEvents(marketAddress, type);
        allEvents.push(...events);
      } catch (e) {}
    }
    if (allEvents.length > 0) {
      allEvents.sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number));
      this.notify(marketAddress, allEvents);
    }
    return allEvents;
  }

  private async fetchEvents(marketAddress: string, eventType: MarketEventType): Promise<MarketEvent[]> {
    const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || '';
    const url = `${BACKEND_API}/api/events/${eventType}?market_address=${marketAddress}`;
    const res = await fetch(url);
    if (!res.ok) throw { status: res.status };
    const events = await res.json();
    return events;
  }

  private notify(marketAddress: string, events: MarketEvent[]) {
    this.listeners.get(marketAddress)?.forEach(cb => cb(events));
  }
}

export default EventListenerService; 