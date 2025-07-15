import { Box, HStack, Button, Flex, Text, FormControl, FormLabel, Input } from '@chakra-ui/react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useSpring, animated } from '@react-spring/web';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface MarketBetPanelProps {
  phase: Phase;
  selectedSide: number | null;
  setSelectedSide: (side: number) => void;
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  handleBid: () => void;
  isSubmitting: boolean;
  connected: boolean;
  longPercentage: number;
  shortPercentage: number;
  userPositions: { long: number; short: number };
  fee: string;
  longAmount: number;
  shortAmount: number;
  totalAmount: number;
}

const MarketBetPanel: React.FC<MarketBetPanelProps> = ({
  phase, selectedSide, setSelectedSide, bidAmount, setBidAmount, handleBid, isSubmitting, connected, longPercentage, shortPercentage, userPositions, fee, longAmount, shortAmount, totalAmount
}) => {
  // Calculate potential profit (theoretical payout if market resolves immediately after bet)
  const amount = parseFloat(bidAmount) || 0;
  const feePercent = parseFloat(fee) || 0;
  let potentialProfit = 0;
  if (amount > 0 && (selectedSide === 0 || selectedSide === 1)) {
    if (selectedSide === 0) {
      // UP/Long
      const numerator = totalAmount + amount * 100000000;
      const denominator = longAmount + amount * 100000000;
      if (denominator > 0) {
        potentialProfit = (numerator / denominator) * amount * (1 - feePercent / 100);
      }
    } else if (selectedSide === 1) {
      // DOWN/Short
      const numerator = totalAmount + amount * 100000000;
      const denominator = shortAmount + amount * 100000000;
      if (denominator > 0) {
        potentialProfit = (numerator / denominator) * amount * (1 - feePercent / 100);
      }
    }
  } else {
    potentialProfit = 0;
  }

  // Animated number for profit
  const { animatedProfit } = useSpring({
    animatedProfit: potentialProfit,
    config: { tension: 170, friction: 26 },
  });

  const hasPosition = userPositions.long > 0 || userPositions.short > 0;

  // Disable input and buttons in Pending phase
  const isPending = phase === Phase.Pending;

  return (
    <Box bg="gray.800" p={4} borderRadius="xl" mb={4} borderWidth={1} borderColor="gray.700">
      {/* LONG/SHORT Ratio */}
      <HStack align="center" spacing={3} w="100%">
        <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.800" whiteSpace="nowrap" mb={4}>{longPercentage.toFixed(0)}%</Text>
        <Flex flex="1" align="center" w="100%" h="18px" borderRadius="full" bg="gray.800" border="5px solid" borderColor="gray.400" position="relative" overflow="hidden" boxShadow="inset 0 1px 3px rgba(0,0,0,0.6)" mb={4} p={0}>
          {longPercentage === 100 ? (
            <Box position="absolute" width="100%" bgGradient="linear(to-r, #00ea00, #56ff56, #efef8b)" h="100%" left="0" top="0" zIndex={1} />
          ) : shortPercentage === 100 ? (
            <Box position="absolute" width="100%" bgGradient="linear(to-r, #FF6B81, #D5006D)" h="100%" right="0" top="0" zIndex={0} />
          ) : (
            <>
              <Box position="absolute" width={`${longPercentage}%`} bgGradient="linear(to-r, #00ea00, #56ff56, #efef8b)" transition="width 0.6s ease" h="100%" display="flex" alignItems="center" justifyContent="flex-end" pr={3} left="0" top="0" zIndex={1} />
              <Box position="absolute" right="0" top="0" h="100%" width={`${shortPercentage}%`} bgGradient="linear(to-r, #FF6B81, #D5006D)" transition="width 0.6s ease" display="flex" alignItems="center" justifyContent="flex-start" pl={3} zIndex={0} />
            </>
          )}
        </Flex>
        <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.800" whiteSpace="nowrap" mb={4}>{shortPercentage.toFixed(0)}%</Text>
      </HStack>
      <HStack spacing={4} mb={3} ml={2} mr={2}>
        <Button border="1px solid" borderColor="gray.300" borderRadius="20px" colorScheme="gray" bg="gray.800" width="50%" onClick={() => setSelectedSide(0)} leftIcon={<FaArrowUp />} textColor="#28a745" textShadow="1px 1px 12px rgba(40, 167, 69, 0.7)" isDisabled={!connected || phase !== 1 || isPending} _hover={{ bg: "gray.700", boxShadow: "0 4px 8px rgba(220, 53, 69, 0.2)" }} _active={{ bg: "#cececc" }} isActive={selectedSide === 0}>UP</Button>
        <Button border="1px solid" borderColor="gray.300" borderRadius="20px" colorScheme="gray" bg="gray.800" width="50%" onClick={() => setSelectedSide(1)} leftIcon={<FaArrowDown />} textColor="#dc3545" textShadow="1px 1px 12px rgba(220, 53, 69, 0.7)" isDisabled={!connected || phase !== 1 || isPending} _hover={{ bg: "gray.700", boxShadow: "0 4px 8px rgba(220, 53, 69, 0.2)" }} _active={{ bg: "#cececc" }} isActive={selectedSide === 1}>DOWN</Button>
      </HStack>
      <FormControl mb={2} mt={6} color="white">
        <FormLabel>You&apos;re betting</FormLabel>
        <Input 
          placeholder="Enter amount in APT" 
          bg="gray.800" 
          color="white" 
          borderColor="gray.600" 
          borderRadius="md" 
          mb={3} ml={2} mr={2}
          value={bidAmount}
          inputMode="decimal"
          pattern="^\d*\.?\d*$"
          onChange={e => {
            const val = e.target.value;
            // Only allow positive numbers and decimals
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              setBidAmount(val);
            }
          }}
          isDisabled={isPending}
        />
      </FormControl>
      <HStack spacing={2} mt={1} mb={2} ml={2} mr={2} alignItems="center" justifyContent="center">
        <Button colorScheme="#0040C1" bg="#0040C1" color="white" _hover={{ bg: "#0040C1" }} width="100%" py={6} mb={3} ml={2} mr={2} onClick={handleBid} isLoading={isSubmitting} loadingText="Placing bid..." isDisabled={!connected || selectedSide === null || phase !== 1 || isPending}>Betting to rich</Button>
      </HStack>
      <Flex justify="space-between" px={2} mb={1}>
        <Text fontSize="lg" color="gray.400">Fee:</Text>
        <Text fontSize="lg" color="gray.400">{fee}%</Text>
      </Flex>
      <Flex justify="space-between" px={2} mb={1} align="center">
        <Text fontSize="lg" color="gray.400">Potential Profit:</Text>
        <Box display="flex" alignItems="center" gap={2}>
          <Box as={animated.span} fontSize="sm" fontWeight="bold" color="white" minW="90px" textAlign="right" mr={3}>
            {potentialProfit > 0 ? animatedProfit.to((v: number) => `~${v.toFixed(4)} APT`) : '--'}
          </Box>
        </Box>
      </Flex>
      <Text fontSize="lg" fontWeight="bold" mb={1} mt={3} color="#FEDF56">My Position</Text>
      {hasPosition ? (
        <>
          <Flex justify="space-between" mb={1.5}>
            <Text color="green.400">LONG:</Text>
            <Text color="white">{(userPositions.long / 100000000).toFixed(4)} APT</Text>
          </Flex>
          <Flex justify="space-between">
            <Text color="red.400">SHORT:</Text>
            <Text color="white">{(userPositions.short / 100000000).toFixed(4)} APT</Text>
          </Flex>
        </>
      ) : (
        <>
          <Flex justify="space-between" mb={2}>
            <Text color="green.400">LONG:</Text>
            <Text color="white">{(userPositions.long / 100000000).toFixed(4)} APT</Text>
          </Flex>
          <Flex justify="space-between">
            <Text color="red.400">SHORT:</Text>
            <Text color="white">{(userPositions.short / 100000000).toFixed(4)} APT</Text>
          </Flex>
        </>
      )}
    </Box>
  );
};

export default MarketBetPanel; 