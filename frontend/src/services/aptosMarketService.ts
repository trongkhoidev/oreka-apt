// import only what is used
import { market_core_MODULE_ADDRESS, market_core_MODULE_NAME } from '@/config/contracts';
import { getAptosClient, getNetworkInfo } from '../config/network';
// import { getPythPriceId } from '../config/geomi';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import { getPairAndSymbolFromPriceFeedId } from '../config/tradingPairs';
import { dispatchMarketUpdate, dispatchMarketListRefresh } from '../utils/marketEvents';

// Note: Avoid patching global fetch to prevent interfering with Next.js runtime

// Export the type from wallet-adapter-core for use in other files
export { InputTransactionData };

// Aligned with the MarketInfo struct in factory.move
export interface MarketInfo {
    market_address: string;
    owner: string;
    price_feed_id: string;
    pair_name: string;
    strike_price: string;
    fee_percentage: string;
    bidding_start_time: string;
    bidding_end_time: string;
    maturity_time: string;
    total_amount: string;
    long_amount: string;
    short_amount: string;
    total_bids: string;
    long_bids: string;
    short_bids: string;
    result: string;
    is_resolved: boolean;
    final_price: string;
    fee_withdrawn: boolean;
    created_at: string;
    // Multi-outcome market fields
    market_type?: {
        is_binary: boolean;
    };
    price_ranges?: Array<{
        min_price: number | string;
        max_price: number | string;
        outcome_name: string;
    }>;
    outcomes?: Array<{
      outcome_index: number;
      price_range: {
        min_price: number | string;
        max_price: number | string;
        outcome_name: string;
      };
    }>;
    outcome_amounts?: number[];
    bonus_injected?: number;
    creator: string;
    symbol?: string; // Added for pair_name mapping
}

export interface DeployMarketParams {
  pairName: string;
  strikePrice: number | string;
  feePercentage: number | string;
  biddingStartTime: number | string;
  biddingEndTime: number | string;
  maturityTime: number | string;
}

export interface DeployMultiOutcomeParams {
  pairName: string; // price_feed_id hex (32 bytes)
  priceRanges: { min: number | string; max: number | string; name?: string }[];
  feePercentage: number | string;
  biddingStartTime: number | string;
  biddingEndTime: number | string;
  maturityTime: number | string;
}

// Gas estimation interface
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
const GAS_SPEED_MULTIPLIERS = {
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

function safeU64String(val: string | number, name: string): string {
  if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
    throw new Error(`[estimateDeployMarketGas] Invalid argument for ${name}: ${val}`);
  }
  return String(val);
}

/**
 * Simulate transaction to estimate gas fees
 */
export async function estimateDeployMarketGas(
  params: DeployMarketParams,
  gasSpeed: GasSpeed = GasSpeed.NORMAL
): Promise<GasEstimate> {
  try {
    const aptos = getAptosClient();
    const hex = params.pairName.startsWith('0x') ? params.pairName.slice(2) : params.pairName;
    if (hex.length !== 64) throw new Error('price_feed_id must be 64 hex chars (32 bytes)');
    const priceFeedIdBytes = Array.from(Buffer.from(hex, 'hex'));
    if (priceFeedIdBytes.length !== 32) throw new Error('price_feed_id must be 32 bytes');
    // Chuẩn hóa và validate arguments
    const args = [
      priceFeedIdBytes,
      safeU64String(params.strikePrice, 'strikePrice'),
      safeU64String(params.feePercentage, 'feePercentage'),
      safeU64String(params.biddingStartTime, 'biddingStartTime'),
      safeU64String(params.biddingEndTime, 'biddingEndTime'),
      safeU64String(params.maturityTime, 'maturityTime')
    ];
    console.log('[estimateDeployMarketGas] arguments:', args);
    const payload = {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::create_market`,
      type_arguments: [],
      arguments: args
    };

    // Use a reasonable default gas unit price for Aptos mainnet
    const baseGasUnitPrice = 100; // Default gas unit price in octas for mainnet
    const adjustedGasUnitPrice = Math.floor(baseGasUnitPrice * GAS_SPEED_MULTIPLIERS[gasSpeed]);

    // Build simulation payload
    const simulationPayload = {
      sender: "0x1",
      payload: payload,
      gas_unit_price: String(adjustedGasUnitPrice),
      max_gas_amount: "1000000"
    };
    console.log('[estimateDeployMarketGas] simulationPayload:', simulationPayload);

    // Simulate transaction using REST API directly
    const simulationResponse = await fetch(`${aptos.config.fullnode}/transactions/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simulationPayload)
    });

    if (!simulationResponse.ok) {
      const errorText = await simulationResponse.text();
      console.error('Transaction simulation failed:', errorText);
      throw new Error(`Transaction simulation failed: ${errorText}`);
    }

    const simulationData = await simulationResponse.json();
    
    if (!simulationData[0] || simulationData[0].success === false) {
      console.error('Transaction simulation failed with data:', simulationData[0]?.vm_status);
      throw new Error(`Transaction simulation failed: ${simulationData[0]?.vm_status}`);
    }

    const gasUsed = Number(simulationData[0].gas_used || 50000); // Default fallback
    const totalFeeOctas = gasUsed * adjustedGasUnitPrice;
    const totalFeeAPT = totalFeeOctas / 1e8; // Convert from octas to APT

    // Estimate USD value (using a rough APT price estimate for mainnet)
    // In a real app, you'd fetch current APT price from an API
    const aptPriceUSD = 8.5; // Rough estimate for mainnet, should be fetched from price feed
    const totalFeeUSD = totalFeeAPT * aptPriceUSD;

    // Estimate confirmation time based on gas speed
    const estimatedTime = getEstimatedConfirmationTime(gasSpeed);

    return {
      gasUsed,
      gasUnitPrice: adjustedGasUnitPrice,
      totalFee: totalFeeAPT,
      totalFeeUSD,
      estimatedTime
    };
  } catch (error) {
    console.error('Error estimating gas:', error);
    
    // Return fallback estimates for mainnet
    const fallbackGasUsed = 50000;
    const fallbackGasUnitPrice = 100;
    const fallbackFeeAPT = (fallbackGasUsed * fallbackGasUnitPrice) / 1e8;
    
    return {
      gasUsed: fallbackGasUsed,
      gasUnitPrice: fallbackGasUnitPrice,
      totalFee: fallbackFeeAPT,
      totalFeeUSD: fallbackFeeAPT * 8.5,
      estimatedTime: '~30 seconds'
    };
  }
}

