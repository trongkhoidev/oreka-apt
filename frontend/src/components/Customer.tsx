import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, HStack, Text, Button, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { bid, claim, resolveMarket, getMarketDetails, getUserBid } from '../services/aptosMarketService';
import MarketCharts from './charts/MarketCharts';
import { PriceService } from '../services/PriceService';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import MarketInfo from './customer/MarketInfo';
import MarketTimeline from './customer/MarketTimeline';
import MarketBetPanel from './customer/MarketBetPanel';
import MarketRules from './customer/MarketRules';
import type { MarketInfo as MarketInfoType } from '../services/aptosMarketService';
import ChartDataPrefetchService from '../services/ChartDataPrefetchService';
import { buildPositionHistoryFromEvents } from '../services/positionHistoryService';
import PositionRealtimeService from '../services/PositionRealtimeService';

enum Side { Long, Short }
enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity'];

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
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [assetLogo, setAssetLogo] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [userPositions, setUserPositions] = useState<{ long: number; short: number }>({ long: 0, short: 0 });
  const [positionHistory, setPositionHistory] = useState<{ time: number; long: number; short: number }[]>([]);

  // Fetch user positions
  const fetchUserPositions = useCallback(async () => {
    if (connected && account?.address) {
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

  // Fetch market data and update state
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
      setAssetLogo(`/images/${details.pair_name.split('/')[0].toLowerCase()}-logo.png`);
      // Fetch user positions
      await fetchUserPositions();
    } catch {
      toast({ title: 'Error', description: 'Could not fetch market data', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, toast, fetchUserPositions]);

  // Fetch position history for the market
  useEffect(() => {
    if (!contractAddress) return;
    let isMounted = true;
    const fetchPositionHistory = async () => {
      // Use realtime service for position history
      const realtimeService = PositionRealtimeService.getInstance();
      const history = realtimeService.getPositionHistory(contractAddress, 'all');
      
      if (isMounted && history.length > 0) {
        // Convert to old format for backward compatibility
        const convertedHistory = history.map(h => ({
          time: h.time,
          long: h.long,
          short: h.short
        }));
        setPositionHistory(convertedHistory);
      } else {
        // Fallback to old method if no realtime data
        const history = await buildPositionHistoryFromEvents(contractAddress);
        if (isMounted) setPositionHistory(history);
      }
    };
    fetchPositionHistory();
    return () => { isMounted = false; };
  }, [contractAddress, phase]);

  // Fetch market data on mount and when contractAddress changes
  useEffect(() => { fetchMarketData(); }, [fetchMarketData]);

  // Fetch asset price
  useEffect(() => {
    if (!market?.pair_name) return;
    const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
    if (!allowedPairs.includes(market.pair_name)) return;
    const priceService = PriceService.getInstance();
    const unsub = priceService.subscribeToWebSocketPrices((priceData) => {
      if (priceData.symbol.replace('-', '/').toUpperCase() === market.pair_name.toUpperCase()) {
        setCurrentPrice(priceData.price);
      }
    }, [market.pair_name]);
    return () => { if (unsub) unsub(); };
  }, [market?.pair_name]);

  // Prefetch chart data for all intervals as soon as market loads
  useEffect(() => {
    if (market?.pair_name) {
      const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
      if (allowedPairs.includes(market.pair_name)) {
        ChartDataPrefetchService.getInstance().prefetchAll(market.pair_name);
      }
    }
  }, [market?.pair_name]);

  // Derived values
  const isOwner = connected && account?.address ? account.address.toString() === (market?.owner || market?.creator) : false;
  const canResolve = phase === Phase.Maturity && !market?.is_resolved;
  const canClaim = phase === Phase.Maturity;
  const long = market?.long_amount ? Number(market.long_amount) : 0;
  const short = market?.short_amount ? Number(market.short_amount) : 0;
  const total = market?.total_amount ? Number(market.total_amount) : long + short;
  // Debug log for Total Deposited
  // if (process.env.NODE_ENV !== 'production') {
  //   console.log('Total Deposited (raw):', market?.total_amount, 'long:', long, 'short:', short);
  // }
  const totalDeposited = market?.total_amount ? (Number(market.total_amount) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const longPercentage = total === 0 ? 50 : (long / total) * 100;
  const shortPercentage = total === 0 ? 50 : (short / total) * 100;
  const strike = market?.strike_price ? (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const maturity = market?.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  const fee = market?.fee_percentage ? (Number(market.fee_percentage) / 10).toFixed(1) : '--';

  const getClaimableAmount = () => {
    if (!market || !market.is_resolved || !account?.address) return 0;
    const userLong = userPositions.long;
    const userShort = userPositions.short;
    const result = Number(market.result);
    const longAmount = Number(market.long_amount);
    const shortAmount = Number(market.short_amount);
    // Logic giống contract Move
    if (result === 0 && userLong > 0) {
      // LONG win
      const winnerPool = longAmount;
      const winningPool = shortAmount;
      return userLong + (userLong * winningPool) / winnerPool;
    } else if (result === 1 && userShort > 0) {
      // SHORT win
      const winnerPool = shortAmount;
      const winningPool = longAmount;
      return userShort + (userShort * winningPool) / winnerPool;
    }
    return 0;
  };

  const claimableAmount = getClaimableAmount();
  const isWinner = claimableAmount > 0;

  // Handlers
  const handleBid = async () => {
    if (selectedSide === null || !bidAmount || !signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      await bid(signAndSubmitTransaction, contractAddress, selectedSide === Side.Long, parseFloat(bidAmount));
      toast({ title: 'Bid submitted', status: 'success' });
      setBidAmount('');
      // Chỉ cập nhật lại market, userPositions, positionHistory thay vì reload toàn bộ
      // 1. Update market
      const details = await getMarketDetails(contractAddress);
      setMarket(details);
      // 2. Update userPositions
      await fetchUserPositions();
      // 3. Update positionHistory (realtime)
      const realtimeService = PositionRealtimeService.getInstance();
      const history = realtimeService.getPositionHistory(contractAddress, 'all');
      if (history.length > 0) {
        const convertedHistory = history.map(h => ({
          time: h.time,
          long: h.long,
          short: h.short
        }));
        setPositionHistory(convertedHistory);
      }
    } catch (error: unknown) {
      toast({ title: 'Bid failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      // TODO: Khi contract đã tích hợp PriceFeed, chỉ cần gọi resolveMarket mà không truyền giá từ frontend
      // Hiện tại, truyền 0 vào final_price (contract sẽ cần tự lấy giá on-chain)
      await resolveMarket(signAndSubmitTransaction, contractAddress, 0);
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
          pairName={market.pair_name || ''}
          strike={strike}
          maturity={maturity}
          pool={totalDeposited}
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
                      chartSymbol={market.pair_name || market?.pair_name}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="position"
                      data={positionHistory}
                      height={CHART_HEIGHT}
                      marketAddress={contractAddress}
                      biddingStartTime={market?.bidding_start_time ? Number(market.bidding_start_time) * 1000 : undefined}
                      biddingEndTime={market?.bidding_end_time ? Number(market.bidding_end_time) * 1000 : undefined}
                      currentTime={Date.now()}
                    />
                  </Box>
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={market.pair_name || market?.pair_name}
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
                      {Number(market.final_price) / 1e8}
                    </Text>
                    <Text fontWeight="bold" color="#FEDF56">USD</Text>
                  </HStack>
                </Flex>
              )}

              {/* Chỉ hiển thị nút Claim Rewards cho address thắng và phase Maturity */}
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
                  rightIcon={<Text fontWeight="bold" color="#00E1D6" ml={2}>{(claimableAmount / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} APT</Text>}
                >
                  Claim Rewards
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