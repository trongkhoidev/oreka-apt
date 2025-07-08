import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  Button,
  Spinner,
  useToast,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';
import { getMarketsByOwner, getAllMarkets, getMarketDetails, getUserBid } from '../services/aptosMarketService';
import { PriceService } from '../services/PriceService';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/router';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import ListAddressMarketCard from './listaddressowner/ListAddressMarketCard';
import ListAddressTabs from './listaddressowner/ListAddressTabs';

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
  market_address?: string;
}

const ListAddressOwner: React.FC = () => {
  const { connected, account } = useWallet();
  const walletAddress = account?.address?.toString() || '';
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'my' | 'active' | 'resolved' | 'holdings'>('all');
  const [network, setNetwork] = useState<unknown>(null);
  const [pairFilter, setPairFilter] = useState('');
  const [page, setPage] = useState(1);
  const contractsPerPage = 9;
  const [marketDetails, setMarketDetails] = useState<Record<string, unknown[] | null>>({});
  const [pairPrices, setPairPrices] = useState<Record<string, number>>({});
  
  const toast = useToast();
  const router = useRouter();

  type FilterType = 'all' | 'active' | 'resolved' | 'my' | 'holdings';
  const tabList: { label: string; value: FilterType }[] = [
    { label: 'All Markets', value: 'all' },
    { label: 'Quests', value: 'active' },
    { label: 'Results', value: 'resolved' },
    { label: 'My Markets', value: 'my' },
    { label: 'My Holdings', value: 'holdings' },
  ];
  const allowedPairs = useMemo(() => getAvailableTradingPairs().map(p => p.pair), []);
  const uniquePairs = useMemo(() => Array.from(new Set(markets.map(m => m.pair_name))).filter(pair => allowedPairs.includes(pair)), [markets, allowedPairs]);

  useEffect(() => {
    const petraNetwork = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'devnet';
      setNetwork(petraNetwork);
  }, []);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      console.log('[ListAddressOwner] Fetching all markets...');
      const marketInfos = await getAllMarkets();
      console.log('[ListAddressOwner] marketInfos:', JSON.stringify(marketInfos));
      if (!marketInfos || marketInfos.length === 0) {
        setMarkets([]);
        setMarketDetails({});
        //toast({ title: 'No contracts found', description: 'No markets deployed on this network. Please check if the contract is deployed to devnet.', status: 'warning', duration: 4000, isClosable: true });
        return;
      }
      // Fetch details for each market in parallel and merge
      const detailsArr = await Promise.all(
        marketInfos.map(async (info) => {
          let details: unknown[] | null = null;
          try {
            console.log('[ListAddressOwner] Fetching details for market:', info.market_address);
            details = await getMarketDetails(info.market_address);
            console.log('[ListAddressOwner] Details for', info.market_address, ':', JSON.stringify(details));
          } catch (e) {
            console.warn(`[ListAddressOwner] No details for market ${info.market_address}:`, e);
          }
          return { info, details };
        })
      );
      const marketsData: Market[] = detailsArr.map(({ info, details }) => ({
        creator: info.owner,
        pair_name: info.pair_name,
        strike_price: Number(info.strike_price),
        fee_percentage: Number(info.fee_percentage),
        total_bids: details && Array.isArray(details) ? Number(details[4]) : 0,
        long_bids: details && Array.isArray(details) ? Number(details[5]) : 0,
        short_bids: details && Array.isArray(details) ? Number(details[6]) : 0,
        total_amount: details && Array.isArray(details) ? Number(details[7]) : 0,
        long_amount: details && Array.isArray(details) ? Number(details[8]) : 0,
        short_amount: details && Array.isArray(details) ? Number(details[9]) : 0,
        result: details && Array.isArray(details) ? Number(details[10]) : 2,
        is_resolved: details && Array.isArray(details) ? Boolean(details[11]) : false,
        bidding_start_time: Number(info.bidding_start_time),
        bidding_end_time: Number(info.bidding_end_time),
        maturity_time: Number(info.maturity_time),
        final_price: details && Array.isArray(details) ? Number(details[15]) : 0,
        fee_withdrawn: false, // If needed, fetch from resource
        _key: info.market_address,
        market_address: info.market_address,
      }));
      setMarkets(marketsData);
      // ... keep the rest of the logic unchanged
      const detailsMap: Record<string, unknown[] | null> = {};
      detailsArr.forEach(({ info, details }) => {
        if (details) detailsMap[info.market_address] = details;
      });
      setMarketDetails(detailsMap);
    } catch (error) {
      console.error('[ListAddressOwner] Error fetching markets:', error);
      toast({ title: 'Error', description: 'Failed to fetch markets. Please check if the contract is deployed to the correct network (devnet/localnet).', status: 'error', duration: 4000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [filter, walletAddress, network]);

  // Helper: get phase for a market (Pending, Bidding, Maturity, Resolved, Expired)
  function getMarketPhase(market: Market) {
    const now = Math.floor(Date.now() / 1000);
    if (market.is_resolved) return 'Resolved';
    if (now < market.bidding_start_time) return 'Pending';
    if (now >= market.bidding_start_time && now < market.bidding_end_time) return 'Bidding';
    if (now >= market.bidding_end_time && now < market.maturity_time && !market.is_resolved) return 'Maturity';
    if (now >= market.maturity_time && !market.is_resolved) return 'Expired';
    return 'Unknown';
  }

  // My Holdings filter state
  const [myHoldingsLoading, setMyHoldingsLoading] = useState(false);
  const [myHoldingsMarkets, setMyHoldingsMarkets] = useState<Market[]>([]);

  // Refactor handleAddressClick: always use market.market_address for navigation
  const handleAddressClick = useCallback((market: Market, marketDetails: unknown) => {
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
    let filtered = markets.filter(m => allowedPairs.includes(m.pair_name));
    if (searchTerm) {
      filtered = filtered.filter(market => 
        market.pair_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (market._key && market._key.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filter === 'active') {
      filtered = filtered.filter(market => {
        const details = marketDetails[market._key || market.pair_name];
        if (!Array.isArray(details)) return false;
        const now = Math.floor(Date.now() / 1000);
        const is_resolved = Boolean(details[11]);
        const bidding_start_time = Number(details[13]);
        const bidding_end_time = Number(details[14]);
        if (is_resolved) return false;
        if (now < bidding_start_time) return true; // Pending
        if (now >= bidding_start_time && now < bidding_end_time) return true; // Bidding
        return false;
      });
    } else if (filter === 'resolved') {
      filtered = filtered.filter(market => {
        const details = marketDetails[market._key || market.pair_name];
        if (!Array.isArray(details)) return false;
        const now = Math.floor(Date.now() / 1000);
        const is_resolved = Boolean(details[11]);
        const bidding_end_time = Number(details[14]);
        const maturity_time = Number(details[15]);
        if (is_resolved) return false;
        if (now >= bidding_end_time && now < maturity_time) return true; // Maturity
        return false;
      });
    } else if (filter === 'my') {
      filtered = filtered.filter(market => market.creator.toLowerCase() === walletAddress.toLowerCase());
    } else if (filter === 'holdings') {
      setMyHoldingsLoading(true);
      Promise.all(filtered.map(async (market) => {
        try {
          const res = await getUserBid(walletAddress, market._key || '');
          if (res && (Number(res[0]) > 0 || res[1])) return market;
        } catch {}
        return null;
      })).then(results => {
        setMyHoldingsMarkets(results.filter((m): m is Market => Boolean(m)));
        setMyHoldingsLoading(false);
      });
      filtered = [];
    }
    setFilteredMarkets(filtered);
  }, [markets, searchTerm, filter, walletAddress, allowedPairs, marketDetails]);

  // For My Holdings, use myHoldingsMarkets if filter is 'holdings'
  const filtered = filter === 'holdings' ? myHoldingsMarkets.filter(m => !pairFilter || m.pair_name === pairFilter) : filteredMarkets.filter(market => !pairFilter || market.pair_name === pairFilter);

  // Polling fetch price for all unique trading pairs every 20s
  useEffect(() => {
    if (!markets.length) return;
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const fetchPrices = async () => {
      if (document.visibilityState !== 'visible') return;
      const pairs = Array.from(new Set(markets.map(m => m.pair_name)));
      const priceResults = await Promise.all(
        pairs.map(async (pair) => {
          try {
            const priceData = await PriceService.getInstance().fetchPrice(pair.replace('/', '-'));
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
        // Chỉ update nếu giá thực sự thay đổi
        setPairPrices(prev => {
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(priceMap);
          return prevStr !== nextStr ? priceMap : prev;
        });
      }
    };

    fetchPrices();
    interval = setInterval(fetchPrices, 20000);

    // Pause polling khi tab không active
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

  const totalPages = Math.ceil(filtered.length / contractsPerPage);
  const paginatedMarkets = filtered.slice((page - 1) * contractsPerPage, page * contractsPerPage);

  // Cleanup effect khi component unmount
  useEffect(() => {
    return () => {
      console.log('ListAddressOwner component unmounting');
    };
  }, []);

  // Thêm hàm getPhaseColor
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

  if (!connected) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="center">
          <Heading mb={2} color="white">Market Directory</Heading>
          <Text color="dark.300">Please connect your wallet to view your markets.</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Flex minH="100vh" bg="dark.900">
      <Flex direction="column" flex={1} minH="100vh" bg="dark.900">
        {/* Tabs và filter */}
        <ListAddressTabs
          tabList={tabList}
          filter={filter}
          setFilter={(v: string) => setFilter(v as FilterType)}
          pairFilter={pairFilter}
          setPairFilter={(v: string) => setPairFilter(v)}
          uniquePairs={uniquePairs}
        />
        {/* Main Grid + Pagination */}
        <Flex direction="column" flex={1} minH={0} px={{ base: 2, md: 10 }}>
          <Box flex={1} minH={0}>
            <Box bg="dark.800" borderRadius="lg" overflow="hidden" minH="400px">
              {loading || (filter === 'holdings' && myHoldingsLoading) ? (
                <Box p={8} textAlign="center">
                  <Spinner size="xl" />
                  <Text mt={4} color="white">Loading markets...</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
                  {paginatedMarkets.map((market) => (
                    <ListAddressMarketCard
                      key={market._key || market.pair_name}
                      market={market}
                      details={marketDetails[market._key || market.pair_name]}
                      onClick={() => handleAddressClick(market, marketDetails[market._key || market.pair_name])}
                      pairPrices={pairPrices}
                      getMarketPhase={getMarketPhase}
                      getPhaseColor={getPhaseColor}
                      getStableIndex={getStableIndex}
                    />
                  ))}
                </SimpleGrid>
              )}
              {!loading && filteredMarkets.length === 0 && (
                <Box p={8} textAlign="center">
                  <Text color="gray.500">No markets found. Try deploying a new market or check your filters.</Text>
                </Box>
              )}
            </Box>
          </Box>
          {/* Pagination */}
          <Box mt={8} mb={4} textAlign="center">
            <Button onClick={() => setPage(page - 1)} isDisabled={page <= 1} mr={2}>Previous</Button>
            <Text as="span" mx={2}>Page {page} / {totalPages}</Text>
            <Button onClick={() => setPage(page + 1)} isDisabled={page >= totalPages}>Next</Button>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ListAddressOwner; 