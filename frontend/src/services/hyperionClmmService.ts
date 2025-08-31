// Hyperion CLMM Integration Service
import { 
  HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS,
  HYPERION_CLMM_INTEGRATION_MODULE_NAME
} from '@/config/contracts';
import { getAptosClient } from '../config/network';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import type { HyperionCLMMInfo } from '@/types';

/**
 * Get Hyperion CLMM pool information
 * @returns Hyperion CLMM pool info or null
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
 * Get CLMM pool liquidity
 * @param poolAddress Pool address
 * @returns Pool liquidity as string
 */
export async function getHyperionCLMMLiquidity(poolAddress: string): Promise<string> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::get_pool_liquidity`,
        typeArguments: [],
        functionArguments: [poolAddress],
      }
    });

    if (result) {
      return String(result);
    }
    return '0';
  } catch (error) {
    console.error('[getHyperionCLMMLiquidity] Error:', error);
    return '0';
  }
}

/**
 * Get CLMM pool price
 * @param poolAddress Pool address
 * @returns Pool price as string
 */
export async function getHyperionCLMMPrice(poolAddress: string): Promise<string> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::get_pool_price`,
        typeArguments: [],
        functionArguments: [poolAddress],
      }
    });

    if (result) {
      return String(result);
    }
    return '0';
  } catch (error) {
    console.error('[getHyperionCLMMPrice] Error:', error);
    return '0';
  }
}

/**
 * Swap tokens using Hyperion CLMM
 * @param signAndSubmitTransaction Transaction signing function
 * @param poolAddress Pool address
 * @param tokenIn Token to swap in
 * @param tokenOut Token to swap out
 * @param amountIn Amount to swap in
 * @param minAmountOut Minimum amount out
 * @returns Transaction hash
 */
export async function swapHyperionCLMM(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  poolAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  minAmountOut: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::swap`,
        typeArguments: [],
        functionArguments: [poolAddress, tokenIn, tokenOut, amountIn, minAmountOut],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[swapHyperionCLMM] Error:', error);
    throw error;
  }
}

/**
 * Add liquidity to Hyperion CLMM pool
 * @param signAndSubmitTransaction Transaction signing function
 * @param poolAddress Pool address
 * @param token0Amount Token 0 amount
 * @param token1Amount Token 1 amount
 * @param minLiquidity Minimum liquidity
 * @returns Transaction hash
 */
export async function addHyperionCLMMLiquidity(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  poolAddress: string,
  token0Amount: string,
  token1Amount: string,
  minLiquidity: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::add_liquidity`,
        typeArguments: [],
        functionArguments: [poolAddress, token0Amount, token1Amount, minLiquidity],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[addHyperionCLMMLiquidity] Error:', error);
    throw error;
  }
}

/**
 * Remove liquidity from Hyperion CLMM pool
 * @param signAndSubmitTransaction Transaction signing function
 * @param poolAddress Pool address
 * @param liquidity Liquidity to remove
 * @param minToken0Amount Minimum token 0 amount
 * @param minToken1Amount Minimum token 1 amount
 * @returns Transaction hash
 */
export async function removeHyperionCLMMLiquidity(
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<unknown>,
  poolAddress: string,
  liquidity: string,
  minToken0Amount: string,
  minToken1Amount: string
): Promise<string> {
  try {
    const transaction: InputTransactionData = {
      data: {
        function: `${HYPERION_CLMM_INTEGRATION_MODULE_ADDRESS}::${HYPERION_CLMM_INTEGRATION_MODULE_NAME}::remove_liquidity`,
        typeArguments: [],
        functionArguments: [poolAddress, liquidity, minToken0Amount, minToken1Amount],
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    if (response && typeof response === 'object' && 'hash' in response) {
      return (response as { hash: string }).hash;
    }
    throw new Error('Transaction did not return a hash');
  } catch (error) {
    console.error('[removeHyperionCLMMLiquidity] Error:', error);
    throw error;
  }
}
