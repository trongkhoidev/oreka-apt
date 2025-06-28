import { useState, useEffect, useCallback } from 'react';
import { getMarketDetails } from '@/services/aptosMarketService';

export function useMarket(marketObjectAddress: string) {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarketDetails(marketObjectAddress);
      setMarket(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market');
    } finally {
      setLoading(false);
    }
  }, [marketObjectAddress]);

  useEffect(() => {
    if (marketObjectAddress) {
      fetchMarket();
    }
  }, [marketObjectAddress, fetchMarket]);

  return { market, loading, error, refresh: fetchMarket };
} 