/**
 * Get estimated confirmation time based on gas speed
 */
function getEstimatedConfirmationTime(gasSpeed: GasSpeed): string {
  switch (gasSpeed) {
    case GasSpeed.NORMAL:
      return '~30 seconds';
    case GasSpeed.FAST:
      return '~15 seconds';
    case GasSpeed.INSTANT:
      return '~5 seconds';
    default:
      return '~30 seconds';
  }
}

/**
 * Deploy market with custom gas settings
 */
export async function deployMarketWithGasSettings(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  params: DeployMarketParams,
  gasSpeed: GasSpeed = GasSpeed.NORMAL
): Promise<string> {
  try {
    const {
      pairName,
      strikePrice,
      feePercentage,
      biddingStartTime,
      biddingEndTime,
      maturityTime,
    } = params;
    
    const hex = pairName.startsWith('0x') ? pairName.slice(2) : pairName;
    if (hex.length !== 64) throw new Error('price_feed_id must be 64 hex chars (32 bytes)');
    const priceFeedIdBytes = Array.from(Buffer.from(hex, 'hex'));
    if (priceFeedIdBytes.length !== 32) throw new Error('price_feed_id must be 32 bytes');
    // Get gas estimate for the selected speed
    const gasEstimate = await estimateDeployMarketGas(params, gasSpeed);
    const transaction: InputTransactionData = {
      data: {
        function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::create_market`,
        typeArguments: [],
        functionArguments: [
          priceFeedIdBytes,
          typeof strikePrice === 'string' ? strikePrice : String(strikePrice),
          typeof feePercentage === 'string' ? feePercentage : String(feePercentage),
          typeof biddingStartTime === 'string' ? biddingStartTime : String(biddingStartTime),
          typeof biddingEndTime === 'string' ? biddingEndTime : String(biddingEndTime),
          typeof maturityTime === 'string' ? maturityTime : String(maturityTime)
        ],
      }
    };
    
    // Note: The actual gas settings will be handled by the wallet
    // The wallet may use our estimates or its own logic
    console.log('Deploying with gas settings:', {
      gasSpeed,
      estimatedGas: gasEstimate.gasUsed,
      estimatedFee: gasEstimate.totalFee
    });
    
    const response = await signAndSubmitTransaction(transaction);
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('Error deploying market with gas settings:', error);
    throw new Error('Failed to deploy market');
  }
}

/**
 * Deploy a new market by calling factory::deploy_market on Aptos chain.
 */
export async function deployMarket(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    params: DeployMarketParams
): Promise<string> {
  try {
    const {
      pairName, 
      strikePrice,
      feePercentage,
      biddingStartTime,
      biddingEndTime,
      maturityTime,
    } = params;

    const hex = pairName.startsWith('0x') ? pairName.slice(2) : pairName;
    if (hex.length !== 64) throw new Error('price_feed_id must be 64 hex chars (32 bytes)');
    const priceFeedIdBytes = Array.from(Buffer.from(hex, 'hex'));
    if (priceFeedIdBytes.length !== 32) throw new Error('price_feed_id must be 32 bytes');
    const transaction: InputTransactionData = {
      data: {
        function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::create_market`,
        typeArguments: [],
        functionArguments: [
          priceFeedIdBytes,
          typeof strikePrice === 'string' ? strikePrice : String(strikePrice),
          typeof feePercentage === 'string' ? feePercentage : String(feePercentage),
          typeof biddingStartTime === 'string' ? biddingStartTime : String(biddingStartTime),
          typeof biddingEndTime === 'string' ? biddingEndTime : String(biddingEndTime),
          typeof maturityTime === 'string' ? maturityTime : String(maturityTime)
        ],
      }
    };
    const response = await signAndSubmitTransaction(transaction);
    // If response is unknown, try to access hash safely
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('Error deploying market:', error);
    if (error instanceof Error && error.message) throw new Error('Failed to deploy market: ' + error.message);
    throw new Error('Failed to deploy market');
  }
}

/**
 * Deploy a multi-outcome market (market_core::create_multi_outcome_market)
 */
