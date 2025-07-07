import { FACTORY_MODULE_ADDRESS } from '@/config/contracts';
import { getMarketDetails } from './aptosMarketService';

export interface BidEvent {
  data: {
    user: string;
    prediction: boolean;
    amount: string;
    market_address: string;
  };
  guid: {
    account_address: string;
    creation_number: string;
  };
  block_timestamp?: string;
  timestamp?: string;
  sequence_number?: string;
}

/**
 * Fetch BidEvent history for a market from Aptos REST API using module event API.
 * @param marketAddress - The object address of the market
 * @returns Array of BidEvent objects from on-chain for this market
 */
export async function getMarketBidEvents(marketAddress: string): Promise<BidEvent[]> {
  // Use module event API: /v1/events/by_event_type/{event_type}
  const eventType = `${FACTORY_MODULE_ADDRESS}::binary_option_market::BidEvent`;
  const eventsUrl = `https://fullnode.devnet.aptoslabs.com/v1/events/by_event_type/${eventType}`;
  try {
    const eventsRes = await fetch(eventsUrl);
    if (!eventsRes.ok) {
      console.warn(`[getMarketBidEvents] No events found for event type ${eventType} (status ${eventsRes.status})`);
      return [];
    }
    const events = await eventsRes.json();
    if (!Array.isArray(events) || events.length === 0) {
      console.warn(`[getMarketBidEvents] Empty event array for event type ${eventType}`);
      return [];
    }
    // Filter events for this market address only (by data.market_address)
    const filtered = events.filter((e: BidEvent) =>
      e.data && e.data.market_address && e.data.market_address.toLowerCase() === marketAddress.toLowerCase()
    );
    return filtered;
  } catch (e) {
    console.error('[getMarketBidEvents] Failed to fetch BidEvent events:', e);
    return [];
  }
}

/**
 * Build position history from BidEvent log for rendering PositionChart
 * @param marketAddress - The object address of the market
 * @returns Array of { time, long, short } points for chart
 */
export async function buildPositionHistoryFromEvents(marketAddress: string): Promise<{time: number, long: number, short: number}[]> {
  const events = await getMarketBidEvents(marketAddress);
  let long = 0, short = 0;
  const history = [];
  for (const e of events) {
    if (!e.data || typeof e.data.prediction !== 'boolean' || !e.data.amount) continue;
    if (e.data.prediction) long += Number(e.data.amount);
    else short += Number(e.data.amount);
    // Prefer block_timestamp, then event.timestamp, then sequence_number, fallback to Date.now()
    let time = Date.now();
    if (e.block_timestamp) time = Number(e.block_timestamp) * 1000;
    else if (e.timestamp) time = Number(e.timestamp) * 1000;
    else if (e.sequence_number) time = Number(e.sequence_number);
    history.push({
      time,
      long: long / 1e8,
      short: short / 1e8,
    });
  }
  // Sort by time ascending
  history.sort((a, b) => a.time - b.time);
  // If no events, fallback to on-chain resource values
  if (history.length === 0) {
    try {
      const market = await getMarketDetails(marketAddress);
      if (market) {
        const now = Date.now();
        history.push({
          time: now,
          long: Number(market.long_amount) / 1e8,
          short: Number(market.short_amount) / 1e8,
        });
        console.warn(`[buildPositionHistoryFromEvents] No BidEvent found for market ${marketAddress}, fallback to on-chain resource values.`);
      } else {
        history.push({
          time: Date.now(),
          long: 0.5,
          short: 0.5,
        });
        console.warn(`[buildPositionHistoryFromEvents] No BidEvent and no market resource found for market ${marketAddress}, fallback to 50/50`);
      }
    } catch (e) {
      history.push({
        time: Date.now(),
        long: 0.5,
        short: 0.5,
      });
      console.warn(`[buildPositionHistoryFromEvents] No BidEvent and error fetching market resource for market ${marketAddress}, fallback to 50/50`, e);
    }
  }
  // If only one point, add a synthetic point at bidding_start_time with 0/0 (or 50/50)
  if (history.length === 1) {
    try {
      const market = await getMarketDetails(marketAddress);
      if (market && market.bidding_start_time) {
        const startTime = Number(market.bidding_start_time) * 1000;
        history.unshift({
          time: startTime,
          long: 0,
          short: 0,
        });
      } else {
        // fallback: 24h before
        history.unshift({
          time: history[0].time - 24 * 60 * 60 * 1000,
          long: 0,
          short: 0,
        });
      }
    } catch {
      history.unshift({
        time: history[0].time - 24 * 60 * 60 * 1000,
        long: 0,
        short: 0,
      });
    }
  }
  return history;
} 