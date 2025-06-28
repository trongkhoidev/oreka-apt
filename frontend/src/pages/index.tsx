import React from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Button, SimpleGrid, Stack, Icon, Divider, useBreakpointValue
} from '@chakra-ui/react';
import { FaRocket, FaLock, FaChartLine, FaBolt, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ConnectWallet from '../components/ConnectWallet';

const features = [
  {
    icon: FaLock,
    title: 'Fast & Secure',
    desc: 'Built on Aptos blockchain for high throughput and security.'
  },
  {
    icon: FaChartLine,
    title: 'Real-time Prices',
    desc: 'Live price feeds from trusted oracles for accurate settlements.'
  },
  {
    icon: FaBolt,
    title: 'Instant Rewards',
    desc: 'Automatic payouts when markets are resolved.'
  },
];

const steps = [
  {
    icon: FaCheckCircle,
    title: 'Connect Wallet',
    desc: 'Connect your Aptos wallet to get started.'
  },
  {
    icon: FaRocket,
    title: 'Create or Join Market',
    desc: 'Create your own binary options market or join existing ones.'
  },
  {
    icon: FaArrowRight,
    title: 'Trade & Earn',
    desc: 'Bid on price outcomes and earn instant rewards.'
  },
];

const Home: React.FC = () => {
  const { connected } = useWallet();
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box bg="#0A0B0F" minH="100vh" py={0}>
      <Container maxW="container.xl" py={{ base: 8, md: 16 }}>
        <VStack spacing={16} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" py={{ base: 8, md: 16 }}>
            <Heading
              size="2xl"
              mb={4}
              bgGradient="linear(to-r, #4F8CFF, #A770EF)"
              bgClip="text"
              fontWeight="extrabold"
              letterSpacing="tight"
              textShadow="0 0 24px #4F8CFF99"
            >
              OREKA: Binary Options on Aptos
            </Heading>
            <Text fontSize="xl" color="gray.400" mb={8} maxW="2xl" mx="auto">
              Trade binary options with real-time price feeds, instant settlements, and a seamless DeFi experience on Aptos blockchain.
            </Text>
            {!connected && (
              <Box display="flex" justifyContent="center">
                <ConnectWallet />
              </Box>
            )}
          </Box>

          {/* Features Section */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {features.map((f, i) => (
              <Box
                key={f.title}
                bg="#181A20"
                p={8}
                borderRadius="2xl"
                boxShadow="lg"
                textAlign="center"
                transition="all 0.2s"
                _hover={{ boxShadow: '2xl', transform: 'translateY(-4px) scale(1.03)' }}
              >
                <Icon as={f.icon} boxSize={10} color="#4F8CFF" mb={4} />
                <Heading size="md" mb={3} color="white">{f.title}</Heading>
                <Text color="gray.400">{f.desc}</Text>
              </Box>
            ))}
          </SimpleGrid>

          {/* How it works Section */}
          <Box>
            <Heading size="lg" color="white" mb={8} textAlign="center">How It Works</Heading>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={8} justify="center" align="center">
              {steps.map((step, idx) => (
                <Box
                  key={step.title}
                  bg="#181A20"
                  p={6}
                  borderRadius="2xl"
                  boxShadow="md"
                  textAlign="center"
                  w={{ base: '100%', md: '300px' }}
                  transition="all 0.2s"
                  _hover={{ boxShadow: 'xl', transform: 'scale(1.04)' }}
                >
                  <Icon as={step.icon} boxSize={8} color="#A770EF" mb={3} />
                  <Heading size="md" color="white" mb={2}>{step.title}</Heading>
                  <Text color="gray.400">{step.desc}</Text>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* About Section */}
          <Box textAlign="center" maxW="3xl" mx="auto" py={8}>
            <Heading size="lg" color="white" mb={4}>About OREKA</Heading>
            <Text color="gray.400" fontSize="lg">
              OREKA is a next-generation DeFi platform for binary options trading on Aptos. We focus on transparency, speed, and user empowerment. Whether you are a trader, a liquidity provider, or a DeFi enthusiast, OREKA brings you a seamless and rewarding experience.
            </Text>
          </Box>

          {/* Call to Action */}
          <Box textAlign="center" py={8}>
            <Heading size="lg" color="white" mb={4}>Get Started Now</Heading>
            <Text color="gray.400" mb={6}>
              Connect your wallet and start trading or create your own market in just a few clicks.
            </Text>
            <HStack spacing={4} justify="center">
              <Button as="a" href="/owner" colorScheme="brand" size="lg" px={8} py={6} fontWeight="bold" fontSize="xl" borderRadius="xl" boxShadow="md">
                Create Market
              </Button>
              <Button as="a" href="/listaddress" variant="outline" size="lg" px={8} py={6} fontWeight="bold" fontSize="xl" borderRadius="xl" color="white" borderColor="#4F8CFF" _hover={{ bg: '#181A20', borderColor: '#A770EF' }}>
                Browse Markets
              </Button>
            </HStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default Home; 