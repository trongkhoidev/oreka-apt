import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

const Home: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /listaddress immediately
    router.replace('/listaddress');
  }, [router]);

  return (
    <Box bg="#0A0B0F" minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={6}>
        <Spinner size="xl" color="#4F8CFF" />
        <Text color="white" fontSize="lg">
          Redirecting to Oreka Markets...
        </Text>
      </VStack>
    </Box>
  );
};

export default Home; 