import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Aptos network configuration
export const networkConfig = {
  localnet: {
    name: 'localnet',
    nodeUrl: 'http://localhost:8080',
    faucetUrl: 'http://localhost:8081',
    chainId: 1337
  },
  devnet: {
    name: 'devnet',
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com',
    faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    chainId: 1
  },
  testnet: {
    name: 'testnet',
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    chainId: 2
  },
  mainnet: {
    name: 'mainnet',
    nodeUrl: 'https://fullnode.mainnet.aptoslabs.com',
    faucetUrl: null,
    chainId: 1
  }
};

// Get current network based on environment
export const getCurrentNetwork = () => {
  const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'localnet';
  return networkConfig[network as keyof typeof networkConfig] || networkConfig.localnet;
};

// Get Aptos client instance
export const getAptosClient = () => {
  const network = getCurrentNetwork();
  const config = new AptosConfig({ network: Network.DEVNET });
  return new Aptos(config);
};

// Get network info
export const getNetworkInfo = () => {
  return getCurrentNetwork();
}; 