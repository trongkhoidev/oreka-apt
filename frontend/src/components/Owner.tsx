import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Input, 
  VStack, 
  useToast, 
  HStack, 
  Icon, 
  SimpleGrid, 
  Text, 
  Select, 
  Divider, 
  Progress, 
  InputGroup, 
  InputRightAddon, 
  Spinner, 
  Slider, 
  SliderTrack, 
  SliderFilledTrack, 
  SliderThumb, 
  Tooltip, 
  InputRightElement,
  Container,
  Heading,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  UnorderedList,
  ListItem
} from '@chakra-ui/react';
import { FaWallet, FaArrowUp, FaArrowDown, FaClock } from 'react-icons/fa';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import { PriceService } from '../services/PriceService';
import { format } from 'date-fns-tz';
import { useRouter } from 'next/router';
import { deployMarket, getMarketsByOwner, MarketInfo } from '../services/aptosMarketService';
import MarketList from './MarketList';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ConnectWallet from './ConnectWallet';

interface Coin {
  value: string;
  label: string;
  currentPrice: number;
  priceFeedAddress: string;
}

const STRIKE_PRICE_MULTIPLIER = 100000000; // 10^8 - allows up to 8 decimal places

const Owner: React.FC = () => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  
  const [strikePrice, setStrikePrice] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [maturityDate, setMaturityDate] = useState('');
  const [maturityTime, setMaturityTime] = useState('');
  const [biddingStartDate, setBiddingStartDate] = useState('');
  const [biddingStartTime, setBiddingStartTime] = useState('');
  const [biddingEndDate, setBiddingEndDate] = useState('');
  const [biddingEndTime, setBiddingEndTime] = useState('');
  const [feePercentage, setFeePercentage] = useState<string>('1.0');
  const [isDeploying, setIsDeploying] = useState(false);
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  const toast = useToast();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.800');
  const formBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const availableCoins: Coin[] = [
    { value: 'BTCUSD', label: 'BTC/USD', currentPrice: 47406.92, priceFeedAddress: '0x1::pyth::BTC_USD' },
    { value: 'ETHUSD', label: 'ETH/USD', currentPrice: 3521.45, priceFeedAddress: '0x1::pyth::ETH_USD' },
    { value: 'LINKUSD', label: 'LINK/USD', currentPrice: 12.87, priceFeedAddress: '0x1::pyth::LINK_USD' },
    { value: 'SNXUSD', label: 'SNX/USD', currentPrice: 0.65, priceFeedAddress: '0x1::pyth::SNX_USD' },
    { value: 'WSTETHUSD', label: 'WSTETH/USD', currentPrice: 2000.0, priceFeedAddress: '0x1::pyth::WSTETH_USD' },
  ];

  const handleCoinSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableCoins.find((coin) => coin.value === event.target.value);
    setSelectedCoin(selected || null);
    setCurrentPrice(null);
  };

  const fetchDeployedContracts = useCallback(async () => {
    if (!connected || !account) return;
    setLoadingMarkets(true);
    try {
      const userMarkets = await getMarketsByOwner(account.address.toString());
      setMarkets(userMarkets);
    } catch (error) {
      console.error('Error fetching deployed contracts:', error);
    } finally {
      setLoadingMarkets(false);
    }
  }, [connected, account]);

  const fetchPrices = useCallback(async () => {
    if (!selectedCoin) return;
    try {
      const priceService = PriceService.getInstance();
      const priceData = await priceService.fetchPrice(selectedCoin.label);
      setCurrentPrice(priceData.price);
    } catch (error) {
      console.error('Error fetching price:', error);
      setCurrentPrice(selectedCoin.currentPrice);
    }
  }, [selectedCoin]);

  useEffect(() => {
    fetchDeployedContracts();
  }, [fetchDeployedContracts]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const resetForm = () => {
    setStrikePrice('');
    setSelectedCoin(null);
    setMaturityDate('');
    setMaturityTime('');
    setBiddingStartDate('');
    setBiddingStartTime('');
    setBiddingEndDate('');
    setBiddingEndTime('');
    setFeePercentage('1.0');
  };

  const deployContract = async () => {
    if (!connected || !account || !signAndSubmitTransaction) {
      toast({ title: 'Wallet not connected', description: 'Please connect your Aptos wallet first', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (!selectedCoin || !strikePrice || !maturityDate || !maturityTime || !biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    setIsDeploying(true);
    try {
      const strikePriceInteger = Math.round(parseFloat(strikePrice) * STRIKE_PRICE_MULTIPLIER);
      const maturityTimestamp = Math.floor(new Date(`${maturityDate} ${maturityTime}`).getTime() / 1000);
      const biddingStartTimestamp = Math.floor(new Date(`${biddingStartDate} ${biddingStartTime}`).getTime() / 1000);
      const biddingEndTimestamp = Math.floor(new Date(`${biddingEndDate} ${biddingEndTime}`).getTime() / 1000);
      const feeValue = Math.round(parseFloat(feePercentage) * 10);
      const params = {
        pairName: selectedCoin.label,
        strikePrice: strikePriceInteger,
        feePercentage: feeValue,
        biddingStartTime: biddingStartTimestamp,
        biddingEndTime: biddingEndTimestamp,
        maturityTime: maturityTimestamp,
      };
      const txHash = await deployMarket(signAndSubmitTransaction as any, params);
      toast({ title: 'Market deployment transaction submitted!', description: `Transaction hash: ${txHash}`, status: 'info', duration: 5000, isClosable: true, });
      resetForm();
      setTimeout(() => fetchDeployedContracts(), 3000);
    } catch (error: any) {
      console.error('Error deploying contract:', error);
      toast({ title: 'Error deploying market', description: error?.message || 'An unexpected error occurred.', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsDeploying(false);
    }
  };

  // Fee slider logic
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const handleFeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      let num = parseFloat(value);
      if (isNaN(num) || value === '') {
        setFeePercentage('');
      } else if (num < 0.1) {
        setFeePercentage('0.1');
      } else if (num > 20) {
        setFeePercentage('20');
      } else {
        setFeePercentage(num.toFixed(1));
      }
    }
  };
  const handleFeeSliderChange = (val: number) => {
    setFeePercentage(val.toFixed(1));
  };

  // Thêm logic tính % change giữa strikePrice và currentPrice
  const getPriceChange = () => {
    if (!strikePrice || !currentPrice) return null;
    const strike = parseFloat(strikePrice);
    if (!strike || strike === 0) return null;
    const diff = currentPrice - strike;
    const percent = (diff / strike) * 100;
    return percent;
  };
  const priceChange = getPriceChange();

  // Tính số trường đã nhập cho progress (Initial -> Creating)
  const progressFields = [selectedCoin, strikePrice, biddingStartDate && biddingStartTime, biddingEndDate && biddingEndTime, maturityDate && maturityTime, feePercentage];
  const filledFields = progressFields.filter(Boolean).length;
  // Progress: Initial (0%), Creating (80%), Finished (100%)
  let progressStep = 0;
  if (filledFields === 0) progressStep = 0;
  else if (filledFields < progressFields.length) progressStep = 80 * (filledFields / progressFields.length);
  else progressStep = 80;
  const [progress, setProgress] = useState(progressStep);
  useEffect(() => { setProgress(progressStep); }, [progressStep]);
  const [isFinishing, setIsFinishing] = useState(false);

  // Logic kiểm tra thời gian hợp lệ
  const isValidTime = () => {
    if (!biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime || !maturityDate || !maturityTime) return false;
    const now = Date.now();
    const start = new Date(`${biddingStartDate}T${biddingStartTime}`).getTime();
    const end = new Date(`${biddingEndDate}T${biddingEndTime}`).getTime();
    const maturity = new Date(`${maturityDate}T${maturityTime}`).getTime();
    return now <= start && start < end && end < maturity;
  };

  // Deploy contract với kiểm tra thời gian
  const deployContractWithCheck = async () => {
    if (!isValidTime()) {
      toast({ title: 'Invalid time', description: 'now <= bidding start < bidding end < maturity', status: 'error', duration: 4000, isClosable: true });
      return;
    }
    setIsFinishing(true);
    setProgress(100);
    await deployContract();
    setTimeout(() => setIsFinishing(false), 1200);
  };

  if (!connected || !account) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading color="white">Owner Dashboard</Heading>
          <Text color="dark.300">Please connect your wallet to manage your markets.</Text>
          <ConnectWallet />
        </VStack>
      </Container>
    );
  }

  return (
    <Box bg="#0A0B0F" minH="100vh" color="white">
      <Container maxW="1200px" py={12}>
        <HStack align="start" spacing={10}>
          {/* Form Section */}
          <Box flex={2} bg="#181A20" borderRadius="2xl" boxShadow="lg" border="1px solid #23262f" p={10}>
            <VStack spacing={7} align="stretch">
              <Heading size="lg" mb={2} bgGradient="linear(to-r, #4F8CFF, #A770EF)" bgClip="text" fontWeight="extrabold" letterSpacing="tight" textShadow="0 0 24px #4F8CFF99">OREKA - Deploy New Market</Heading>
              <Box bg="#23262f" borderRadius="xl" p={4} mb={2}>
                <Text fontSize="md" color="#B0B3B8">
                  <b>Note:</b> When creating a market, you&apos;re establishing a binary options contract where users can bid on whether the price will be above (LONG) or below (SHORT) the strike price at maturity. The fee you set (between 0.1% and 20%) will be applied to winning positions and distributed to you as the market creator.
                </Text>
              </Box>
              {/* Asset */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Select Asset</Text>
                <Select placeholder="Select Trading Pair" value={selectedCoin?.value || ''} onChange={handleCoinSelect} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }}>
                  {availableCoins.map((coin) => (
                    <option key={coin.value} value={coin.value} style={{ backgroundColor: '#23262f', color: 'white' }}>{coin.label}</option>
                  ))}
                </Select>
              </Box>
              {/* Strike Price */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Strike Price</Text>
                <InputGroup>
                  <Input placeholder="Enter strike price" value={strikePrice} onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setStrikePrice(e.target.value); }} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                  <InputRightAddon h="48px" bg="transparent" borderColor="#35373f" color="#B0B3B8" fontSize="lg">$</InputRightAddon>
                </InputGroup>
              </Box>
              {/* Bidding Start Time */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Bidding Start</Text>
                <HStack spacing={4}>
                  <Input type="date" placeholder="dd/mm/yyyy" value={biddingStartDate} onChange={e => setBiddingStartDate(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="60%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                  <Input type="time" placeholder="--:--" value={biddingStartTime} onChange={e => setBiddingStartTime(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="40%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                </HStack>
              </Box>
              {/* Bidding End Time */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Bidding End</Text>
                <HStack spacing={4}>
                  <Input type="date" placeholder="dd/mm/yyyy" value={biddingEndDate} onChange={e => setBiddingEndDate(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="60%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                  <Input type="time" placeholder="--:--" value={biddingEndTime} onChange={e => setBiddingEndTime(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="40%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                </HStack>
              </Box>
              {/* Maturity Date */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Market Maturity</Text>
                <HStack spacing={4}>
                  <Input type="date" placeholder="dd/mm/yyyy" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="60%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                  <Input type="time" placeholder="--:--" value={maturityTime} onChange={e => setMaturityTime(e.target.value)} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" w="40%" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }} />
                </HStack>
              </Box>
              {/* Fee with slider */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Fee (%)</Text>
                <HStack spacing={4} align="center">
                  <Box flex={1} maxW="300px" position="relative">
                    <Slider
                      id="fee-slider"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={parseFloat(feePercentage) || 0.1}
                      onChange={handleFeeSliderChange}
                      onMouseEnter={() => setShowFeeTooltip(true)}
                      onMouseLeave={() => setShowFeeTooltip(false)}
                    >
                      <SliderTrack bg="#23262f" h="4px">
                        <SliderFilledTrack bg="#4F8CFF" />
                      </SliderTrack>
                      <Tooltip
                        hasArrow
                        bg="#4F8CFF"
                        color="white"
                        placement="top"
                        isOpen={showFeeTooltip}
                        label={`${parseFloat(feePercentage) || 0.1}%`}
                      >
                        <SliderThumb boxSize={6} bg="white" />
                      </Tooltip>
                    </Slider>
                  </Box>
                  <Box flex={1}>
                    <InputGroup>
                      <Input
                        placeholder="Enter fee"
                        value={feePercentage}
                        onChange={handleFeeInputChange}
                        bg="#23262f"
                        border="1px solid #35373f"
                        color="white"
                        borderRadius="xl"
                        h="48px"
                        fontSize="lg"
                        w="100%"
                        min={0.1}
                        max={20}
                        step={0.1}
                        _placeholder={{ color: '#888' }}
                        _hover={{ borderColor: '#4F8CFF' }}
                        _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }}
                        type="number"
                      />
                      <InputRightAddon h="48px" bg="transparent" borderColor="#35373f" color="#B0B3B8" fontSize="lg">%</InputRightAddon>
                    </InputGroup>
                  </Box>
                </HStack>
              </Box>
            </VStack>
          </Box>
          {/* Preview Section */}
          <Box flex={1} bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="320px">
            <Heading size="md" mb={4} color="#4F8CFF" letterSpacing="tight">Preview</Heading>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between"><Text color="#B0B3B8">Asset:</Text><Text color="white" fontWeight="bold">{selectedCoin?.label || '--'}</Text></HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Strike Price:</Text>
                <HStack>
                  <Text color="white" fontWeight="bold">{strikePrice || '--'}</Text>
                  {priceChange !== null && (
                    <>
                      {priceChange > 0 && <Icon as={FaArrowUp} color="green.400" />}
                      {priceChange < 0 && <Icon as={FaArrowDown} color="red.400" />}
                      <Text color={priceChange > 0 ? 'green.400' : priceChange < 0 ? 'red.400' : 'gray.400'} fontWeight="bold" fontSize="md">
                        {Math.abs(priceChange).toFixed(2)}%
                      </Text>
                    </>
                  )}
                </HStack>
              </HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Current Price:</Text><Text color="#4F8CFF" fontWeight="bold">{currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}</Text></HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Bidding Start:</Text><Text color="white" fontWeight="bold">{biddingStartDate && biddingStartTime ? `${biddingStartDate} ${biddingStartTime}` : '--'}</Text></HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Bidding End:</Text><Text color="white" fontWeight="bold">{biddingEndDate && biddingEndTime ? `${biddingEndDate} ${biddingEndTime}` : '--'}</Text></HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Maturity:</Text><Text color="white" fontWeight="bold">{maturityDate && maturityTime ? `${maturityDate} ${maturityTime}` : '--'}</Text></HStack>
              <HStack justify="space-between"><Text color="#B0B3B8">Fee:</Text><Text color="white" fontWeight="bold">{feePercentage}%</Text></HStack>
            </VStack>
          </Box>
        </HStack>
        {/* Progress Bar dưới cùng */}
        <Box mt={10} w="100%">
          <HStack spacing={4} justify="space-between" mb={2}>
            <Text color={progress < 1 ? 'white' : 'white'} fontWeight={progress < 1 ? 'bold' : 'normal'}>Initial</Text>
            <Text color={progress < 100 ? 'white' : 'white'} fontWeight={progress >= 80 && !isFinishing ? 'bold' : 'normal'}>Creating</Text>
            <Text color={progress === 100 ? 'white' : 'gray.400'} fontWeight={progress === 100 ? 'bold' : 'normal'}>Finished</Text>
          </HStack>
          <Box position="relative" h="8px" bg="#23262f" borderRadius="full" w="full">
            <Box position="absolute" left={0} top={0} h="8px" borderRadius="full" bgGradient="linear(to-r, #4F8CFF, #A770EF)" w={`${progress}%`} transition="width 0.4s cubic-bezier(.4,2,.6,1)" />
          </Box>
        </Box>
        {/* Button Create Market dưới cùng */}
        <Box mt={8} w="100%" display="flex" justifyContent="center">
          <Button colorScheme="brand" onClick={deployContractWithCheck} isLoading={isDeploying} loadingText="Submitting..." size="lg" w="300px" borderRadius="xl" fontSize="xl" h="56px" _hover={{ bg: '#4F8CFF', color: 'white', boxShadow: '0 4px 16px #4F8CFF33' }} isDisabled={progress < 80 || !signAndSubmitTransaction}>Create market</Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Owner; 