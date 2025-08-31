// Aptos-specific types for poly-option crypto markets

// Asset type constants for dual payment support
export const ASSET_USDC = 1;
export const ASSET_APT = 2;

// Outcome comparison types for poly-option markets
export const CMP_GT = 1;             // Greater than: price > a
export const CMP_GTE = 2;            // Greater than or equal: price >= a
export const CMP_LT = 3;             // Less than: price < a
export const CMP_LTE = 4;            // Less than or equal: price <= a
export const CMP_INCL_RANGE = 5;     // Range inclusive: a <= price <= b
export const CMP_OPEN_RANGE = 6;     // Range open: a < price < b

// Market status constants
export const MARKET_STATUS_ACTIVE = 1;    // Active: from deploy to bidding end time
export const MARKET_STATUS_EXPIRED = 2;   // Expired: after bidding end time

// Constants for weighting system (in basis points - BPS)
export const ALPHA = 15; // 0.15% = 15 basis points
export const BETA = 40; // 0.4% = 40 basis points
export const RISK_MAX = 175; // 1.75% = 175 basis points
export const FEE_OWNER_BPS = 150; // 1.5% = 150 basis points
export const FIXED_POINT = 1_000_000_000; // 1e9 for precision
export const BPS_DENOMINATOR = 10_000; // 100% = 10,000 basis points

// Poly-option outcome structure
export interface Outcome {
  /// Outcome index
  index: number;
  /// Comparison type (GT, GTE, LT, LTE, RANGE_INC, RANGE_OPEN)
  comparison_type: number;
  /// First threshold value (fixed-point)
  threshold1: string;
  /// Second threshold value (for ranges, fixed-point)
  threshold2: string;
  /// Outcome description
  description: string;
  /// Whether this outcome is active
  is_active: boolean;
}

// Market configuration for poly-option system
export interface MarketConfig {
  /// Market creator address
  creator: string;
  /// Asset symbol (BTC, ETH, etc.)
  asset_symbol: string;
  /// Payment asset type (USDC or APT)
  payment_asset: number;
  /// Vector of outcomes
  outcomes: Outcome[];
  /// Owner fee in basis points (BPS)
  owner_fee_bps: number;
  /// Protocol rake in basis points (BPS)
  protocol_rake_bps: number;
  /// ORK reward budget for this market
  ork_budget: number;
  /// Market open time
  open_time: number;
  /// Market lock time
  lock_time: number;
  /// Market status
  status: number;
  /// Pyth price feed ID
  price_feed_id: string;
}

// User bet structure for poly-option system
export interface UserBet {
  /// User address
  user: string;
  /// Outcome index
  outcome_index: number;
  /// Bet amount (raw)
  amount: string;
  /// Net amount after fees
  amount_net: string;
  /// Calculated weight
  weight: string;
  /// Bet timestamp
  timestamp: number;
}

// Bid structure for poly-option market
export interface Bid {
  /// Vector of amounts bet on each outcome
  outcome_amounts: string[];
  /// Vector of net amounts after fees for each outcome
  outcome_net_amounts: string[];
  /// Vector of calculated weights for each outcome
  outcome_weights: string[];
  /// Total amount bet
  total_amount: string;
  /// Total net amount after fees
  total_net_amount: string;
  /// Total weight
  total_weight: string;
  /// Timestamp when bet was placed
  timestamp: number;
}

// Market information for listing poly-option market
export interface MarketInfo {
  market_address: string;
  owner: string;
  price_feed_id: string;
  /// Vector of outcomes with their strike prices and comparison types
  outcomes: Outcome[];
  /// Number of outcomes
  num_outcomes: number;
  /// Fee percentage for the market (in basis points)
  fee_percentage_bps: number;
  /// Protocol rake percentage (in basis points)
  rake_percentage_bps: number;
  /// ORK reward budget
  ork_budget: number;
  /// Bidding start time
  bidding_start_time: number;
  /// Bidding end time
  bidding_end_time: number;
  /// Market status
  status: number;
  /// Payment asset type (USDC or APT)
  payment_asset: number;
}

// Market structure for poly-option system
export interface Market {
  /// The creator of the market
  creator: string;
  /// The price feed id for the asset pair, e.g. BTC/USD
  price_feed_id: string;
  /// Vector of outcomes with their strike prices and comparison types
  outcomes: Outcome[];
  /// Number of outcomes
  num_outcomes: number;
  /// Fee percentage for the market (in basis points)
  fee_percentage_bps: number;
  /// Protocol rake percentage (in basis points)
  rake_percentage_bps: number;
  /// ORK reward budget
  ork_budget: number;
  /// Total number of bids
  total_bids: number;
  /// Total amount of coins deposited in the market (gross - before fees)
  total_amount: string;
  /// Total net amount after fees (used for payout calculations)
  total_net_amount: string;
  /// Accumulated owner fees
  fee_accumulator: string;
  /// Accumulated protocol rake
  rake_accumulator: string;
  /// Vector of total amounts for each outcome (gross)
  outcome_amounts: string[];
  /// Vector of total net amounts for each outcome (after fees)
  outcome_net_amounts: string[];
  /// Vector of total weights for each outcome
  outcome_weights: string[];
  /// Total weight across all outcomes
  total_weight: string;
  /// Bidding start time
  bidding_start_time: number;
  /// Bidding end time
  bidding_end_time: number;
  /// Market status
  status: number;
  /// Winning outcome index (255 if not resolved)
  winning_outcome: number;
  /// Whether market is void
  is_void: boolean;
  /// Whether market is resolved
  is_resolved: boolean;
  /// Final price (fixed-point)
  final_price: string;
  /// Resolution timestamp
  resolved_at: number;
  /// Payment asset type (USDC or APT)
  payment_asset: number;
  /// Payout pool (losers net - rake)
  payout_pool: string;
  /// Losers net amount
  losers_net: string;
}

