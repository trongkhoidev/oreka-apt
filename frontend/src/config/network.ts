import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

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
  
  
};

// Get current network based on environment
export const getCurrentNetwork = () => {
  const customNodeUrl = process.env.NEXT_PUBLIC_APTOS_NODE_URL;
  if (customNodeUrl) {
    return {
      name: Network.CUSTOM,
      nodeUrl: customNodeUrl,
      faucetUrl: null,
      chainId: 1 
    };
  }
  const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet';
  let networkName: Network = Network.MAINNET;
  if (network === 'testnet') networkName = Network.TESTNET;
  else if (network === 'devnet') networkName = Network.DEVNET;
  else if (network === 'mainnet') networkName = Network.MAINNET;
  return { ...networkConfig[network as keyof typeof networkConfig] || networkConfig.mainnet, name: networkName };
};

// Get Aptos client instance
export const getAptosClient = () => {
  const network = getCurrentNetwork();
  let nodeUrl = network.nodeUrl;
  if (!nodeUrl.endsWith('/v1')) {
    nodeUrl = nodeUrl.replace(/\/+$/, '') + '/v1';
  }
  console.log('[getAptosClient] Using baseURL:', nodeUrl);
  const config = new AptosConfig({ fullnode: nodeUrl, network: network.name });
  return new Aptos(config);
};

// Get network info
export const getNetworkInfo = () => {
  return getCurrentNetwork();
}; 