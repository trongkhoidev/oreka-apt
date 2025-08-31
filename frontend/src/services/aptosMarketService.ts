// Aptos Market Service for Poly-Option Crypto Markets
import {
  CRYPTO_MARKET_MODULE_ADDRESS,
  CRYPTO_MARKET_MODULE_NAME,
  TREASURY_POOL_MODULE_ADDRESS,
  TREASURY_POOL_MODULE_NAME,
  ORK_TOKEN_MODULE_ADDRESS,
  ORK_TOKEN_MODULE_NAME,
  CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS,
  CIRCLE_USDC_INTEGRATION_MODULE_NAME,
  HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS,
  HYPERION_CLMM_INTEGRATION_MODULE_NAME,
} from '@/config/contracts';
import { getAptosClient } from '@/config/network';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import type { 
  GasEstimate,
  CircleUSDCInfo,
  HyperionCLMMInfo,
  NoditIndexInfo,
  Market,
  MarketFormData,
  UserBet,
  TreasuryPool,
  OrkTokenInfo
} from '@/types';
import { GasSpeed } from '@/types';

// Export the type from wallet-adapter-core for use in other files
export { InputTransactionData };

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
 * Estimate gas for deploying a new poly-option market
 * @param params Market creation parameters
 * @param gasSpeed Gas speed setting
 * @returns Gas estimate
 */
export async function estimateDeployMarketGas(
  params: MarketFormData,
  gasSpeed: GasSpeed = GasSpeed.NORMAL
): Promise<GasEstimate> {
  try {
    // Convert parameters to the format expected by the smart contract
    const args = [
      params.tradingPair,
      params.outcomes.map(outcome => [
        outcome.index,
        outcome.comparison_type,
        outcome.threshold1,
        outcome.threshold2,
        outcome.description,
        outcome.is_active
      ]),
      safeU64String(params.ownerFeeBps, 'ownerFeeBps'),
      safeU64String(params.protocolRakeBps, 'protocolRakeBps'),
      safeU64String(params.orkBudget, 'orkBudget'),
      safeU64String(new Date(`${params.biddingStartDate} ${params.biddingStartTime}`).getTime() / 1000, 'biddingStartTime'),
      safeU64String(new Date(`${params.biddingEndDate} ${params.biddingEndTime}`).getTime() / 1000, 'biddingEndTime'),
      params.paymentAsset
    ];

    console.log('[estimateDeployMarketGas] arguments:', args);

    // Use a reasonable default gas unit price for Aptos mainnet
    const baseGasUnitPrice = 100; // Default gas unit price in octas for mainnet
    const adjustedGasUnitPrice = Math.floor(baseGasUnitPrice * GAS_SPEED_MULTIPLIERS[gasSpeed]);
    const gasUsed = 100000; // Base estimate, will be refined
    const totalFee = (gasUsed * adjustedGasUnitPrice) / 1e8; // Convert to APT
    const totalFeeUSD = totalFee * 10; // Rough USD conversion

    return {
      gasUsed,
      gasUnitPrice: adjustedGasUnitPrice,
      totalFee,
      totalFeeUSD,
      estimatedTime: '2-5 minutes'
    };
  } catch (error) {
    console.error('[estimateDeployMarketGas] Error:', error);
    throw error;
  }
}

/**
 * Deploy a new poly-option market with gas settings
 * @param signAndSubmitTransaction Transaction signing function
 * @param params Market creation parameters
 * @param gasSpeed Gas speed setting
 * @returns Transaction hash
 */
export async function deployMarketWithGasSettings(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  params: MarketFormData
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::create_market`,
        typeArguments: [],
        functionArguments: [
          params.tradingPair,
          params.outcomes.map(outcome => [
            outcome.index,
            outcome.comparison_type,
            outcome.threshold1,
            outcome.threshold2,
            outcome.description,
            outcome.is_active
          ]),
          params.ownerFeeBps,
          params.protocolRakeBps,
          params.orkBudget,
          new Date(`${params.biddingStartDate} ${params.biddingStartTime}`).getTime() / 1000,
          new Date(`${params.biddingEndDate} ${params.biddingEndTime}`).getTime() / 1000,
          params.paymentAsset
        ],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[deployMarketWithGasSettings] Error:', error);
    throw error;
  }
}

/**
 * Deploy a new poly-option market
 * @param signAndSubmitTransaction Transaction signing function
 * @param params Market creation parameters
 * @returns Transaction hash
 */
export async function deployMarket(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  params: MarketFormData
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::create_market`,
        typeArguments: [],
        functionArguments: [
          params.tradingPair,
          params.outcomes.map(outcome => [
            outcome.index,
            outcome.comparison_type,
            outcome.threshold1,
            outcome.threshold2,
            outcome.description,
            outcome.is_active
          ]),
          params.ownerFeeBps,
          params.protocolRakeBps,
          params.orkBudget,
          new Date(`${params.biddingStartDate} ${params.biddingStartTime}`).getTime() / 1000,
          new Date(`${params.biddingEndDate} ${params.biddingEndTime}`).getTime() / 1000,
          params.paymentAsset
        ],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[deployMarket] Error:', error);
    throw error;
  }
}

