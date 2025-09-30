/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APTOS_NETWORK: process.env.NEXT_PUBLIC_APTOS_NETWORK || 'mainnet',
    NEXT_PUBLIC_APTOS_NODE_URL: process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
  },
}

module.exports = nextConfig; 
