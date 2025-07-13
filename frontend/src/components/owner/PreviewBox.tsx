import React from 'react';
import { Box, Heading, VStack, HStack, Text, Icon } from '@chakra-ui/react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

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
}

const PreviewBox: React.FC<PreviewBoxProps> = ({
  selectedPair, strikePrice, priceChange, currentPrice, biddingStartDate, biddingStartTime, biddingEndDate, biddingEndTime, maturityDate, maturityTime, feePercentage, formatShortDateTime
}) => (
  <Box bg="#181A20" borderRadius="2xl" boxShadow="md" border="1px solid #23262f" p={8} minW="320px">
    <Heading size="md" mb={4} color="#4F8CFF" letterSpacing="tight">Preview</Heading>
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between"><Text color="#B0B3B8">Asset:</Text><Text color="white" fontWeight="bold">{selectedPair?.pair || '--'}</Text></HStack>
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
      <HStack justify="space-between"><Text color="#B0B3B8">Current Price:</Text><Text color="#4F8CFF" fontWeight="bold">{currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Time Bidding:</Text><Text color="white" fontWeight="bold">{biddingStartDate && biddingStartTime && biddingEndDate && biddingEndTime ? `${formatShortDateTime(biddingStartDate, biddingStartTime)} → ${formatShortDateTime(biddingEndDate, biddingEndTime)}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Maturity:</Text><Text color="white" fontWeight="bold">{maturityDate && maturityTime ? `${maturityDate} ${maturityTime}` : '--'}</Text></HStack>
      <HStack justify="space-between"><Text color="#B0B3B8">Fee:</Text><Text color="white" fontWeight="bold">{feePercentage}%</Text></HStack>
    </VStack>
  </Box>
);

export default PreviewBox; 