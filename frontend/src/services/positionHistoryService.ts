
export interface BidEvent {
  data: {
    user: string;
    prediction: boolean;
    amount: string;
    market_address: string;
    timestamp_bid?: string; // thêm trường này cho đúng API
    outcome_index?: number; // for multi-outcome markets
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
    // Use the correct contract address
    const contractAddress = "0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d";
    const url = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${contractAddress}/events/${contractAddress}::market_core_v2::MarketRegistry/bid_events`;
    
    console.log('[getMarketBidEvents] Fetching from URL:', url);
    console.log('[getMarketBidEvents] Looking for market:', marketAddress);
    
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[getMarketBidEvents] API error:', res.status, res.statusText);
      return [];
    }
    const allEvents: BidEvent[] = await res.json();
    
    console.log('[getMarketBidEvents] Total events fetched:', allEvents.length);
    
    // Lọc đúng market_address
    const filtered = allEvents.filter((e) => e.data.market_address?.toLowerCase() === marketAddress.toLowerCase());
    
    console.log('[getMarketBidEvents] Filtered events for market:', filtered.length);
    console.log('[getMarketBidEvents] Sample events:', filtered.slice(0, 3).map(e => ({
      market_address: e.data.market_address,
      outcome_index: e.data.outcome_index,
      amount: e.data.amount,
      timestamp_bid: e.data.timestamp_bid
    })));
    
    // Sắp xếp theo timestamp_bid tăng dần
    filtered.sort((a, b) => Number(a.data.timestamp_bid || 0) - Number(b.data.timestamp_bid || 0));
    // Gán timestamp chuẩn (ms) cho mỗi event
    for (const e of filtered) {
      if (e.data.timestamp_bid) {
        e.timestamp = Number(e.data.timestamp_bid) * 1000;
      }
    }
    return filtered;
  } catch (error) {
    console.error('[getMarketBidEvents] Error:', error);
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

  return timeline.filter((pt, idx, arr) => idx === 0 || pt.time !== arr[idx - 1].time);
}

/**
 * Build timeline step chart for MultiOutcomePositionChart
 * @param bidEvents - Array of BidEvent objects
 * @param biddingStartTime - Bidding start timestamp (ms)
 * @param biddingEndTime - Bidding end timestamp (ms)
 * @param currentTime - Current time (ms)
 * @param numOutcomes - Number of outcomes in the market
 * @returns Array<{ time, outcomeAmounts }>
 */
export function buildMultiOutcomePositionTimeline(
  bidEvents: BidEvent[],
  biddingStartTime: number,
  biddingEndTime: number,
  currentTime: number,
  numOutcomes: number
): Array<{ time: number, outcomeAmounts: number[] }> {
  // Always start at biddingStartTime (0 for all outcomes)
  const timeline: { time: number, outcomeAmounts: number[] }[] = [
    { time: biddingStartTime, outcomeAmounts: new Array(numOutcomes).fill(0) }
  ];
  
  const outcomeAmounts = new Array(numOutcomes).fill(0);
  
  // Sort events by timestamp thực (ưu tiên), fallback version
  const sorted = [...bidEvents].sort((a, b) => {
    const ta = a.timestamp ?? (a.data.timestamp_bid ? Number(a.data.timestamp_bid) * 1000 : Number(a.version));
    const tb = b.timestamp ?? (b.data.timestamp_bid ? Number(b.data.timestamp_bid) * 1000 : Number(b.version));
    return ta - tb;
  });
  
  console.log('[buildMultiOutcomePositionTimeline] Processing events:', {
    totalEvents: sorted.length,
    numOutcomes,
    biddingStartTime: new Date(biddingStartTime).toISOString(),
    biddingEndTime: new Date(biddingEndTime).toISOString(),
    currentTime: new Date(currentTime).toISOString()
  });
  
  for (const e of sorted) {
    const amount = Number(e.data.amount);
    const outcomeIndex = e.data.outcome_index ?? 0;
    
    console.log('[buildMultiOutcomePositionTimeline] Processing event:', {
      amount,
      outcomeIndex,
      timestamp: e.timestamp,
      timestamp_bid: e.data.timestamp_bid,
      version: e.version
    });
    
    // Ensure outcomeIndex is within bounds
    if (outcomeIndex >= 0 && outcomeIndex < numOutcomes) {
      outcomeAmounts[outcomeIndex] += amount;
    } else {
      console.warn('[buildMultiOutcomePositionTimeline] Invalid outcome index:', outcomeIndex, 'for numOutcomes:', numOutcomes);
    }
    
    const t = e.timestamp ?? (e.data.timestamp_bid ? Number(e.data.timestamp_bid) * 1000 : Number(e.version));
    timeline.push({ time: t, outcomeAmounts: [...outcomeAmounts] });
  }

  console.log('[buildMultiOutcomePositionTimeline] Final timeline:', timeline.map(t => ({
    time: new Date(t.time).toISOString(),
    outcomeAmounts: t.outcomeAmounts
  })));

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

  // If we have very few data points, create intermediate points for better visualization
  const filtered = timeline.filter((pt, idx, arr) => idx === 0 || pt.time !== arr[idx - 1].time);
  
  // If we only have 1-2 points, create more intermediate points for smoother visualization
  if (filtered.length <= 2 && currentTime < biddingEndTime) {
    const startTime = filtered[0].time;
    const endTime = Math.min(currentTime, biddingEndTime);
    const timeDiff = endTime - startTime;
    
    // Create 5-10 intermediate points
    const numPoints = Math.min(10, Math.max(5, Math.floor(timeDiff / (60 * 1000)))); // 1 point per minute max
    const interval = timeDiff / numPoints;
    
    const enhancedTimeline = [filtered[0]]; // Start point
    
    for (let i = 1; i < numPoints; i++) {
      const time = startTime + (interval * i);
      enhancedTimeline.push({ 
        time, 
        outcomeAmounts: [...filtered[0].outcomeAmounts] // Keep same amounts for now
      });
    }
    
    // Add end point if different from start
    if (filtered.length > 1) {
      enhancedTimeline.push(filtered[filtered.length - 1]);
    }
    
    console.log('[buildMultiOutcomePositionTimeline] Enhanced timeline with intermediate points:', enhancedTimeline.length);
    return enhancedTimeline;
  }

  return filtered;
} 