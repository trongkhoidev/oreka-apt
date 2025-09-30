import React from 'react';
import { Box, Heading, VStack, HStack, Text, Icon, Tag, TagLabel } from '@chakra-ui/react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

type RangeKind = 'lt' | 'range' | 'gt';

interface PreviewBoxProps {
  selectedPair: { pair: string } | null;
  strikePrice: string;
  priceChange: number | null;
  currentPrice: number | null;
  biddingStartDate: string;
  biddingStartTime: string;
  biddingEndDate: string;
  biddingEndTime: string;
  maturityDate: string;
  maturityTime: string;
  feePercentage: string;
  formatShortDateTime: (dateStr: string, timeStr: string) => string;
  // multi-outcome preview
  isMultiOutcome?: boolean;
  ranges?: { min: string; max: string; name: string; kind: RangeKind }[];
  rangesError?: string | null;
}

const PreviewBox: React.FC<PreviewBoxProps> = ({
  selectedPair, strikePrice, priceChange, currentPrice, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, maturityDate, maturityTime, feePercentage, formatShortDateTime,
  isMultiOutcome = false, ranges = [], rangesError
}) => (
  <Box bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="360px">
    <Heading size="md" mb={4} color="#4F8CFF" letterSpacing="tight">Preview</Heading>
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between"><Text color="#B0B3B8">Asset:</Text><Text color="white" fontWeight="bold">{selectedPair?.pair || '--'}</Text></HStack>
      {!isMultiOutcome ? (
        <HStack justify="space-between"><Text color="#B0B3B8">Strike Price:</Text>
          <HStack>
            <Text color="white" fontWeight="bold">{strikePrice || '--'}</Text>
            {priceChange !== null && (
              <>
                {priceChange > 0 && <Icon as={FaArrowUp} color="green.400" />}
                {priceChange < 0 && <Icon as={FaArrowDown} color="red.400" />}
                <Text color={priceChange > 0 ? 'green.400' : priceChange < 0 ? 'red.400' : 'gray.400'} fontWeight="bold" fontSize="md">
                  {Math.abs(priceChange).toFixed(2)}%
                </Text>
              </>
            )}
          </HStack>
        </HStack>
      ) : (
        <Box>
          <Text color="#B0B3B8" mb={2}>Outcomes</Text>
          <VStack spacing={2} align="stretch">
            {ranges.length === 0 && <Text color="gray.400">--</Text>}
            {ranges.map((r, i) => {
              const kindText = r.kind === 'lt' ? 'Below' : r.kind === 'gt' ? 'Above' : 'Range';
              const spanText = r.kind === 'lt' ? `x < ${r.max}` : r.kind === 'gt' ? `x > ${r.min}` : `${r.min} – ${r.max}`;
              return (
                <HStack key={i} justify="space-between">
                  <HStack>
                    <Tag size="sm" colorScheme="blue" variant="subtle"><TagLabel>{kindText}</TagLabel></Tag>
                    <Text color="white" fontWeight="bold">{r.name || `O${i}`}</Text>
                  </HStack>
                  <Text color="#4F8CFF" fontWeight="bold">{spanText}</Text>
                </HStack>
              );
            })}
            {rangesError && <Text color="red.300" fontSize="sm">{rangesError}</Text>}
          </VStack>
        </Box>
      )}
      <HStack justify="space-between"><Text color="#B0B3B8">Current Price:</Text><Text color="#4F8CFF" fontWeight="bold">{currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Time Bidding:</Text><Text color="white" fontWeight="bold">{biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime ? `${formatShortDateTime(biddingStartDate, biddingStartTime)} → ${formatShortDateTime(biddingEndDate, biddingEndTime)}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Maturity:</Text><Text color="white" fontWeight="bold">{maturityDate && maturityTime ? `${maturityDate} ${maturityTime}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Fee:</Text><Text color="white" fontWeight="bold">{feePercentage}%</Text></HStack>
    </VStack>
  </Box>
);

export default PreviewBox; 