export async function deployMultiOutcomeMarket(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  params: DeployMultiOutcomeParams
): Promise<string> {
  const {
    pairName,
    priceRanges,
    feePercentage,
    biddingStartTime,
    biddingEndTime,
    maturityTime,
  } = params;

  // price_feed_id to bytes (32)
  const hex = pairName.startsWith('0x') ? pairName.slice(2) : pairName;
  if (hex.length !== 64) throw new Error('price_feed_id must be 64 hex chars (32 bytes)');
  const priceFeedIdBytes = Array.from(Buffer.from(hex, 'hex'));
  if (priceFeedIdBytes.length !== 32) throw new Error('price_feed_id must be 32 bytes');

  // Flatten ranges to [min0,max0,min1,max1,...] for entry function vector<u64>
  const rangesFlat: string[] = [];
  for (const r of priceRanges) {
    const min = typeof r.min === 'string' ? r.min : String(r.min);
    const max = typeof r.max === 'string' ? r.max : String(r.max);
    rangesFlat.push(min, max);
  }

  // Move expects vector<PriceRange> where PriceRange has fields (min_price, max_price, outcome_name: String)
  // Using wallet-adapter, we pass as functionArguments: [vector<u8>, vector<PriceRange>, fee, times]
  const transaction: InputTransactionData = {
    data: {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::create_multi_outcome_market`,
      typeArguments: [],
      functionArguments: [
        priceFeedIdBytes,
        rangesFlat,
        typeof feePercentage === 'string' ? feePercentage : String(feePercentage),
        typeof biddingStartTime === 'string' ? biddingStartTime : String(biddingStartTime),
        typeof biddingEndTime === 'string' ? biddingEndTime : String(biddingEndTime),
        typeof maturityTime === 'string' ? maturityTime : String(maturityTime)
      ]
    }
  };

  const response = await signAndSubmitTransaction(transaction);
  // Handle multiple wallet return shapes
  let txHash: string | null = null;
  if (typeof response === 'string') {
    txHash = response;
  } else if (response && typeof response === 'object') {
    const anyResp = response as Record<string, unknown>;
    if (typeof anyResp.hash === 'string') txHash = anyResp.hash as string;
    else if (typeof anyResp.txHash === 'string') txHash = anyResp.txHash as string;
    else if (typeof anyResp.transactionHash === 'string') txHash = anyResp.transactionHash as string;
    else if (typeof anyResp.pendingTransactionHash === 'string') txHash = anyResp.pendingTransactionHash as string;
    else if (anyResp.result && typeof (anyResp.result as Record<string, unknown>)?.hash === 'string') {
      txHash = (anyResp.result as Record<string, unknown>).hash as string;
    }
  }
  
  if (txHash) {
    // Dispatch market list refresh event for new market creation
    dispatchMarketListRefresh();
    return txHash;
  }
  
  console.warn('[deployMultiOutcomeMarket] Unexpected wallet response:', response);
  throw new Error('Transaction did not return a hash');
}

export async function getMarketsByOwner(owner: string): Promise<MarketInfo[]> {
  if (!owner || typeof owner !== 'string' || !owner.startsWith('0x')) return [];
  try {
    const aptos = getAptosClient();
    const payload = {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_markets_by_owner` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [owner],
    };
    console.log('[getMarketsByOwner] payload:', payload);
    const result = await aptos.view({ payload });
    console.log('[getMarketsByOwner] result:', result);
    if (result && result[0]) {
      return (result[0] as MarketInfo[]).map(market => {
        const { pair, symbol } = getPairAndSymbolFromPriceFeedId(market.price_feed_id || '');
        return {
          ...market,
          pair_name: pair,
          symbol,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('[getMarketsByOwner] Error:', error);
    return [];
  }
}


const marketDetailsCache: Record<string, { data: MarketInfo | null, ts: number, rateLimitedUntil?: number }> = {};

// Function to clear market details cache
export function clearMarketDetailsCache(marketAddress?: string): void {
  if (marketAddress) {
    delete marketDetailsCache[marketAddress];
    console.log(`[clearMarketDetailsCache] Cleared cache for market: ${marketAddress}`);
  } else {
    Object.keys(marketDetailsCache).forEach(key => delete marketDetailsCache[key]);
    console.log('[clearMarketDetailsCache] Cleared all market cache');
  }
}

export async function getMarketDetails(marketObjectAddress: string, forceRefresh: boolean = false): Promise<MarketInfo | null> {
  const now = Date.now();
  if (!forceRefresh && marketDetailsCache[marketObjectAddress] && now - marketDetailsCache[marketObjectAddress].ts < 3 * 60 * 1000) {
    return marketDetailsCache[marketObjectAddress].data;
  }
 
  if (marketDetailsCache[marketObjectAddress]?.rateLimitedUntil && now < marketDetailsCache[marketObjectAddress].rateLimitedUntil) {
    console.warn(`[getMarketDetails] Skipping fetch for ${marketObjectAddress} due to rate limit.`);
    return marketDetailsCache[marketObjectAddress].data || null;
  }
  try {
    const aptos = getAptosClient();
    const resourceType = `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::Market` as `${string}::${string}::${string}`;
    // Fix URL duplication: aptos.config.fullnode already includes /v1
    const baseUrl = `${aptos.config.fullnode}/accounts`;
    const url = `${baseUrl}/${marketObjectAddress}/resource/${resourceType}`;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const response = await fetch(url);
        if (response.status === 429) {
          console.warn('[getMarketDetails] Rate limited (429). Retrying after 2 minutes...');
          marketDetailsCache[marketObjectAddress] = {
            data: marketDetailsCache[marketObjectAddress]?.data || null,
            ts: now,
            rateLimitedUntil: now + 2 * 60 * 1000
          };
          await new Promise(res => setTimeout(res, 2 * 60 * 1000));
          retryCount++;
          continue;
        }
        if (response.status === 404) {
          console.warn('[getMarketDetails] Resource not found (404):', url);
          return null;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        if (!text) {
          console.warn('[getMarketDetails] Empty response body:', url);
          return null;
        }
        let resource;
        try {
          resource = JSON.parse(text);
        } catch (e: unknown) {
          console.error('[getMarketDetails] Failed to parse JSON:', e, text);
          return null;
        }
        if (!resource || !resource.data) {
          throw new Error(`Market resource not found for address: ${marketObjectAddress}`);
        }
        const market = resource.data;
        const { pair, symbol } = getPairAndSymbolFromPriceFeedId((market.price_feed_id as string) || '');
        const result: MarketInfo = {
          market_address: marketObjectAddress,
          owner: market.creator || '',
          creator: market.creator || '',
          pair_name: pair,
          symbol,
          strike_price: market.strike_price ? String(market.strike_price) : '0',
          fee_percentage: market.fee_percentage ? String(market.fee_percentage) : '0',
          bidding_start_time: market.bidding_start_time ? String(market.bidding_start_time) : '0',
          bidding_end_time: market.bidding_end_time ? String(market.bidding_end_time) : '0',
          maturity_time: market.maturity_time ? String(market.maturity_time) : '0',
          total_amount: market.total_amount ? String(market.total_amount) : '0',
          long_amount: market.long_amount ? String(market.long_amount) : '0',
          short_amount: market.short_amount ? String(market.short_amount) : '0',
          total_bids: market.total_bids ? String(market.total_bids) : '0',
          long_bids: market.long_bids ? String(market.long_bids) : '0',
          short_bids: market.short_bids ? String(market.short_bids) : '0',
          result: market.result !== undefined ? String(market.result) : '2',
          is_resolved: !!market.is_resolved,
          final_price: market.final_price ? String(market.final_price) : '0',
          fee_withdrawn: !!market.fee_withdrawn,
          created_at: market.created_at ? String(market.created_at) : '0',
          price_feed_id: market.price_feed_id || '',
          // Multi-outcome market fields
          market_type: market.market_type || { is_binary: true },
          price_ranges: market.price_ranges ? 
            market.price_ranges.map((pr: Record<string, unknown>) => ({
              min_price: pr.min_price,
              max_price: pr.max_price,
              outcome_name: pr.outcome_name || ''
            })) : [],
          outcomes: market.outcomes ? 
            market.outcomes.map((outcome: Record<string, unknown>) => ({
              outcome_index: outcome.outcome_index,
              price_range: {
                min_price: (outcome.price_range as { min_price?: unknown })?.min_price,
                max_price: (outcome.price_range as { max_price?: unknown })?.max_price,
                outcome_name: (outcome.price_range as { outcome_name?: string })?.outcome_name || ''
              }
            })) : [],
          outcome_amounts: market.outcome_amounts ? 
            market.outcome_amounts.map((amount: unknown) => Number(amount) || 0) : [],
          bonus_injected: market.bonus_injected ? Number(market.bonus_injected) : 0,
        };
        
        console.log('[getMarketDetails] Raw market data from blockchain:', {
          market_address: marketObjectAddress,
          raw_market: market,
          market_type: market.market_type,
          price_ranges: market.price_ranges,
          outcomes: market.outcomes,
          price_ranges_type: typeof market.price_ranges,
          price_ranges_length: market.price_ranges?.length,
          outcome_amounts: market.outcome_amounts,
          outcome_amounts_type: typeof market.outcome_amounts,
          outcome_amounts_length: market.outcome_amounts?.length,
          first_price_range: market.price_ranges?.[0],
          all_price_ranges: market.price_ranges?.map((pr: Record<string, unknown>, i: number) => ({
            index: i,
            min_price: pr.min_price,
            max_price: pr.max_price,
            outcome_name: pr.outcome_name,
            min_price_type: typeof pr.min_price,
            max_price_type: typeof pr.max_price
          })),
          // Debug timing fields
          timing_fields: {
            bidding_start_time: market.bidding_start_time,
            bidding_end_time: market.bidding_end_time,
            maturity_time: market.maturity_time,
            created_at: market.created_at
          }
        });
        
        console.log('[getMarketDetails] Processed market data:', {
          market_address: marketObjectAddress,
          market_type: result.market_type,
          is_multi_outcome: result.market_type && !result.market_type.is_binary,
          outcomes_count: result.outcomes?.length || 0,
          price_ranges_count: result.price_ranges?.length || 0,
          outcomes: result.outcomes,
          price_ranges: result.price_ranges,
          // Debug processed timing fields
          processed_timing: {
            bidding_start_time: result.bidding_start_time,
            bidding_end_time: result.bidding_end_time,
            maturity_time: result.maturity_time,
            created_at: result.created_at
          }
        });
        marketDetailsCache[marketObjectAddress] = { data: result, ts: Date.now() };
        return result;
      } catch (fetchError) {
        console.error('[getMarketDetails] Fetch error:', fetchError);
        retryCount++;
        if (retryCount >= 3) {
          throw fetchError;
        }
        await new Promise(res => setTimeout(res, 1000 * retryCount)); // Exponential backoff
      }
    }
    return null;
  } catch (error) {
    console.error('[getMarketDetails] Error:', error, marketObjectAddress);
    return null;
  }
}

export async function bid(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string, 
    prediction: boolean, 
    amount: number,
    timestampBid: number 
): Promise<string> {
    // Convert amount to octas (1 APT = 1e8 octas)
    const amountInOctas = Math.floor(amount * 1e8);
    // Use standard entry function payload; coin transfer is handled by Move contract
    const transaction: InputTransactionData = {
        data: {
            function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::bid`,
            typeArguments: [],
            functionArguments: [marketAddress, prediction, amountInOctas.toString(), timestampBid.toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      const txHash = (response as { hash: string }).hash;
      
      // Dispatch market update event
      dispatchMarketUpdate(marketAddress, 'bid', { txHash, amount, prediction });
      
      return txHash;
    }
    throw new Error('Transaction did not return a hash');
}

export async function claim(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::claim`,
            typeArguments: [],
            functionArguments: [marketAddress], 
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    // If response is unknown, try to access hash safely
    if (response && typeof response === 'object' && 'hash' in response) {
      const txHash = (response as { hash: string }).hash;
      
      // Dispatch market update event
      dispatchMarketUpdate(marketAddress, 'claim', { txHash });
      
      return txHash;
    }
    throw new Error('Transaction did not return a hash');
}

// Claim for multi-outcome market
export async function claimMultiOutcome(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::claim_multi_outcome`,
            typeArguments: [],
            functionArguments: [marketAddress], 
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    // If response is unknown, try to access hash safely
    if (response && typeof response === 'object' && 'hash' in response) {
      const txHash = (response as { hash: string }).hash;
      
      // Dispatch market update event
      dispatchMarketUpdate(marketAddress, 'claim', { txHash });
      
      return txHash;
    }
    throw new Error('Transaction did not return a hash');
}

/**
 * Resolve market using off-chain price data (Hermes API approach)
 * @param signAndSubmitTransaction
 * @param marketAddress
 * @param finalPrice - final price from Hermes API
 * @param result - 0 for long win, 1 for short win
 */
export async function resolveMarket(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string,
    pythPriceUpdate: (number[] | Uint8Array)[]
): Promise<string> {
    // Validate inputs
    if (!signAndSubmitTransaction) {
        throw new Error('signAndSubmitTransaction function is required');
    }
    if (!marketAddress || typeof marketAddress !== 'string') {
        throw new Error('Valid market address is required');
    }
    if (!pythPriceUpdate || !Array.isArray(pythPriceUpdate) || pythPriceUpdate.length === 0) {
        throw new Error('Valid Pyth price update data is required');
    }

    // Optional validation: ensure the VAA corresponds to market's price_feed_id
    try {
      const network = getNetworkInfo();
      console.log('[resolveMarket] Using network for Pyth IDs:', network.name);
    } catch (error) {
      console.warn('[resolveMarket] Could not get network info:', error);
    }

    // Normalize payload strictly to vector<vector<u8>> expected by Move:
    // Each inner element MUST be a byte array where every value is 0..255 and numeric
    const normalizedUpdates: number[][] = pythPriceUpdate.map((chunk, chunkIdx) => {
      if (!chunk || chunk.length === 0) {
        throw new Error(`Empty VAA chunk at index ${chunkIdx}`);
      }

      if (chunk instanceof Uint8Array) {
        return Array.from(chunk);
      }
      
      // Handle both number[] and string[] arrays
      const normalizedChunk = (chunk as (number | string)[]).map((v: unknown, byteIdx) => {
        const num = Number(v);
        if (isNaN(num) || num < 0 || num > 255) {
          throw new Error(`Invalid byte value at chunk[${chunkIdx}][${byteIdx}]: ${v}. Must be 0-255.`);
        }
        return num;
      });
      
      console.log(`[resolveMarket] Normalized chunk[${chunkIdx}]:`, {
        originalLength: chunk.length,
        normalizedLength: normalizedChunk.length,
        firstBytes: normalizedChunk.slice(0, 8),
        lastBytes: normalizedChunk.slice(-8)
      });
      
      return normalizedChunk;
    });
    const transaction: InputTransactionData = {
        data: {
            function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::resolve_market`,
            typeArguments: [],
            functionArguments: [marketAddress, normalizedUpdates],
        }
    };

    try {
      console.log('[resolveMarket] Submitting transaction with normalized updates:', {
        marketAddress,
        updateChunks: normalizedUpdates.length,
        totalBytes: normalizedUpdates.reduce((sum, chunk) => sum + chunk.length, 0),
        firstChunkLength: normalizedUpdates[0]?.length,
        firstChunkFirst8: normalizedUpdates[0]?.slice(0, 8),
        firstChunkLast8: normalizedUpdates[0]?.slice(-8)
      });

      // Log transaction details for debugging
      console.log('[resolveMarket] Transaction details:', {
        function: 'resolve_market',
        typeArguments: transaction.data.typeArguments,
        functionArguments: [
          transaction.data.functionArguments[0], // market address
          `[${normalizedUpdates.length} chunks with ${normalizedUpdates.reduce((sum, chunk) => sum + chunk.length, 0)} total bytes]`
        ]
      });

      const response = await signAndSubmitTransaction(transaction);
      
      if (response && typeof response === 'object' && 'hash' in response) {
        console.log('[resolveMarket] Transaction successful, hash:', (response as { hash: string }).hash);
        return (response as { hash: string }).hash;
      }
      
      throw new Error('Transaction did not return a valid hash');
    } catch (error) {
      console.error('[resolveMarket] Transaction failed:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('[resolveMarket] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Check for specific error patterns
        if (error.message.includes('Simulation error')) {
          console.error('[resolveMarket] Simulation error detected - this usually means the transaction would fail on-chain');
        }
        if (error.message.includes('Generic error')) {
          console.error('[resolveMarket] Generic error detected - this could be due to VAA format or contract issues');
        }
        if (error.message.includes('E_WRONG_VERSION')) {
          console.error('[resolveMarket] VAA version error - the VAA data format is not supported');
        }
      }
      
      throw new Error(`Market resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function withdrawFee(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::withdraw_fee`,
            typeArguments: [],
            functionArguments: [marketAddress], 
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    // If response is unknown, try to access hash safely
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
}

export async function getAllMarkets(): Promise<MarketInfo[]> {
  try {
    const aptos = getAptosClient();
    const payload = {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_all_markets` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [],
    };
    console.log('[getAllMarkets] payload:', payload);
    const result = await aptos.view({ payload });
    console.log('[getAllMarkets] result:', result);
    if (result && result[0]) {
      return (result[0] as MarketInfo[]).map(market => {
        const { pair, symbol } = getPairAndSymbolFromPriceFeedId(market.price_feed_id || '');
        return {
          ...market,
          pair_name: pair,
          symbol,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('[getAllMarkets] Error:', error);
    return [];
  }
}

/**
 * Get the user's bid for a specific market.
 * @param userAddress - The user's wallet address
 * @param marketAddress - The market object address (NOT the module address!)
 * @returns [long_amount, short_amount, has_bid]
 */
export async function getUserBid(userAddress: string, marketAddress: string): Promise<[string, string, boolean]> {
  console.log('[getUserBid] Called with:', { userAddress, marketAddress });
  const aptos = getAptosClient();
  const result = await aptos.view({
    payload: {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_user_position`,
      typeArguments: [],
      functionArguments: [userAddress, marketAddress],
    }
  });
  console.log('[getUserBid] API raw result:', result);


  // Handle different response formats
  if (Array.isArray(result) && result.length === 2 && (typeof result[0] === 'string' || typeof result[0] === 'number')) {
    const long = String(result[0]);
    const short = String(result[1]);
    const hasBid = Number(long) > 0 || Number(short) > 0;
    console.log('[getUserBid] Parsed (array direct):', { long, short, hasBid });
    return [long, short, hasBid];
  }

  // Handle wrapped response format
  if (Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === 'object') {
    const firstResult = result[0] as { result?: unknown[] };
    if (firstResult.result && Array.isArray(firstResult.result) && firstResult.result.length === 2) {
      const long = String(firstResult.result[0]);
      const short = String(firstResult.result[1]);
      const hasBid = Number(long) > 0 || Number(short) > 0;
      console.log('[getUserBid] Parsed (array[0].result):', { long, short, hasBid });
      return [long, short, hasBid];
    }
  }

  // Handle object with result property
  if (result && typeof result === 'object' && 'result' in result) {
    const resultObj = result as { result?: unknown[] };
    if (resultObj.result && Array.isArray(resultObj.result) && resultObj.result.length === 2) {
      const long = String(resultObj.result[0]);
      const short = String(resultObj.result[1]);
      const hasBid = Number(long) > 0 || Number(short) > 0;
      console.log('[getUserBid] Parsed (object.result):', { long, short, hasBid });
      return [long, short, hasBid];
    }
  }

  // fallback
  console.warn('[getUserBid] Fallback: No result or unexpected format', { result });
  return ['0', '0', false];
}

// Get user position for multi-outcome market
export async function getUserMultiOutcomePosition(userAddress: string, marketAddress: string): Promise<number[]> {
  console.log('[getUserMultiOutcomePosition] Called with:', { 
    userAddress, 
    marketAddress,
    moduleAddress: market_core_MODULE_ADDRESS,
    functionName: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_user_multi_outcome_position`
  });
  
  // Add delay to prevent rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Debug: Check if this is the same address that bet
  console.log('[getUserMultiOutcomePosition] Address comparison:', {
    currentUserAddress: userAddress,
    isCurrentUser: userAddress === '0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d',
    addressLength: userAddress.length,
    addressPrefix: userAddress.slice(0, 10) + '...' + userAddress.slice(-10),
    addressValidation: {
      startsWith0x: userAddress.startsWith('0x'),
      hasCorrectLength: userAddress.length === 66, // 0x + 64 hex chars
      isHex: /^0x[0-9a-fA-F]+$/.test(userAddress)
    }
  });
  
  const aptos = getAptosClient();
  
  try {
    const result = await aptos.view({
      payload: {
        function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_user_multi_outcome_position`,
        typeArguments: [],
        functionArguments: [userAddress, marketAddress],
      }
    });
    console.log('[getUserMultiOutcomePosition] API raw result:', result);
    console.log('[getUserMultiOutcomePosition] Result type:', typeof result);
    console.log('[getUserMultiOutcomePosition] Is array:', Array.isArray(result));
    console.log('[getUserMultiOutcomePosition] Result length:', Array.isArray(result) ? result.length : 'N/A');
    
    // Debug: Check if result is empty vector
    if (Array.isArray(result) && result.length === 0) {
      console.log('[getUserMultiOutcomePosition] WARNING: API returned empty array - user may not have bet or address mismatch');
      console.log('[getUserMultiOutcomePosition] Debugging empty result:', {
        userAddress,
        marketAddress,
        moduleAddress: market_core_MODULE_ADDRESS,
        functionCall: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_user_multi_outcome_position`,
        possibleIssues: [
          'User address format incorrect',
          'Market address incorrect', 
          'User has not bet in this market',
          'Contract function not working properly'
        ]
      });
    }

  // Handle wrapped response format first (most common)
  if (result && typeof result === 'object' && 'result' in result) {
    const resultObj = result as { result?: unknown[] };
    console.log('[getUserMultiOutcomePosition] Wrapped result object:', resultObj);
    if (resultObj.result && Array.isArray(resultObj.result)) {
      const amounts = resultObj.result.map((amount: unknown) => Number(amount) || 0);
      console.log('[getUserMultiOutcomePosition] Parsed amounts (wrapped):', amounts);
      console.log('[getUserMultiOutcomePosition] Wrapped amounts length:', amounts.length);
      
      // Apply same normalization logic for wrapped response
      if (amounts.length === 0 || amounts.length === 1) {
        console.log('[getUserMultiOutcomePosition] Wrapped API returned insufficient data, fetching market info...');
        try {
          const marketDetails = await getMarketDetails(marketAddress);
          const expectedLength = marketDetails?.price_ranges?.length || 3;
          console.log('[getUserMultiOutcomePosition] Expected length from market (wrapped):', expectedLength);
          
          const normalizedAmounts = Array.from({ length: expectedLength }, (_, index) => 
            amounts[index] || 0
          );
          console.log('[getUserMultiOutcomePosition] Normalized amounts (wrapped):', normalizedAmounts);
          return normalizedAmounts;
        } catch (error) {
          console.warn('[getUserMultiOutcomePosition] Failed to get market details (wrapped), using default length 3:', error);
          const fallbackAmounts = Array.from({ length: 3 }, (_, index) => amounts[index] || 0);
          console.log('[getUserMultiOutcomePosition] Fallback amounts (wrapped):', fallbackAmounts);
          return fallbackAmounts;
        }
      }
      
      return amounts;
    }
  }

  // Handle direct array response format
  if (Array.isArray(result)) {
    // Check if it's a nested array (like [["10000000", "50000000", "30000000"]])
    if (result.length === 1 && Array.isArray(result[0])) {
      const nestedArray = result[0];
      const amounts = nestedArray.map((amount: unknown) => Number(amount) || 0);
      console.log('[getUserMultiOutcomePosition] Parsed amounts (nested array):', amounts);
      console.log('[getUserMultiOutcomePosition] Nested amounts length:', amounts.length);
      
      // Return the amounts directly since we have the correct data
      if (amounts.length > 0) {
        return amounts;
      }
    }
    
    // Handle direct array format
    const amounts = result.map((amount: unknown) => Number(amount) || 0);
    console.log('[getUserMultiOutcomePosition] Parsed amounts (direct array):', amounts);
    console.log('[getUserMultiOutcomePosition] Amounts length:', amounts.length);
    
    // If API returns empty array or single element, we need to get market info to determine correct length
    if (amounts.length === 0 || amounts.length === 1) {
      console.log('[getUserMultiOutcomePosition] API returned insufficient data, fetching market info...');
      try {
        // Get market details to determine number of outcomes
        const marketDetails = await getMarketDetails(marketAddress);
        const expectedLength = marketDetails?.price_ranges?.length || 3;
        console.log('[getUserMultiOutcomePosition] Expected length from market:', expectedLength);
        
        // Create array with correct length, filling with 0s
        const normalizedAmounts = Array.from({ length: expectedLength }, (_, index) => 
          amounts[index] || 0
        );
        console.log('[getUserMultiOutcomePosition] Normalized amounts:', normalizedAmounts);
        return normalizedAmounts;
      } catch (error) {
        console.warn('[getUserMultiOutcomePosition] Failed to get market details, using default length 3:', error);
        // Fallback to length 3 if we can't get market info
        const fallbackAmounts = Array.from({ length: 3 }, (_, index) => amounts[index] || 0);
        console.log('[getUserMultiOutcomePosition] Fallback amounts:', fallbackAmounts);
        return fallbackAmounts;
      }
    }
    
    return amounts;
  }


  // Handle single value response (might be the issue)
  if (typeof result === 'number' || typeof result === 'string') {
    const singleAmount = Number(result) || 0;
    console.log('[getUserMultiOutcomePosition] Single value response:', singleAmount);
    return [singleAmount];
  }

  console.warn('[getUserMultiOutcomePosition] Fallback: No result or unexpected format', { 
    result, 
    resultType: typeof result,
    isArray: Array.isArray(result),
    keys: result && typeof result === 'object' ? Object.keys(result) : 'N/A'
  });
  
  // Even in fallback case, try to return array with correct length
  try {
    const marketDetails = await getMarketDetails(marketAddress);
    const expectedLength = marketDetails?.price_ranges?.length || 3;
    console.log('[getUserMultiOutcomePosition] Fallback: Expected length from market:', expectedLength);
    const fallbackAmounts = Array.from({ length: expectedLength }, () => 0);
    console.log('[getUserMultiOutcomePosition] Fallback: Returning zero array:', fallbackAmounts);
    return fallbackAmounts;
  } catch (error) {
    console.warn('[getUserMultiOutcomePosition] Fallback: Failed to get market details, returning default [0,0,0]:', error);
    return [0, 0, 0];
  }
  } catch (error) {
    console.error('[getUserMultiOutcomePosition] API call failed:', error);
    
    // Handle rate limit specifically
    if (error instanceof Error && error.message.includes('429')) {
      console.warn('[getUserMultiOutcomePosition] Rate limit exceeded, returning empty array');
      return [];
    }
    
    // For other errors, return empty array
    return [];
  }
}

// Function to check all addresses that have bet in the market
export async function getAllBettingAddresses(marketAddress: string): Promise<void> {
  console.log('[getAllBettingAddresses] Checking all betting addresses for market:', marketAddress);
  
  try {
    const aptos = getAptosClient();
    
    // Get market details to see total amounts
    const marketDetails = await getMarketDetails(marketAddress);
    console.log('[getAllBettingAddresses] Market details:', {
      marketAddress,
      outcomeAmounts: marketDetails?.outcome_amounts,
      totalPool: marketDetails?.outcome_amounts?.reduce((sum, amount) => sum + amount, 0),
      priceRanges: marketDetails?.price_ranges?.length
    });
    
    // Try to get all bids by checking the market resource
    const result = await aptos.view({
      payload: {
        function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_market_info`,
        typeArguments: [],
        functionArguments: [marketAddress],
      }
    });
    
    console.log('[getAllBettingAddresses] Market info result:', result);
    
    // Try to get market details directly from the market resource
    try {
      const marketResource = await aptos.getAccountResource({
        accountAddress: marketAddress,
        resourceType: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::Market`
      });
      console.log('[getAllBettingAddresses] Market resource:', marketResource);
      
      // Check if we can see the bids table
      if (marketResource.data && marketResource.data.bids) {
        console.log('[getAllBettingAddresses] Bids table found:', marketResource.data.bids);
      } else {
        console.log('[getAllBettingAddresses] No bids table found in market resource');
      }
    } catch (marketResourceError) {
      console.log('[getAllBettingAddresses] Market resource error:', marketResourceError);
    }
    
    // Try to get all markets to see if we can find this market
    try {
      const allMarketsResult = await aptos.view({
        payload: {
          function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_all_markets`,
          typeArguments: [],
          functionArguments: [],
        }
      });
      console.log('[getAllBettingAddresses] All markets result:', allMarketsResult);
    } catch (allMarketsError) {
      console.log('[getAllBettingAddresses] All markets call failed:', allMarketsError);
    }
    
    // Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[getAllBettingAddresses] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[getAllBettingAddresses] Market details error:', marketDetailsError);
    }
    
    // Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[getAllBettingAddresses] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[getAllBettingAddresses] Market details error:', marketDetailsError);
    }
    
  } catch (error) {
    console.error('[getAllBettingAddresses] Error:', error);
  }
}

