// import only what is used
import { BINARY_OPTION_MARKET_MODULE_ADDRESS } from '@/config/contracts';
import { getAptosClient } from '../config/network';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import { getPairNameFromPriceFeedId } from '@/config/tradingPairs';
import { getStandardPairName } from '@/config/pairMapping';

// Debug: Monkey-patch fetch to log stacktrace when calling /module/binary_option_market
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('/module/binary_option_market')) {
      console.trace('Fetch /module/binary_option_market called from:');
    }
    return originalFetch.apply(this, args);
  };
}

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
    creator: string;
}

export interface DeployMarketParams {
  pairName: string;
  strikePrice: number | string;
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

/**
 * Simulate transaction to estimate gas fees
 */
export async function estimateDeployMarketGas(
  params: DeployMarketParams,
  gasSpeed: GasSpeed = GasSpeed.NORMAL
): Promise<GasEstimate> {
  try {
    const aptos = getAptosClient();
    
    // Create transaction payload for simulation
    const payload = {
      function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::create_market`,
      type_arguments: [],
      arguments: [
        params.pairName,
        Number(params.strikePrice),
        Number(params.feePercentage),
        Number(params.biddingStartTime),
        Number(params.biddingEndTime),
        Number(params.maturityTime)
      ]
    };

    // Use a reasonable default gas unit price for Aptos mainnet
    // In a real app, you'd fetch this from the network
    const baseGasUnitPrice = 100; // Default gas unit price in octas for mainnet
    
    // Apply speed multiplier
    const adjustedGasUnitPrice = Math.floor(baseGasUnitPrice * GAS_SPEED_MULTIPLIERS[gasSpeed]);

    // Simulate transaction using REST API directly, now with a guaranteed correct fullnode URL
    const simulationResponse = await fetch(`${aptos.config.fullnode}/transactions/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: "0x1", // Use a dummy address for simulation
        payload: payload,
        gas_unit_price: adjustedGasUnitPrice.toString(),
        max_gas_amount: "1000000", // Set a reasonable max gas limit
      })
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
    
    // Get gas estimate for the selected speed
    const gasEstimate = await estimateDeployMarketGas(params, gasSpeed);
    
    const transaction: InputTransactionData = {
      data: {
        function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::create_market`,
        typeArguments: [],
        functionArguments: [
          pairName,
          typeof strikePrice === 'string' ? parseInt(strikePrice, 10) : strikePrice,
          typeof feePercentage === 'string' ? parseInt(feePercentage, 10) : feePercentage,
          typeof biddingStartTime === 'string' ? parseInt(biddingStartTime, 10) : biddingStartTime,
          typeof biddingEndTime === 'string' ? parseInt(biddingEndTime, 10) : biddingEndTime,
          typeof maturityTime === 'string' ? parseInt(maturityTime, 10) : maturityTime
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
    // If response is unknown, try to access hash safely
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
    
    const transaction: InputTransactionData = {
      data: {
        function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::create_market`,
        typeArguments: [],
        functionArguments: [
            pairName,
            typeof strikePrice === 'string' ? parseInt(strikePrice, 10) : strikePrice,
            typeof feePercentage === 'string' ? parseInt(feePercentage, 10) : feePercentage,
            typeof biddingStartTime === 'string' ? parseInt(biddingStartTime, 10) : biddingStartTime,
            typeof biddingEndTime === 'string' ? parseInt(biddingEndTime, 10) : biddingEndTime,
            typeof maturityTime === 'string' ? parseInt(maturityTime, 10) : maturityTime
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

export async function getMarketsByOwner(owner: string): Promise<MarketInfo[]> {
  if (!owner || typeof owner !== 'string' || !owner.startsWith('0x')) return [];
  try {
    const aptos = getAptosClient();
    const payload = {
      function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::get_markets_by_owner` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [owner],
    };
    console.log('[getMarketsByOwner] payload:', payload);
    const result = await aptos.view({ payload });
    console.log('[getMarketsByOwner] result:', result);
    return result && result[0] ? (result[0] as MarketInfo[]) : [];
  } catch (error) {
    console.error('[getMarketsByOwner] Error:', error);
    return [];
  }
}

export async function getMarketDetails(marketObjectAddress: string): Promise<MarketInfo | null> {
  try {
    const resourceType = `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::Market` as `${string}::${string}::${string}`;
    const baseUrl = 'https://fullnode.mainnet.aptoslabs.com/v1/accounts';
    const url = `${baseUrl}/${marketObjectAddress}/resource/${resourceType}`;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const response = await fetch(url);
        if (response.status === 429) {
          console.warn('[getMarketDetails] Rate limited (429). Retrying after 2 minutes...');
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
        const resource = await response.json();
        if (!resource || !resource.data) {
          throw new Error(`Market resource not found for address: ${marketObjectAddress}`);
        }
        const market = resource.data;
        return {
          market_address: marketObjectAddress,
          owner: market.creator || '',
          creator: market.creator || '',
          pair_name: getStandardPairName(market.price_feed_id || ''),
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
        };
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
    timestampBid: number // thêm tham số này
): Promise<string> {
    // Convert amount to octas (1 APT = 1e8 octas)
    const amountInOctas = Math.floor(amount * 1e8);
    // Use standard entry function payload; coin transfer is handled by Move contract
    const transaction: InputTransactionData = {
        data: {
            function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::bid`,
            typeArguments: [],
            functionArguments: [marketAddress, prediction, amountInOctas.toString(), timestampBid.toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
}

export async function claim(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::claim`,
            typeArguments: [],
            functionArguments: [marketAddress], // chỉ truyền 1 argument
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    // If response is unknown, try to access hash safely
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
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
    finalPrice: number,
    result: number
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::resolve_market`,
            typeArguments: [],
            functionArguments: [marketAddress, finalPrice.toString(), result.toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
}

export async function withdrawFee(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::withdraw_fee`,
            typeArguments: [],
            functionArguments: [marketAddress], // chỉ truyền 1 argument
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
      function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::get_all_markets` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [],
    };
    console.log('[getAllMarkets] payload:', payload);
    const result = await aptos.view({ payload });
    console.log('[getAllMarkets] result:', result);
    return result && result[0] ? (result[0] as MarketInfo[]) : [];
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
      function: `${BINARY_OPTION_MARKET_MODULE_ADDRESS}::binary_option_market::get_user_position`,
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