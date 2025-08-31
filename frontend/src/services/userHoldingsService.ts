import { getUserPosition } from './aptosMarketService';

/**
 * Check if a user has any holdings (long or short) in a given market.
 * Returns true if user has long > 0 or short > 0, false otherwise.
 * This uses the same logic as the direct API test.
 */
export async function hasUserHoldings(userAddress: string, marketAddress: string): Promise<boolean> {
  try {
    const userPosition = await getUserPosition(userAddress, marketAddress);
    if (userPosition) {
      return Number(userPosition.amount_net) > 0;
    }
    return false;
  } catch {
    return false;
  }
} 