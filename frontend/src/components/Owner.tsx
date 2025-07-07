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
  estimateDeployMarketGas, 
  deployMarketWithGasSettings,
  GasSpeed,
  GasEstimate,
  GAS_SPEED_LABELS,
  GAS_SPEED_DESCRIPTIONS,
  getMarketDetails
} from '../services/aptosMarketService';
import MarketList from './MarketList';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ConnectWallet from './ConnectWallet';
import { getAptosClient } from '../config/network';
import OwnerMarketList from './owner/OwnerMarketList';
import OwnerDeployForm from './owner/OwnerDeployForm';
import PreviewBox from './owner/PreviewBox';
import NetworkFeeBox from './owner/NetworkFeeBox';
import DeployProgressBar from './owner/DeployProgressBar';
import DeployButton from './owner/DeployButton';

const STRIKE_PRICE_MULTIPLIER = 100000000; // 10^8 - allows up to 8 decimal places

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
  result: number;
  is_resolved: boolean;
  bidding_start_time: number;
  bidding_end_time: number;
  maturity_time: number;
  final_price: number;
  fee_withdrawn: boolean;
  _key?: string;
}

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
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [selectedGasSpeed, setSelectedGasSpeed] = useState<GasSpeed>(GasSpeed.NORMAL);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [balance, setBalance] = useState<string>('');

  const toast = useToast();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.800');
  const formBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const availablePairs: TradingPairInfo[] = getAvailableTradingPairs();

  const [markets, setMarkets] = useState<Market[]>([]);

  const handlePairSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availablePairs.find((pair) => pair.pair === event.target.value);
    setSelectedPair(selected || null);
    setCurrentPrice(null);
  };

  const fetchDeployedContracts = useCallback(async () => {
    if (!connected || !account) return;
    setLoadingMarkets(true);
    try {
      const userMarketInfos = await getMarketsByOwner(account.address.toString());
      const detailsArr = await Promise.all(
        userMarketInfos.map(async (info) => {
          const details = await getMarketDetails(info.market_address);
          return { info, details };
        })
      );
      const mergedMarkets = detailsArr.map(({ info, details }) => ({
        creator: info.owner,
        pair_name: info.pair_name,
        strike_price: Number(info.strike_price),
        fee_percentage: Number(info.fee_percentage),
        total_bids: details ? Number(details[4]) : 0,
        long_bids: details ? Number(details[5]) : 0,
        short_bids: details ? Number(details[6]) : 0,
        total_amount: details ? Number(details[7]) : 0,
        long_amount: details ? Number(details[8]) : 0,
        short_amount: details ? Number(details[9]) : 0,
        result: details ? Number(details[10]) : 2,
        is_resolved: details ? Boolean(details[11]) : false,
        bidding_start_time: Number(info.bidding_start_time),
        bidding_end_time: Number(info.bidding_end_time),
        maturity_time: Number(info.maturity_time),
        final_price: details ? Number(details[15]) : 0,
        fee_withdrawn: false, // If needed, fetch from resource
        _key: info.market_address
      }));
      setMarkets(mergedMarkets);
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

  const fetchBalance = useCallback(async () => {
    if (!account?.address) return;
    try {
      const aptos = getAptosClient();
      const resources = await aptos.getAccountResources({ accountAddress: account.address.toString() });
      const coinStore = resources.find((r: any) => r.type.indexOf('0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>') !== -1);
      if (coinStore && (coinStore as any).data && (coinStore as any).data.coin && (coinStore as any).data.coin.value) {
        setBalance((parseInt((coinStore as any).data.coin.value, 10) / 1e8).toFixed(4));
      } else {
        setBalance('0');
      }
    } catch (error) {
      setBalance('0');
    }
  }, [account]);

  useEffect(() => {
    fetchDeployedContracts();
  }, [fetchDeployedContracts]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    fetchBalance();
  }, [account, fetchBalance]);

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
      if (isNaN(strikePriceInteger) || isNaN(maturityTimestamp) || isNaN(biddingStartTimestamp) || isNaN(biddingEndTimestamp) || isNaN(feeValue)) {
        toast({ title: 'Invalid input', description: 'Please check all numeric fields.', status: 'error', duration: 4000, isClosable: true });
        setIsDeploying(false);
        return;
      }
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
        <Flex align="start" direction="row" w="full">
          {/* Form tạo market */}
          <Box flex={2} bg="#181A20" borderRadius="2xl" boxShadow="lg" border="1px solid #23262f" p={6}>
            <OwnerDeployForm
              availablePairs={availablePairs}
              selectedPair={selectedPair}
              setSelectedPair={setSelectedPair}
              strikePrice={strikePrice}
              setStrikePrice={setStrikePrice}
              biddingStartDate={biddingStartDate}
              setBiddingStartDate={setBiddingStartDate}
              biddingStartTime={biddingStartTime}
              setBiddingStartTime={setBiddingStartTime}
              biddingEndDate={biddingEndDate}
              setBiddingEndDate={setBiddingEndDate}
              biddingEndTime={biddingEndTime}
              setBiddingEndTime={setBiddingEndTime}
              maturityDate={maturityDate}
              setMaturityDate={setMaturityDate}
              maturityTime={maturityTime}
              setMaturityTime={setMaturityTime}
              feePercentage={feePercentage}
              setFeePercentage={setFeePercentage}
              handleFeeInputChange={handleFeeInputChange}
              handleFeeSliderChange={handleFeeSliderChange}
              isDeploying={isDeploying}
              deployContractWithCheck={deployContractWithCheck}
              progress={progress}
              isFinishing={isFinishing}
              showFeeTooltip={showFeeTooltip}
              setShowFeeTooltip={setShowFeeTooltip}
            />
          </Box>
          {/* Box Preview + Network Fee */}
          <Flex flex={1.5} direction="column" gap={6} minW="400px" ml={8}>
            <PreviewBox
              selectedPair={selectedPair}
              strikePrice={strikePrice}
              priceChange={priceChange}
              currentPrice={currentPrice}
              biddingStartDate={biddingStartDate}
              biddingStartTime={biddingStartTime}
              biddingEndDate={biddingEndDate}
              biddingEndTime={biddingEndTime}
              maturityDate={maturityDate}
              maturityTime={maturityTime}
              feePercentage={feePercentage}
              formatShortDateTime={formatShortDateTime}
            />
            <NetworkFeeBox
              selectedGasSpeed={selectedGasSpeed}
              setSelectedGasSpeed={setSelectedGasSpeed}
              isEstimatingGas={isEstimatingGas}
              gasEstimate={gasEstimate}
            />
          </Flex>
        </Flex>
        {/* Progress bar và Button nằm ngoài box, dưới form, full width */}
        <Box mt={10} w="100%">
          <DeployProgressBar progress={progress} isFinishing={isFinishing} />
          <DeployButton
            isDeploying={isDeploying}
            deployContractWithCheck={deployContractWithCheck}
            progress={progress}
            signAndSubmitTransaction={signAndSubmitTransaction}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default Owner; 