// Legacy interface for backward compatibility (deprecated)
export interface LegacyMarket {
  id: string;
  owner: string;
  tradingPair: string;
  strikePrice: number;
  fee: number;
  biddingStartTime: number;
  biddingEndTime: number;
  maturityTime: number;
  totalBidAmount: number;
  totalAskAmount: number;
  isActive: boolean;
  isMatured: boolean;
  isSettled: boolean;
  finalPrice?: number;
  winner?: 'bid' | 'ask' | null;
}

// Wallet and account types
export interface WalletInfo {
  address: string;
  publicKey: string;
  isConnected: boolean;
}

export interface AptosAccount {
  address: string;
  publicKey: string;
  sequenceNumber: number;
  authenticationKey: string;
}

// Price and trading data types
export interface PriceData {
  price: number;
  symbol: string;
  timestamp: number;
}

export interface TradingPairInfo {
  pair: string;
  symbol: string;
  priceFeedId?: string;
}

// Transaction and result types
export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface AptosTransaction {
  hash: string;
  sender: string;
  sequenceNumber: number;
  maxGasAmount: number;
  gasUnitPrice: number;
  gasCurrency: string;
  expirationTimestampSecs: number;
  payload: unknown;
  signature: unknown;
}

export interface AptosResource {
  type: string;
  data: unknown;
}

export interface AptosEvent {
  key: string;
  sequenceNumber: number;
  type: string;
  data: unknown;
}

// Market form data for creating new markets
export interface MarketFormData {
  tradingPair: string;
  outcomes: Outcome[];
  ownerFeeBps: string;
  protocolRakeBps: string;
  orkBudget: string;
  biddingStartDate: string;
  biddingStartTime: string;
  biddingEndDate: string;
  biddingEndTime: string;
  paymentAsset: number;
}

// Bet data for placing bets
export interface BetData {
  marketId: string;
  outcomeIndex: number;
  amount: string;
}

// Market statistics
export interface MarketStats {
  totalMarkets: number;
  activeMarkets: number;
  totalVolume: string;
  totalFees: string;
  totalRake: string;
}

// Network and contract configuration
export interface NetworkInfo {
  name: string;
  nodeUrl: string;
  faucetUrl?: string;
  chainId: number;
}

export interface ContractConfig {
  cryptoMarketModuleAddress: string;
  cryptoMarketModuleName: string;
  treasuryPoolModuleAddress: string;
  treasuryPoolModuleName: string;
  orkTokenModuleAddress: string;
  orkTokenModuleName: string;
  priceFeedMapping: { [key: string]: string };
}

// Gas estimation types
export interface GasEstimate {
  gasUsed: number;
  gasUnitPrice: number;
  totalFee: number; // in APT
  totalFeeUSD: number; // in USD
  estimatedTime: string; // estimated confirmation time
}

// Gas speed options
export enum GasSpeed {
  NORMAL = 'normal',
  FAST = 'fast', 
  INSTANT = 'instant'
}

// Gas speed multipliers
export const GAS_SPEED_MULTIPLIERS = {
  [GasSpeed.NORMAL]: 1,
  [GasSpeed.FAST]: 1.5,
  [GasSpeed.INSTANT]: 2.5
};

// Gas speed labels
export const GAS_SPEED_LABELS = {
  [GasSpeed.NORMAL]: 'Normal',
  [GasSpeed.FAST]: 'Fast',
  [GasSpeed.INSTANT]: 'Instant'
};

// Gas speed descriptions
export const GAS_SPEED_DESCRIPTIONS = {
  [GasSpeed.NORMAL]: 'Standard speed, lower cost',
  [GasSpeed.FAST]: 'Faster confirmation, moderate cost',
  [GasSpeed.INSTANT]: 'Highest priority, premium cost'
};

// Treasury pool types
export interface TreasuryPool {
  aptBalance: string;
  usdcBalance: string;
  orkBalance: string;
  totalFeesCollected: string;
  totalRakeCollected: string;
  totalDustCollected: string;
  createdAt: number;
}

// Treasury configuration
export interface TreasuryConfig {
  admin: string;
  isPaused: boolean;
  maxBetAmount: string;
  minBetAmount: string;
  maxRakeBps: number;
  maxFeeBps: number;
  updatedAt: number;
}

// ORK token types
export interface OrkTokenInfo {
  totalSupply: string;
  circulatingSupply: string;
  maxSupply: string;
  decimals: number;
  symbol: string;
  name: string;
}

// Reward manager types
export interface RewardInfo {
  userAddress: string;
  marketAddress: string;
  outcomeIndex: number;
  rewardAmount: string;
  timestamp: number;
}

// Circle USDC integration types
export interface CircleUSDCInfo {
  usdcAddress: string;
  usdcDecimals: number;
  usdcSymbol: string;
  usdcName: string;
}

// Hyperion CLMM integration types
export interface HyperionCLMMInfo {
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  fee: number;
  tickSpacing: number;
}

// Nodit indexing types
export interface NoditIndexInfo {
  indexerUrl: string;
  webhookUrl: string;
  isActive: boolean;
  lastSync: number;
} 