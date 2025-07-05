import React from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Button, SimpleGrid, Stack, Divider, Tooltip
} from '@chakra-ui/react';
import { FaRocket, FaLock, FaChartLine, FaBolt, FaArrowRight, FaShieldAlt, FaWallet, FaGithub, FaGlobe, FaCode } from 'react-icons/fa';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import Head from 'next/head';

const features = [
  { icon: FaLock, title: 'On-chain Security', desc: 'All markets are managed by Move smart contracts on Aptos.' },
  { icon: FaChartLine, title: 'Real-time Prices', desc: 'Live price feeds from trusted oracles and exchanges.' },
  { icon: FaBolt, title: 'Instant Settlement', desc: 'Automatic payouts and fee distribution on market resolution.' },
  { icon: FaShieldAlt, title: 'Multi-token Support', desc: 'Trade binary options on APT, BTC, ETH, SOL, SUI, BNB, WETH.' },
];

const steps = [
  { icon: FaWallet, title: 'Connect Wallet', desc: 'Connect your Aptos wallet to get started.' },
  { icon: FaRocket, title: 'Create or Join Market', desc: 'Create your own binary options market or join existing ones.' },
  { icon: FaArrowRight, title: 'Trade & Earn', desc: 'Bid on price outcomes and earn instant rewards.' },
];

const contractLinks = [
  { icon: FaCode, label: 'Move Source', url: 'https://aptos.dev/en/build/smart-contracts' },
  { icon: FaGlobe, label: 'Aptos Explorer', url: 'https://explorer.aptoslabs.com/' },
  { icon: FaGithub, label: 'Github', url: 'https://github.com/trongkhoidev/oreka-apt' },
];

const socialLinks = [
  { icon: FaGlobe, label: 'Coinbase API', url: 'https://api.coinbase.com/' },
  { icon: FaGlobe, label: 'Binance API', url: 'https://api.binance.com/' },
  { icon: FaGlobe, label: 'NewsData.io', url: 'https://newsdata.io/' },
  { icon: FaGlobe, label: 'CoinMarketCal', url: 'https://coinmarketcal.com/' },
  { icon: FaGlobe, label: 'CryptoPanic', url: 'https://cryptopanic.com/' },
  { icon: FaGlobe, label: 'Aptos Explorer', url: 'https://explorer.aptoslabs.com/' },
  { icon: FaGlobe, label: 'Aptos Node', url: 'https://fullnode.mainnet.aptoslabs.com/v1' },
  { icon: FaGlobe, label: 'Aptos Dev Docs', url: 'https://aptos.dev/' },
];

const supportedTokens = getAvailableTradingPairs();

// Thêm hàm ánh xạ tên token sang tên đầy đủ
const tokenFullNames: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  SUI: 'Sui',
  BNB: 'Binance Coin',
  WETH: 'Wrapped Ether',
  APT: 'Aptos',
  LINK: 'Chainlink',
  SNX: 'Synthetix',
  WSTETH: 'Wrapped Staked Ether',
};

