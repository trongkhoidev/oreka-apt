import { Aptos, AptosConfig, Network, Account, AccountAddress, EntryFunctionArgument, TransactionPayloadEntryFunction } from '@aptos-labs/ts-sdk';
import { FACTORY_MODULE_ADDRESS } from '@/config/contracts';
import { getCurrentNetwork } from '../config/network';

// This is the type for the payload of a transaction
// It is compatible with what signAndSubmitTransaction expects
export type EntryFunctionPayload = {
    function: string;
    typeArguments?: any[];
    functionArguments: any[];
};

export type InputTransactionData = {
    data: EntryFunctionPayload;
};

// Aligned with the MarketInfo struct in factory.move
export interface MarketInfo {
    market_address: string;
    owner: string;
    pair_name: string;
    strike_price: string; // u64 can be large, using string
    fee_percentage: string; // u64 can be large, using string
    bidding_start_time: string; // u64 can be large, using string
    bidding_end_time: string; // u64 can be large, using string
    maturity_time: string; // u64 can be large, using string
}

export interface DeployMarketParams {
  pairName: string;
  strikePrice: number | string;
  feePercentage: number | string;
  biddingStartTime: number | string;
  biddingEndTime: number | string;
  maturityTime: number | string;
}

function mapNetworkNameToEnum(name: string): Network {
  switch (name) {
    case 'localnet':
      return Network.LOCAL;
    case 'devnet':
      return Network.DEVNET;
    case 'testnet':
      return Network.TESTNET;
    case 'mainnet':
      return Network.MAINNET;
    default:
      return Network.DEVNET;
  }
}

// Helper to get Aptos client with dynamic network
export function getAptosClient() {
  const network = getCurrentNetwork();
  return new Aptos(new AptosConfig({
    network: mapNetworkNameToEnum(network.name)
  }));
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
      function: `${FACTORY_MODULE_ADDRESS}::factory::deploy_market`,
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

    // Use a reasonable default gas unit price for Aptos
    // In a real app, you'd fetch this from the network
    const baseGasUnitPrice = 100; // Default gas unit price in octas
    
    // Apply speed multiplier
    const adjustedGasUnitPrice = Math.floor(baseGasUnitPrice * GAS_SPEED_MULTIPLIERS[gasSpeed]);

    // Simulate transaction using REST API directly
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
      throw new Error('Transaction simulation failed');
    }

    const simulationData = await simulationResponse.json();
    
    if (!simulationData[0] || simulationData[0].success === false) {
      throw new Error('Transaction simulation failed');
    }

    const gasUsed = Number(simulationData[0].gas_used || 50000); // Default fallback
    const totalFeeOctas = gasUsed * adjustedGasUnitPrice;
    const totalFeeAPT = totalFeeOctas / 1e8; // Convert from octas to APT

    // Estimate USD value (using a rough APT price estimate)
    // In a real app, you'd fetch current APT price from an API
    const aptPriceUSD = 8.5; // Rough estimate, should be fetched from price feed
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
    
    // Return fallback estimates
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
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
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
        function: `${FACTORY_MODULE_ADDRESS}::factory::deploy_market`,
        typeArguments: [],
        functionArguments: [
          pairName,
          Number(strikePrice),
          Number(feePercentage),
          Number(biddingStartTime),
          Number(biddingEndTime),
          Number(maturityTime)
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
    return response.hash;
  } catch (error) {
    console.error('Error deploying market with gas settings:', error);
    throw new Error('Failed to deploy market');
  }
}

/**
 * Deploy a new market by calling factory::deploy_market on Aptos chain.
 */
export async function deployMarket(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
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
        function: `${FACTORY_MODULE_ADDRESS}::factory::deploy_market`,
        typeArguments: [],
        functionArguments: [
            pairName,
            Number(strikePrice),
            Number(feePercentage),
            Number(biddingStartTime),
            Number(biddingEndTime),
            Number(maturityTime)
        ],
      }
    };
    
    const response = await signAndSubmitTransaction(transaction);
    return response.hash;
  } catch (error) {
    console.error('Error deploying market:', error);
    throw new Error('Failed to deploy market');
  }
}

export async function getMarketsByOwner(owner: string): Promise<MarketInfo[]> {
  try {
    const aptos = getAptosClient();
    const result: any = await aptos.view({
      payload: {
        function: `${FACTORY_MODULE_ADDRESS}::factory::get_contracts_by_owner`,
        typeArguments: [],
        functionArguments: [owner],
      }
    });
    return result[0];
  } catch (error) {
    console.warn('Error fetching markets by owner:', error);
    return [];
  }
}

export async function getMarketDetails(marketObjectAddress: string): Promise<any> {
  const aptos = getAptosClient();
  const result = await aptos.view({
    payload: {
      function: `${FACTORY_MODULE_ADDRESS}::binary_option_market::get_market_details`,
      typeArguments: [],
      functionArguments: [marketObjectAddress],
    }
  });
  return result;
}

export async function bid(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
    marketAddress: string, 
    prediction: boolean, 
    amount: number
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${FACTORY_MODULE_ADDRESS}::binary_option_market::bid`,
            typeArguments: [],
            functionArguments: [marketAddress, prediction, amount.toString(), Math.floor(Date.now() / 1000).toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    return response.hash;
}

export async function claim(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${FACTORY_MODULE_ADDRESS}::binary_option_market::claim`,
            typeArguments: [],
            functionArguments: [marketAddress, Math.floor(Date.now() / 1000).toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    return response.hash;
}

export async function resolveMarket(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
    marketAddress: string, 
    finalPrice: number
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${FACTORY_MODULE_ADDRESS}::binary_option_market::resolve_market`,
            typeArguments: [],
            functionArguments: [marketAddress, finalPrice.toString(), Math.floor(Date.now() / 1000).toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    return response.hash;
}

export async function withdrawFee(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>,
    marketAddress: string
): Promise<string> {
    const transaction: InputTransactionData = {
        data: {
            function: `${FACTORY_MODULE_ADDRESS}::binary_option_market::withdraw_fee`,
            typeArguments: [],
            functionArguments: [marketAddress, Math.floor(Date.now() / 1000).toString()],
        }
    };
    const response = await signAndSubmitTransaction(transaction);
    return response.hash;
}

export async function getAllMarkets(): Promise<MarketInfo[]> {
  try {
    const aptos = getAptosClient();
    const result: any = await aptos.view({
      payload: {
        function: `${FACTORY_MODULE_ADDRESS}::factory::get_all_markets`,
        typeArguments: [],
        functionArguments: [],
      }
    });
    return result[0];
  } catch (error) {
    console.warn('Error fetching all markets:', error);
    return [];
  }
} 