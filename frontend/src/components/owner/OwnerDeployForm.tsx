import React from 'react';
import {
  Box, VStack, Heading, Text, Select, InputGroup, Input, InputRightAddon, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Tooltip
} from '@chakra-ui/react';
import { FaInfoCircle } from 'react-icons/fa';
import { TradingPairInfo } from '../../config/tradingPairs';

interface OwnerDeployFormProps {
  availablePairs: TradingPairInfo[];
  selectedPair: TradingPairInfo | null;
  setSelectedPair: (pair: TradingPairInfo | null) => void;
  strikePrice: string;
  setStrikePrice: (v: string) => void;
  biddingStartDate: string;
  setBiddingStartDate: (v: string) => void;
  biddingStartTime: string;
  setBiddingStartTime: (v: string) => void;
  biddingEndDate: string;
  setBiddingEndDate: (v: string) => void;
  biddingEndTime: string;
  setBiddingEndTime: (v: string) => void;
  maturityDate: string;
  setMaturityDate: (v: string) => void;
  maturityTime: string;
  setMaturityTime: (v: string) => void;
  feePercentage: string;
  setFeePercentage: (v: string) => void;
  handleFeeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFeeSliderChange: (val: number) => void;
  isDeploying: boolean;
  deployContractWithCheck: () => void;
  progress: number;
  isFinishing: boolean;
  showFeeTooltip: boolean;
  setShowFeeTooltip: (v: boolean) => void;
}

const OwnerDeployForm: React.FC<OwnerDeployFormProps> = ({
  availablePairs, selectedPair, setSelectedPair, strikePrice, setStrikePrice,
  biddingStartDate, setBiddingStartDate, biddingStartTime, setBiddingStartTime,
  biddingEndDate, setBiddingEndDate, biddingEndTime, setBiddingEndTime,
  maturityDate, setMaturityDate, maturityTime, setMaturityTime,
  feePercentage, handleFeeInputChange, handleFeeSliderChange,
 showFeeTooltip, setShowFeeTooltip
}) => {
  return (
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
        <Select placeholder="Select Asset" value={selectedPair?.pair || ''} onChange={e => {
          const selected = availablePairs.find((pair) => pair.pair === e.target.value);
          setSelectedPair(selected || null);
        }} bg="#23262f" border="1px solid #35373f" color="white" borderRadius="xl" h="48px" fontSize="lg" _placeholder={{ color: '#888' }} _hover={{ borderColor: '#4F8CFF' }} _focus={{ borderColor: '#4F8CFF', boxShadow: '0 0 0 1px #4F8CFF' }}>
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
  );
};

export default OwnerDeployForm; 