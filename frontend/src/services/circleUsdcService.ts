// Circle USDC Integration Service
import { 
  CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS,
  CIRCLE_USDC_INTEGRATION_MODULE_NAME
} from '@/config/contracts';
import { getAptosClient } from '../config/network';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import type { CircleUSDCInfo } from '@/types';

/**
 * Get Circle USDC token information
 * @returns Circle USDC token info or null
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
 * Get Circle USDC balance for a user
 * @param userAddress User wallet address
 * @returns USDC balance as string
 */
export async function getCircleUSDCBalance(userAddress: string): Promise<string> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS}::${CIRCLE_USDC_INTEGRATION_MODULE_NAME}::get_balance`,
        typeArguments: [],
        functionArguments: [userAddress],
      }
    });

    if (result) {
      return String(result);
    }
    return '0';
  } catch (error) {
    console.error('[getCircleUSDCBalance] Error:', error);
    return '0';
  }
}

/**
 * Approve USDC spending for a market
 * @param signAndSubmitTransaction Transaction signing function
 * @param spender Market address to approve
 * @param amount Amount to approve
 * @returns Transaction hash
 */
export async function approveCircleUSDC(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  spender: string,
  amount: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS}::${CIRCLE_USDC_INTEGRATION_MODULE_NAME}::approve`,
        typeArguments: [],
        functionArguments: [spender, amount],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[approveCircleUSDC] Error:', error);
    throw error;
  }
}

/**
 * Transfer USDC to another address
 * @param signAndSubmitTransaction Transaction signing function
 * @param recipient Recipient address
 * @param amount Amount to transfer
 * @returns Transaction hash
 */
export async function transferCircleUSDC(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  recipient: string,
  amount: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS}::${CIRCLE_USDC_INTEGRATION_MODULE_NAME}::transfer`,
        typeArguments: [],
        functionArguments: [recipient, amount],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[transferCircleUSDC] Error:', error);
    throw error;
  }
}

/**
 * Get USDC allowance for a spender
 * @param owner Owner address
 * @param spender Spender address
 * @returns Allowance amount as string
 */
export async function getCircleUSDCAllowance(owner: string, spender: string): Promise<string> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${CIRCLE_USDC_INTEGRATION_MODULE_ADDRESS}::${CIRCLE_USDC_INTEGRATION_MODULE_NAME}::allowance`,
        typeArguments: [],
        functionArguments: [owner, spender],
      }
    });

    if (result) {
      return String(result);
    }
    return '0';
  } catch (error) {
    console.error('[getCircleUSDCAllowance] Error:', error);
    return '0';
  }
}