/**
 * Get markets by owner address
 * @param owner Owner address
 * @returns Array of market addresses
 */
export async function getMarketsByOwner(owner: string): Promise<string[]> {
  try {
    const aptos = getAptosClient();
    const payload = {
      function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::get_markets_by_owner` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [owner],
    };

    const response = await aptos.view({ payload });
    return response as string[];
  } catch (error) {
    console.error('[getMarketsByOwner] Error:', error);
    return [];
  }
}

/**
 * Get market details by market object address
 * @param marketObjectAddress Market object address
 * @returns Market information or null
 */
export async function getMarketDetails(marketObjectAddress: string): Promise<Market | null> {
  try {
    const resourceType = `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::Market` as `${string}::${string}::${string}`;
    const baseUrl = 'https://fullnode.mainnet.aptoslabs.com/v1/accounts';
    const url = `${baseUrl}/${marketObjectAddress}/resource/${resourceType}`;
    
    const response = await fetch(url);
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
    
    const result: Market = {
      creator: market.creator || '',
      price_feed_id: market.price_feed_id || '',
      outcomes: market.outcomes || [],
      num_outcomes: market.num_outcomes || 0,
      fee_percentage_bps: market.fee_percentage_bps || 0,
      rake_percentage_bps: market.rake_percentage_bps || 0,
      ork_budget: market.ork_budget || 0,
      total_bids: market.total_bids || 0,
      total_amount: market.total_amount || '0',
      total_net_amount: market.total_net_amount || '0',
      fee_accumulator: market.fee_accumulator || '0',
      rake_accumulator: market.rake_accumulator || '0',
      outcome_amounts: market.outcome_amounts || [],
      outcome_net_amounts: market.outcome_net_amounts || [],
      outcome_weights: market.outcome_weights || [],
      total_weight: market.total_weight || '0',
      bidding_start_time: market.bidding_start_time || 0,
      bidding_end_time: market.bidding_end_time || 0,
      status: market.status || 1,
      winning_outcome: market.winning_outcome || 255,
      is_void: market.is_void || false,
      is_resolved: market.is_resolved || false,
      final_price: market.final_price || '0',
      resolved_at: market.resolved_at || 0,
      payment_asset: market.payment_asset || 2, // Default to APT
      payout_pool: market.payout_pool || '0',
      losers_net: market.losers_net || '0',
    };

    return result;
  } catch (error) {
    console.error('[getMarketDetails] Error:', error, marketObjectAddress);
    return null;
  }
}

/**
 * Place a bet on a specific outcome
 * @param signAndSubmitTransaction Transaction signing function
 * @param marketAddress Market address
 * @param outcomeIndex Outcome index to bet on
 * @param amount Bet amount
 * @returns Transaction hash
 */
export async function placeBet(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  marketAddress: string, 
  outcomeIndex: number, 
  amount: number
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::place_bet`,
        typeArguments: [],
        functionArguments: [marketAddress, outcomeIndex, amount.toString()],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[placeBet] Error:', error);
    throw error;
  }
}

/**
 * Claim winnings from a resolved market
 * @param signAndSubmitTransaction Transaction signing function
 * @param marketAddress Market address
 * @returns Transaction hash
 */
export async function claimWinnings(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  marketAddress: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::claim_winnings`,
        typeArguments: [],
        functionArguments: [marketAddress], 
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[claimWinnings] Error:', error);
    throw error;
  }
}

/**
 * Resolve market using Pyth price data
 * @param signAndSubmitTransaction Transaction signing function
 * @param marketAddress Market address
 * @param pythPriceUpdate Pyth price update data
 * @returns Transaction hash
 */
export async function resolveMarket(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  marketAddress: string,
  pythPriceUpdate: number[][]
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::resolve_market`,
        typeArguments: [],
        functionArguments: [marketAddress, pythPriceUpdate],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[resolveMarket] Error:', error);
    throw error;
  }
}

