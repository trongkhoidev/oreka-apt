import React, { useState, useEffect } from 'react';
import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';

interface ContractBalanceProps {
  contractAddress?: string;
}

const ContractBalance: React.FC<ContractBalanceProps> = ({ contractAddress }) => {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contractAddress) {
      fetchContractBalance();
    }
  }, [contractAddress]);

  const fetchContractBalance = async () => {
    setLoading(true);
    try {
      // TODO: Implement Aptos contract balance fetching
      // For now, return mock data
      setBalance('0.0000');
    } catch (error) {
      console.error('Error fetching contract balance:', error);
      setBalance('0.0000');
    } finally {
      setLoading(false);
    }
  };

  if (!contractAddress) {
    return null;
  }

  return (
    <Box p={4} borderWidth={1} borderRadius="md">
      <VStack spacing={2}>
        <Text fontSize="sm" color="gray.500">Contract Balance</Text>
        <HStack>
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <Text fontWeight="bold">{balance} APT</Text>
          )}
        </HStack>
      </VStack>
    </Box>
  );
};

export default ContractBalance; 