import type { AppProps } from 'next/app';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";
import { PontemWalletAdapter } from "@pontem/aptos-wallet-adapter";
import theme from '../themes/theme';
import NavigationSidebar from '../components/Navigation';
import Topbar from '../components/Topbar';
// import { useRouter } from 'next/router';
// import { BloctoWallet } from "@blocto/aptos-wallet-adapter-plugin";

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