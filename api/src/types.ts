// Database types matching the smart contract events
export interface BetEvent {
  user_addr: string;
  market_addr: string;
  amount_raw: string; // u64 as string
  side: number; // 0 for long, 1 for short, or outcome index for multi-outcome
  timestamp: number;
}

export interface ClaimEvent {
  user_addr: string;
  market_addr: string;
  winning_raw: string; // u64 as string
  timestamp: number;
}

export interface OwnerFeeEvent {
  owner_addr: string;
  market_addr: string;
  fee_raw: string; // u64 as string
  timestamp: number;
}

export interface MarketCreatedEvent {
  market_addr: string;
  owner_addr: string;
  trading_pair: string;
  market_type: { is_binary: boolean };
  strike_price?: string;
  price_ranges?: Array<{
    min_price: string;
    max_price: string;
    outcome_name: string;
  }>;
  maturity_time: number;
  created_timestamp: number;
}

// API Response types
export interface ProfileResponse {
  user_addr: string;
  totals: {
    bet: { raw: string; human: string };
    winning: { raw: string; human: string };
    owner_fee: { raw: string; human: string };
  };
  counts: {
    played: number;
    created: number;
    won: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user_addr: string;
  total_amount?: { raw: string; human: string };
  winning?: { raw: string; human: string };
  amount?: { raw: string; human: string };
  rank_by_winning?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  month?: string; // For monthly leaderboards
}
