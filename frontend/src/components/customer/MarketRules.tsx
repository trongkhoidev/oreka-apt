import { Box, Flex, Heading, Icon, Text, UnorderedList, ListItem, Link } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import type { MarketInfo as MarketInfoType } from '../../services/aptosMarketService';

interface MarketRulesProps {
  showRules: boolean;
  setShowRules: (show: boolean) => void;
  market: MarketInfoType;
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
          This is a binary option market where users can place bids on whether the price of {market.pair_name || ''} will be above (LONG) or below (SHORT) the strike price: {strike} USD at maturity.
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
        <Box mt={4} p={3} borderRadius="md" border="1px solid" borderColor="gray.700">
          <Flex align="center" fontSize="25px" fontWeight="bold">
            <img src="/images/coinbase.png" alt="Coinbase" style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 24 }} />
            <Box>
              <Text color="gray.400" fontSize="lg">Resolution Source</Text>
              <Link color="blue.400" href="https://www.coinbase.com" isExternal>Coinbase</Link>
            </Box>
          </Flex>
        </Box>
      </Box>
    )}
  </Box>
);

export default MarketRules; 