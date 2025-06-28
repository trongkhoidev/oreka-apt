import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  useToast,
  useColorModeValue,
  Link,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  Tab,
  Select,
  SimpleGrid,
  Progress,
  Flex,
  Icon
} from '@chakra-ui/react';
import { SearchIcon, CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { FaHome, FaPlus, FaList, FaChartBar, FaUser, FaWallet, FaRegClock } from 'react-icons/fa';
import { getMarketsByOwner, getAllMarkets, getMarketDetails } from '../services/aptosMarketService';
import { PriceService } from '../services/PriceService';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/router';
import ConnectWallet from './ConnectWallet';
import { getAvailableTradingPairs } from '../config/tradingPairs';

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
  is_canceled: boolean;
  bidding_start_time: number;
  bidding_end_time: number;
  maturity_time: number;
  created_at: number;
  final_price: number;
  fee_withdrawn: boolean;
  _key?: string;
}

const ListAddressOwner: React.FC = () => {
  const { connected, account } = useWallet();
  const walletAddress = account?.address?.toString() || '';
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'my' | 'active' | 'resolved'>('all');
  const [network, setNetwork] = useState<any>(null);
  const [pairFilter, setPairFilter] = useState('');
  const [page, setPage] = useState(1);
  const contractsPerPage = 9;
  const [marketDetails, setMarketDetails] = useState<Record<string, any>>({});
  
  const toast = useToast();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const router = useRouter();

  const tabList = [
    { label: 'All Markets', value: 'all' },
    { label: 'Quests', value: 'active' },
    { label: 'Results', value: 'resolved' },
    { label: 'My Markets', value: 'my' },
    { label: 'My Holdings', value: 'holdings' },
  ];
  const allowedPairs = useMemo(() => getAvailableTradingPairs().map(p => p.pair), []);
  const uniquePairs = useMemo(() => Array.from(new Set(markets.map(m => m.pair_name))).filter(pair => allowedPairs.includes(pair)), [markets, allowedPairs]);

  useEffect(() => {
    // Lấy network từ biến môi trường hoặc fallback về 'localnet'
    const petraNetwork = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'localnet';
      setNetwork(petraNetwork);
  }, []);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      let marketInfos: any[] = [];
      if (filter === 'my' && walletAddress) {
        marketInfos = await getMarketsByOwner(walletAddress);
      } else if (filter === 'all') {
        marketInfos = await getAllMarkets();
      } else {
        marketInfos = [];
      }
      // Map sơ bộ
      const marketsData: Market[] = marketInfos.map((info, idx) => ({
        creator: info.owner,
        pair_name: info.pair_name,
        strike_price: Number(info.strike_price),
        fee_percentage: Number(info.fee_percentage),
        total_bids: 0,
        long_bids: 0,
        short_bids: 0,
        total_amount: 0,
        long_amount: 0,
        short_amount: 0,
        result: 2,
        is_resolved: false,
        is_canceled: false,
        bidding_start_time: Number(info.bidding_start_time),
        bidding_end_time: Number(info.bidding_end_time),
        maturity_time: Number(info.maturity_time),
        created_at: Number(info.created_at),
        final_price: 0,
        fee_withdrawn: false,
        _key: info.market_address || String(idx)
      }));
      setMarkets(marketsData);
      // Fetch chi tiết từng market song song
      const detailsArr = await Promise.all(marketsData.map(async m => {
        try {
          const details = await getMarketDetails(m._key || m.pair_name);
          return { address: m._key || m.pair_name, details };
        } catch {
          return { address: m._key || m.pair_name, details: null };
        }
      }));
      const detailsMap: Record<string, any> = {};
      detailsArr.forEach(({ address, details }) => {
        if (details) detailsMap[address] = details;
      });
      setMarketDetails(detailsMap);
    } catch (error) {
      console.error('Error fetching markets:', error);
      toast({ title: 'Error', description: 'Failed to fetch markets', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [filter, walletAddress, network]);

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
      filtered = filtered.filter(market => !market.is_resolved);
    } else if (filter === 'resolved') {
      filtered = filtered.filter(market => market.is_resolved);
    }
    setFilteredMarkets(filtered);
  }, [markets, searchTerm, filter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100000000).toFixed(2)}`;
  };

  const formatAmount = (amount: number) => {
    return `${(amount / 100000000).toFixed(4)} APT`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadge = (market: Market) => {
    const now = Math.floor(Date.now() / 1000);
    
    if (market.is_resolved) {
      return <Badge colorScheme="green">Resolved</Badge>;
    } else if (now < market.bidding_start_time) {
      return <Badge colorScheme="yellow">Pending</Badge>;
    } else if (now >= market.bidding_start_time && now < market.bidding_end_time) {
      return <Badge colorScheme="blue">Bidding</Badge>;
    } else if (now >= market.bidding_end_time && now < market.maturity_time) {
      return <Badge colorScheme="orange">Maturity</Badge>;
    } else {
      return <Badge colorScheme="red">Expired</Badge>;
    }
  };

  const getResultText = (market: Market) => {
    if (!market.is_resolved) return 'N/A';
    return market.result === 0 ? 'LONG' : 'SHORT';
  };

  // Helper: Tính phase từ thời gian
  const getPhase = (market: any) => {
    const now = Math.floor(Date.now() / 1000);
    if (market.is_resolved) return 'Resolved';
    if (now < market.bidding_start_time) return 'Pending';
    if (now < market.bidding_end_time) return 'Bidding';
    if (now < market.maturity_time) return 'Maturity';
    return 'Expired';
  };

  // Helper: Tính phần trăm LONG/SHORT (giả lập nếu chưa có dữ liệu)
  const getLongShortPercent = (market: any) => {
    const long = Number(market.long_amount || 0);
    const short = Number(market.short_amount || 0);
    const total = long + short;
    if (total === 0) return { long: 50, short: 50 };
    return { long: (long / total) * 100, short: (short / total) * 100 };
  };

  // Helper: Countdown
  const getCountdown = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp * 1000 - now;
    if (diff <= 0) return 'Ended';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const filtered = filteredMarkets.filter(market => !pairFilter || market.pair_name === pairFilter);
  const totalPages = Math.ceil(filtered.length / contractsPerPage);
  const paginatedMarkets = filtered.slice((page - 1) * contractsPerPage, page * contractsPerPage);

  // Cleanup effect khi component unmount
  useEffect(() => {
    return () => {
      console.log('ListAddressOwner component unmounting');
    };
  }, []);

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
      {/* Sidebar Navigation */}
      {/* Main Content */}
      <Flex direction="column" flex={1} minH="100vh" bg="dark.900">
        {/* Tabs and Filters */}
        <Box px={{ base: 4, md: 10 }} pt={2} pb={4} w="full">
          <Tabs variant="soft-rounded" colorScheme="brand">
            <TabList display="flex" alignItems="center">
              {tabList.map(tab => (
                <Tab key={tab.value} onClick={() => setFilter(tab.value as any)} _selected={{ bg: 'brand.500', color: 'white' }}>{tab.label}</Tab>
              ))}
              <Box ml={2} minW="150px">
                <Select
                  placeholder="Pair"
                  value={pairFilter}
                  onChange={e => { setPairFilter(e.target.value); setFilter('all'); }}
                  variant="unstyled"
                  borderRadius="xl"
                  bg="transparent"
                  color="white"
                  fontWeight="bold"
                  fontSize="md"
                  pl={3}
                  py={2}
                  _focus={{ boxShadow: 'none', bg: 'brand.500', color: 'white' }}
                  _hover={{ bg: 'brand.600', color: 'white' }}
                  style={{ minWidth: 120, border: 'none', outline: 'none', marginLeft: 0 }}
                >
                  {uniquePairs.map(pair => (
                    <option key={pair} value={pair} style={{ color: '#222', background: '#fff' }}>{pair}</option>
                  ))}
                </Select>
              </Box>
            </TabList>
          </Tabs>
        </Box>
        {/* Main Grid + Pagination (flex-grow) */}
        <Flex direction="column" flex={1} minH={0} px={{ base: 2, md: 10 }}>
          <Box flex={1} minH={0}>
            <Box bg="dark.800" borderRadius="lg" overflow="hidden" minH="400px">
          {loading ? (
            <Box p={8} textAlign="center">
              <Spinner size="xl" />
                  <Text mt={4} color="white">Loading markets...</Text>
            </Box>
          ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={0.5} >
                  {paginatedMarkets.map((market, idx) => {
                    const details = marketDetails[market._key || market.pair_name];
                    const long = details ? Number(details[8]) : 0;
                    const short = details ? Number(details[9]) : 0;
                    const total = details ? Number(details[7]) : 0;
                    const percent = (long + short) === 0 ? { long: 50, short: 50 } : { long: (long / (long + short)) * 100, short: (short / (long + short)) * 100 };
                    const phase = getPhase(market);
                    const phaseColor = phase === 'Resolved' ? 'green' : phase === 'Bidding' ? 'blue' : phase === 'Maturity' ? 'orange' : phase === 'Expired' ? 'red' : 'yellow';
                    const baseToken = market.pair_name.split('/')[0].toLowerCase();
                    const strike = (market.strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const maturity = new Date(market.maturity_time * 1000).toLocaleString();
                    const title = `${market.pair_name} will reach $${strike} by ${maturity}?`;
                    // Tính thời gian bidding
                    const now = Math.floor(Date.now() / 1000);
                    let biddingStatus = null;
                    let biddingColor = '#4F8CFF';
                    let biddingIcon = <Icon as={FaRegClock} color="#4F8CFF" mr={1} />;
                    if (now < market.bidding_start_time) {
                      biddingStatus = 'Pending';
                      biddingColor = '#A770EF';
                    } else if (now >= market.bidding_start_time && now < market.bidding_end_time) {
                      const remain = market.bidding_end_time - now;
                      const h = Math.floor(remain / 3600);
                      const m = Math.floor((remain % 3600) / 60);
                      const s = Math.floor(remain % 60);
                      biddingStatus = `${h}h ${m}m ${s}s`;
                    } else {
                      biddingStatus = 'End';
                      biddingColor = '#B0B3B8';
                    }
                    // Chọn ảnh động theo index: btc1.png...btc10.png
                    const imgIndex = (idx % 10) + 1;
                    const imgSrc = `/images/${baseToken}/${baseToken}${imgIndex}.png`;
                    return (
                      <Box
                        key={market._key || market.pair_name}
                        px={5} py={4}
                        borderRadius="2xl"
                        boxShadow="lg"
                        bg="#181A20"
                        border="2px solid transparent"
                        style={{
                          background: 'linear-gradient(#181A20, #181A20) padding-box, linear-gradient(90deg, #4F8CFF, #A770EF, #4F8CFF) border-box',
                        }}
                        transition="all 0.18s"
                        _hover={{
                          boxShadow: 'xl',
                          borderColor: '#4F8CFF',
                          transform: 'scale(1.025)',
                          cursor: 'pointer',
                          bg: '#181A20',
                        }}
                        onClick={() => router.push(`/customer/${market._key || market.pair_name}`)}
                        position="relative"
                        minH="380px"
                        minW="320px"
                        maxW="400px"
                        w="100%"
                        display="flex"
                        flexDirection="column"
                        justifyContent="stretch"
                        alignItems="stretch"
                      >
                        {/* Image + Phase badge */}
                        <Box position="relative" borderTopRadius="2xl" overflow="hidden" h="44%" minH="120px" bg="#23262f">
                          <img
                            src={imgSrc}
                            alt={market.pair_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.src = `/images/${baseToken}-logo.png`; }}
                          />
                          <Badge position="absolute" top={2} left={2} colorScheme={phaseColor} fontSize="xs" px={3} py={1} borderRadius="md" zIndex={2} bg="#23262f" color="white" fontWeight="bold">{phase}</Badge>
                        </Box>
                        {/* Info section */}
                        <Box px={3} pt={2} pb={2} flex={1} display="flex" flexDirection="column" justifyContent="space-between">
                          <Text fontWeight="bold" fontSize="md" color="white" mb={2} noOfLines={2}>{title}</Text>
                          {/* Bar long/short */}
                          <HStack mb={1} spacing={2} align="center" px={1}>
                            <Text color="#5FDCC6" fontWeight="bold" minW="36px" fontSize="sm" textAlign="right">{percent.long.toFixed(0)}%</Text>
                            <Box flex={1} h="14px" borderRadius="full" bg="#23262f" position="relative" overflow="hidden">
                              {/* Gradient bar: xanh (#00ea00) -> vàng (#f8ff8b) tại điểm long% -> hồng (#ff3a7a) */}
                              <Box position="absolute" left={0} top={0} h="100%" w="100%" borderRadius="full" zIndex={2}
                                style={{
                                  background: `linear-gradient(90deg, #00ea00 0%, #f8ff8b ${percent.long}%, #ff3a7a ${percent.long}%, #ff3a7a 100%)`,
                                  transition: 'background 0.4s',
                                }}
                              />
                            </Box>
                            <Text color="#ED5FA7" fontWeight="bold" minW="36px" fontSize="sm" textAlign="left">{percent.short.toFixed(0)}%</Text>
                          </HStack>
                          {/* Asset price + Total deposited + Bidding time */}
                          <Flex align="center" justify="space-between" mt={2} mb={1}>
                            <HStack spacing={2} align="center">
                              <Box boxSize="18px" borderRadius="full" overflow="hidden" bg="#23262f">
                                <img src={`/images/${baseToken}-logo.png`} alt={baseToken} style={{ width: '100%', height: '100%' }} />
                              </Box>
                              <Text color="#4F8CFF" fontWeight="bold" fontSize="sm">${'--'}</Text>
                        </HStack>
                            <HStack spacing={2} align="center">
                              <Text color="white" fontWeight="bold" fontSize="sm">{(total / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 })} APT</Text>
                              <Icon as={FaRegClock} color={biddingColor} boxSize={4} />
                              <Text color={biddingColor} fontWeight="bold" fontSize="sm">{biddingStatus}</Text>
                        </HStack>
                          </Flex>
                        </Box>
            </Box>
                    );
                  })}
                </SimpleGrid>
          )}
          {!loading && filteredMarkets.length === 0 && (
            <Box p={8} textAlign="center">
                  <Text color="gray.500">No markets found. Try deploying a new market or check your filters.</Text>
            </Box>
          )}
        </Box>
          </Box>
          {/* Pagination luôn ở dưới cùng */}
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