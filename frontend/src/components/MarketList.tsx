import React, { useCallback } from 'react';
import { Box, VStack, HStack, Text, Button, Badge, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { getMarketDetails } from '../services/aptosMarketService';

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

  // Preload market data on hover for faster navigation
  const handleMouseEnter = useCallback((market: Market) => {
    const marketAddress = market.id || market.object_address;
    if (marketAddress) {
      // Preload market data in background
      getMarketDetails(marketAddress, false).then(data => {
        if (data) {
          // Store in sessionStorage for instant access
          try {
            sessionStorage.setItem(`market_${marketAddress}`, JSON.stringify(data));
          } catch (err) {
            console.warn('[MarketList] Failed to cache market data', err);
          }
        }
      }).catch(err => {
        console.warn('[MarketList] Failed to preload market data', err);
      });
    }
  }, []);

  const handleMarketClick = useCallback((market: Market) => {
    const marketAddress = market.id || market.object_address;
    if (marketAddress) {
      // Check for cached market data first
      try {
        const cachedData = sessionStorage.getItem(`market_${marketAddress}`);
        if (cachedData) {
          console.log('[MarketList] Using cached market data for faster navigation');
          localStorage.setItem('contractData', cachedData);
        }
      } catch (err) {
        console.warn('[MarketList] Failed to access cached data', err);
      }
      router.push(`/customer/${marketAddress}`);
    }
  }, [router]);

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
              <Box 
                key={market.id || market.object_address} 
                p={4} 
                borderWidth={1} 
                borderRadius="md"
                onMouseEnter={() => handleMouseEnter(market)}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                onClick={() => handleMarketClick(market)}
              >
                <HStack justify="space-between">
                  <Text fontWeight="bold">{market.pair_name || market.tradingPair}</Text>
                  <Badge colorScheme={market.is_resolved ? 'green' : 'blue'}>
                    {market.is_resolved ? 'Resolved' : 'Active'}
                  </Badge>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleMarketClick(market); }}>
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