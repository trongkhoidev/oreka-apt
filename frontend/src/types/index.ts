// Aptos-specific types for binary options

export interface Market {
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

export interface WalletInfo {
  address: string;
  publicKey: string;
  isConnected: boolean;
}

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

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface MarketFormData {
  tradingPair: string;
  strikePrice: string;
  biddingStartDate: string;
  biddingStartTime: string;
  biddingEndDate: string;
  biddingEndTime: string;
  maturityDate: string;
  maturityTime: string;
  fee: string;
}

export interface BidData {
  marketId: string;
  amount: string;
  side: 'bid' | 'ask';
}

export interface MarketStats {
  totalMarkets: number;
  activeMarkets: number;
  totalVolume: number;
  totalFees: number;
}

export interface NetworkInfo {
  name: string;
  nodeUrl: string;
  faucetUrl?: string;
  chainId: number;
}

export interface ContractConfig {
  factoryModuleAddress: string;
  factoryModuleName: string;
  factoryFunctionName: string;
  priceFeedMapping: { [key: string]: string };
}

export interface AptosAccount {
  address: string;
  publicKey: string;
  sequenceNumber: number;
  authenticationKey: string;
}

export interface AptosTransaction {
  hash: string;
  sender: string;
  sequenceNumber: number;
  maxGasAmount: number;
  gasUnitPrice: number;
  gasCurrency: string;
  expirationTimestampSecs: number;
  payload: any;
  signature: any;
}

export interface AptosResource {
  type: string;
  data: any;
}

export interface AptosEvent {
  key: string;
  sequenceNumber: number;
  type: string;
  data: any;
} 