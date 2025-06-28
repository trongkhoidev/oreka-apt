import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Button, SimpleGrid, Stack, Divider, useBreakpointValue, Flex, Tooltip
} from '@chakra-ui/react';
import { FaRocket, FaLock, FaChartLine, FaBolt, FaArrowRight, FaShieldAlt, FaWallet, FaGithub, FaTwitter, FaDiscord, FaGlobe, FaCode } from 'react-icons/fa';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ConnectWallet from '../components/ConnectWallet';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import { motion } from 'framer-motion';
import Head from 'next/head';

// Motion components for react-icons
const MotionFaWallet = motion(FaWallet);
const MotionFaRocket = motion(FaRocket);
const MotionFaArrowRight = motion(FaArrowRight);
const MotionFaLock = motion(FaLock);
const MotionFaChartLine = motion(FaChartLine);
const MotionFaBolt = motion(FaBolt);
const MotionFaShieldAlt = motion(FaShieldAlt);

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);
const MotionText = motion(Text);
const MotionButton = motion(Button);
const MotionImg = motion.img;

const features = [
  { icon: MotionFaLock, title: 'On-chain Security', desc: 'All markets are managed by Move smart contracts on Aptos.' },
  { icon: MotionFaChartLine, title: 'Real-time Prices', desc: 'Live price feeds from trusted oracles and exchanges.' },
  { icon: MotionFaBolt, title: 'Instant Settlement', desc: 'Automatic payouts and fee distribution on market resolution.' },
  { icon: MotionFaShieldAlt, title: 'Multi-token Support', desc: 'Trade binary options on APT, BTC, ETH, SOL, SUI, BNB, WETH.' },
];

const steps = [
  { icon: MotionFaWallet, title: 'Connect Wallet', desc: 'Connect your Aptos wallet to get started.' },
  { icon: MotionFaRocket, title: 'Create or Join Market', desc: 'Create your own binary options market or join existing ones.' },
  { icon: MotionFaArrowRight, title: 'Trade & Earn', desc: 'Bid on price outcomes and earn instant rewards.' },
];

