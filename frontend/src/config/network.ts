import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk';

// Define a type for network configuration for better type safety
export type AptosNetwork = typeof networkConfig.mainnet;

// Aptos network configuration
export const networkConfig = {
  mainnet: {
    name: 'mainnet',
    nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    faucetUrl: null,
    chainId: 1
  },
  devnet: {
    name: 'devnet',
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    chainId: 193
  },
  testnet: {
    name: 'testnet', 
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    chainId: 2
  },
  
};

// Get current network based on environment
export const getCurrentNetwork = () => {
  const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
  return networkConfig[network as keyof typeof networkConfig] || networkConfig.mainnet;
};

// Get Aptos client instance
export const getAptosClient = () => {
  const network = getCurrentNetwork();
  // Explicitly create the config with the nodeUrl from our configuration
  // This avoids issues with SDK versions and ensures the correct endpoint is always used.
  console.log('[getAptosClient] Using baseURL:', network.nodeUrl);
  const config = new AptosConfig({ fullnode: network.nodeUrl });
  return new Aptos(config);
};

// Get network info
export const getNetworkInfo = () => {
  return getCurrentNetwork();
}; 