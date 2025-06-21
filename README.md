# Yugo - Binary Options Platform on Aptos

A decentralized binary options trading platform built on Aptos blockchain using Move language.

## Features

- 📈 Binary options trading with price feeds
- ⚡ Fast transaction processing
- 🎲 Pool-based reward distribution
- 🔒 Secure Move smart contracts
- 💱 Support for multiple trading pairs
- 🏭 Factory for deploying custom markets

## Architecture

### Smart Contracts (Move)
- `types.move` - Core data structures and types
- `binary_option_market.move` - Main trading contract
- `factory.move` - Market deployment factory

### Frontend
- Next.js with TypeScript
- Aptos wallet integration
- Real-time market data

## Getting Started

### Prerequisites
- Aptos CLI
- Node.js >= 16
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd yugo
```

2. Install Aptos CLI:
```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
```

3. Setup Aptos environment:
```bash
aptos init
```

4. Deploy contracts:
```bash
./scripts/deploy.sh local
```

5. Start frontend:
```bash
cd frontend
npm install
npm run dev
```

## Development

### Running Tests
```bash
cd move
aptos move test
```

### Compiling Contracts
```bash
cd move
aptos move compile
```

## License

MIT
