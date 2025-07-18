import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  useToast, 
  Container,
  Flex
} from '@chakra-ui/react';
import { TradingPairInfo, getPriceFeedIdFromPairName } from '../config/tradingPairs';
import { PriceService } from '../services/PriceService';

import { 
  estimateDeployMarketGas, 
  deployMarketWithGasSettings,
  GasSpeed,
  GasEstimate,
} from '../services/aptosMarketService';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import OwnerDeployForm from './owner/OwnerDeployForm';
import PreviewBox from './owner/PreviewBox';
import NetworkFeeBox from './owner/NetworkFeeBox';
import DeployProgressBar from './owner/DeployProgressBar';
import DeployButton from './owner/DeployButton';

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
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [selectedGasSpeed, setSelectedGasSpeed] = useState<GasSpeed>(GasSpeed.NORMAL);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  const toast = useToast();


  const availablePairs: TradingPairInfo[] = [
    { pair: 'APT/USD', symbol: 'APTUSDT', priceFeedId: '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5' },
    { pair: 'BTC/USD', symbol: 'BTCUSDT', priceFeedId: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43' },
    { pair: 'ETH/USD', symbol: 'ETHUSDT', priceFeedId: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace' },
    { pair: 'SOL/USD', symbol: 'SOLUSDT', priceFeedId: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d' },
    { pair: 'SUI/USD', symbol: 'SUIUSDT', priceFeedId: '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744' },
    { pair: 'BNB/USD', symbol: 'BNBUSDT', priceFeedId: '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f' },
    { pair: 'WETH/USD', symbol: 'WETHUSDT', priceFeedId: '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6' },
  ];




  const fetchDeployedContracts = useCallback(async () => {
    if (!connected || !account) return;
    try {
      // const userMarketInfos = await getMarketsByOwner(account.address.toString());
      // const detailsArr = await Promise.all(
      //   userMarketInfos.map(async (info) => {
      //     const details = await getMarketDetails(info.market_address);
      //     return { info, details };
      //   })
      // );
    } catch (error) {
      console.error('Error fetching deployed contracts:', error);
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
  const estimateGas = useCallback(async () => {
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
        pairName: getPriceFeedIdFromPairName(selectedPair.pair),
        strikePrice: String(strikePriceInteger),
        feePercentage: String(feeValue),
        biddingStartTime: String(biddingStartTimestamp),
        biddingEndTime: String(biddingEndTimestamp),
        maturityTime: String(maturityTimestamp),
      };
      console.log('[estimateGas] params:', params, 'selectedGasSpeed:', selectedGasSpeed);
      const estimate = await estimateDeployMarketGas(params, selectedGasSpeed);
      setGasEstimate(estimate);
    } catch (error: unknown) {
      console.error('Error estimating gas:', error);
      // Don't show toast for gas estimation errors as they're not critical
    } finally {
      setIsEstimatingGas(false);
    }
  }, [selectedPair, strikePrice, maturityDate, maturityTime, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, selectedGasSpeed, feePercentage]);

  useEffect(() => {
    if (selectedPair && strikePrice && maturityDate && maturityTime && biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime) {
      estimateGas();
    }
  }, [selectedPair, strikePrice, maturityDate, maturityTime, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, selectedGasSpeed, feePercentage, estimateGas]);

  // Thêm log để debug gasEstimate khi thay đổi gas option
  useEffect(() => {
    if (gasEstimate) {
      console.log('[Owner] gasEstimate updated:', gasEstimate, 'selectedGasSpeed:', selectedGasSpeed);
    }
  }, [gasEstimate, selectedGasSpeed]);

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
        pairName: getPriceFeedIdFromPairName(selectedPair.pair),
        strikePrice: strikePriceInteger,
        feePercentage: feeValue,
        biddingStartTime: biddingStartTimestamp,
        biddingEndTime: biddingEndTimestamp,
        maturityTime: maturityTimestamp,
      };
      // Wrap signAndSubmitTransaction to return a string hash if needed
      const txHash = await deployMarketWithGasSettings(
        async (tx: unknown) => {
          const result = await (signAndSubmitTransaction as (tx: unknown) => Promise<{ hash: string }>)(tx);
          return result.hash;
        },
        params,
        selectedGasSpeed
      );
      toast({ title: 'Market deployment transaction submitted!', description: `Transaction hash: ${txHash}`, status: 'info', duration: 5000, isClosable: true, });
      resetForm();
      setTimeout(() => fetchDeployedContracts(), 3000);
    } catch (error: unknown) {
      console.error('Error deploying contract:', error);
      toast({ title: 'Error deploying market', description: (error as Error)?.message || 'An unexpected error occurred.', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsDeploying(false);
    }
  };

  // Fee slider logic
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const handleFeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      const num = parseFloat(value);
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

  const getPriceChange = () => {
    if (!strikePrice || !currentPrice) return null;
    const strike = parseFloat(strikePrice);
    if (!strike || strike === 0) return null;
    const diff = currentPrice - strike;
    const percent = (diff / strike) * 100;
    return percent;
  };
  const priceChange = getPriceChange();

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

  const isValidTime = () => {
    if (!biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime || !maturityDate || !maturityTime) return false;
    const now = Date.now();
    const start = new Date(`${biddingStartDate}T${biddingStartTime}`).getTime();
    const end = new Date(`${biddingEndDate}T${biddingEndTime}`).getTime();
    const maturity = new Date(`${maturityDate}T${maturityTime}`).getTime();
    return now <= start && start < end && end < maturity;
  };

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

  function formatShortDateTime(dateStr: string, timeStr: string) {
    if (!dateStr || !timeStr) return '';
    // dateStr: yyyy-mm-dd or yyyy/MM/dd
    const [ m, d] = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    return `${d}/${m} ${timeStr}`;
  }



  return (
    <Box bg="#0A0B0F" minH="100vh" color="white">
      <Container maxW="1200px" py={12}>
        <Flex align="start" direction="row" w="full">
          {/* Form create market */}
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