// Test function to debug API call
export async function testGetUserMultiOutcomePosition(userAddress: string, marketAddress: string): Promise<void> {
  console.log('[TEST] Testing getUserMultiOutcomePosition with:', { userAddress, marketAddress });
  
  try {
    const aptos = getAptosClient();
    
    // Test 1: Check if user address is valid
    console.log('[TEST] User address validation:', {
      userAddress,
      isValidAddress: userAddress.startsWith('0x'),
      length: userAddress.length
    });
    
    // Test 2: Check if market address is valid
    console.log('[TEST] Market address validation:', {
      marketAddress,
      isValidAddress: marketAddress.startsWith('0x'),
      length: marketAddress.length
    });
    
    // Test 3: Make the API call
    console.log('[TEST] Making API call...');
    const result = await aptos.view({
      payload: {
        function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_user_multi_outcome_position`,
        typeArguments: [],
        functionArguments: [userAddress, marketAddress],
      }
    });
    
    console.log('[TEST] API call result:', {
      result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A'
    });
    
    // Test 4: Try to get market resource directly
    try {
      const marketResource = await aptos.getAccountResource({
        accountAddress: marketAddress,
        resourceType: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::Market`
      });
      console.log('[TEST] Market resource:', marketResource);
      
      // Check if we can see the bids table
      if (marketResource.data && marketResource.data.bids) {
        console.log('[TEST] Bids table found:', marketResource.data.bids);
      } else {
        console.log('[TEST] No bids table found in market resource');
      }
    } catch (marketResourceError) {
      console.log('[TEST] Market resource error:', marketResourceError);
    }
    
    // Test 5: Try to get market info using get_market_info function
    try {
      const marketInfoResult = await aptos.view({
        payload: {
          function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_market_info`,
          typeArguments: [],
          functionArguments: [marketAddress],
        }
      });
      console.log('[TEST] Market info result:', marketInfoResult);
    } catch (marketInfoError) {
      console.log('[TEST] Market info error:', marketInfoError);
    }
    
    // Test 6: Try to get all markets to see if we can find this market
    try {
      const allMarketsResult = await aptos.view({
        payload: {
          function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::get_all_markets`,
          typeArguments: [],
          functionArguments: [],
        }
      });
      console.log('[TEST] All markets result:', allMarketsResult);
    } catch (allMarketsError) {
      console.log('[TEST] All markets error:', allMarketsError);
    }
    
    // Test 7: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 8: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 9: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 10: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 11: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 12: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 13: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 14: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 15: Try to get market details using getMarketDetails function
    try {
      const marketDetails = await getMarketDetails(marketAddress);
      console.log('[TEST] Market details from getMarketDetails:', marketDetails);
    } catch (marketDetailsError) {
      console.log('[TEST] Market details error:', marketDetailsError);
    }
    
    // Test 16: Check if user address is correct
    console.log('[TEST] User address validation:', {
      userAddress,
      isValidAddress: userAddress.startsWith('0x'),
      length: userAddress.length,
      expectedLength: 66, // 0x + 64 hex chars
      isCorrectLength: userAddress.length === 66,
      isHex: /^0x[0-9a-fA-F]+$/.test(userAddress)
    });
    
  } catch (error) {
    console.error('[TEST] API call failed:', error);
  }
}

