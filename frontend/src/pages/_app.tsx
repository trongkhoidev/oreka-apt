import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";
import { PontemWalletAdapter } from "@pontem/aptos-wallet-adapter";
import theme from '../themes/theme';
import MainLayout from '../layouts/MainLayout';
// import { BloctoWallet } from "@blocto/aptos-wallet-adapter-plugin";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AptosWalletAdapterProvider optInWallets={["Petra", "Pontem Wallet"]} autoConnect={true}>
      <ChakraProvider theme={theme}>
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
      </ChakraProvider>
    </AptosWalletAdapterProvider>
  );
} 