# OREKA Binary Options – Decentralized Trading Platform on Aptos

A professional, real-time decentralized binary options trading platform built on the Aptos blockchain. OREKA combines on-chain Move smart contracts, a modern Next.js/React frontend, robust wallet and data integrations, and a seamless DeFi experience.

---

## 🚀 Features

- **On-chain Binary Options**: All market logic and settlement are handled by Move smart contracts on Aptos.
- **Real-time Price Feeds**: Live price data from trusted oracles (Pyth, Binance, Coinbase, v.v.).
- **Create & Trade Markets**: Deploy your own binary option markets or trade on existing ones.
- **Multi-token Support**: Trade binary options on APT, BTC, ETH, SOL, SUI, BNB, WETH, and more.
- **Wallet Integration**: Connect with Petra, Martian, Pontem, Blocto, Nightly, Particle, and other AIP-62 compatible wallets.
- **Instant Settlement**: Automatic payouts and fee distribution on market resolution.
- **Advanced Search**: Search and filter all on-chain markets by title, pair, and more.
- **Position History Charts**: Visualize market participation over time, powered by on-chain events.
- **Responsive UI**: Built with Next.js, React, Chakra UI, and Recharts for a seamless user experience.
- **Open-source & Transparent**: All contracts and logic are fully auditable.

---

## 🏗️ Architecture

### Smart Contracts (Move)
- **Location**: `sources/`
- **Contracts**:
  - `types.move`: Core data structures and event definitions.
  - `market_core.move`: Main binary options contract (market logic, events, settlement, claim, withdraw fee, registry, view functions).
  - `pyth_price_adapter.move`: Oracle price integration (Pyth).
- **Tests**: `tests/market_core_tests.move` – Unit tests for contract logic.
- **Dependencies**: [Pyth Crosschain](https://github.com/pyth-network/pyth-crosschain.git)

### Frontend
- **Framework**: Next.js (TypeScript, React)
- **UI**: Chakra UI, Recharts, Chart.js
- **Wallet Integration**: @aptos-labs/wallet-adapter-react, multi-wallet support
- **Data**: On-chain fetch via Aptos fullnode REST API
- **Structure**:
  - `frontend/src/components/`: UI, charts, wallet, market cards, owner/customer panels
  - `frontend/src/services/`: Data fetching, price feeds, event listeners
  - `frontend/src/config/`: Network, contract, and trading pair configs
  - `frontend/src/hooks/`: Custom React hooks
  - `frontend/src/layouts/`: Main layout components
  - `frontend/src/themes/`: Chakra UI theme
  - `frontend/src/types/`: TypeScript type definitions
  - `frontend/src/utils/`: Utility functions
  - `frontend/pages/`: Next.js pages (routing)
  - `frontend/public/`: Asset, logo, font, deployed contract address

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Aptos CLI
- Aptos wallet (Petra, Martian, Pontem, Blocto, Nightly, Particle, etc.)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/trongkhoidev/oreka-apt.git
   cd oreka
   ```
2. **Install Aptos CLI:**
   ```bash
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   ```
3. **Setup Aptos environment:**
   ```bash
   aptos init
   ```
4. **Deploy contracts:**
   ```bash
   ./scripts/deploy.sh local
   ```
5. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Frontend)
Create a `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_APTOS_NETWORK=devnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
# (Optional) For backend event filtering:
NEXT_PUBLIC_BACKEND_API=http://localhost:3000
```

---

## 🧑‍💻 Usage

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
- The frontend visualizes position history using on-chain events directly
- All position and market data are fetched from Aptos fullnode REST API and processed in the frontend.

---

## 🛠️ Development

### Scripts
- `npm run dev` – Start development server (frontend)
- `npm run build` – Build for production (frontend)
- `npm run start` – Start production server (frontend)
- `npm run lint` – Run ESLint (frontend)
- `./scripts/test.sh` – Run all Move contract tests
- `aptos move compile` – Compile Move contracts

### Code Style
- TypeScript for type safety
- ESLint for linting
- Prettier for formatting

---

## 📂 Project Structure

```
oreka/
├── sources/                # Move smart contracts (types, market_core, pyth_price_adapter)
├── tests/                  # Move contract tests
├── scripts/                # Deploy/test scripts
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── components/     # UI, charts, wallet, market panels
│   │   ├── services/       # Data, price, event
│   │   ├── config/         # Network, contract, trading pairs
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Layout components
│   │   ├── themes/         # Chakra UI theme
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   ├── public/             # Asset, logo, font, deployed contract address
│   ├── pages/              # Next.js pages (routing)
│   ├── package.json        # Frontend dependencies/scripts
├── Move.toml               # Move package config
├── README.md               # Project documentation
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License
This project is licensed under the MIT License.

## Originality
The original [Oreka](https://github.com/mangekyou-labs/oreka) inspires this project

