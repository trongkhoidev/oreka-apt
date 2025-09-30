import { Box, Button, Flex, Text, FormControl, FormLabel, Input, VStack, HStack } from '@chakra-ui/react';
import { useSpring, animated } from '@react-spring/web';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface MultiOutcomeBetPanelProps {
  phase: Phase;
  selectedOutcome: number | null;
  setSelectedOutcome: (outcome: number) => void;
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  handleBid: () => void;
  isSubmitting: boolean;
  connected: boolean;
  userPositions: number[];
  fee: string;
  totalAmount: number;
  priceRanges: Array<{
    min_price: number | string;
    max_price: number | string;
    outcome_name: string;
  }>;
  outcomeAmounts: number[];
}

// Generate meaningful outcome labels from price ranges
function generateOutcomeLabel(priceRange: { min_price: number | string; max_price: number | string; outcome_name: string }): string {
  const min = typeof priceRange.min_price === 'string' ? Number(priceRange.min_price) : priceRange.min_price;
  const max = typeof priceRange.max_price === 'string' ? Number(priceRange.max_price) : priceRange.max_price;
  if (isNaN(min) || isNaN(max)) return 'Invalid Price';

  // Always convert from octas to USD (divide by 1e8)
  const minPrice = min / 1e8;
  const maxPrice = max / 1e8;

  const U64_MAX = 18446744073709551615;
  const U64_MAX_APT = U64_MAX / 1e8;
  const U64_MAX_STR = '18446744073709551615';

  const fmt = (value: number) => value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: 4
  });

  const isMaxU64 = max.toString() === U64_MAX_STR || maxPrice >= U64_MAX_APT;
  if (minPrice === 0 && isMaxU64) return 'Any Price';
  if (minPrice === 0) return `<$${fmt(maxPrice)}`;
  if (isMaxU64) return `≥$${fmt(minPrice)}`;
  return `≥$${fmt(minPrice)} to <$${fmt(maxPrice)}`;
}

