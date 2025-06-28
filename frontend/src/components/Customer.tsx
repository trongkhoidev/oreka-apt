import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Flex, VStack, HStack, Text, Heading, Button, Badge, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel, NumberInput, NumberInputField, useColorModeValue, Progress, Divider, SimpleGrid, Image, Tooltip, Circle
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/router';
import { bid, claim, resolveMarket, getMarketDetails } from '../services/aptosMarketService';
import MarketCharts from './charts/MarketCharts';
import { PriceService } from '../services/PriceService';

enum Side { Long, Short }
enum Phase { Pending, Bidding, Maturity, Resolved, Canceled }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity', 'Resolved', 'Canceled'];
const phaseColors = ['yellow', 'blue', 'orange', 'green', 'red'];

const Customer: React.FC<CustomerProps> = ({ contractAddress }) => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const router = useRouter();
  const toast = useToast();

  // State
  const [market, setMarket] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>(Phase.Pending);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [assetLogo, setAssetLogo] = useState<string>('');

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    if (!contractAddress) return;
    setIsLoading(true);
    try {
      const detailsTuple = await getMarketDetails(contractAddress);
      const [
        creator, pair_name, strike_price, fee_percentage, total_bids, long_bids, short_bids,
        total_amount, long_amount, short_amount, result, is_resolved, is_canceled,
        bidding_start_time, bidding_end_time, maturity_time, final_price
      ] = detailsTuple;
      const marketData = {
        creator, pair_name, strike_price, fee_percentage, total_bids, long_bids, short_bids,
        total_amount, long_amount, short_amount, result, is_resolved, is_canceled,
        bidding_start_time, bidding_end_time, maturity_time, final_price
      };
      setMarket(marketData);
      // Phase logic
      const now = Math.floor(Date.now() / 1000);
      if (is_canceled) setPhase(Phase.Canceled);
      else if (is_resolved) setPhase(Phase.Resolved);
      else if (now < bidding_start_time) setPhase(Phase.Pending);
      else if (now < bidding_end_time) setPhase(Phase.Bidding);
      else setPhase(Phase.Maturity);
      // Asset logo
      setAssetLogo(`/images/${pair_name.split('/')[0].toLowerCase()}-logo.png`);
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({ title: 'Error', description: 'Could not fetch market data.', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, toast]);

  useEffect(() => { fetchMarketData(); }, [fetchMarketData]);

  // Fetch asset price
  useEffect(() => {
    if (!market?.pair_name) return;
    const priceService = PriceService.getInstance();
    let unsub = priceService.subscribeToWebSocketPrices((priceData) => {
      if (priceData.symbol.startsWith(market.pair_name.split('/')[0])) {
        setCurrentPrice(priceData.price);
      }
    }, [market.pair_name]);
    return () => { if (unsub) unsub(); };
  }, [market?.pair_name]);

  // Derived
  const isOwner = connected && account?.address.toString() === market?.creator;
  const canResolve = phase === Phase.Maturity && isOwner;
  const canClaim = phase === Phase.Resolved;
  const long = Number(market?.long_amount || 0);
  const short = Number(market?.short_amount || 0);
  const total = long + short;
  const percent = total === 0 ? { long: 50, short: 50 } : { long: (long / total) * 100, short: (short / total) * 100 };
  const strike = market ? (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const maturity = market ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  const pool = market ? (Number(market.total_amount) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const fee = market ? (Number(market.fee_percentage) / 10).toFixed(1) : '--';
  const phaseColor = phaseColors[phase];
  const title = market ? `${market.pair_name} will reach $${strike} by ${maturity}?` : '';

  // Handlers
  const handleBid = async () => {
    if (selectedSide === null || !bidAmount || !signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      await bid(signAndSubmitTransaction as any, contractAddress, selectedSide === Side.Long, parseFloat(bidAmount));
      toast({ title: 'Bid submitted', status: 'success' });
      setBidAmount('');
      fetchMarketData();
    } catch (error: any) {
      toast({ title: 'Bid failed', description: error.message, status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleResolve = async () => {
    if (!currentPrice || !signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      const finalPrice = Math.round(currentPrice * 1e8);
      await resolveMarket(signAndSubmitTransaction as any, contractAddress, finalPrice);
      toast({ title: 'Market resolve transaction submitted', status: 'success' });
      fetchMarketData();
    } catch (error: any) {
      toast({ title: 'Resolve failed', description: error.message, status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleClaim = async () => {
    if (!signAndSubmitTransaction) return;
    setIsSubmitting(true);
    try {
      await claim(signAndSubmitTransaction as any, contractAddress);
      toast({ title: 'Claim transaction submitted', status: 'success' });
      fetchMarketData();
    } catch (error: any) {
      toast({ title: 'Claim failed', description: error.message, status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI
  if (isLoading || !market) {
    return <Container centerContent py={10}><Spinner size="xl" /></Container>;
  }

  return (
    <Box bg="dark.900" minH="100vh" py={8}>
      <Container maxW="container.xl">
        {/* Header */}
        <Flex align="center" mb={8} gap={6} direction={{ base: 'column', md: 'row' }}>
          <Box boxSize="80px" borderRadius="full" overflow="hidden" bg="dark.700" border="3px solid brand.500">
            <Image src={assetLogo} alt={market.pair_name} boxSize="80px" objectFit="cover" />
          </Box>
          <VStack align="start" spacing={1} flex={1}>
            <Heading size="lg" color="white">{market.pair_name}</Heading>
            <Text fontSize="xl" color="dark.200" fontWeight="bold">Strike: <Text as="span" color="brand.300">${strike}</Text></Text>
            <Text color="dark.400">Maturity: {maturity}</Text>
            <Badge colorScheme={phaseColor} fontSize="1em" px={4} py={2} borderRadius="md">{phaseNames[phase]}</Badge>
          </VStack>
        </Flex>

        {/* Bar long/short + pool + price */}
        <Box bg="dark.700" borderRadius="xl" p={6} mb={8}>
          <HStack mb={3} spacing={2} align="center">
            <Text color="success.400" fontWeight="bold" minW="36px" textAlign="right">{percent.long.toFixed(0)}%</Text>
            <Box flex={1} h="16px" borderRadius="md" bgGradient="linear(to-r, success.400, yellow.200, accent.400)" position="relative">
              <Box position="absolute" left={0} top={0} h="100%" w={`${percent.long}%`} bgGradient="linear(to-r, success.400, yellow.200)" borderRadius="md" />
              <Box position="absolute" right={0} top={0} h="100%" w={`${percent.short}%`} bgGradient="linear(to-l, accent.400, yellow.200)" borderRadius="md" />
            </Box>
            <Text color="accent.400" fontWeight="bold" minW="36px" textAlign="left">{percent.short.toFixed(0)}%</Text>
          </HStack>
          <Flex justify="space-between" align="center" mt={2}>
            <Text color="dark.300">Pool: <Text as="span" color="white" fontWeight="bold">{pool} APT</Text></Text>
            <Text color="brand.200" fontWeight="bold" fontSize="lg">Current Price: ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</Text>
          </Flex>
        </Box>

        {/* Tabs: Chart/Info */}
        <Tabs variant="soft-rounded" colorScheme="brand" mb={8}>
          <TabList>
            <Tab>Price Chart</Tab>
            <Tab>Market Info</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <MarketCharts chartSymbol={market.pair_name} strikePrice={Number(market.strike_price) / 1e8} />
            </TabPanel>
            <TabPanel px={0}>
              <VStack align="start" spacing={2} fontSize="md" color="dark.200">
                <Text>Strike Price: <Text as="span" color="white" fontWeight="bold">${strike}</Text></Text>
                <Text>Fee: <Text as="span" color="white" fontWeight="bold">{fee}%</Text></Text>
                <Text>Maturity: <Text as="span" color="white" fontWeight="bold">{maturity}</Text></Text>
                <Text>Total Pool: <Text as="span" color="white" fontWeight="bold">{pool} APT</Text></Text>
                <Text>Long Amount: <Text as="span" color="success.300" fontWeight="bold">{(long / 1e8).toFixed(4)} APT</Text></Text>
                <Text>Short Amount: <Text as="span" color="accent.300" fontWeight="bold">{(short / 1e8).toFixed(4)} APT</Text></Text>
                <Text>Owner: <Text as="span" color="brand.300" fontWeight="bold">{market.creator?.slice(0, 6)}...{market.creator?.slice(-4)}</Text></Text>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Bid Panel & Actions */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
          {/* Bid Panel */}
          <VStack p={6} bg="dark.700" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="dark.600" spacing={4} align="stretch">
            <Heading size="md" color="white">Place Your Bid</Heading>
            <HStack>
              <Button colorScheme={selectedSide === Side.Long ? 'success' : 'dark'} onClick={() => setSelectedSide(Side.Long)} flex="1">LONG</Button>
              <Button colorScheme={selectedSide === Side.Short ? 'accent' : 'dark'} onClick={() => setSelectedSide(Side.Short)} flex="1">SHORT</Button>
            </HStack>
            <NumberInput value={bidAmount} onChange={setBidAmount} isDisabled={phase !== Phase.Bidding} min={0} precision={4} step={0.01}>
              <NumberInputField placeholder="Enter amount in APT" />
            </NumberInput>
            <Button colorScheme="brand" onClick={handleBid} isLoading={isSubmitting} isDisabled={phase !== Phase.Bidding || !selectedSide || !bidAmount}>
              Submit Bid
            </Button>
            <Divider my={2} />
            <Text color="dark.400" fontSize="sm">Fee: <Text as="span" color="white" fontWeight="bold">{fee}%</Text></Text>
          </VStack>
          {/* Actions Panel */}
          <VStack p={6} bg="dark.700" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="dark.600" spacing={4} align="stretch">
            <Heading size="md" color="white">Actions</Heading>
            <HStack spacing={4} mt={2}>
              {canResolve && <Button colorScheme="orange" onClick={handleResolve} isLoading={isSubmitting}>Resolve Market</Button>}
              {canClaim && <Button colorScheme="purple" onClick={handleClaim} isLoading={isSubmitting}>Claim Winnings</Button>}
            </HStack>
          </VStack>
        </SimpleGrid>

        {/* Timeline Phase */}
        <Box bg="dark.700" borderRadius="xl" p={6} mb={8}>
          <HStack justify="space-between" align="center">
            {phaseNames.slice(0, 4).map((name, idx) => (
              <VStack key={name} spacing={1} flex={1}>
                <Circle size="32px" bg={phase === idx ? `${phaseColors[idx]}.400` : 'dark.600'} color="white" fontWeight="bold">{idx + 1}</Circle>
                <Text color={phase === idx ? `${phaseColors[idx]}.300` : 'dark.400'} fontWeight={phase === idx ? 'bold' : 'normal'}>{name}</Text>
              </VStack>
            ))}
          </HStack>
        </Box>
      </Container>
    </Box>
  );
};

export default Customer; 