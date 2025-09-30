import { Box, Flex, Heading, Icon, Text, UnorderedList, ListItem, HStack, Badge } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import type { MarketInfo as MarketInfoType } from '../../services/aptosMarketService';

interface MarketRulesProps {
  showRules: boolean;
  setShowRules: (show: boolean) => void;
  market: MarketInfoType;
  strike: string;
  fee: string;
}

const MarketRules: React.FC<MarketRulesProps> = ({ showRules, setShowRules, market, strike, fee }) => {
  const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
  const priceRanges = market?.price_ranges || [];
  
  return (
    <Box mt={8} border="1px solid #2D3748" borderRadius="xl" p={4}>
      <Flex justify="space-between" align="center" onClick={() => setShowRules(!showRules)} cursor="pointer">
        <HStack spacing={3}>
          <Heading size="md" color="#F0F8FF" fontSize="25px">Rules</Heading>
          <Badge 
            colorScheme={isMultiOutcome ? "purple" : "blue"} 
            fontSize="xs" 
            px={2} 
            py={1} 
            borderRadius="md"
          >
            {isMultiOutcome ? "Multi-Outcome" : "Binary"}
          </Badge>
        </HStack>
        <Icon as={showRules ? ChevronUpIcon : ChevronDownIcon} color="gray.400" boxSize="30px" />
      </Flex>
      {showRules && (
        <Box mt={4}>
          {/* Market Description */}
          <Text color="gray.400" mb={3}>
            {isMultiOutcome 
              ? `This is a multi-outcome market where users can place bids on which price range ${market.pair_name || ''} will fall into at maturity.`
              : `This is a binary option market where users can place bids on whether the price of ${market.pair_name || ''} will be above (LONG) or below (SHORT) the strike price: ${strike} USD at maturity.`
            }
          </Text>

          {/* Market Phases */}
          <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Market Phases:</Text>
          <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
            <ListItem><strong>Pending Phase:</strong> The market is visible but not yet open for bidding.</ListItem>
            <ListItem><strong>Bidding Phase:</strong> Users can place {isMultiOutcome ? "bids on different price ranges" : "LONG/SHORT bids"} with APT.</ListItem>
            <ListItem><strong>Maturity Phase:</strong> The final price is determined and the market outcome is resolved.</ListItem>
          </UnorderedList>

          {/* Outcome Criteria */}
          {isMultiOutcome ? (
            <>
              <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Price Range Criteria:</Text>
              <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
                {priceRanges.map((range, index) => {
                  // Format prices properly - convert from raw values to USD
                  const minPrice = Number(range.min_price) / 1e8;
                  const maxPrice = Number(range.max_price) / 1e8;
                  
                  // Handle special cases for min/max values
                  const formatPrice = (price: number) => {
                    if (price === 0) return "0";
                    if (price >= 18446744073709551615 / 1e8) return "∞"; // Max uint64
                    return price.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    });
                  };
                  
                  return (
                    <ListItem key={index}>
                      <strong>{range.outcome_name}:</strong> Price falls between {formatPrice(minPrice)} and {formatPrice(maxPrice)} USD
                    </ListItem>
                  );
                })}
              </UnorderedList>
            </>
          ) : (
            <>
              <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Yes/No Criteria:</Text>
              <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
                <ListItem>Resolves to <strong>&quot;Yes&quot;</strong> (LONG wins) if the final price is strictly above {strike} USD at maturity time.</ListItem>
                <ListItem>Resolves to <strong>&quot;No&quot;</strong> (SHORT wins) if the final price is {strike} USD or below at maturity time.</ListItem>
              </UnorderedList>
            </>
          )}

          {/* Profit Calculation */}
          <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Profit Calculation:</Text>
          <Text color="gray.400" mb={3}>
            {isMultiOutcome 
              ? `Your potential profit depends on the ratio between different outcome pools. If most users bet against your chosen outcome, your potential profit increases. A fee of ${fee}% is charged on winning positions.`
              : `Your potential profit depends on the ratio between LONG and SHORT bids. If most users bet against your position, your potential profit increases. A fee of ${fee}% is charged on winning positions.`
            }
          </Text>

          {/* Additional Multi-Outcome Info */}
          {isMultiOutcome && (
            <>
              <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Multi-Outcome Features:</Text>
              <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
                <ListItem>You can bet on multiple outcomes simultaneously</ListItem>
                <ListItem>Each outcome has its own pool and percentage</ListItem>
                <ListItem>Winning outcomes share the total pool proportionally</ListItem>
                <ListItem>Only one outcome can win (the range containing the final price)</ListItem>
              </UnorderedList>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MarketRules; 