// Bid on multi-outcome market
export async function bidMultiOutcome(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  marketAddress: string,
  outcomeIndex: number,
  amount: number,
  timestampBid: number
): Promise<string> {
  const transaction: InputTransactionData = {
    data: {
      function: `${market_core_MODULE_ADDRESS}::${market_core_MODULE_NAME}::bid_multi_outcome`,
      typeArguments: [],
      functionArguments: [
        marketAddress,
        outcomeIndex,
        Math.floor(amount * 1e8), // Convert APT to octas
        timestampBid
      ]
    }
  };

  const response = await signAndSubmitTransaction(transaction);
  
  // Handle multiple wallet return shapes
  let txHash: string | null = null;
  if (typeof response === 'string') {
    txHash = response;
  } else if (response && typeof response === 'object') {
    const responseObj = response as Record<string, unknown>;
    txHash = (responseObj.hash as string) || (responseObj.transactionHash as string) || null;
  }
  
  if (!txHash) {
    throw new Error('Failed to get transaction hash from wallet response');
  }
  
  console.log('[bidMultiOutcome] Transaction submitted:', txHash);
  return txHash;
} 

export async function getMarketCount(): Promise<number> {
  try {
    const markets = await getAllMarkets();
    return markets.length;
  } catch {
    return 0;
  }
} 