# Yugo Binary Options – Aptos dApp

A professional, real-time decentralized binary options trading platform built on the Aptos blockchain, featuring on-chain Move smart contracts, a modern Next.js/React frontend, and robust wallet and data integrations.

---

## Features

- **On-chain Binary Options**: All market logic and settlement are handled by Move smart contracts on Aptos.
- **Real-time Price Feeds**: Live price data from trusted oracles (Coinbase, Binance, etc.).
- **Create & Trade Markets**: Deploy your own binary option markets or trade on existing ones.
- **Wallet Support**: Connect with Petra, Martian, Pontem, and other AIP-62 compatible wallets.
- **Instant Settlement**: Automatic payouts and fee distribution on market resolution.
- **Advanced Search**: Search and filter all on-chain markets by title, pair, and more.
- **Position History Charts**: Visualize market participation over time, powered by on-chain events or GraphQL API.
- **Responsive UI**: Built with Next.js, React, Chakra UI, and Recharts for a seamless user experience.

---

## Architecture

### Smart Contracts (Move)
- `types.move`: Core data structures and types
- `binary_option_market.move`: Main binary options contract (market logic, events, settlement)
- `factory.move`: Market deployment factory

### Frontend
- **Framework**: Next.js (TypeScript, React)
- **UI**: Chakra UI, Recharts
- **Wallet Integration**: @aptos-labs/wallet-adapter-react
- **Data**: On-chain fetch via Aptos fullnode REST API, with optional GraphQL for position history

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Aptos wallet (Petra, Martian, Pontem, etc.)

### Installation

1. **Clone the repository:**
   ```bash
git clone <your-repo-url>
cd frontend
```
2. **Install dependencies:**
   ```bash
npm install
# or
yarn install
```
3. **Set up environment variables:**
   - Create a `.env.local` file in `frontend/`:
   ```env
NEXT_PUBLIC_APTOS_NETWORK=devnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-api-endpoint.com/graphql
```
   - (Optional) For backend event filtering:
   ```env
NEXT_PUBLIC_BACKEND_API=http://localhost:3000
```
4. **Run the development server:**
   ```bash
npm run dev
# or
yarn dev
```
5. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

### Creating a Market
1. Connect your Aptos wallet
2. Go to "Create Market"
3. Fill in trading pair, strike price, bidding/maturity times, and fee
4. Submit the transaction (on-chain)

### Trading on Markets
1. Browse available markets on the "Markets" page
2. Click a market to view details and charts
3. Place long/short bids during the bidding phase
4. Wait for market maturity and settlement
5. Claim winnings if you are eligible

### Position History & Charts
- The frontend visualizes position history using on-chain events or a GraphQL API for performance.
- To use a custom GraphQL endpoint, set `NEXT_PUBLIC_GRAPHQL_ENDPOINT` in your `.env.local`.
- The GraphQL API should provide a `positionHistory(marketAddress: String!): [PositionHistoryPoint!]!` query returning objects with `time`, `long`, and `short` fields.

---

## Project Structure

```
src/
├── components/          # React components (UI, charts, wallet, market cards)
├── config/              # Network, contract, and trading pair configs
├── context/             # React context providers
├── contracts/           # Move contract ABIs/types/utils
├── hooks/               # Custom React hooks (market, position, etc.)
├── layouts/             # Main layout components
├── services/            # Data fetching, price feeds, event listeners, GraphQL
├── themes/              # Chakra UI theme
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── pages/               # Next.js pages (routing)
```

---

## Environment Variables

- `NEXT_PUBLIC_APTOS_NETWORK`: Aptos network (`mainnet`, `testnet`, `devnet`)
- `NEXT_PUBLIC_APTOS_NODE_URL`: Fullnode endpoint (must end with `/v1`)
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT`: (Optional) GraphQL endpoint for position history
- `NEXT_PUBLIC_BACKEND_API`: (Optional) Backend API for event filtering

---

## Development

### Scripts
- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Run ESLint

### Code Style
- TypeScript for type safety
- ESLint for linting
- Prettier for formatting

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

This project is licensed under the MIT License. 