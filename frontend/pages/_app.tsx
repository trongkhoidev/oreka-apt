import type { AppProps } from 'next/app';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import theme from '../src/themes/theme';
import Topbar from '../src/components/Topbar';

// Create Material-UI theme
const muiTheme = createTheme();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AptosWalletAdapterProvider optInWallets={["Petra", "Pontem Wallet"]} autoConnect={true}>
      <ChakraProvider theme={theme}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Topbar />
          <Box bg="dark.800" minH="100vh" px={0}>
            <Box mt={20}>
              <Component {...pageProps} />
            </Box>
          </Box>
        </ThemeProvider>
      </ChakraProvider>
    </AptosWalletAdapterProvider>
  );
} 