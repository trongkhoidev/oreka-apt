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
  ListItem,
  Radio,
  RadioGroup,
  Stack,
  Badge,
  Flex
} from '@chakra-ui/react';
import { FaWallet, FaArrowUp, FaArrowDown, FaClock, FaGasPump, FaRocket, FaInfoCircle } from 'react-icons/fa';
import { getAvailableTradingPairs, TradingPairInfo } from '../config/tradingPairs';
import { PriceService } from '../services/PriceService';
import { format } from 'date-fns-tz';
import { useRouter } from 'next/router';
import { 
  deployMarket, 
  getMarketsByOwner, 
  MarketInfo, 
  estimateDeployMarketGas, 
  deployMarketWithGasSettings,
  GasSpeed,
  GasEstimate,
  GAS_SPEED_LABELS,
  GAS_SPEED_DESCRIPTIONS
} from '../services/aptosMarketService';
import MarketList from './MarketList';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ConnectWallet from './ConnectWallet';

const STRIKE_PRICE_MULTIPLIER = 100000000; // 10^8 - allows up to 8 decimal places

const Owner: React.FC = () => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  
  const [strikePrice, setStrikePrice] = useState('');
  const [selectedPair, setSelectedPair] = useState<TradingPairInfo | null>(null);
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
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [selectedGasSpeed, setSelectedGasSpeed] = useState<GasSpeed>(GasSpeed.NORMAL);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.800');
  const formBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const availablePairs: TradingPairInfo[] = getAvailableTradingPairs();

  const handlePairSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availablePairs.find((pair) => pair.pair === event.target.value);
    setSelectedPair(selected || null);
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
    if (!selectedPair) return;
    try {
      const priceService = PriceService.getInstance();
      const priceData = await priceService.fetchPrice(selectedPair.pair);
      setCurrentPrice(priceData.price);
    } catch (error) {
      console.error('Error fetching price:', error);
      setCurrentPrice(null);
    }
  }, [selectedPair]);

  useEffect(() => {
    fetchDeployedContracts();
  }, [fetchDeployedContracts]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Estimate gas when form parameters change
  useEffect(() => {
    if (selectedPair && strikePrice && maturityDate && maturityTime && biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime) {
      estimateGas();
    }
  }, [selectedPair, strikePrice, maturityDate, maturityTime, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, selectedGasSpeed]);

  const resetForm = () => {
    setStrikePrice('');
    setSelectedPair(null);
    setMaturityDate('');
    setMaturityTime('');
    setBiddingStartDate('');
    setBiddingStartTime('');
    setBiddingEndDate('');
    setBiddingEndTime('');
    setFeePercentage('1.0');
    setGasEstimate(null);
  };

  const estimateGas = async () => {
    if (!selectedPair || !strikePrice || !maturityDate || !maturityTime || !biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime) {
      return;
    }
    try {
      setIsEstimatingGas(true);
      const strikePriceInteger = Math.round(parseFloat(strikePrice) * STRIKE_PRICE_MULTIPLIER);
      const maturityTimestamp = Math.floor(new Date(`${maturityDate} ${maturityTime}`).getTime() / 1000);
      const biddingStartTimestamp = Math.floor(new Date(`${biddingStartDate} ${biddingStartTime}`).getTime() / 1000);
      const biddingEndTimestamp = Math.floor(new Date(`${biddingEndDate} ${biddingEndTime}`).getTime() / 1000);
      const feeValue = Math.round(parseFloat(feePercentage) * 10);
      const params = {
        pairName: selectedPair.pair,
        strikePrice: strikePriceInteger,
        feePercentage: feeValue,
        biddingStartTime: biddingStartTimestamp,
        biddingEndTime: biddingEndTimestamp,
        maturityTime: maturityTimestamp,
      };
      const estimate = await estimateDeployMarketGas(params, selectedGasSpeed);
      setGasEstimate(estimate);
    } catch (error: any) {
      console.error('Error estimating gas:', error);
      // Don't show toast for gas estimation errors as they're not critical
    } finally {
      setIsEstimatingGas(false);
    }
  };

  const deployContract = async () => {
    if (!connected || !account || !signAndSubmitTransaction) {
      toast({ title: 'Wallet not connected', description: 'Please connect your Aptos wallet first', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (!selectedPair || !strikePrice || !maturityDate || !maturityTime || !biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime) {
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
        pairName: selectedPair.pair,
        strikePrice: strikePriceInteger,
        feePercentage: feeValue,
        biddingStartTime: biddingStartTimestamp,
        biddingEndTime: biddingEndTimestamp,
        maturityTime: maturityTimestamp,
      };
      const txHash = await deployMarketWithGasSettings(signAndSubmitTransaction as any, params, selectedGasSpeed);
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
  const progressFields = [selectedPair, strikePrice, biddingStartDate && biddingStartTime, biddingEndDate && biddingEndTime, maturityDate && maturityTime, feePercentage];
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

  // Helper: format date/time ngắn gọn (dd/MM HH:mm)
  function formatShortDateTime(dateStr: string, timeStr: string) {
    if (!dateStr || !timeStr) return '';
    // dateStr: yyyy-mm-dd hoặc yyyy/MM/dd
    const [y, m, d] = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    return `${d}/${m} ${timeStr}`;
  }

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
        {/* Flex chia 2 phần, có divider dọc */}
        <Flex align="start" direction="row" w="full">
          {/* Phần trái: Form nhập thông tin */}
          <Box flex={2} bg="#181A20" borderRadius="2xl" boxShadow="lg" border="1px solid #23262f" p={6}>
            <VStack spacing={5} align="stretch">
              <Heading size="lg" mb={1} bgGradient="linear(to-r, #4F8CFF, #A770EF)" bgClip="text" fontWeight="extrabold" letterSpacing="tight" textShadow="0 0 24px #4F8CFF99">Deploy New Market</Heading>
              <Box bgGradient="linear(to-r, #23262f, #1e2746)" borderRadius="lg" p={3} boxShadow="md" border="1.5px solid #4F8CFF" display="flex" alignItems="center" gap={2} mb={1}>
                <FaInfoCircle color="#4F8CFF" size={18} style={{ marginRight: 8 }} />
                <Text fontSize="sm" color="#B0B3B8" fontWeight="bold">
                  <b>Note:</b> Create a market for users to bet on price (LONG/SHORT) at maturity. Your fee (0.1%–20%) applies to winners and is paid to you.
                </Text>
              </Box>
              {/* Asset */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={2} color="#E0E0E0">Select Asset</Text>
                <Select placeholder="Select Asset" value={selectedPair?.pair || ''} onChange={handlePairSelect} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }}>
                  {availablePairs.map((pair) => (
                    <option key={pair.pair} value={pair.pair} style={{ backgroundColor: '#23262f', color: 'white' }}>{pair.pair}</option>
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
          {/* Divider dọc */}
          <Box width="2px" height="auto" minH="600px" mx={8} bgGradient="linear(to-b, #23262f, #35373f)" borderRadius="full" alignSelf="stretch" />
          {/* Phần phải: 2 box xếp dọc */}
          <Flex flex={1.5} direction="column" gap={6} minW="400px">
            {/* Box Preview */}
            <Box bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="320px">
              <Heading size="md" mb={4} color="#4F8CFF" letterSpacing="tight">Preview</Heading>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between"><Text color="#B0B3B8">Asset:</Text><Text color="white" fontWeight="bold">{selectedPair?.pair || '--'}</Text></HStack>
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
                <HStack justify="space-between"><Text color="#B0B3B8">Time Bidding:</Text><Text color="white" fontWeight="bold">{biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime ? `${formatShortDateTime(biddingStartDate, biddingStartTime)} → ${formatShortDateTime(biddingEndDate, biddingEndTime)}` : '--'}</Text></HStack>
                <HStack justify="space-between"><Text color="#B0B3B8">Maturity:</Text><Text color="white" fontWeight="bold">{maturityDate && maturityTime ? `${maturityDate} ${maturityTime}` : '--'}</Text></HStack>
                <HStack justify="space-between"><Text color="#B0B3B8">Fee:</Text><Text color="white" fontWeight="bold">{feePercentage}%</Text></HStack>
              </VStack>
             
            </Box>
            {/* Box Deploy Speed + Network Fee */}
            <Box bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="320px">
              <Text color="#B0B3B8" fontWeight="bold" fontSize="md" mb={3}>
                Deploy Speed
              </Text>
              <HStack spacing={4} mb={6} align="stretch">
                {[{
                  label: 'Normal',
                  icon: FaGasPump,
                  color: '#4F8CFF',
                  desc1: 'Standard',
                  desc2: 'Low cost',
                  value: GasSpeed.NORMAL,
                  border: '2px solid #4F8CFF',
                  shadow: '0 0 8px #4F8CFF33',
                }, {
                  label: 'Fast',
                  icon: FaRocket,
                  color: '#A770EF',
                  desc1: 'Faster',
                  desc2: 'Moderate cost',
                  value: GasSpeed.FAST,
                  border: '2px solid #A770EF',
                  shadow: '0 0 8px #A770EF33',
                }, {
                  label: 'Instant',
                  icon: FaArrowUp,
                  color: '#ED5FA7',
                  desc1: 'Highest',
                  desc2: 'Premium cost',
                  value: GasSpeed.INSTANT,
                  border: '2px solid #ED5FA7',
                  shadow: '0 0 8px #ED5FA733',
                }].map(opt => (
                  <Box
                    as="button"
                    key={opt.value}
                    flex={1}
                    minW={0}
                    minH="120px"
                    p={4}
                    borderRadius="lg"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    border={selectedGasSpeed === opt.value ? opt.border : '1px solid #35373f'}
                    bg={selectedGasSpeed === opt.value ? '#23262f' : 'transparent'}
                    boxShadow={selectedGasSpeed === opt.value ? opt.shadow : 'none'}
                    onClick={() => setSelectedGasSpeed(opt.value)}
                    transition="all 0.2s"
                    _hover={{ borderColor: opt.color, bg: '#23262f' }}
                  >
                    <Icon as={opt.icon} color={opt.color} boxSize={7} mb={2} />
                    <Text color="white" fontWeight="bold" fontSize="lg">{opt.label}</Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">{opt.desc1}<br />{opt.desc2}</Text>
                  </Box>
                ))}
              </HStack>
              {/* Gas Estimation */}
              <Box bg="#23262f" borderRadius="lg" p={4}>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Icon as={FaGasPump} color="#4F8CFF" />
                    <Text color="#B0B3B8" fontSize="sm" fontWeight="bold">Network Fee</Text>
                  </HStack>
                  {isEstimatingGas && <Spinner size="sm" color="#4F8CFF" />}
                </HStack>
                {gasEstimate ? (
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text color="gray.400" fontSize="xs">Gas Used:</Text>
                      <Text color="white" fontSize="xs" fontWeight="bold">{gasEstimate.gasUsed.toLocaleString()} units</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.400" fontSize="xs">Gas Price:</Text>
                      <Text color="white" fontSize="xs" fontWeight="bold">{gasEstimate.gasUnitPrice} octas</Text>
                    </HStack>
                    <Divider borderColor="gray.600" />
                    <HStack justify="space-between">
                      <Text color="white" fontSize="sm" fontWeight="bold">Total Fee:</Text>
                      <VStack align="end" spacing={0}>
                        <Text color="#4F8CFF" fontSize="sm" fontWeight="bold">{gasEstimate.totalFee.toFixed(6)} APT</Text>
                        <Text color="gray.400" fontSize="xs">≈ ${gasEstimate.totalFeeUSD.toFixed(2)}</Text>
                      </VStack>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.400" fontSize="xs">Est. Time:</Text>
                      <HStack>
                        <Icon as={FaClock} color="yellow.400" size="xs" />
                        <Text color="yellow.400" fontSize="xs" fontWeight="bold">{gasEstimate.estimatedTime}</Text>
                      </HStack>
                    </HStack>
                  </VStack>
                ) : (
                  <Text color="gray.400" fontSize="sm">
                    {isEstimatingGas ? 'Estimating gas...' : 'Fill form to estimate gas'}
                  </Text>
                )}
              </Box>
            </Box>
          </Flex>
        </Flex>
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
        <Box mt={8} w="100%" display="flex" flexDirection="column" alignItems="center" gap={4}>
          
          <Button 
            colorScheme="brand" 
            onClick={deployContractWithCheck} 
            isLoading={isDeploying} 
            loadingText="Submitting..." 
            size="lg" 
            w="300px" 
            borderRadius="xl" 
            fontSize="xl" 
            h="56px" 
            _hover={{ bg: '#4F8CFF', color: 'white', boxShadow: '0 4px 16px #4F8CFF33' }} 
            isDisabled={progress < 80 || !signAndSubmitTransaction}
            leftIcon={<FaRocket />}
          >
            {isDeploying ? 'Deploying Market...' : 'Create Market'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Owner; 