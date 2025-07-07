import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Flex, HStack, Text, Button, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { bid, claim, resolveMarket, getMarketDetails, getUserBid } from '../services/aptosMarketService';
import { buildPositionHistoryFromEvents } from '../services/positionHistoryService';
import MarketCharts from './charts/MarketCharts';
import { PriceService } from '../services/PriceService';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import MarketInfo from './customer/MarketInfo';
import MarketTimeline from './customer/MarketTimeline';
import MarketBetPanel from './customer/MarketBetPanel';
import MarketRules from './customer/MarketRules';
import type { MarketInfo as MarketInfoType } from '../services/aptosMarketService';
import ChartDataPrefetchService from '../services/ChartDataPrefetchService';

enum Side { Long, Short }
enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity'];

// Add a helper to get/set history from localStorage
function getHistoryKey(contractAddress: string) {
  return `positionHistory_${contractAddress}`;
}
function loadHistory(contractAddress: string) {
  try {
    const raw = localStorage.getItem(getHistoryKey(contractAddress));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveHistory(contractAddress: string, history: any[]) {
  try {
    localStorage.setItem(getHistoryKey(contractAddress), JSON.stringify(history));
  } catch {}
}

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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch position history from on-chain event log
  const fetchPositionHistory = useCallback(async () => {
    if (!contractAddress) return;
    const history = await buildPositionHistoryFromEvents(contractAddress);
    setPositionHistory(history);
  }, [contractAddress]);

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
      if (connected && account?.address) {
        try {
          const userBid = await getUserBid(account.address.toString(), contractAddress);
          if (userBid[2]) {
            setUserPositions({ 
              long: Number(userBid[0]) / 1e8, 
              short: Number(userBid[1]) / 1e8
            });
          } else {
            setUserPositions({ long: 0, short: 0 });
          }
        } catch {
          setUserPositions({ long: 0, short: 0 });
        }
      }
      // Fetch position history from event log
      await fetchPositionHistory();
    } catch {
      toast({ title: 'Error', description: 'Could not fetch market data', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, toast, connected, account, fetchPositionHistory]);

  // Poll for position history (from event log)
  useEffect(() => {
    if (!market) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    const poll = async () => {
      await fetchPositionHistory();
    };
    pollingRef.current = setInterval(poll, 20000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [contractAddress, market, fetchPositionHistory]);

  // Fetch market data and position history on mount and when contractAddress changes
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
  const isOwner = connected && account?.address.toString() === (market?.owner || market?.creator);
  const canResolve = phase === Phase.Maturity && isOwner;
  const canClaim = phase === Phase.Maturity;
  const long = market?.long_amount ? Number(market.long_amount) : 0;
  const short = market?.short_amount ? Number(market.short_amount) : 0;
  const total = market?.total_amount ? Number(market.total_amount) : long + short;
  const longPercentage = total === 0 ? 50 : (long / total) * 100;
  const shortPercentage = total === 0 ? 50 : (short / total) * 100;
  const strike = market?.strike_price ? (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const maturity = market?.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  const pool = market?.total_amount ? (Number(market.total_amount) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const fee = market?.fee_percentage ? (Number(market.fee_percentage) / 10).toFixed(1) : '--';

  // Handlers
  const handleBid = async () => {
    if (selectedSide === null || !bidAmount || !signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      await bid(signAndSubmitTransaction, contractAddress, selectedSide === Side.Long, parseFloat(bidAmount));
      toast({ title: 'Bid submitted', status: 'success' });
      setBidAmount('');
      await fetchMarketData();
    } catch (error: unknown) {
      toast({ title: 'Bid failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!currentPrice || !signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      const finalPrice = Math.round(currentPrice * 1e8);
      await resolveMarket(signAndSubmitTransaction, contractAddress, finalPrice);
      toast({ title: 'Market resolve transaction submitted', status: 'success' });
      await fetchMarketData();
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
      await fetchMarketData();
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

  return (
    <Box bg="dark.900" minH="100vh" py={8}>
      <Container maxW="container.xl">
        {/* Market Info */}
        <MarketInfo
          assetLogo={assetLogo}
          pairName={market.pair_name || ''}
          strike={strike}
          maturity={maturity}
          pool={pool}
          fee={fee}
          phase={phase}
          phaseNames={phaseNames}
        />

        {/* Main Content - 2 Column Layout */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
          {/* Left Side - Charts and Rules */}
          <Box width={{ base: '100%', md: '80%' }} pr={{ base: 0, md: 4 }}>
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
                <TabPanel p={0} pt={4}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={market.pair_name || market?.pair_name}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="position"
                      data={positionHistory}
                    />
                  </Box>
                </TabPanel>
                <TabPanel p={0} pt={4}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={market.pair_name || market?.pair_name}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="price"
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
          <Box width={{ base: '100%', md: '28%' }} mr={0} ml={{ md: 4 }}
            minW={{ md: '340px' }}
            maxW={{ md: '420px' }}
            alignSelf="flex-start"
          >
            <Box
              bg="gray.800"
              p={6}
              borderRadius="2xl"
              mb={6}
              borderWidth={1}
              borderColor="gray.700"
              boxShadow="0 4px 32px 0 rgba(0,0,0,0.25)"
            >
              <Flex justify="space-between" align="center" textAlign="center" fontSize="20px" color="#FEDF56">
                <HStack justify="center" align="center">
                  <Text color="gray.400">Strike Price: </Text>
                  <Text fontWeight="bold">
                    {strike} USD
                  </Text>
                </HStack>
              </Flex>

              {/* Show Final Price in Maturity phase */}
              {phase === Phase.Maturity && (market?.final_price || market?.final_price) && (
                <Flex justify="space-between" align="center" mt={2}>
                  <HStack fontSize="20px">
                    <Text color="gray.400">Final Price:</Text>
                    <Text fontWeight="bold" color={String(market?.result) === '0' ? 'green' : 'red'}>
                      {market?.final_price ? (Number(market.final_price) / 1e8).toFixed(4) : Number(market?.final_price || '0').toFixed(4)}
                    </Text>
                    <Text fontWeight="bold" color="#FEDF56">USD</Text>
                  </HStack>
                </Flex>
              )}

              {canClaim && (
                <Button
                  onClick={handleClaim}
                  colorScheme="yellow"
                  bg="#FEDF56"
                  color="white"
                  _hover={{ bg: "#FFE56B" }}
                  width="100%"
                  mt={4}
                  isLoading={isSubmitting}
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