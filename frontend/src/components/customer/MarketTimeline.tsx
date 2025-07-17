import React, { useEffect, useState } from 'react';
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

function shortDate(ts: number) {
  const d = new Date(ts * 1000);
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
}
function fullDateTime(ts: number) {
  const d = new Date(ts * 1000);
  // dd/mm/yyyy, HH:MM:SS
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear() + ', ' + d.toLocaleTimeString();
}
function shortDayMonth(ts: number) {
  const d = new Date(ts * 1000);
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
}

const MODULE_ADDRESS = '0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d'; 
const RESOLVE_EVENT_HANDLE = 'resolve_events';

const MarketTimeline: React.FC<MarketTimelineProps> = ({ phase, phaseNames, market, maturity, canResolve, handleResolve, isSubmitting }) => {
  const [resolvedTime, setResolvedTime] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResolvedTime() {
      if (!market?.market_address || !market?.is_resolved || !market?.final_price) return;
      try {
        // Fetch ResolveEvent list
        const events = await fetch(`https://fullnode.mainnet.aptoslabs.com/v1/accounts/${MODULE_ADDRESS}/events/${MODULE_ADDRESS}::binary_option_market::MarketRegistry/${RESOLVE_EVENT_HANDLE}`).then(res => res.json());
        const event = events.find((e: { data: { final_price: number; }; version: string; }) => {
          return e.data && Number(e.data.final_price) === Number(market.final_price);
        });
        if (event && event.version) {
    
          const tx = await fetch(`https://api.mainnet.aptoslabs.com/v1/transactions/by_version/${event.version}`).then(res => res.json());
          if (tx && tx.timestamp) {
       
            const date = new Date(Number(tx.timestamp) / 1000);
            // Format dd/mm/yyyy, HH:MM:SS
            const formatted = date.getDate().toString().padStart(2, '0') + '/' +
              (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
              date.getFullYear() + ', ' +
              date.toLocaleTimeString('en-GB', { hour12: false });
            setResolvedTime(formatted);
          }
        }
      } catch {
        setResolvedTime(null);
      }
    }
    fetchResolvedTime();
  }, [market?.market_address, market?.is_resolved, market?.final_price]);

  let outcomeText = '';
  if (market?.is_resolved && market?.final_price && market?.strike_price) {
    const finalPrice = Number(market.final_price);
    const strikePrice = Number(market.strike_price);
    if (!isNaN(finalPrice) && !isNaN(strikePrice)) {
      if (finalPrice >= strikePrice) outcomeText = 'Outcome: LONG';
      else outcomeText = 'Outcome: SHORT';
    }
  }

  return (
    <Box bg="#222530" p={4} mt={7} borderWidth={1} borderColor="gray.700" borderRadius="30px" boxShadow="md" position="relative" height={resolvedTime ? "285px" : "265px"}>
      <Text fontSize="2xl" fontWeight="bold" mb={2}  color="#fff" textAlign="center">
        {outcomeText
          ? <>
              Outcome: <Text as="span" color={outcomeText.includes('LONG') ? 'green.300' : 'red.300'} display="inline">{outcomeText.replace('Outcome: ', '')}</Text>
              {resolvedTime && (
                <Text fontSize="md" color="gray.400" >{resolvedTime}</Text>
              )}
            </>
          : (<>
              Market is{' '}
              <Text as="span" color={phase === 0 ? 'yellow.400' : phase === 1 ? 'blue.400' : 'orange.400'}>
                {phaseNames[phase]}
              </Text>
            </>)}
      </Text>
      <Box bg="#0B0E16" p={4} borderWidth={1} mt={resolvedTime ? 5 :0} borderColor="gray.700" borderRadius="30px" position="absolute" top="70px" left="0" right="0" zIndex={1}>
        <VStack align="stretch" spacing={3} position="relative">
          <Box position="absolute" left="16px" top="30px" bottom="20px" width="2px" bg="gray.700" zIndex={0} />
          {/* Pending Phase */}
          <HStack spacing={4}>
            <Circle size="35px" bg="blue.400" color="black" zIndex={1} fontWeight="bold">{phase >= 1 ? <CheckIcon boxSize={4} /> : '1'}</Circle>
            <VStack align="start" spacing={0} fontWeight="bold">
              <Text fontSize="lg" color={phase === 0 ? 'yellow.400' : 'gray.500'}>Pending</Text>
              <Text fontSize="xs" color="gray.500">
                {market?.bidding_start_time
                  ? (phase > 0
                      ? shortDate(Number(market.bidding_start_time))
                      : fullDateTime(Number(market.bidding_start_time))
                    )
                  : 'Pending'}
              </Text>
            </VStack>
            <Spacer />
          </HStack>
          {/* Bidding Phase */}
          <HStack spacing={4}>
            <Circle size="35px" bg="blue.400" color="black" zIndex={1} fontWeight="bold">{phase >= 2 ? <CheckIcon boxSize={4} /> : '2'}</Circle>
            <VStack align="start" spacing={0} fontWeight="bold">
              <Text fontSize="lg" color={phase === 1 ? 'blue.400' : 'gray.500'}>Bidding</Text>
              {phase > 1 ? (
                <Text fontSize="xs" color="gray.500">
                  {market?.bidding_start_time && market?.bidding_end_time
                    ? `${shortDayMonth(Number(market.bidding_start_time))} - ${shortDayMonth(Number(market.bidding_end_time))}`
                    : 'Bidding'}
                </Text>
              ) : (
                <>
                  <Text fontSize="xs" color="gray.500">{market?.bidding_start_time ? fullDateTime(Number(market.bidding_start_time)) : 'Waiting for Start'}</Text>
                  <Text fontSize="xs" color="gray.500">{market?.bidding_end_time ? fullDateTime(Number(market.bidding_end_time)) : 'Waiting for End'}</Text>
                </>
              )}
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
};

export default MarketTimeline; 