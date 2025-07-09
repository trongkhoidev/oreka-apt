import React from 'react';
import { Box, VStack, HStack, Text, Circle, Button, Spacer } from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import type { MarketInfo as MarketInfoType } from '../../services/aptosMarketService';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface MarketTimelineProps {
  phase: Phase;
  phaseNames: string[];
  market: MarketInfoType;
  maturity: string;
  canResolve: boolean;
  handleResolve: () => void;
  isSubmitting: boolean;
}

const MarketTimeline: React.FC<MarketTimelineProps> = ({ phase, phaseNames, market, maturity, canResolve, handleResolve, isSubmitting }) => (
  <Box bg="#222530" p={4} mt={7} borderWidth={1} borderColor="gray.700" borderRadius="30px" boxShadow="md" position="relative" height="265px">
    <Text fontSize="2xl" fontWeight="bold" mb={4} mt={2} color="#99A0AE" textAlign="center">
      Market is{' '}
      <Text as="span" color={phase === 0 ? 'yellow.400' : phase === 1 ? 'blue.400' : 'orange.400'}>
        {phaseNames[phase]}
      </Text>
    </Text>
    <Box bg="#0B0E16" p={4} borderWidth={1} borderColor="gray.700" borderRadius="30px" position="absolute" top="70px" left="0" right="0" zIndex={1}>
      <VStack align="stretch" spacing={3} position="relative">
        <Box position="absolute" left="16px" top="30px" bottom="20px" width="2px" bg="gray.700" zIndex={0} />
        {/* Pending Phase */}
        <HStack spacing={4}>
          <Circle size="35px" bg="blue.400" color="black" zIndex={1} fontWeight="bold">{phase >= 1 ? <CheckIcon boxSize={4} /> : '1'}</Circle>
          <VStack align="start" spacing={0} fontWeight="bold">
            <Text fontSize="lg" color={phase === 0 ? 'yellow.400' : 'gray.500'}>Pending</Text>
            <Text fontSize="xs" color="gray.500">{market?.bidding_start_time ? new Date(Number(market.bidding_start_time) * 1000).toLocaleString() : 'Pending'}</Text>
          </VStack>
          <Spacer />
        </HStack>
        {/* Bidding Phase */}
        <HStack spacing={4}>
          <Circle size="35px" bg="blue.400" color="black" zIndex={1} fontWeight="bold">{phase >= 2 ? <CheckIcon boxSize={4} /> : '2'}</Circle>
          <VStack align="start" spacing={0} fontWeight="bold">
            <Text fontSize="lg" color={phase === 1 ? 'blue.400' : 'gray.500'}>Bidding</Text>
            <Text fontSize="xs" color="gray.500">{market?.bidding_start_time ? new Date(Number(market.bidding_start_time) * 1000).toLocaleString() : 'Waiting for Start'}</Text>
            <Text fontSize="xs" color="gray.500">{market?.bidding_end_time ? new Date(Number(market.bidding_end_time) * 1000).toLocaleString() : 'Waiting for End'}</Text>
          </VStack>
          <Spacer />
          {canResolve && (
            <Button
              onClick={handleResolve}
              size="sm"
              colorScheme="yellow"
              bg="#FEDF56"
              color="black"
              _hover={{ bg: "#FFE56B" }}
              isLoading={isSubmitting}
              loadingText="Resolving"
              alignItems="center"
              justifyContent="center"
              width="30%"
            >
              Resolve
            </Button>
          )}
        </HStack>
        {/* Maturity Phase */}
        <HStack spacing={4}>
          <Circle size="35px" bg="blue.400" color="black" zIndex={1} fontWeight="bold">{phase >= 2 ? <CheckIcon boxSize={4} /> : '3'}</Circle>
          <VStack align="start" spacing={0} fontWeight="bold">
            <Text fontSize="lg" color={phase === 2 ? 'orange.400' : 'gray.500'}>Maturity</Text>
            <Text fontSize="xs" color="gray.500">{maturity}</Text>
          </VStack>
          <Spacer />
        </HStack>
      </VStack>
    </Box>
  </Box>
);

export default MarketTimeline; 