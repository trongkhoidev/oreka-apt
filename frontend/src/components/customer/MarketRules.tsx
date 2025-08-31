import { Box, Flex, Heading, Icon, Text, UnorderedList, ListItem } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import type { Market } from '../../types';

interface MarketRulesProps {
  showRules: boolean;
  setShowRules: (show: boolean) => void;
  market: Market;
  strike: string;
  fee: string;
}

const MarketRules: React.FC<MarketRulesProps> = ({ showRules, setShowRules, market, strike, fee }) => (
  <Box mt={8} border="1px solid #2D3748" borderRadius="xl" p={4}>
    <Flex justify="space-between" align="center" onClick={() => setShowRules(!showRules)} cursor="pointer">
      <Heading size="md" color="#F0F8FF" fontSize="25px">Rules</Heading>
      <Icon as={showRules ? ChevronUpIcon : ChevronDownIcon} color="gray.400" boxSize="30px" />
    </Flex>
    {showRules && (
      <Box mt={4}>
        <Text color="gray.400" mb={3}>
          This is a poly-option market where users can place bets on multiple outcomes for {market.price_feed_id || ''} with strike price: {strike} USD at maturity.
        </Text>
        <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Market Phases:</Text>
        <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
          <ListItem><strong>Pending Phase:</strong> The market is visible but not yet open for bidding.</ListItem>
          <ListItem><strong>Bidding Phase:</strong> Users can place LONG/SHORT bids with APT.</ListItem>
          <ListItem><strong>Maturity Phase:</strong> The final price is determined and the market outcome is resolved.</ListItem>
        </UnorderedList>
        <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Yes/No Criteria:</Text>
        <UnorderedList color="gray.400" spacing={2} pl={5} mb={4}>
          <ListItem>Resolves to <strong>&quot;Yes&quot;</strong> (LONG wins) if the final price is strictly above {strike} USD at maturity time.</ListItem>
          <ListItem>Resolves to <strong>&quot;No&quot;</strong> (SHORT wins) if the final price is {strike} USD or below at maturity time.</ListItem>
        </UnorderedList>
        <Text fontWeight="semibold" color="gray.300" mt={4} mb={2}>Profit Calculation:</Text>
        <Text color="gray.400" mb={3}>
          Your potential profit depends on the ratio between LONG and SHORT bids. If most users bet against your position, your potential profit increases. A fee of {fee}% is charged on winning positions.
        </Text>
      </Box>
    )}
  </Box>
);

export default MarketRules; 