const contractLinks = [
  { icon: FaCode, label: 'Move Source', url: 'https://aptos.dev/en/build/smart-contracts' },
  { icon: FaGlobe, label: 'Aptos Explorer', url: 'https://explorer.aptoslabs.com/' },
  { icon: FaGithub, label: 'Github', url: 'https://github.com/your-org/your-repo' },
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

const Home: React.FC = () => {
  const { connected } = useWallet();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [prices, setPrices] = useState<{ [symbol: string]: number }>({});
  const [isMarqueeHovered, setIsMarqueeHovered] = useState(false);
  const supportedTokens = getAvailableTradingPairs();

  // Fetch real-time prices for supported tokens (optional, for hover)
  useEffect(() => {
    // Nếu muốn show giá động khi hover token, có thể giữ lại PriceService ở đây
  }, []);

  // Animation for supported tokens marquee
  const marqueeTokens = [
    ...supportedTokens,
    ...supportedTokens, // repeat for smooth loop
  ];

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
      <Box 
        bg="#0A0B0F" 
        minH="100vh" 
        py={0}
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(79, 140, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(167, 112, 239, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Container maxW="container.xl" py={{ base: 8, md: 16 }} position="relative" zIndex={1}>
          <VStack spacing={16} align="stretch">
            {/* Hero Section */}
            <Box textAlign="center" py={{ base: 8, md: 16 }}>
              <VStack spacing={2} mb={2}>
                <Text
                  fontSize={{ base: "4xl", md: "6xl" }}
                  fontWeight="extrabold"
                  bgGradient="linear(to-r, #4F8CFF, #A770EF)"
                  bgClip="text"
                  letterSpacing="wider"
                  fontFamily="'Orbitron', 'Montserrat', sans-serif"
                  lineHeight="1"
                >
                  OREKA
                </Text>
                <Text
                  fontSize={{ base: "md", md: "lg" }}
                  color="gray.400"
                  fontWeight="medium"
                  letterSpacing="wide"
                >
                  Empowering Decentralized Prediction Markets
                </Text>
              </VStack>
              <Text
                as="h1"
                fontSize={{ base: "2xl", md: "4xl" }}
                mb={4}
                bgGradient="linear(to-r, #4F8CFF, #A770EF)"
                bgClip="text"
                fontWeight="extrabold"
                letterSpacing="tight"
              >
                Prediction Markets on Aptos
              </Text>
              <HStack spacing={4} justify="center" mb={4}>
                {!connected && <ConnectWallet />}
                <MotionButton 
                  as="a" 
                  href="/owner" 
                  colorScheme="brand" 
                  size="lg" 
                  px={8} 
                  py={6} 
                  fontWeight="bold" 
                  fontSize="xl" 
                  borderRadius="xl" 
                  boxShadow="md"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(79, 140, 255, 0.5)",
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Create Market
                </MotionButton>
                <MotionButton 
                  as="a" 
                  href="/listaddress" 
                  variant="outline" 
                  size="lg" 
                  px={8} 
                  py={6} 
                  fontWeight="bold" 
                  fontSize="xl" 
                  borderRadius="xl" 
                  color="white" 
                  borderColor="#4F8CFF" 
                  _hover={{ bg: '#181A20', borderColor: '#A770EF' }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(167, 112, 239, 0.3)",
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Browse Markets
                </MotionButton>
              </HStack>
            </Box>

            {/* How It Works Section */}
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <Heading size="lg" color="white" mb={8} textAlign="center">How It Works</Heading>
              <Stack direction={{ base: 'column', md: 'row' }} spacing={8} justify="center" align="center">
                {steps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <MotionBox
                      key={step.title}
                      bg="#181A20"
                      p={6}
                      borderRadius="2xl"
                      boxShadow="md"
                      textAlign="center"
                      w={{ base: '100%', md: '300px' }}
                      _hover={{ boxShadow: 'xl', transform: 'scale(1.04)' }}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 + idx * 0.15 }}
                      viewport={{ once: true }}
                      whileHover={{ 
                        y: -8,
                        rotateY: 5,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                      }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <StepIcon
                        size={32}
                        color="#A770EF"
                        style={{ margin: '0 auto', display: 'block' }}
                      />
                      <Heading size="md" color="white" mb={2}>{step.title}</Heading>
                      <Text color="gray.400">{step.desc}</Text>
                    </MotionBox>
                  );
                })}
              </Stack>
            </MotionBox>

            {/* Features Section */}
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Heading size="lg" color="white" mb={8} textAlign="center">Why OREKA?</Heading>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8}>
                {features.map((f, i) => {
                  const FeatureIcon = f.icon;
                  return (
                    <MotionBox
                      key={f.title}
                      bg="#181A20"
                      p={8}
                      borderRadius="2xl"
                      boxShadow="lg"
                      textAlign="center"
                      _hover={{ boxShadow: '2xl', transform: 'translateY(-4px) scale(1.03)' }}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 + i * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ 
                        y: -12,
                        rotateX: 5,
                        boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
                      }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <FeatureIcon
                        size={40}
                        color="#4F8CFF"
                        style={{ margin: '0 auto', display: 'block' }}
                      />
                      <Heading size="md" mb={3} color="white">{f.title}</Heading>
                      <Text color="gray.400">{f.desc}</Text>
                    </MotionBox>
                  );
                })}
              </SimpleGrid>
            </MotionBox>

            {/* Supported Tokens - Marquee Animation */}
            <Box>
              <Heading size="lg" color="white" mb={8} textAlign="center">Supported Tokens</Heading>
              <Box 
                overflow="hidden" 
                w="full" 
                py={2} 
                position="relative"
                onMouseEnter={() => setIsMarqueeHovered(true)}
                onMouseLeave={() => setIsMarqueeHovered(false)}
              >
                <MotionHStack
                  spacing={8}
                  align="center"
                  style={{ whiteSpace: 'nowrap' }}
                  animate={{ 
                    x: isMarqueeHovered ? "0px" : [0, -((supportedTokens.length) * 120)]
                  }}
                  transition={{ 
                    repeat: isMarqueeHovered ? 0 : Infinity, 
                    duration: 18, 
                    ease: "linear" 
                  }}
                >
                  {marqueeTokens.map((token, idx) => (
                    <Tooltip key={token.pair + idx} label={token.pair} hasArrow>
                      <MotionBox 
                        textAlign="center" 
                        minW="100px"
                        whileHover={{ 
                          scale: 1.1,
                          y: -5
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <MotionImg
                          src={`/images/${token.pair.split('/')[0].toLowerCase()}-logo.png`}
                          alt={token.pair}
                          style={{ width: 150, height: 150, display: 'block', margin: '0 auto', marginBottom: 8, borderRadius: '50%' }}
                          whileHover={{ 
                            rotate: 360,
                            scale: 1.2
                          }}
                          transition={{ duration: 0.6 }}
                        />
                        <Text color="white" fontWeight="bold">{token.pair.split('/')[0]}</Text>
                      </MotionBox>
                    </Tooltip>
                  ))}
                </MotionHStack>
              </Box>
            </Box>

            {/* Smart Contract Transparency */}
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Heading size="lg" color="white" mb={4} textAlign="center">Smart Contract Transparency</Heading>
              <Text color="gray.400" fontSize="lg" textAlign="center" mb={4}>
                All markets and trades are managed by open-source Move smart contracts on Aptos. Fully auditable, transparent, and secure.
              </Text>
              <HStack spacing={4} justify="center" mb={4}>
                {contractLinks.map(link => (
                  <MotionButton 
                    as="a" 
                    href={link.url} 
                    target="_blank" 
                    color='white'
                    leftIcon={<link.icon />} 
                    colorScheme="brand" 
                    variant="outline" 
                    key={link.label}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(79, 140, 255, 0.3)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {link.label}
                  </MotionButton>
                ))}
              </HStack>
            </MotionBox>

            {/* Community & Footer */}
            <Box textAlign="center" py={8}>
              <HStack spacing={4} justify="center" mb={4}>
                {socialLinks.map(link => (
                  <MotionButton 
                    as="a" 
                    href={link.url} 
                    target="_blank" 
                    leftIcon={<link.icon />} 
                    colorScheme="brand" 
                    color='white'
                    variant="ghost" 
                    key={link.label}
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 5
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {link.label}
                  </MotionButton>
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