/**
 * Withdraw fees from a market
 * @param signAndSubmitTransaction Transaction signing function
 * @param marketAddress Market address
 * @returns Transaction hash
 */
export async function withdrawFees(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  marketAddress: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::withdraw_fees`,
        typeArguments: [],
        functionArguments: [marketAddress], 
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[withdrawFees] Error:', error);
    throw error;
  }
}

/**
 * Get all markets
 * @returns Array of market addresses
 */
export async function getAllMarkets(): Promise<string[]> {
  try {
    const aptos = getAptosClient();
    const payload = {
      function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::get_all_markets` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [],
    };

    const response = await aptos.view({ payload });
    return response as string[];
  } catch (error) {
    console.error('[getAllMarkets] Error:', error);
    return [];
  }
}

/**
 * Get user position in a market
 * @param userAddress User address
 * @param marketAddress Market address
 * @returns User bet information or null
 */
export async function getUserPosition(userAddress: string, marketAddress: string): Promise<UserBet | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${CRYPTO_MARKET_MODULE_ADDRESS}::${CRYPTO_MARKET_MODULE_NAME}::get_user_position`,
        typeArguments: [],
        functionArguments: [userAddress, marketAddress],
      }
    });

    if (result) {
      return result as unknown as UserBet;
    }
    return null;
  } catch (error) {
    console.error('[getUserPosition] Error:', error);
    return null;
  }
}

/**
 * Get treasury pool information
 * @returns Treasury pool data or null
 */
export async function getTreasuryPool(): Promise<TreasuryPool | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${TREASURY_POOL_MODULE_ADDRESS}::${TREASURY_POOL_MODULE_NAME}::get_treasury_pool`,
        typeArguments: [],
        functionArguments: [],
      }
    });

    if (result) {
      return result as unknown as TreasuryPool;
    }
    return null;
  } catch (error) {
    console.error('[getTreasuryPool] Error:', error);
    return null;
  }
}

/**
 * Get ORK token information
 * @returns ORK token data or null
 */
export async function getOrkTokenInfo(): Promise<OrkTokenInfo | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${ORK_TOKEN_MODULE_ADDRESS}::${ORK_TOKEN_MODULE_NAME}::get_token_info`,
        typeArguments: [],
        functionArguments: [],
      }
    });

    if (result) {
      return result as unknown as OrkTokenInfo;
    }
    return null;
  } catch (error) {
    console.error('[getOrkTokenInfo] Error:', error);
    return null;
  }
}

/**
 * Get Circle USDC information
 * @returns Circle USDC data or null
 */
export async function getCircleUSDCInfo(): Promise<CircleUSDCInfo | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS}::${CIRCLE_USDC_INTEGRATION_MODULE_NAME}::get_usdc_info`,
        typeArguments: [],
        functionArguments: [],
      }
    });

    if (result) {
      return result as unknown as CircleUSDCInfo;
    }
    return null;
  } catch (error) {
    console.error('[getCircleUSDCInfo] Error:', error);
    return null;
  }
}

/**
 * Get Hyperion CLMM information
 * @returns Hyperion CLMM data or null
 */
export async function getHyperionCLMMInfo(): Promise<HyperionCLMMInfo | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::get_clmm_info`,
        typeArguments: [],
        functionArguments: [],
      }
    });

    if (result) {
      return result as unknown as HyperionCLMMInfo;
    }
    return null;
  } catch (error) {
    console.error('[getHyperionCLMMInfo] Error:', error);
    return null;
  }
}

/**
 * Get Nodit indexing information
 * @returns Nodit indexing data or null
 */
export async function getNoditIndexInfo(): Promise<NoditIndexInfo | null> {
  try {
    // This would typically come from an external API or configuration
    return {
      indexerUrl: 'https://api.nodit.io', // Placeholder, replace with actual URL
      webhookUrl: 'https://webhook.nodit.io', // Placeholder, replace with actual URL
      isActive: true,
      lastSync: Date.now()
    };
  } catch (error) {
    console.error('[getNoditIndexInfo] Error:', error);
    return null;
  }
} 