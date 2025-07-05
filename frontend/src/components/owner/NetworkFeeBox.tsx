import React from 'react';
import { Box, Text, HStack, VStack, Icon, Spinner, Divider } from '@chakra-ui/react';
import { FaGasPump, FaRocket, FaArrowUp, FaClock } from 'react-icons/fa';
import { GasSpeed, GasEstimate } from '../../services/aptosMarketService';

interface NetworkFeeBoxProps {
  selectedGasSpeed: GasSpeed;
  setSelectedGasSpeed: (v: GasSpeed) => void;
  isEstimatingGas: boolean;
  gasEstimate: GasEstimate | null;
}

const options = [
  {
    label: 'Normal',
    icon: FaGasPump,
    color: '#4F8CFF',
    desc1: 'Standard',
    desc2: 'Low cost',
    value: GasSpeed.NORMAL,
    border: '2px solid #4F8CFF',
    shadow: '0 0 8px #4F8CFF33',
  },
  {
    label: 'Fast',
    icon: FaRocket,
    color: '#A770EF',
    desc1: 'Faster',
    desc2: 'Moderate cost',
    value: GasSpeed.FAST,
    border: '2px solid #A770EF',
    shadow: '0 0 8px #A770EF33',
  },
  {
    label: 'Instant',
    icon: FaArrowUp,
    color: '#ED5FA7',
    desc1: 'Highest',
    desc2: 'Premium cost',
    value: GasSpeed.INSTANT,
    border: '2px solid #ED5FA7',
    shadow: '0 0 8px #ED5FA733',
  },
];

const NetworkFeeBox: React.FC<NetworkFeeBoxProps> = ({ selectedGasSpeed, setSelectedGasSpeed, isEstimatingGas, gasEstimate }) => (
  <Box bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="320px">
    <Text color="#B0B3B8" fontWeight="bold" fontSize="md" mb={3}>Deploy Speed</Text>
    <HStack spacing={4} mb={6} align="stretch">
      {options.map(opt => (
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
);

export default NetworkFeeBox; 