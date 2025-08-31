import { Box, Button, Flex, Text, FormControl, FormLabel, Input, VStack, Badge } from '@chakra-ui/react';
import { FaChartLine } from 'react-icons/fa';
import { useSpring, animated } from '@react-spring/web';
import type { Outcome } from '@/types';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface MarketBetPanelProps {
  phase: Phase;
  selectedOutcome: number | null;
  setSelectedOutcome: (outcomeIndex: number) => void;
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  handleBet: () => void;
  isSubmitting: boolean;
  connected: boolean;
  outcomes: Outcome[];
  outcomePercentages: number[];
  userPositions: { [outcomeIndex: number]: number };
  fee: string;
  outcomeAmounts: { [outcomeIndex: number]: number };
  totalAmount: number;
  paymentAsset: number; // 1 for USDC, 2 for APT
}

const MarketBetPanel: React.FC<MarketBetPanelProps> = ({
  phase, 
  selectedOutcome, 
  setSelectedOutcome, 
  bidAmount, 
  setBidAmount, 
  handleBet, 
  isSubmitting, 
  connected, 
  outcomes,
  outcomePercentages,
  userPositions, 
  fee, 
  outcomeAmounts, 
  totalAmount,
  paymentAsset
}) => {
  // Calculate potential profit (theoretical payout if market resolves immediately after bet)
  const amount = parseFloat(bidAmount) || 0;
  const feePercent = parseFloat(fee) || 0;
  let potentialProfit = 0;
  
  if (amount > 0 && selectedOutcome !== null && selectedOutcome < outcomes.length) {
    const selectedOutcomeAmount = outcomeAmounts[selectedOutcome] || 0;
    const numerator = totalAmount + amount * 100000000;
    const denominator = selectedOutcomeAmount + amount * 100000000;
    if (denominator > 0) {
      potentialProfit = (numerator / denominator) * amount * (1 - feePercent / 100);
    }
  }

  // Animated number for profit
  const { animatedProfit } = useSpring({
    animatedProfit: potentialProfit,
    config: { tension: 170, friction: 26 },
  });

  const hasPosition = Object.values(userPositions).some(pos => pos > 0);

  // Disable input and buttons in Pending phase
  const isPending = phase === Phase.Pending;

  // Get asset symbol
  const assetSymbol = paymentAsset === 1 ? 'USDC' : 'APT';

  // Get outcome comparison type label
  const getComparisonTypeLabel = (comparisonType: number): string => {
    switch (comparisonType) {
      case 1: return '>';
      case 2: return '≥';
      case 3: return '<';
      case 4: return '≤';
      case 5: return 'Range';
      case 6: return 'Open Range';
      default: return 'Unknown';
    }
  };

  // Get outcome color based on index
  const getOutcomeColor = (index: number): string => {
    const colors = ['green', 'blue', 'purple', 'orange', 'pink', 'teal', 'cyan', 'yellow'];
    return colors[index % colors.length];
  };

  return (
    <Box bg="gray.800" p={4} borderRadius="xl" mb={4} borderWidth={1} borderColor="gray.700">
      {/* Outcomes Selection */}
      <VStack spacing={3} mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="whiteAlpha.900" textAlign="center">
          Select Outcome
        </Text>
        <Flex wrap="wrap" gap={2} justify="center">
          {outcomes.map((outcome, index) => {
            const isSelected = selectedOutcome === index;
            const percentage = outcomePercentages[index] || 0;
            const color = getOutcomeColor(index);
            
            return (
              <Button
                key={index}
                size="sm"
                colorScheme={color}
                variant={isSelected ? "solid" : "outline"}
                onClick={() => setSelectedOutcome(index)}
                isDisabled={!connected || phase !== 1 || isPending || !outcome.is_active}
                _hover={{ 
                  bg: isSelected ? `${color}.500` : `${color}.100`,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
                _active={{ transform: 'translateY(0)' }}
                position="relative"
                minW="120px"
              >
                <VStack spacing={1}>
                  <Text fontSize="xs" fontWeight="bold">
                    {outcome.description}
                  </Text>
                  <Text fontSize="xs" opacity={0.8}>
                    {getComparisonTypeLabel(outcome.comparison_type)} {parseFloat(outcome.threshold1) / 1e9}
                  </Text>
                  {outcome.comparison_type === 5 || outcome.comparison_type === 6 ? (
                    <Text fontSize="xs" opacity={0.8}>
                      to {parseFloat(outcome.threshold2) / 1e9}
                    </Text>
                  ) : null}
                  <Badge 
                    colorScheme={color} 
                    variant="subtle" 
                    fontSize="xs"
                    position="absolute"
                    top={1}
                    right={1}
                  >
                    {percentage.toFixed(1)}%
                  </Badge>
                </VStack>
              </Button>
            );
          })}
        </Flex>
      </VStack>

      {/* Outcome Distribution Chart */}
      <Box mb={4}>
        <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.800" mb={2} textAlign="center">
          Outcome Distribution
        </Text>
        <Flex 
          align="center" 
          w="100%" 
          h="20px" 
          borderRadius="full" 
          bg="gray.800" 
          border="2px solid" 
          borderColor="gray.400" 
          position="relative" 
          overflow="hidden" 
          boxShadow="inset 0 1px 3px rgba(0,0,0,0.6)"
        >
          {outcomes.map((outcome, index) => {
            const percentage = outcomePercentages[index] || 0;
            const color = getOutcomeColor(index);
            const previousPercentages = outcomePercentages.slice(0, index).reduce((sum, p) => sum + p, 0);
            
            return (
              <Box
                key={index}
                position="absolute"
                left={`${previousPercentages}%`}
                width={`${percentage}%`}
                bg={`${color}.500`}
                h="100%"
                transition="width 0.6s ease"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                color="white"
                fontWeight="bold"
                textShadow="1px 1px 2px rgba(0,0,0,0.8)"
              >
                {percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
              </Box>
            );
          })}
        </Flex>
      </Box>

      {/* Betting Form */}
      <FormControl mb={2} mt={6} color="white">
        <FormLabel>You&apos;re betting</FormLabel>
        <Input 
          placeholder={`Enter amount in ${assetSymbol}`} 
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
            if (/^\d*\.?\d*$/.test(val)) {
              setBidAmount(val);
            }
          }}
          isDisabled={!connected || phase !== 1 || isPending || selectedOutcome === null}
          _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px blue.400" }}
        />
        
        {/* Potential Profit Display */}
        {selectedOutcome !== null && amount > 0 && (
          <Box 
            bg="gray.700" 
            p={3} 
            borderRadius="md" 
            mb={3} 
            ml={2} 
            mr={2}
            border="1px solid"
            borderColor="gray.600"
          >
            <Text fontSize="sm" color="whiteAlpha.700" mb={1}>
              Potential Profit:
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="green.400">
              <animated.span>
                {animatedProfit.to((val: number) => `+${val.toFixed(4)} ${assetSymbol}`)}
              </animated.span>
            </Text>
          </Box>
        )}

        {/* Place Bet Button */}
        <Button
          w="100%"
          colorScheme="blue"
          onClick={handleBet}
          isLoading={isSubmitting}
          loadingText="Placing Bet..."
          isDisabled={
            !connected || 
            phase !== 1 || 
            isPending || 
            selectedOutcome === null || 
            !bidAmount || 
            parseFloat(bidAmount) <= 0
          }
          _hover={{ 
            bg: "blue.600", 
            transform: "translateY(-2px)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
          }}
          _active={{ transform: "translateY(0)" }}
          leftIcon={<FaChartLine />}
          size="lg"
          borderRadius="xl"
        >
          Place Bet on {selectedOutcome !== null ? outcomes[selectedOutcome]?.description : 'Outcome'}
        </Button>
      </FormControl>

      {/* User Position Summary */}
      {hasPosition && (
        <Box 
          bg="gray.700" 
          p={3} 
          borderRadius="md" 
          mt={4} 
          ml={2} 
          mr={2}
          border="1px solid"
          borderColor="gray.600"
        >
          <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.800" mb={2}>
            Your Positions:
          </Text>
          <VStack spacing={1} align="stretch">
            {outcomes.map((outcome, index) => {
              const position = userPositions[index] || 0;
              if (position > 0) {
                return (
                  <Flex key={index} justify="space-between" align="center">
                    <Text fontSize="xs" color="whiteAlpha.700">
                      {outcome.description}:
                    </Text>
                    <Badge colorScheme={getOutcomeColor(index)} variant="solid">
                      {position} {assetSymbol}
                    </Badge>
                  </Flex>
                );
              }
              return null;
            })}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default MarketBetPanel; 