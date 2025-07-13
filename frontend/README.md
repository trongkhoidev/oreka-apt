# Yugo Binary Options - Aptos Frontend

A decentralized binary options trading platform built on the Aptos blockchain.

## Features

- **Real-time Price Feeds**: Get live price data from multiple sources (Coinbase, Binance)
- **Create Markets**: Set up your own binary option markets with custom parameters
- **Trade Markets**: Place bids and asks on active markets with instant settlement
- **Aptos Integration**: Built on Aptos blockchain with Move smart contracts
- **Wallet Support**: Connect with Petra, Martian, and other AIP-62 compatible wallets

## Supported Trading Pairs

- BTC/USD
- ETH/USD
- LINK/USD
- SNX/USD
- WSTETH/USD
- APT/USD
- SUI/USD
- ARB/USD
- SOL/USD
- OP/USD
- DOGE/USD
- BNB/USD

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Aptos wallet (Petra, Martian, etc.)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
# Create .env.local file
NEXT_PUBLIC_APTOS_NETWORK=devnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Wallet Setup

1. Install an Aptos wallet:
   - [Petra Wallet](https://petra.app/)
   - [Martian Wallet](https://martianwallet.xyz/)

2. Switch to Aptos Devnet in your wallet

3. Get test APT from the [Aptos Faucet](https://faucet.devnet.aptoslabs.com/)

4. Connect your wallet to the application

## Usage

### Creating a Market

1. Connect your Aptos wallet
2. Navigate to "Create Market"
3. Fill in the market parameters:
   - Trading pair
   - Strike price
   - Bidding start/end times
   - Maturity time
   - Fee
4. Submit the transaction

### Trading on Markets

1. Browse available markets on the "Markets" page
2. Click "View Details" on a market
3. Place bids or asks with your desired amount
4. Wait for market maturity and settlement

## Project Structure

```
src/
├── components/          # React components
│   ├── ConnectWallet.tsx
│   ├── Navigation.tsx
│   └── ...
├── context/            # React context providers
│   └── AuthContext.tsx
├── config/             # Configuration files
│   ├── contracts.ts
│   ├── network.ts
│   └── tradingPairs.ts
├── services/           # Business logic services
│   └── PriceService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── pages/              # Next.js pages
│   ├── _app.tsx
│   ├── index.tsx
│   ├── owner.tsx
│   └── listaddress/
└── utils/              # Utility functions
```

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **UI**: Chakra UI
- **Blockchain**: Aptos
- **Wallet**: @aptos-labs/wallet-adapter-react
- **Price Feeds**: Coinbase API, Binance API
- **Charts**: Recharts

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

This project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

## Roadmap

- [ ] Move smart contract integration
- [ ] Advanced charting features
- [ ] Mobile app
- [ ] Cross-chain support
- [ ] Advanced trading features
- [ ] Governance token 

## GraphQL API Integration

- The frontend now supports fetching position history for markets using a GraphQL API for improved performance and flexibility.
- To use a custom GraphQL endpoint, set the environment variable `NEXT_PUBLIC_GRAPHQL_ENDPOINT` in your `.env.local` file:

```
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
```

- The GraphQL API should provide a `positionHistory(marketAddress: String!): [PositionHistoryPoint!]!` query returning objects with `time`, `long`, and `short` fields. 

## Environment Variables

- `NEXT_PUBLIC_BACKEND_API`: URL backend (ví dụ: `http://localhost:3000` khi phát triển local, hoặc domain backend khi deploy Vercel). Dùng để frontend fetch event đã filter từ backend. 