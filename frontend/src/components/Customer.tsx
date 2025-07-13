import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, HStack, Text, Button, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { bid, claim, resolveMarket, getMarketDetails, getUserBid, withdrawFee } from '../services/aptosMarketService';
import MarketCharts from './charts/MarketCharts';
import { PriceService } from '../services/PriceService';
import { getAvailableTradingPairs, getTradingPairInfo } from '../config/tradingPairs';
import MarketInfo from './customer/MarketInfo';
import MarketTimeline from './customer/MarketTimeline';
import MarketBetPanel from './customer/MarketBetPanel';
import MarketRules from './customer/MarketRules';
import type { MarketInfo as MarketInfoType } from '../services/aptosMarketService';
import ChartDataPrefetchService from '../services/ChartDataPrefetchService';
import { getMarketBidEvents, buildPositionTimeline } from '../services/positionHistoryService';
import { getStandardPairName, getPriceFeedIdFromPairName } from '../config/pairMapping';
import EventListenerService from '../services/EventListenerService';

enum Side { Long, Short }
enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity'];

// Helper: fetch final price from Hermes API (dùng priceFeedId từ mapping)
async function fetchFinalPriceFromHermes(pairName: string): Promise<number> {
  // Lấy priceFeedId chuẩn từ mapping
  const priceFeedId = getPriceFeedIdFromPairName(pairName);
  if (!priceFeedId) throw new Error('No priceFeedId found for pair');
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x${priceFeedId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch price from Hermes');
  const data = await res.json();
  const parsedArr = data.parsed || [];
  // So sánh id trả về (không có 0x) với id gốc (bỏ 0x)
  const priceObj = parsedArr.find((p: { id: string; price: { price: number; expo: number } }) => (p.id || '').toLowerCase() === priceFeedId.toLowerCase());
  if (!priceObj || !priceObj.price || typeof priceObj.price.price === 'undefined' || typeof priceObj.price.expo === 'undefined') {
    throw new Error('No price found');
  }
  const price = Number(priceObj.price.price);
  const expo = Number(priceObj.price.expo);
  const realPrice = price * Math.pow(10, expo);
  return Math.round(realPrice * 1e8); // fixed 8 số lẻ cho contract
}

// Helper: format claimable amount with 2, 4, or 6 decimals
const formatClaimAmount = (amount: number) => {
  if (!isFinite(amount)) return '--';
  // Chuyển về số thực APT
  const apt = amount / 1e8;
  // Nếu là số nguyên hoặc chỉ có 2 số lẻ, hiển thị 2
  if (Number.isInteger(apt * 100)) return apt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Nếu có 4 số lẻ, hiển thị 4
  if (Number(apt * 10000) === 0) return apt.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  // Nếu có nhiều số lẻ hơn, hiển thị 6
  return apt.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};

const Customer: React.FC<CustomerProps> = ({ contractAddress }) => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const toast = useToast();

  // State
  const [market, setMarket] = useState<MarketInfoType | null>(null);
  const [phase, setPhase] = useState<Phase>(Phase.Pending);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetLogo, setAssetLogo] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [userPositions, setUserPositions] = useState<{ long: number; short: number }>({ long: 0, short: 0 });
  const [positionHistory, setPositionHistory] = useState<{ time: number; long: number; short: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [refreshChart, setRefreshChart] = useState(0);

  // Thêm state currentTime để realtime chart
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user positions - remove dependency on fetchMarketData
  const fetchUserPositions = useCallback(async () => {
    if (connected && account?.address && contractAddress) {
      try {
        const [long, short, hasBid] = await getUserBid(account.address.toString(), contractAddress);
        console.log('getUserBid:', { long, short, hasBid, account: account.address.toString(), contractAddress });
        setUserPositions({
          long: Number(long),
          short: Number(short)
        });
        console.log('userPositions set:', { long: Number(long), short: Number(short) });
      } catch (e) {
        console.error('getUserBid error:', e);
        setUserPositions({ long: 0, short: 0 });
      }
    } else {
      setUserPositions({ long: 0, short: 0 });
    }
  }, [connected, account, contractAddress]);

  // Fetch market data and update state - remove fetchUserPositions dependency
  const fetchMarketData = useCallback(async () => {
    if (!contractAddress) return;
    setIsLoading(true);
    try {
      const details = await getMarketDetails(contractAddress);
      if (!details) {
        setIsLoading(false);
        toast({ title: 'Market not found', description: 'This market does not exist or has been removed.', status: 'error' });
        setMarket(null);
        return;
      }
      setMarket(details);
      // Phase logic
      const now = Math.floor(Date.now() / 1000);
      const biddingStart = Number(details.bidding_start_time);
      const biddingEnd = Number(details.bidding_end_time);
      if (details.is_resolved) setPhase(Phase.Maturity);
      else if (now < biddingStart) setPhase(Phase.Pending);
      else if (now >= biddingStart && now < biddingEnd) setPhase(Phase.Bidding);
      else setPhase(Phase.Maturity);
      
      // Always use getStandardPairName for all pair name conversions
      const pairName = getStandardPairName(details.pair_name);
      setAssetLogo(`/images/${pairName.split('/')[0].toLowerCase()}-logo.png`);
    } catch (error) {
      console.error('fetchMarketData error:', error);
      toast({ title: 'Error', description: 'Could not fetch market data', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, toast]);

  // Fetch position history for the market - build from BidEvents
  useEffect(() => {
    if (!contractAddress) return;
    let isMounted = true;
    const fetchPositionHistory = async () => {
      setLoadingChart(true);
      try {
        // Fetch all BidEvents from API
        const bidEvents = await getMarketBidEvents(contractAddress);
        // Lấy thời gian biddingStartTime và biddingEndTime từ market
        const market = await getMarketDetails(contractAddress);
        const biddingStartTime = market?.bidding_start_time ? Number(market.bidding_start_time) * 1000 : undefined;
        const biddingEndTime = market?.bidding_end_time ? Number(market.bidding_end_time) * 1000 : undefined;
        if (biddingStartTime && biddingEndTime) {
          const timeline = buildPositionTimeline(
            bidEvents,
            biddingStartTime,
            biddingEndTime,
            Date.now()
          );
          if (isMounted) setPositionHistory(timeline);
        } else {
          if (isMounted) setPositionHistory([]);
        }
      } catch (error) {
        if (isMounted) setPositionHistory([]);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchPositionHistory();
    return () => { isMounted = false; };
  }, [contractAddress, phase, refreshChart]);

  // Fetch user bid on mount and when contractAddress changes - separate from fetchMarketData
  useEffect(() => {
    if (!contractAddress || !account?.address) return;
    fetchUserPositions(); // initial fetch
    // Lắng nghe event BidEvent liên quan đến market này
    const unsubscribe = EventListenerService.getInstance().subscribe(contractAddress, (events) => {
      if (events.some(e => e.type === 'BidEvent' && e.data.user?.toLowerCase() === account.address.toString().toLowerCase())) {
        fetchUserPositions();
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [contractAddress, account?.address, fetchUserPositions]);

  // Fetch market data on mount and when contractAddress changes
  useEffect(() => { 
    fetchMarketData(); 
  }, [fetchMarketData]);

  // Fetch user positions after market data is loaded
  useEffect(() => {
    if (market && connected && account?.address) {
      fetchUserPositions();
    }
  }, [market, connected, account, fetchUserPositions]);

  // Fetch asset price
  useEffect(() => {
    if (!market?.pair_name) return;
    const pairName = getStandardPairName(market.pair_name);
    const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
    if (!allowedPairs.includes(pairName)) return;
    const priceService = PriceService.getInstance();
    const unsub = priceService.subscribeToWebSocketPrices((priceData) => {
      if (priceData.symbol.replace('-', '/').toUpperCase() === pairName.toUpperCase()) {
        // setCurrentPrice(priceData.price); // This line was removed
      }
    }, [pairName]);
    return () => { if (unsub) unsub(); };
  }, [market?.pair_name]);

  // Prefetch chart data for all intervals as soon as market loads
  useEffect(() => {
    if (market?.pair_name) {
      const pairName = getStandardPairName(market.pair_name);
      const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
      if (allowedPairs.includes(pairName)) {
        ChartDataPrefetchService.getInstance().prefetchAll(pairName);
      }
    }
  }, [market?.pair_name]);

  // Derived values
  const canResolve = phase === Phase.Maturity && !market?.is_resolved;
  const long = market?.long_amount ? Number(market.long_amount) : 0;
  const short = market?.short_amount ? Number(market.short_amount) : 0;
  const total = market?.total_amount ? Number(market.total_amount) : long + short;
  const longPercentage = total === 0 ? 50 : (long / total) * 100;
  const shortPercentage = total === 0 ? 50 : (short / total) * 100;
  const pairName = market?.pair_name ? getStandardPairName(market.pair_name) : '';
  const pairInfo = pairName ? getTradingPairInfo(pairName) : undefined;
  const strike = market?.strike_price ? (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const maturity = market?.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  const fee = market?.fee_percentage ? (Number(market.fee_percentage) / 10).toFixed(1) : '--';

  // Tính claimableAmount đúng logic Move contract
  const getClaimableAmount = () => {
    if (!market || !market.is_resolved || !account?.address) return 0;
    const userLong = userPositions.long;
    const userShort = userPositions.short;
    const result = Number(market.result);
    const longAmount = Number(market.long_amount);
    const shortAmount = Number(market.short_amount);
    const feePercentage = Number(market.fee_percentage);
    let rawAmount = 0;
    if (result === 0 && userLong > 0) {
      // LONG win
      const winnerPool = longAmount;
      const winningPool = shortAmount;
      rawAmount = userLong + Math.floor((userLong * winningPool) / winnerPool);
    } else if (result === 1 && userShort > 0) {
      // SHORT win
      const winnerPool = shortAmount;
      const winningPool = longAmount;
      rawAmount = userShort + Math.floor((userShort * winningPool) / winnerPool);
    } else {
      return 0;
    }
    // Fee: (fee_percentage * raw_amount) / 1000
    const fee = Math.floor((feePercentage * rawAmount) / 1000);
    return rawAmount - fee;
  };

  const claimableAmount = getClaimableAmount();
  const isWinner = claimableAmount > 0;

  // Kiểm tra user là owner
  const isOwner = account?.address && market?.creator && account.address.toString().toLowerCase() === market.creator.toLowerCase();
  // Kiểm tra đã withdraw fee chưa
  const canWithdrawFee = isOwner && market?.is_resolved && !market?.fee_withdrawn;
  // Tính fee đúng logic contract
  const getWithdrawFeeAmount = () => {
    if (!market) return 0;
    const feePercentage = Number(market.fee_percentage);
    const totalAmount = Number(market.total_amount);
    return Math.floor((feePercentage * totalAmount) / 1000);
  };
  const withdrawFeeAmount = getWithdrawFeeAmount();

  // Handlers
  const handleBid = async () => {
    if (selectedSide === null || !bidAmount || !signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      const timestampBid = Math.floor(Date.now() / 1000);
      await bid(signAndSubmitTransaction, contractAddress, selectedSide === Side.Long, parseFloat(bidAmount), timestampBid);
      toast({ title: 'Bid submitted', status: 'success' });
      setBidAmount('');
      // Update market, userPositions, and chart
      const details = await getMarketDetails(contractAddress);
      setMarket(details);
      await fetchUserPositions();
      setRefreshChart(c => c + 1); // Trigger chart refresh
    } catch (error: unknown) {
      toast({ title: 'Bid failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!signAndSubmitTransaction || !market) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Lấy giá cuối cùng từ Hermes API (dùng priceFeedId từ mapping)
      const finalPrice = await fetchFinalPriceFromHermes(market.pair_name);
      // Tính result theo đúng logic contract
      const strike = Number(market.strike_price);
      let result = 2;
      if (finalPrice >= strike) result = 0; // LONG win
      else result = 1; // SHORT win
      await resolveMarket(signAndSubmitTransaction, contractAddress, finalPrice, result);
      toast({ title: 'Market resolve transaction submitted', status: 'success' });
      fetchMarketData();
    } catch (error: unknown) {
      toast({ title: 'Resolve failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async () => {
    if (!signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      await claim(signAndSubmitTransaction, contractAddress);
      toast({ title: 'Claim transaction submitted', status: 'success' });
      fetchMarketData();
    } catch (error: unknown) {
      toast({ title: 'Claim failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler withdraw fee
  const handleWithdrawFee = async () => {
    if (!signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawFee(signAndSubmitTransaction, contractAddress);
      toast({ title: 'Withdraw fee transaction submitted', status: 'success' });
      fetchMarketData();
    } catch (error: unknown) {
      toast({ title: 'Withdraw fee failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI
  if (isLoading || !market) {
    return (
      <Box bg="dark.900" minH="100vh" py={8}>
        <Container maxW="container.xl" centerContent>
          <Spinner size="xl" />
          <Text mt={4} color="white">Loading market data...</Text>
        </Container>
      </Box>
    );
  }

  const CHART_HEIGHT = 380;

  return (
    <Box bg="dark.900" minH="100vh" py={8}>
      <Container maxW="container.xl">
        {/* Market Info */}
        <MarketInfo
          assetLogo={assetLogo}
          pairName={getStandardPairName(market.pair_name) || ''}
          strike={strike}
          maturity={maturity}
          pool={market?.total_amount ? (Number(market.total_amount) / 1e8).toString() : '--'}
          fee={fee}
          phase={phase}
          phaseNames={phaseNames}
        />
        

        {/* Main Content - 2 Column Layout */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
          {/* Left Side - Charts and Rules */}
          <Box width={{ base: '100%', md: '70%' }} pr={{ base: 0, md: 2 }}>
            <Tabs variant="line" colorScheme="yellow" border="1px solid" borderColor="gray.700" borderRadius="xl" pb={2}>
              <Box pb={1}>
                <TabList
                  borderBottom="2px solid"
                  borderColor="gray.600"
                  px={6}
                  py={3}
                  display="grid"
                  gridTemplateColumns="1fr 1fr"
                  alignItems="center"
                >
                  <Flex justify="center">
                    <Tab
                      fontWeight="bold"
                      fontSize="sm"
                      _selected={{
                        bg: "blue.600",
                        color: "white",
                        borderRadius: "md",
                        boxShadow: "md",
                      }}
                      _hover={{
                        bg: "gray.700",
                        color: "white",
                      }}
                      px={6}
                      py={2}
                      transition="all 0.2s"
                    >
                      Position Chart
                    </Tab>
                  </Flex>
                  <Flex justify="center">
                    <Tab
                      fontWeight="bold"
                      fontSize="sm"
                      _selected={{
                        bg: "green.500",
                        color: "white",
                        borderRadius: "md",
                        boxShadow: "md",
                      }}
                      _hover={{
                        bg: "gray.700",
                        color: "white",
                      }}
                      px={6}
                      py={2}
                      transition="all 0.2s"
                    >
                      Price Chart
                    </Tab>
                  </Flex>
                </TabList>
              </Box>

              <TabPanels>
                <TabPanel p={0} pt={2}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={getStandardPairName(market.pair_name) || market?.pair_name}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="position"
                      data={positionHistory}
                      height={CHART_HEIGHT}
                      marketAddress={contractAddress}
                      biddingStartTime={market?.bidding_start_time ? Number(market.bidding_start_time) * 1000 : undefined}
                      biddingEndTime={market?.bidding_end_time ? Number(market.bidding_end_time) * 1000 : undefined}
                      currentTime={currentTime}
                    />
                  </Box>
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={pairName}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="price"
                      height={CHART_HEIGHT}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Rules Section */}
            <MarketRules
              showRules={showRules}
              setShowRules={setShowRules}
              market={market}
              strike={strike}
              fee={fee}
            />
          </Box>

          {/* Right Side - Betting Panel and Market Info */}
          <Box width={{ base: '100%', md: '30%' }} ml={{ md: 2 }} minW={{ md: '280px' }} maxW={{ md: '340px' }} alignSelf="flex-start">
            <Box
              bg="gray.800"
              p={6}
              borderRadius="2xl"
              mb={6}
              borderWidth={1}
              borderColor="gray.700"
              boxShadow="0 4px 32px 0 rgba(0,0,0,0.25)"
            >
              <Flex justify="space-between" align="center" textAlign="center" fontSize="20px" color="white">
                <HStack justify="center" align="center">
                  <Text color="gray.400">Strike Price: </Text>
                  <Text fontWeight="bold">
                    {strike} 
                  </Text>
                  <Text fontWeight="bold" color="#FEDF56">USD</Text>
                </HStack>
              </Flex>

              {/* Show Final Price in Maturity phase */}
              {phase === Phase.Maturity && market?.is_resolved && market?.final_price && (
                <Flex justify="space-between" align="center" mt={2}>
                  <HStack fontSize="20px">
                    <Text color="gray.400">Final Price:</Text>
                    <Text fontWeight="bold" color={String(market?.result) === '0' ? 'green' : 'red'}>
                      {(Number(market.final_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </Text>
                    <Text fontWeight="bold" color="#FEDF56">USD</Text>
                  </HStack>
                </Flex>
              )}

              {phase === Phase.Maturity && market?.is_resolved && isWinner && (
                <Button
                  onClick={handleClaim}
                  colorScheme="yellow"
                  bg=""
                  border="1px solid #FEDF56"
                  color="white"
                  _hover={{ bg: "#0d6d0c" }}
                  width="100%"
                  mt={4}
                  isLoading={isSubmitting}
                  rightIcon={<Text fontWeight="bold" color="#00E1D6" ml={2}>{formatClaimAmount(claimableAmount)} APT</Text>}
                >
                  Claim Rewards
                </Button>
              )}
              {/* Withdraw Fee button cho Owner */}
              {phase === Phase.Maturity && canWithdrawFee && (
                <Button
                  onClick={handleWithdrawFee}
                  colorScheme="blue"
                  border="1px solid #4F8CFF"
                  color="white"
                  _hover={{ bg: "#0d6d0c" }}
                  width="100%"
                  mt={4}
                  isLoading={isSubmitting}
                  rightIcon={<Text fontWeight="bold" color="#4F8CFF" ml={2}>{formatClaimAmount(withdrawFeeAmount)} APT</Text>}
                >
                  Withdraw Fee
                </Button>
              )}
            </Box>

            {/* Betting Panel - Only show during Bidding phase */}
            {(phase === Phase.Pending || phase === Phase.Bidding) && (
              <MarketBetPanel
                phase={phase}
                selectedSide={selectedSide}
                setSelectedSide={setSelectedSide}
                bidAmount={bidAmount}
                setBidAmount={setBidAmount}
                handleBid={handleBid}
                isSubmitting={isSubmitting}
                connected={connected}
                longPercentage={longPercentage}
                shortPercentage={shortPercentage}
                userPositions={userPositions}
                fee={fee}
                longAmount={long}
                shortAmount={short}
                totalAmount={total}
              />
            )}

            {/* Market Timeline */}
            <MarketTimeline
              phase={phase}
              phaseNames={phaseNames}
              market={market}
              maturity={maturity}
              canResolve={canResolve}
              handleResolve={handleResolve}
              isSubmitting={isSubmitting}
            />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default Customer; 