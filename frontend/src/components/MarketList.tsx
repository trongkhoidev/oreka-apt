import React from 'react';
import { Box, VStack, HStack, Text, Button, Badge, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface Market {
  id?: string;
  object_address?: string;
  pair_name?: string;
  tradingPair?: string;
  is_resolved?: boolean;
}

interface MarketListProps {
  markets: Market[];
  loading: boolean;
  onRefresh?: () => void;
  showPagination?: boolean;
}

const MarketList: React.FC<MarketListProps> = ({ markets, loading, onRefresh, showPagination = true }) => {
  const router = useRouter();

  if (loading) {
    return <Spinner size="xl" />;
  }

  if (!markets || markets.length === 0) {
    return <Text>No markets found.</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="xl" />
          <Text mt={4}>Loading markets...</Text>
        </Box>
      ) : markets.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No markets found</Text>
        </Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {markets.map((market) => (
              <Box key={market.id || market.object_address} p={4} borderWidth={1} borderRadius="md">
                <HStack justify="space-between">
                  <Text fontWeight="bold">{market.pair_name || market.tradingPair}</Text>
                  <Badge colorScheme={market.is_resolved ? 'green' : 'blue'}>
                    {market.is_resolved ? 'Resolved' : 'Active'}
                  </Badge>
                  <Button size="sm" onClick={() => router.push(`/customer/${market.id || market.object_address}`)}>
                    View
                  </Button>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
          
          {showPagination && (
            <Box textAlign="center" mt={6}>
              <Text fontSize="sm" color="gray.500">
                Showing {markets.length} markets
              </Text>
            </Box>
          )}
        </>
      )}
      {onRefresh && (
        <Button onClick={onRefresh}>Refresh</Button>
      )}
    </VStack>
  );
};

export default MarketList; 