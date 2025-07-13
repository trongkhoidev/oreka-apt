import { getCurrentNetwork } from '../config/network';
import { BINARY_OPTION_MARKET_MODULE_ADDRESS } from '../config/contracts';

export interface BidEvent {
  data: {
    user: string;
    prediction: boolean;
    amount: string;
    market_address: string;
    timestamp_bid?: string; // thêm trường này cho đúng API
  };
  guid: {
    account_address: string;
    creation_number: string;
  };
  version: string;
  timestamp?: number; // thêm trường này để dùng trong timeline
}

/**
 * Fetch all BidEvents for a market from Aptos fullnode event API, filter by market_address, sort by timestamp_bid.
 * @param marketAddress - The market address to filter events
 * @returns Array of BidEvent with timestamp (ms)
 */
export async function getMarketBidEvents(marketAddress: string): Promise<BidEvent[]> {
  try {
    // API event endpoint cố định theo hướng dẫn user
    const url = "https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xc921fc8dcdb4a3938115a7a198a16d60ab6fe17caefd2cbb36073c3a42f4aa69/events/0xc921fc8dcdb4a3938115a7a198a16d60ab6fe17caefd2cbb36073c3a42f4aa69::binary_option_market::MarketRegistry/bid_events";
    const res = await fetch(url);
    if (!res.ok) return [];
    const allEvents: BidEvent[] = await res.json();
    // Lọc đúng market_address
    const filtered = allEvents.filter((e) => e.data.market_address?.toLowerCase() === marketAddress.toLowerCase());
    // Sắp xếp theo timestamp_bid tăng dần
    filtered.sort((a, b) => Number(a.data.timestamp_bid || 0) - Number(b.data.timestamp_bid || 0));
    // Gán timestamp chuẩn (ms) cho mỗi event
    for (const e of filtered) {
      if (e.data.timestamp_bid) {
        e.timestamp = Number(e.data.timestamp_bid) * 1000;
      }
    }
    return filtered;
  } catch (e) {
    return [];
  }
}

/**
 * Build timeline step chart for PositionChart
 * @param bidEvents - Array of BidEvent objects
 * @param biddingStartTime - Bidding start timestamp (ms)
 * @param biddingEndTime - Bidding end timestamp (ms)
 * @param currentTime - Current time (ms)
 * @returns Array<{ time, long, short }>
 */
export function buildPositionTimeline(
  bidEvents: BidEvent[],
  biddingStartTime: number,
  biddingEndTime: number,
  currentTime: number
): Array<{ time: number, long: number, short: number }> {
  // Always start at biddingStartTime (0/0)
  const timeline: { time: number, long: number, short: number }[] = [
    { time: biddingStartTime, long: 0, short: 0 }
  ];
      let long = 0, short = 0;
  // Sort events by timestamp thực (ưu tiên), fallback version
  const sorted = [...bidEvents].sort((a, b) => {
    const ta = a.timestamp ?? (a.data.timestamp_bid ? Number(a.data.timestamp_bid) * 1000 : Number(a.version));
    const tb = b.timestamp ?? (b.data.timestamp_bid ? Number(b.data.timestamp_bid) * 1000 : Number(b.version));
    return ta - tb;
  });
  for (const e of sorted) {
    const amount = Number(e.data.amount);
        if (e.data.prediction) long += amount;
        else short += amount;
    const t = e.timestamp ?? (e.data.timestamp_bid ? Number(e.data.timestamp_bid) * 1000 : Number(e.version));
    timeline.push({ time: t, long, short });
  }
  // Thêm điểm cuối: luôn là currentTime nếu currentTime < biddingEndTime, ngược lại là biddingEndTime
  const last = timeline[timeline.length - 1];
  if (currentTime < biddingEndTime) {
    if (last.time < currentTime) {
      timeline.push({ ...last, time: currentTime });
    }
        } else {
    if (last.time < biddingEndTime) {
      timeline.push({ ...last, time: biddingEndTime });
    }
  }
  // Loại bỏ duplicate time liên tiếp
  return timeline.filter((pt, idx, arr) => idx === 0 || pt.time !== arr[idx - 1].time);
} 