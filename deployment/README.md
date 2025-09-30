# Oreka Smart Contract Deployment

This directory contains scripts and configuration files for deploying Oreka prediction markets smart contracts to Aptos blockchain.

## 🚀 Quick Start

### 1. Prerequisites

- [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli) installed
- Node.js 18+ (for additional scripts)
- Sufficient APT tokens for deployment

### 2. Setup Account

```bash
# Setup account for mainnet
./scripts/main.sh setup mainnet production

# Setup account for testnet
./scripts/main.sh setup testnet testnet
```

### 3. Deploy Contracts

```bash
# Deploy to mainnet
./scripts/main.sh deploy mainnet production

# Deploy to testnet
./scripts/main.sh deploy testnet testnet
```

### 4. Verify Deployment

```bash
# Verify mainnet deployment
./scripts/main.sh verify mainnet production

# Verify testnet deployment
./scripts/main.sh verify testnet testnet
```

## 📁 Directory Structure

```
deployment/
├── scripts/
│   ├── main.sh              # Main deployment manager
│   ├── deploy.sh            # Core deployment script
│   ├── setup-account.sh     # Account setup script
│   ├── verify.sh            # Deployment verification
│   └── multisig-deploy.sh   # Multi-signature deployment
├── config/
│   ├── production.env       # Mainnet configuration
│   ├── testnet.env          # Testnet configuration
│   └── development.env      # Development configuration
├── keys/                    # Account keys (gitignored)
├── deployments/             # Deployment records
├── reports/                 # Verification reports
└── logs/                    # Deployment logs
```

## 🔧 Configuration

### Environment Files

Each environment has its own configuration file:

- **`production.env`**: Mainnet deployment
- **`testnet.env`**: Testnet deployment  
- **`development.env`**: Development/testing

### Required Configuration

```env
# Aptos Profile Configuration
APTOS_PROFILE=oreka_mainnet
APTOS_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Network URLs
APTOS_REST_URL=https://fullnode.mainnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.mainnet.aptoslabs.com

# Module Configuration
MODULE_ADDRESS=0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d
```

## 📋 Available Commands

### Account Management

```bash
# Setup new account
./scripts/main.sh setup [network] [profile]

# Check account balance
./scripts/main.sh balance [network] [profile]

# Show account information
./scripts/main.sh info [network] [profile]
```

### Deployment

```bash
# Deploy contracts
./scripts/main.sh deploy [network] [profile]

# Verify deployment
./scripts/main.sh verify [network] [profile]

# Multi-signature deployment
./scripts/main.sh multisig [network] [profile]
```

### Testing & Development

```bash
# Run tests
./scripts/main.sh test [network] [profile]

# Compile contracts
./scripts/main.sh compile [network] [profile]
```

### Utilities

```bash
# Clean artifacts
./scripts/main.sh clean [network] [profile]

# Show logs
./scripts/main.sh logs [network] [profile]

# Show deployment status
./scripts/main.sh status [network] [profile]
```

## 🔐 Security Considerations

### Private Key Management

- **Never commit private keys to version control**
- Use environment variables or secure key management
- Consider using hardware wallets for production

### Multi-signature Deployment

For production deployments, consider using multi-signature accounts:

```bash
# Enable multisig in config
REQUIRE_MULTISIG=true
MULTISIG_THRESHOLD=2
MULTISIG_ACCOUNTS="0x123...,0x456...,0x789..."

# Run multisig deployment
./scripts/main.sh multisig mainnet production
```

## 📊 Deployment Process

### 1. Account Setup

- Generate or import Aptos account
- Fund account with APT tokens
- Configure environment variables

### 2. Contract Compilation

- Compile Move modules
- Verify bytecode integrity
- Run unit tests

### 3. Module Deployment

- Publish modules to blockchain
- Initialize required resources
- Set up configuration

### 4. Verification

- Verify module deployment
- Check resource initialization
- Test module functions
- Generate deployment report

## 🏗️ Deployed Modules

### Core Modules

- **`global_pool`**: Global liquidity pool management
- **`market_core`**: Binary prediction markets
- **`pyth_price_adapter`**: Pyth price feed integration
- **`types`**: Shared type definitions

### Initialized Resources

- **`GlobalPool`**: Global pool state
- **`MarketRegistry`**: Market registry
- **`MarketConfig`**: Market configuration

## 🔍 Verification

### Automated Verification

The verification script checks:

- ✅ Module deployment status
- ✅ Resource initialization
- ✅ Function accessibility
- ✅ Account balance
- ✅ Configuration validity

### Manual Verification

```bash
# Check deployed modules
aptos account list --profile oreka_mainnet --query modules

# Check initialized resources
aptos account list --profile oreka_mainnet --query resources

# Test module functions
aptos move view --function-id 0x...::global_pool::get_global_pool_summary
```

## 📈 Monitoring

### Deployment Tracking

- Deployment records saved in `deployments/`
- Verification reports in `reports/`
- Logs in `logs/`

### Health Checks

```bash
# Check deployment status
./scripts/main.sh status mainnet production

# View recent logs
./scripts/main.sh logs mainnet production
```

## 🚨 Troubleshooting

### Common Issues

1. **Insufficient Balance**
   ```bash
   # Check balance
   ./scripts/main.sh balance mainnet production
   
   # Fund account (testnet only)
   aptos account fund-with-faucet --profile oreka_testnet
   ```

2. **Compilation Errors**
   ```bash
   # Compile and check errors
   ./scripts/main.sh compile mainnet production
   ```

3. **Deployment Failures**
   ```bash
   # Check logs
   ./scripts/main.sh logs mainnet production
   
   # Verify configuration
   cat config/production.env
   ```

4. **Verification Failures**
   ```bash
   # Run verification
   ./scripts/main.sh verify mainnet production
   
   # Check deployment status
   ./scripts/main.sh status mainnet production
   ```

### Recovery Procedures

1. **Failed Deployment**
   - Check account balance
   - Verify configuration
   - Retry deployment

2. **Partial Deployment**
   - Check which modules deployed
   - Redeploy missing modules
   - Reinitialize resources

3. **Configuration Issues**
   - Verify environment variables
   - Check network connectivity
   - Validate private key format

## 🔄 Updates & Maintenance

### Updating Contracts

1. Update source code
2. Compile and test
3. Deploy new version
4. Verify deployment
5. Update configuration

### Monitoring

- Monitor contract events
- Track gas usage
- Monitor account balance
- Check for errors

## 📚 Additional Resources

- [Aptos CLI Documentation](https://aptos.dev/cli-tools/aptos-cli-tool/)
- [Move Language Guide](https://move-language.github.io/move/)
- [Aptos Developer Portal](https://aptos.dev/)

## 🤝 Contributing

1. Follow security best practices
2. Test on testnet first
3. Document any changes
4. Update configuration as needed

## 📄 License

MIT License - see LICENSE file for details
