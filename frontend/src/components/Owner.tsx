import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
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
  deployMultiOutcomeMarket,
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
  const router = useRouter();
  const { connected, account, signAndSubmitTransaction } = useWallet();
  
  const [strikePrice, setStrikePrice] = useState('');
  const [isMultiOutcome, setIsMultiOutcome] = useState(false);
  const [ranges, setRanges] = useState<{ min: string; max: string; name: string; kind: 'lt'|'range'|'gt' }[]>([
    { min: '', max: '', name: '', kind: 'range' },
    { min: '', max: '', name: '', kind: 'range' }
  ]);
  const [rangesError, setRangesError] = useState<string | null>(null);

  // Validate ranges whenever they change
  useEffect(() => {
    if (isMultiOutcome && ranges.length > 0) {
      const error = validateRanges(ranges);
      setRangesError(error);
    } else {
      setRangesError(null);
    }
  }, [ranges, isMultiOutcome]);

  // Helper function to format numeric input
  const formatNumericInput = (value: string): string => {
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit to 8 decimal places
    if (parts[1] && parts[1].length > 8) {
      return parts[0] + '.' + parts[1].substring(0, 8);
    }
    return cleaned;
  };

  const validateRanges = (items: { min: string; max: string; name: string; kind: 'lt'|'range'|'gt' }[]): string | null => {
    // Filter out empty ranges
    const nonEmptyRanges = items.filter(r => {
      if (r.kind === 'lt') return r.max.trim() !== '';
      if (r.kind === 'gt') return r.min.trim() !== '';
      return r.min.trim() !== '' && r.max.trim() !== '';
    });

    if (nonEmptyRanges.length < 2) {
      return 'At least 2 valid ranges required.';
    }

    const normalized = nonEmptyRanges.map((r, i) => {
      const min = r.kind === 'lt' ? Number.NEGATIVE_INFINITY : Number(r.min);
      const max = r.kind === 'gt' ? Number.POSITIVE_INFINITY : Number(r.max);
      return { idx: i, min, max, original: r };
    });
    
    // basic validity
    for (const n of normalized) {
      if (Number.isNaN(n.min) || Number.isNaN(n.max)) return 'All boundaries must be numeric.';
      if (n.min >= n.max) return 'Each outcome must satisfy min < max.';
      if (n.min <= 0 && n.min !== Number.NEGATIVE_INFINITY) return 'All values must be positive numbers.';
      if (n.max <= 0 && n.max !== Number.POSITIVE_INFINITY) return 'All values must be positive numbers.';
    }
    
    // check overlap (O(n log n))
    const sorted = [...normalized].sort((a,b) => a.min - b.min);
    for (let i=1;i<sorted.length;i++) {
      if (sorted[i].min < sorted[i-1].max) {
        return 'Outcomes must be non-overlapping and sorted.';
      }
    }
    return null;
  };
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
    if (!selectedPair || !maturityDate || !maturityTime || !biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime) {
      return;
    }
    try {
      setIsEstimatingGas(true);
      const strikePriceInteger = isMultiOutcome ? 0 : Math.round(parseFloat(strikePrice || '0') * STRIKE_PRICE_MULTIPLIER);
      const maturityTimestamp = Math.floor(new Date(`${maturityDate} ${maturityTime}`).getTime() / 1000);
      const biddingStartTimestamp = Math.floor(new Date(`${biddingStartDate} ${biddingStartTime}`).getTime() / 1000);
      const biddingEndTimestamp = Math.floor(new Date(`${biddingEndDate} ${biddingEndTime}`).getTime() / 1000);
      const feeValue = Math.round(parseFloat(feePercentage) * 10);
      if (isMultiOutcome && rangesError) {
        return; // skip estimation until valid
      }
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
  }, [selectedPair, strikePrice, maturityDate, maturityTime, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, selectedGasSpeed, feePercentage, isMultiOutcome, rangesError]);

  useEffect(() => {
    const hasRequiredFields = isMultiOutcome 
      ? selectedPair && maturityDate && maturityTime && biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime && !rangesError
      : selectedPair && strikePrice && maturityDate && maturityTime && biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime;
    
    if (hasRequiredFields) {
      estimateGas();
    }
  }, [selectedPair, strikePrice, maturityDate, maturityTime, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, selectedGasSpeed, feePercentage, estimateGas, isMultiOutcome, rangesError]);

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
    if (!selectedPair || !maturityDate || !maturityTime || !biddingStartDate || !biddingStartTime || !biddingEndDate || !biddingEndTime) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    setIsDeploying(true);
    try {
      const strikePriceInteger = isMultiOutcome ? 0 : Math.round(parseFloat(strikePrice || '0') * STRIKE_PRICE_MULTIPLIER);
      const maturityTimestamp = Math.floor(new Date(`${maturityDate} ${maturityTime}`).getTime() / 1000);
      const biddingStartTimestamp = Math.floor(new Date(`${biddingStartDate} ${biddingStartTime}`).getTime() / 1000);
      const biddingEndTimestamp = Math.floor(new Date(`${biddingEndDate} ${biddingEndTime}`).getTime() / 1000);
      const feeValue = Math.round(parseFloat(feePercentage) * 10);
      if (isNaN(maturityTimestamp) || isNaN(biddingStartTimestamp) || isNaN(biddingEndTimestamp) || isNaN(feeValue)) {
        toast({ title: 'Invalid input', description: 'Please check all numeric fields.', status: 'error', duration: 4000, isClosable: true });
        setIsDeploying(false);
        return;
      }
      if (isMultiOutcome) {
        const err = validateRanges(ranges);
        setRangesError(err);
        if (err) {
          throw new Error(err);
        }
        // Validate dynamic ranges
        const U64_MAX_STR = '18446744073709551615';
        const cleaned = ranges.slice(0, 10).map((r, i) => {
          const isLT = r.kind === 'lt';
          const isGT = r.kind === 'gt';
          // Convert APT to octas (multiply by 1e8)
          const minVal = isLT ? '0' : String(Math.floor(Number(r.min) * 1e8));
          const maxVal = isGT ? U64_MAX_STR : String(Math.floor(Number(r.max) * 1e8));
          return {
            // keep as string to avoid JS precision issues for u64 max
            min: minVal,
            max: maxVal,
            name: r.name && r.name.trim() ? r.name.trim() : `O${i}`
          };
        }).filter(r => r.min !== 'NaN' && r.max !== 'NaN');
        if (cleaned.length < 2) throw new Error('At least 2 ranges required');
        // Normalize open-ended to large finite bounds for client-side check (contract still validates ranges)
        const parsed = cleaned.map(r => ({
          min: r.min,
          max: r.max,
          name: r.name
        }));
        parsed.sort((a,b) => Number(a.min) - Number(b.min));
        for (let i=0;i<parsed.length;i++) {
          if (Number(parsed[i].min) >= Number(parsed[i].max)) {
            throw new Error('Invalid ranges: min < max and numeric');
          }
          if (i>0 && Number(parsed[i].min) < Number(parsed[i-1].max)) {
            throw new Error('Ranges must be non-overlapping and sorted');
          }
        }
        const txHash = await deployMultiOutcomeMarket(
          async (tx: unknown) => {
            const result = await (signAndSubmitTransaction as (tx: unknown) => Promise<{ hash: string }>)(tx);
            return result.hash;
          },
          {
            pairName: getPriceFeedIdFromPairName(selectedPair.pair),
            priceRanges: parsed,
            feePercentage: feeValue,
            biddingStartTime: biddingStartTimestamp,
            biddingEndTime: biddingEndTimestamp,
            maturityTime: maturityTimestamp,
          }
        );
        toast({ title: 'Multi-outcome market submitted!', description: `Transaction hash: ${txHash}`, status: 'info', duration: 5000, isClosable: true });
        try { localStorage.removeItem('allMarketsCache'); } catch {}
        router.push('/listaddress/1');
      } else {
        const params = {
          pairName: getPriceFeedIdFromPairName(selectedPair.pair),
          strikePrice: strikePriceInteger,
          feePercentage: feeValue,
          biddingStartTime: biddingStartTimestamp,
          biddingEndTime: biddingEndTimestamp,
          maturityTime: maturityTimestamp,
        };
        const txHash = await deployMarketWithGasSettings(
          async (tx: unknown) => {
            const result = await (signAndSubmitTransaction as (tx: unknown) => Promise<{ hash: string }>)(tx);
            return result.hash;
          },
          params,
          selectedGasSpeed
        );
        toast({ title: 'Binary market submitted!', description: `Transaction hash: ${txHash}`, status: 'info', duration: 5000, isClosable: true });
        try { localStorage.removeItem('allMarketsCache'); } catch {}
        router.push('/listaddress/1');
      }
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

  // For multi-outcome, we don't need strikePrice, but we need valid ranges
  const progressFields = isMultiOutcome 
    ? [selectedPair, ranges.length >= 2 && !rangesError, biddingStartDate && biddingStartTime, biddingEndDate && biddingEndTime, maturityDate && maturityTime, feePercentage]
    : [selectedPair, strikePrice, biddingStartDate && biddingStartTime, biddingEndDate && biddingEndTime, maturityDate && maturityTime, feePercentage];
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
              setStrikePrice={(value) => setStrikePrice(formatNumericInput(value))}
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
              isMultiOutcome={isMultiOutcome}
              setIsMultiOutcome={setIsMultiOutcome}
              ranges={ranges}
              onChangeRange={(idx, field, value) => {
                const formattedValue = (field === 'min' || field === 'max') ? formatNumericInput(value) : value;
                setRanges(prev => prev.map((r,i) => i===idx ? { ...r, [field]: formattedValue } : r));
              }}
              onAddRange={() => setRanges(prev => prev.length>=10 ? prev : [...prev, { min:'', max:'', name:'', kind:'range' }])}
              onRemoveRange={(idx) => setRanges(prev => prev.filter((_,i)=>i!==idx))}
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
              isMultiOutcome={isMultiOutcome}
              ranges={ranges}
              rangesError={rangesError}
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