const Home: React.FC = () => {
  return (
    <>
      <Head>
        <title>OREKA - Empowering Decentralized Prediction Markets</title>
        <meta name="description" content="Trade binary options on top crypto assets with real-time price feeds, instant settlements, and a seamless DeFi experience on Aptos blockchain." />
        <meta name="keywords" content="OREKA, binary options, Aptos, crypto, decentralized, prediction markets" />
        <meta name="author" content="OREKA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Box bg="#0A0B0F" minH="100vh" py={0} position="relative" overflow="hidden">
        <Container maxW="container.xl" py={{ base: 8, md: 16 }} position="relative" zIndex={1}>
          <VStack spacing={16} align="stretch">
            {/* Hero Section */}
            <Box textAlign="center" py={{ base: 8, md: 16 }}>
              <VStack spacing={2} mb={2}>
                <Text fontSize={{ base: "4xl", md: "6xl" }} fontWeight="extrabold" bgGradient="linear(to-r, #4F8CFF, #A770EF)" bgClip="text" letterSpacing="wider" fontFamily="'Orbitron', 'Montserrat', sans-serif" lineHeight="1">OREKA</Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="gray.400" fontWeight="medium" letterSpacing="wide">Empowering Decentralized Prediction Markets</Text>
              </VStack>
              <Text as="h1" fontSize={{ base: "2xl", md: "4xl" }} mb={4} bgGradient="linear(to-r, #4F8CFF, #A770EF)" bgClip="text" fontWeight="extrabold" letterSpacing="tight">Prediction Markets on Aptos</Text>
              <HStack spacing={4} justify="center" mb={4}>
               
                <Button as="a" href="/owner" colorScheme="brand" size="lg" px={8} py={6} fontWeight="bold" fontSize="xl" borderRadius="xl" boxShadow="md">Create Market</Button>
                <Button as="a" href="/listaddress" variant="outline" size="lg" px={8} py={6} fontWeight="bold" fontSize="xl" borderRadius="xl" color="white" borderColor="#4F8CFF" _hover={{ bg: '#181A20', borderColor: '#A770EF' }}>Browse Markets</Button>
              </HStack>
            </Box>

            {/* How It Works Section */}
            <Box>
              <Heading size="lg" color="white" mb={8} textAlign="center">How It Works</Heading>
              <Stack direction={{ base: 'column', md: 'row' }} spacing={8} justify="center" align="center">
                {steps.map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <Box key={step.title} bg="#181A20" p={6} borderRadius="2xl" boxShadow="md" textAlign="center" w={{ base: '100%', md: '300px' }}>
                      <StepIcon size={32} color="#A770EF" style={{ margin: '0 auto', display: 'block' }} />
                      <Heading size="md" color="white" mb={2}>{step.title}</Heading>
                      <Text color="gray.400">{step.desc}</Text>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Features Section */}
            <Box>
              <Heading size="lg" color="white" mb={8} textAlign="center">Why OREKA?</Heading>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8}>
                {features.map((f) => {
                  const FeatureIcon = f.icon;
                  return (
                    <Box key={f.title} bg="#181A20" p={8} borderRadius="2xl" boxShadow="lg" textAlign="center">
                      <FeatureIcon size={40} color="#4F8CFF" style={{ margin: '0 auto', display: 'block' }} />
                      <Heading size="md" mb={3} color="white">{f.title}</Heading>
                      <Text color="gray.400">{f.desc}</Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            {/* Supported Tokens - Static */}
            <Box>
              <Heading size="lg" color="white" mb={8} textAlign="center">Supported Tokens</Heading>
              <HStack spacing={8} align="center" justify="center" flexWrap="wrap">
                {supportedTokens.map((token) => {
                  const symbol = token.pair.split('/')[0].toUpperCase();
                  const fullName = tokenFullNames[symbol] || symbol;
                  return (
                    <Tooltip key={token.pair} label={fullName} hasArrow>
                      <Box textAlign="center" minW="100px">
                        <img
                          src={`/images/${symbol.toLowerCase()}-logo.png`}
                          alt={token.pair}
                          style={{ width: 80, height: 80, display: 'block', margin: '0 auto', marginBottom: 8, borderRadius: '50%' }}
                        />
                        <Text color="white" fontWeight="bold">{symbol}</Text>
                      </Box>
                    </Tooltip>
                  );
                })}
              </HStack>
            </Box>

            {/* Smart Contract Transparency */}
            <Box>
              <Heading size="lg" color="white" mb={4} textAlign="center">Smart Contract Transparency</Heading>
              <Text color="gray.400" fontSize="lg" textAlign="center" mb={4}>
                All markets and trades are managed by open-source Move smart contracts on Aptos. Fully auditable, transparent, and secure.
              </Text>
              <HStack spacing={4} justify="center" mb={4}>
                {contractLinks.map(link => (
                  <Button as="a" href={link.url} target="_blank" color='white' leftIcon={<link.icon />} colorScheme="brand" variant="outline" key={link.label}>{link.label}</Button>
                ))}
              </HStack>
            </Box>

            {/* Community & Footer */}
            <Box textAlign="center" py={8}>
              <HStack spacing={4} justify="center" mb={4}>
                {socialLinks.map(link => (
                  <Button as="a" href={link.url} target="_blank" leftIcon={<link.icon />} colorScheme="brand" color='white' variant="ghost" key={link.label}>{link.label}</Button>
                ))}
              </HStack>
              <Divider my={4} />
              <Text color="gray.500" fontSize="sm">&copy; {new Date().getFullYear()} OREKA. All rights reserved.</Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    </>
  );
};

export default Home; 