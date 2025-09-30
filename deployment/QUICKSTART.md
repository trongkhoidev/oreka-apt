# 🚀 Oreka Deployment Quick Start Guide

This guide will help you deploy Oreka prediction markets smart contracts to Aptos blockchain in just a few steps.

## ⚡ Quick Deployment (5 minutes)

### 1. Prerequisites

```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Install jq (for JSON processing)
# Ubuntu/Debian:
sudo apt-get install jq

# macOS:
brew install jq
```

### 2. Setup Account

```bash
# Navigate to deployment directory
cd deployment

# Setup account for mainnet
make setup network=mainnet profile=production

# Or for testnet
make setup network=testnet profile=testnet
```

### 3. Deploy Contracts

```bash
# Deploy to mainnet
make deploy network=mainnet profile=production

# Or deploy to testnet
make deploy network=testnet profile=testnet
```

### 4. Verify Deployment

```bash
# Verify mainnet deployment
make verify network=mainnet profile=production

# Or verify testnet deployment
make verify network=testnet profile=testnet
```

## 🎯 One-Command Deployment

### Mainnet Deployment

```bash
make deploy-mainnet
```

### Testnet Deployment

```bash
make deploy-testnet
```

### Development Deployment

```bash
make deploy-dev
```

## 🔧 Manual Step-by-Step

### Step 1: Account Setup

```bash
# Generate new account
./scripts/setup-account.sh production mainnet

# Check account balance
make balance network=mainnet profile=production
```

### Step 2: Configuration

Edit the configuration file:

```bash
# Edit mainnet config
nano config/production.env

# Update these values:
# APTOS_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
# MODULE_ADDRESS=0xYOUR_ADDRESS_HERE
```

### Step 3: Deploy

```bash
# Deploy contracts
./scripts/deploy.sh mainnet production

# Or use make
make deploy network=mainnet profile=production
```

### Step 4: Verify

```bash
# Verify deployment
./scripts/verify.sh mainnet production

# Or use make
make verify network=mainnet profile=production
```

## 📋 Deployment Checklist

### Pre-deployment

- [ ] Aptos CLI installed
- [ ] jq installed
- [ ] Account created and funded
- [ ] Configuration file updated
- [ ] Private key secured

### Deployment

- [ ] Contracts compiled successfully
- [ ] Modules published to blockchain
- [ ] Resources initialized
- [ ] Configuration set

### Post-deployment

- [ ] Deployment verified
- [ ] Functions tested
- [ ] Deployment info saved
- [ ] Monitoring setup

## 🔍 Verification Commands

### Check Deployment Status

```bash
make status network=mainnet profile=production
```

### View Account Info

```bash
make info network=mainnet profile=production
```

### Check Balance

```bash
make balance network=mainnet profile=production
```

### View Logs

```bash
make logs network=mainnet profile=production
```

## 🚨 Troubleshooting

### Common Issues

1. **"Aptos CLI not found"**
   ```bash
   # Install Aptos CLI
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   ```

2. **"Insufficient balance"**
   ```bash
   # Check balance
   make balance network=mainnet profile=production
   
   # Fund account (testnet only)
   aptos account fund-with-faucet --profile oreka_testnet
   ```

3. **"Config file not found"**
   ```bash
   # Create config from template
   cp config/production.env.example config/production.env
   # Edit with your values
   nano config/production.env
   ```

4. **"Compilation failed"**
   ```bash
   # Check Move syntax
   make compile network=mainnet profile=production
   ```

### Getting Help

```bash
# Show all available commands
make help

# Show specific command help
./scripts/main.sh help
```

## 📊 Deployment Information

### Deployed Modules

- **`global_pool`**: Global liquidity pool
- **`market_core`**: Prediction markets
- **`pyth_price_adapter`**: Price feed integration
- **`types`**: Shared types

### Initialized Resources

- **`GlobalPool`**: Pool state management
- **`MarketRegistry`**: Market registry
- **`MarketConfig`**: Market configuration

### Module Address

```
0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d
```

## 🔐 Security Notes

- **Never share your private key**
- **Use testnet for testing**
- **Verify all transactions**
- **Keep deployment records**

## 📚 Next Steps

After successful deployment:

1. **Update Indexer**: Update PostgreSQL indexer with new module address
2. **Frontend Integration**: Update frontend to use deployed contracts
3. **Monitoring**: Set up monitoring and alerts
4. **Documentation**: Update API documentation

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review deployment logs
3. Verify configuration
4. Test on testnet first

## 🎉 Success!

Once deployment is complete, you'll have:

- ✅ Smart contracts deployed on Aptos
- ✅ All modules initialized
- ✅ Ready for production use
- ✅ Full verification completed

Your Oreka prediction markets are now live on Aptos blockchain! 🚀
