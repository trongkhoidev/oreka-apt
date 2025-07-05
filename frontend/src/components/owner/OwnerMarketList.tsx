import React from 'react';
import { Box, SimpleGrid, Spinner, Text } from '@chakra-ui/react';

interface Market {
  creator: string;
  pair_name: string;
  strike_price: number;
  fee_percentage: number;
  total_bids: number;
  long_bids: number;
  short_bids: number;
  total_amount: number;
  long_amount: number;
  short_amount: number;
  result: number;
  is_resolved: boolean;
  bidding_start_time: number;
  bidding_end_time: number;
  maturity_time: number;
  final_price: number;
  fee_withdrawn: boolean;
  _key?: string;
}

interface OwnerMarketListProps {
  markets: Market[];
  loadingMarkets: boolean;
}

const OwnerMarketList: React.FC<OwnerMarketListProps> = ({ markets, loadingMarkets }) => {
  if (loadingMarkets) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4} color="white">Loading your markets...</Text>
      </Box>
    );
  }
  if (!markets.length) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.500">No markets found. Try deploying a new market.</Text>
      </Box>
    );
  }
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {markets.map((market) => (
        <Box key={market._key || market.pair_name} p={4} borderRadius="xl" bg="#23262f" color="white">
          <Text fontWeight="bold">{market.pair_name}</Text>
          <Text>Strike: {(market.strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <Text>Fee: {(market.fee_percentage / 10).toFixed(1)}%</Text>
          <Text>Bidding: {new Date(market.bidding_start_time * 1000).toLocaleString()} - {new Date(market.bidding_end_time * 1000).toLocaleString()}</Text>
          <Text>Maturity: {new Date(market.maturity_time * 1000).toLocaleString()}</Text>
          <Text>Total: {(market.total_amount / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 })} APT</Text>
          <Text>Status: {market.is_resolved ? 'Resolved' : 'Active'}</Text>
        </Box>
      ))}
    </SimpleGrid>
  );
};

export default OwnerMarketList; 