const MultiOutcomeBetPanel: React.FC<MultiOutcomeBetPanelProps> = ({
  phase, selectedOutcome, setSelectedOutcome, bidAmount, setBidAmount, handleBid, isSubmitting, connected, userPositions, fee, totalAmount, priceRanges, outcomeAmounts
}) => {
  console.log('[MultiOutcomeBetPanel] Component rendered with userPositions:', {
    userPositions,
    length: userPositions.length,
    hasPositions: userPositions.some(pos => pos > 0),
    details: userPositions.map((pos, idx) => ({
      index: idx,
      value: pos,
      inAPT: (pos / 1e8).toFixed(4)
    })),
    priceRangesLength: priceRanges.length,
    outcomeAmountsLength: outcomeAmounts.length
  });
  // Calculate potential profit for selected outcome
  const amount = parseFloat(bidAmount) || 0;
  const feePercent = parseFloat(fee) || 0;
  let potentialProfit = 0;
  
  if (amount > 0 && selectedOutcome !== null && outcomeAmounts[selectedOutcome] !== undefined) {
    const currentOutcomeAmount = outcomeAmounts[selectedOutcome] || 0;
    const newTotalAmount = totalAmount + amount * 1e8;
    const newOutcomeAmount = currentOutcomeAmount + amount * 1e8;
    
    if (newOutcomeAmount > 0) {
      // Calculate potential profit: (total pool / winning pool) * bet amount - fee
      potentialProfit = (newTotalAmount / newOutcomeAmount) * amount * (1 - feePercent / 100);
    }
  }

  // Animated number for profit
  const { animatedProfit } = useSpring({
    animatedProfit: potentialProfit,
    config: { tension: 170, friction: 26 },
  });

  // Ensure userPositions is properly formatted array
  const normalizedUserPositions = Array.isArray(userPositions) ? userPositions : [];
  const hasPosition = normalizedUserPositions.some(pos => pos > 0);
  
  // Enhanced debug logging for positions
  console.log('[MultiOutcomeBetPanel] Enhanced debug positions:', {
    userPositions,
    normalizedUserPositions,
    userPositionsString: JSON.stringify(userPositions),
    normalizedString: JSON.stringify(normalizedUserPositions),
    hasPosition,
    userPositionsLength: userPositions.length,
    normalizedLength: normalizedUserPositions.length,
    priceRangesLength: priceRanges.length,
    outcomeAmounts,
    outcomeAmountsLength: outcomeAmounts.length,
    userPositionsDetails: normalizedUserPositions.map((pos, idx) => ({
      index: idx,
      value: pos,
      isGreaterThanZero: pos > 0,
      inAPT: (pos / 1e8).toFixed(4)
    })),
    someCheck: normalizedUserPositions.some(pos => pos > 0),
    everyCheck: normalizedUserPositions.every(pos => pos === 0),
    filterCheck: normalizedUserPositions.filter(pos => pos > 0)
  });
  const isPending = phase === Phase.Pending;

  return (
    <Box bg="gray.800" p={4} borderRadius="xl" mb={4} borderWidth={1} borderColor="gray.700">
      {/* Outcome Selection */}
      <VStack spacing={3} mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>
          Select Price Range
        </Text>
        {priceRanges.map((priceRange, index) => {
          const outcomeAmount = outcomeAmounts[index] || 0;
          const actualTotal = outcomeAmounts.reduce((sum, amount) => sum + amount, 0);
          const percentage = actualTotal > 0 ? (outcomeAmount / actualTotal) * 100 : 0;
          // const userAmount = normalizedUserPositions[index] || 0; // Unused for now
          
          const isSelected = selectedOutcome === index;
          
          return (
            <Box
              key={index}
              w="100%"
              p={2}
              borderRadius="12px"
              bg={isSelected ? "#2B365A" : "#3A3F4E"}
              cursor="pointer"
              onClick={() => setSelectedOutcome(index)}
              _hover={{ 
                bg: isSelected ? "#344A6B" : "#4A5568",
                "& .percentage-bar": {
                  bg: isSelected ? "#3A4F70" : "#5A6570"
                }
              }}
              transition="all 0.2s"
              position="relative"
              overflow="hidden"
              border={isSelected ? "1px solid" : "1px solid transparent"}
              borderColor={isSelected ? "#4A5568" : "transparent"}
            >
              {/* Filled bar to visualize selection percent */}
              <Box 
                className="percentage-bar"
                position="absolute" 
                left={0} 
                top={0} 
                bottom={0} 
                width={`${percentage}%`} 
                bg={isSelected ? "#3A4F70" : "#4A5568"} 
                opacity={0.8} 
                borderRadius="10px" 
                transition="all 0.3s ease" 
              />
              <HStack position="relative" spacing={2} align="center">
                {isSelected && (
                  <Box
                    w="4"
                    h="4"
                    borderRadius="50%"
                    bg="#4A5568"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Box
                      w="2"
                      h="2"
                      borderRadius="50%"
                      bg="#FFFFFF"
                    />
                  </Box>
                )}
                <Text color={isSelected ? "#FFFFFF" : "#E2E8F0"} fontWeight="semibold" fontSize="sm" noOfLines={1} flex={1}>
                  {generateOutcomeLabel(priceRange)}
                </Text>
                <Text color={isSelected ? "#FFFFFF" : "#E2E8F0"} fontWeight="bold" fontSize="sm" minW="fit-content">
                  {percentage.toFixed(1)}%
                </Text>
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {/* Betting Amount */}
      <FormControl mb={4} color="white">
        <FormLabel>Amount</FormLabel>
        <Input 
          placeholder="Enter amount in APT" 
          bg="gray.800" 
          color="white" 
          borderColor="gray.600" 
          borderRadius="md" 
          mb={3}
          value={bidAmount}
          inputMode="decimal"
          pattern="^\d*\.?\d*$"
          onChange={e => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              setBidAmount(val);
            }
          }}
          isDisabled={isPending}
        />
      </FormControl>

      {/* Bet Button */}
      <Button 
        colorScheme="blue" 
        bg="#4F8CFF" 
        color="white" 
        _hover={{ bg: "#3B82F6" }} 
        width="100%" 
        py={6} 
        mb={4} 
        onClick={handleBid} 
        isLoading={isSubmitting} 
        loadingText="Placing bid..." 
        isDisabled={!connected || selectedOutcome === null || phase !== 1 || isPending || !bidAmount}
      >
        Place Bet
      </Button>

      {/* Info Section */}
      <VStack spacing={2} align="stretch">
        <Flex justify="space-between" px={2}>
          <Text fontSize="sm" color="gray.400">Fee:</Text>
          <Text fontSize="sm" color="gray.400">{fee}%</Text>
        </Flex>
        
        <Flex justify="space-between" px={2} align="center">
          <Text fontSize="sm" color="gray.400">Potential Profit:</Text>
          <Box as={animated.span} fontSize="sm" fontWeight="bold" color="white" minW="90px" textAlign="right">
            {potentialProfit > 0 ? animatedProfit.to((v: number) => `~${v.toFixed(4)} APT`) : '--'}
          </Box>
        </Flex>

        <Text fontSize="lg" fontWeight="bold" mt={3} color="#FEDF56">My Positions</Text>
        {hasPosition ? (
          <VStack spacing={1} align="stretch">
            {priceRanges.map((priceRange, index) => {
              const userAmount = normalizedUserPositions[index] || 0;
              console.log(`[MultiOutcomeBetPanel] Outcome ${index} (My Positions):`, {
                userAmount,
                priceRange: priceRange.outcome_name,
                shouldShow: userAmount > 0,
                normalizedUserPositions,
                index
              });
              
              if (userAmount === 0) return null;
              
              return (
                <Flex key={index} justify="space-between" align="center" px={2} py={1} bg="gray.700" borderRadius="md">
                  <Text color="white" fontSize="sm" noOfLines={1} flex={1}>
                    {generateOutcomeLabel(priceRange)}
                  </Text>
                  <Text color="green.400" fontSize="sm" fontWeight="bold">
                    {(userAmount / 1e8).toFixed(4)} APT
                  </Text>
                </Flex>
              );
            })}
          </VStack>
        ) : (
          <Text color="gray.500" fontSize="sm" textAlign="center" py={2}>
            No positions yet
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default MultiOutcomeBetPanel;
