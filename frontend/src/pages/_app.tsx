import type { AppProps } from 'next/app';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import theme from '../themes/theme';
import NavigationSidebar from '../components/Navigation';
import Topbar from '../components/Topbar';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AptosWalletAdapterProvider optInWallets={["Petra", "Pontem Wallet"]} autoConnect={true}>
      <ChakraProvider theme={theme}>
        <NavigationSidebar />
        <Box ml={{ base: '100px', md: '280px' }} bg="dark.800" minH="100vh" px={{ base: 2, md: 10 }}>
          <Topbar />
          <Box mt={6}>
            <Component {...pageProps} />
          </Box>
        </Box>
      </ChakraProvider>
    </AptosWalletAdapterProvider>
  );
} 