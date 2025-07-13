import { useState, useEffect, useCallback } from 'react';
import { getMarketDetails } from '@/services/aptosMarketService';
import EventListenerService from '../services/EventListenerService';

export function useMarket(marketObjectAddress: string) {
  const [market, setMarket] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarketDetails(marketObjectAddress);
      setMarket(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market');
    } finally {
      setLoading(false);
    }
  }, [marketObjectAddress]);

  useEffect(() => {
    if (!marketObjectAddress) return;
    fetchMarket(); // initial fetch
    const unsubscribe = EventListenerService.getInstance().subscribe(marketObjectAddress, () => {
      fetchMarket();
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [marketObjectAddress, fetchMarket]);

  return { market, loading, error, refresh: fetchMarket };
} 