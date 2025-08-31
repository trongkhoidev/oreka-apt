import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Spinner,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';
import { PriceService } from '../services/PriceService';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/router';
import { getAvailableTradingPairs, getBinanceSymbolFromPairName } from '../config/tradingPairs';
import ListAddressMarketCard from './listaddressowner/ListAddressMarketCard';
import ListAddressTabs from './listaddressowner/ListAddressTabs';
import { hasUserHoldings } from '../services/userHoldingsService';
import { debounce } from 'lodash';

interface Market {
  creator: string;
  pair_name: string;
  strike_price: number;
  fee_percentage: number;
  total_bids: number;
  long_bids: number;
  short_bids: number;
  total_amount: number;
  long_amount: number;
  short_amount: number;
  result: number; // 0: LONG win, 1: SHORT win, 2: unresolved
  is_resolved: boolean;
  bidding_start_time: number;
  bidding_end_time: number;
  maturity_time: number;
  final_price: number;
  fee_withdrawn: boolean;
  _key?: string;
  market_address: string;
  created_at?: number; // Added for sorting
  price_feed_id?: number[] | string | undefined;
}

const ListAddressOwner: React.FC = () => {
  const { account } = useWallet();
  const walletAddress = account?.address?.toString() || '';
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [pairFilter, setPairFilter] = useState('');
  const [pairPrices, setPairPrices] = useState<Record<string, number>>({});
  
  const router = useRouter();

  type FilterType = 'all' | 'active' | 'expired' | 'close' | 'my' | 'holdings';
  const tabList: { label: string; value: FilterType }[] = [
    { label: 'All Markets', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Expired', value: 'expired' },
    { label: 'Close', value: 'close' },
    { label: 'My Markets', value: 'my' },
    { label: 'My Holdings', value: 'holdings' },
  ];
  const allowedPairs = useMemo(() => getAvailableTradingPairs().map(p => p.pair), []);
  // My Holdings filter state
  const [myHoldingsLoading, setMyHoldingsLoading] = useState(false);
  const [myHoldingsMarkets, setMyHoldingsMarkets] = useState<Market[]>([]);

  const uniquePairs = useMemo(() => {
    let source: Market[] = markets;
    if (filter === 'holdings') {
      source = myHoldingsMarkets;
    } else if (filter === 'my') {
      source = markets.filter(market => market.creator.toLowerCase() === walletAddress.toLowerCase());
    } else if (filter === 'active') {
      const now = Math.floor(Date.now() / 1000);
      source = markets.filter(market => now >= market.bidding_start_time && now < market.bidding_end_time && !market.is_resolved);
    } else if (filter === 'expired') {
      const now = Math.floor(Date.now() / 1000);
      source = markets.filter(market => now >= market.bidding_end_time);
    } else if (filter === 'close') {
      source = markets.filter(market => market.is_resolved);
    }
    return Array.from(new Set(source.map(m => m.pair_name)));
  }, [filter, markets, myHoldingsMarkets, walletAddress]);

  useEffect(() => {
    setLoading(true);
    const debouncedFetch = debounce(async () => {
      // Check localStorage cache
      const cacheKey = 'allMarketsCache';
      const cache = localStorage.getItem(cacheKey);
      if (cache) {
        try {
          const { data, ts } = JSON.parse(cache);
          if (Array.isArray(data) && Date.now() - ts < 5 * 60 * 1000) { // 5 phút
            setMarkets(data);
            setLoading(false);
            return;
          }
        } catch {}
      }
      try {
        // TODO: Update this to work with new poly-option system
        // const marketInfos: { market_address: string; owner: string; pair_name: string; strike_price: string; fee_percentage: string; total_bids: string; long_bids: string; short_bids: string; total_amount: string; long_amount: string; short_amount: string; result: string; is_resolved: boolean; bidding_start_time: string; bidding_end_time: string; maturity_time: string; final_price: string; fee_withdrawn: boolean }[] = await getAllMarkets();
        // if (!marketInfos || marketInfos.length === 0) {
        //   setMarkets([]);
        //   localStorage.setItem(cacheKey, JSON.stringify({ data: [], ts: Date.now() }));
        //   setLoading(false);
        //   return;
        // }
        // const detailsArr = await Promise.all(
        //   marketInfos.map(async (info) => {
        //     let details: unknown = null;
        //     try {
        //       details = await getMarketDetails(info.market_address);
        //     } catch (e) {
        //       console.warn('[ListAddressOwner] Failed to get market details for:', info.market_address, e);
        //     }
        //     return { info, details };
        //   })
        // );
        // const marketsData: Market[] = detailsArr.map(({ info, details }) => {
        //   const d = (details || info) as Market;
        //   const priceFeedIdStr = typeof d.price_feed_id === 'string' ? d.price_feed_id : Array.isArray(d.price_feed_id) ? d.price_feed_id.join('') : '';
        //   const { pair, symbol } = getPairAndSymbolFromPriceFeedId(priceFeedIdStr);
        //   return {
        //     creator: d.creator || '',
        //     pair_name: pair,
        //     symbol,
        //     strike_price: Number(d.strike_price) || 0,
        //     fee_percentage: Number(d.fee_percentage) || 0,
        //     total_bids: Number(d.total_bids) || 0,
        //     long_bids: Number(d.long_bids) || 0,
        //     short_bids: Number(d.short_bids) || 0,
        //     total_amount: Number(d.total_amount) || 0,
        //     long_amount: Number(d.long_amount) || 0,
        //     short_amount: Number(d.short_amount) || 0,
        //     result: Number(d.result) || 2,
        //     is_resolved: Boolean(d.is_resolved),
        //     bidding_start_time: Number(d.bidding_start_time) || 0,
        //     bidding_end_time: Number(d.bidding_end_time) || 0,
        //     maturity_time: Number(d.maturity_time) || 0,
        //     final_price: Number(d.final_price) || 0,
        //     fee_withdrawn: Boolean(d.fee_withdrawn),
        //     _key: d.market_address || '',
        //     market_address: d.market_address || '',
        //     created_at: Number(d.created_at) || 0,
        //     price_feed_id: d.price_feed_id,
        //   };
        // });
        // setMarkets(marketsData);
        // localStorage.setItem(cacheKey, JSON.stringify({ data: marketsData, ts: Date.now() }));
        
        // Temporary: set empty markets for now
        setMarkets([]);
        localStorage.setItem(cacheKey, JSON.stringify({ data: [], ts: Date.now() }));
      } catch (error) {
        console.error('[ListAddressOwner] Error fetching markets:', error);
        setMarkets([]);
        localStorage.setItem(cacheKey, JSON.stringify({ data: [], ts: Date.now() }));
      } finally {
        setLoading(false);
      }
    }, 400);
    debouncedFetch();
    return () => { debouncedFetch.cancel(); };
  }, [filter, walletAddress]);

  // Helper: get phase for a market (Pending, Bidding, Maturity, Resolved)
  function getMarketPhase(market: Market) {
    const now = Math.floor(Date.now() / 1000);
    if (market.is_resolved) return 'Maturity';
    if (now < market.bidding_start_time) return 'Pending';
    if (now >= market.bidding_start_time && now < market.bidding_end_time) return 'Bidding';
    if (now >= market.bidding_end_time && now < market.maturity_time && !market.is_resolved) return 'Maturity';
    if (now >= market.maturity_time && !market.is_resolved) return 'Maturity';
    return 'Unknown';
  }

  // Fetch My Holdings when needed (robust, always after markets are fetched)
  useEffect(() => {
    if (filter !== 'holdings') return;
    setMyHoldingsLoading(true);
    Promise.all(markets.map(async (market) => {
      try {
        console.log('[DEBUG] Checking holdings for market:', market.market_address, 'user:', walletAddress);
        const hasHoldings = await hasUserHoldings(walletAddress, market.market_address);
        console.log('[DEBUG] hasUserHoldings result:', { market: market.market_address, hasHoldings });
        if (hasHoldings) return market;
      } catch (e) {
        console.log('[DEBUG] Error checking holdings for market:', market.market_address, e);
      }
      return null;
    })).then(results => {
      const filtered = results.filter(Boolean) as Market[];
      console.log('[DEBUG] Final myHoldingsMarkets:', filtered);
      setMyHoldingsMarkets(filtered);
      setMyHoldingsLoading(false);
    });
  }, [markets, walletAddress, filter]);

  // Refactor handleAddressClick: always use market.market_address for navigation
  const handleAddressClick = useCallback((market: Market) => {
    try {
      // Always use market.market_address as contract address, fallback to empty string
      const contractAddress = market.market_address || market._key || '';
      console.log('[handleAddressClick] Navigating to contractAddress:', contractAddress);
      if (!contractAddress) throw new Error('No valid contract address');
      // Clear any existing stored contract data
      localStorage.removeItem('contractData');
      localStorage.removeItem('selectedContractAddress');
      // Store for fallback/UX
      localStorage.setItem('selectedContractAddress', contractAddress);
      // Navigate to customer view
      router.push(`/customer/${contractAddress}`);
    } catch (error) {
      console.error('Error preparing contract data:', error);
    }
  }, [router]);

  // Filtering logic for tabs
  useEffect(() => {
    console.log('markets:', markets);
    let filtered = markets;
    if (searchTerm) {
      filtered = filtered.filter(market => 
        market.pair_name && market.pair_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (market._key && market._key.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (filter === 'active') {
      filtered = filtered.filter(market => {
        return now >= market.bidding_start_time && now < market.bidding_end_time && !market.is_resolved;
      });
    } else if (filter === 'expired') {
      filtered = filtered.filter(market => {
        return now >= market.bidding_end_time;
      });
    } else if (filter === 'close') {
      filtered = filtered.filter(market => {
        return market.is_resolved;
      });
    } else if (filter === 'my') {
      filtered = filtered.filter(market => market.creator.toLowerCase() === walletAddress.toLowerCase());
    } else if(filter === 'holdings'){
      filtered = filtered.filter(market => myHoldingsMarkets.includes(market));
    }
    setFilteredMarkets(filtered);
  }, [markets, searchTerm, filter, walletAddress, allowedPairs, myHoldingsMarkets]);

  // Main filtered list
  const filtered = filter === 'holdings'
    ? myHoldingsMarkets.filter(m => !pairFilter || m.pair_name === pairFilter)
    : filteredMarkets.filter(market => !pairFilter || market.pair_name === pairFilter);

  const sorted = [...filtered].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  // Polling fetch price for all unique trading pairs every 20s
  useEffect(() => {
    if (!markets.length) return;
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const fetchPrices = async () => {
      if (document.visibilityState !== 'visible') return;
      
      const pairs = Array.from(new Set(markets.map(m => m.pair_name)));
      const priceResults = await Promise.all(
        pairs.map(async (rawPair) => {
          const pair = (rawPair || '').trim().toUpperCase();
          const symbol = getBinanceSymbolFromPairName(pair);
          if (!symbol) {
            
            return { pair, price: undefined };
          }
          try {
            const priceData = await PriceService.getInstance().fetchPrice(symbol);
            
            return { pair, price: priceData.price };
          } catch {
            
            return { pair, price: undefined };
          }
        })
      );
      if (isMounted) {
        const priceMap: Record<string, number> = {};
        priceResults.forEach(({ pair, price }) => {
          if (price !== undefined) priceMap[pair] = price;
        });
        setPairPrices(prev => {
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(priceMap);
          return prevStr !== nextStr ? priceMap : prev;
        });
      }
    };

    fetchPrices();
    interval = setInterval(fetchPrices, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchPrices();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [markets]);

  useEffect(() => {
    return () => {
      console.log('ListAddressOwner component unmounting');
    };
  }, []);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Pending': return '#66FF00';
      case 'Bidding': return '#4F8CFF'; 
      case 'Maturity': return '#999999'; 
      default: return '#A0A4AE';
    }
  };

  // Helper: Get stable index for image based on unique contract key
  function getStableIndex(key: string, max: number) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % 1000000007;
    }
    return (Math.abs(hash) % max) + 1;
  }





  return (
    <Flex minH="100vh" bg="dark.900">
      <Flex direction="column" flex={1} minH="100vh" bg="dark.900" maxW="100%" mx="auto" w="full">
        {/* Tabs and filter */}
        <ListAddressTabs
          tabList={tabList}
          filter={filter}
          setFilter={(v: string) => setFilter(v as FilterType)}
          pairFilter={pairFilter}
          setPairFilter={(v: string) => setPairFilter(v)}
          uniquePairs={uniquePairs}
        />
        {/* Main Grid */}
        <Flex direction="column" flex={1} minH={0} px={{ base: 0, md: 1, lg: 1 }}>
          <Box flex={1} minH={0}>
            <Box bg="dark.800" borderRadius="lg" overflow="hidden" minH="400px" p={2}>
              {loading || (filter === 'holdings' && myHoldingsLoading) ? (
                <Box p={8} textAlign="center">
                  <Spinner size="xl" color="brand.500" />
                  <Text mt={4} color="white" fontSize="lg">Loading markets...</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 5 }} spacing={2}>
                  {sorted.map((market) => {
                    return (
                      <ListAddressMarketCard
                        key={market._key || market.pair_name}
                        market={market as Market}
                        onClick={() => handleAddressClick(market)}
                        pairPrices={pairPrices}
                        getMarketPhase={getMarketPhase}
                        getPhaseColor={getPhaseColor}
                        getStableIndex={getStableIndex}
                      />
                    );
                  })}
                </SimpleGrid>
              )}
              {!loading && (
                (filter === 'holdings' && myHoldingsMarkets.length === 0) ||
                (filter !== 'holdings' && filteredMarkets.length === 0)
              ) && (
                <Box p={8} textAlign="center">
                  <Text color="gray.500" fontSize="lg">No markets found. Try deploying a new market or check your filters.</Text>
                </Box>
              )}
            </Box>
          </Box>
          {/* Market Count Info */}
          <Box mt={8} mb={6} textAlign="center">
            <Text color="gray.400" fontSize="md" fontWeight="medium">
              Showing {sorted.length} markets
            </Text>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ListAddressOwner; 