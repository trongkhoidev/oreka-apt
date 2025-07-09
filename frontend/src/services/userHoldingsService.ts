import { getUserBid } from './aptosMarketService';

/**
 * Check if a user has any holdings (long or short) in a given market.
 * Returns true if user has long > 0 or short > 0, false otherwise.
 * This uses the same logic as the direct API test.
 */
export async function hasUserHoldings(userAddress: string, marketAddress: string): Promise<boolean> {
  try {
    const [long, short] = await getUserBid(userAddress, marketAddress);
    return Number(long) > 0 || Number(short) > 0;
  } catch (e) {
    return false;
  }
} 