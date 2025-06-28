import { Aptos, AptosConfig, Network, Account, AccountAddress, EntryFunctionArgument } from '@aptos-labs/ts-sdk';
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
    
    // Log kiểu dữ liệu và giá trị các tham số
    console.log('Types:',
      typeof pairName,
      typeof strikePrice,
      typeof feePercentage,
      typeof biddingStartTime,
      typeof biddingEndTime,
      typeof maturityTime
    );
    console.log('Values:',
      pairName,
      strikePrice,
      feePercentage,
      biddingStartTime,
      biddingEndTime,
      maturityTime
    );
    
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