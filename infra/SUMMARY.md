# Oreka Crypto v2 - Infrastructure Summary

## 🎯 Project Overview
Oreka Crypto v2 is a decentralized betting platform built on Aptos blockchain, featuring poly-option markets, weighted pari-mutuel payouts, and comprehensive reward systems.

## 🏗️ Architecture Components

### Core Smart Contracts (Move)
- **crypto_market.move**: Poly-option market management
- **treasury_pool.move**: Multi-asset treasury management
- **payment_router.move**: Unified payment handling
- **payment_usdc.move**: Circle USDC integration
- **clmm_router.move**: Hyperion CLMM integration
- **reward_manager.move**: ORK token distribution
- **user_stats.move**: User analytics tracking
- **types.move**: Shared data structures
- **pyth_price_adapter.move**: Oracle price feeds
- **ork_token_new.move**: Anti-inflationary ORK token

### Infrastructure Services
- **PostgreSQL**: Event indexing and analytics
- **Redis**: Caching and session management
- **Nodit Indexer**: Blockchain event processing
- **Hyperion CLMM**: Idle capital management
- **Circle USDC**: Stablecoin integration
- **API Gateway**: RESTful API endpoints
- **Monitoring**: Prometheus + Grafana

## 🚀 Key Features

### 1. Poly-Option Markets
- Multiple outcomes per market
- Flexible comparison rules (GT, GTE, LT, LTE, RANGE)
- Time-based bidding periods
- Open market resolution

### 2. Non-Negative Payout Pool
- Weighted pari-mutuel system
- Fee and rake collection
- Guaranteed positive pool balance
- Fair reward distribution

### 3. Multi-Asset Support
- APT (native)
- USDC (Circle FA/PFS)
- ORK (platform token)

### 4. Anti-Inflationary Tokenomics
- Hard-capped ORK supply
- Budget-based reward distribution
- Treasury-managed token vault

### 5. CLMM Integration
- Idle capital deployment
- Yield generation and distribution
- Risk management controls

## 📊 Event System

### Market Events
- Market creation and updates
- Bet placement and withdrawal
- Market resolution and voiding
- Prize distribution

### Payment Events
- Fee collection and distribution
- Rake accumulation
- Treasury operations
- Asset transfers

### CLMM Events
- Deposit and withdrawal tracking
- Yield generation
- Distribution to stakeholders

### Reward Events
- ORK token distribution
- Points accumulation
- User statistics updates

## 🔧 Integration Points

### Circle USDC
- Fungible Asset standard compliance
- Primary Fungible Store integration
- CCTP cross-chain transfer ready

### Hyperion
- CLMM pool management
- Yield optimization
- Risk management

### Nodit
- Real-time event indexing
- Webhook delivery
- Analytics and reporting

### Pyth Oracle
- Price feed validation
- Staleness and confidence checks
- Normalized price scaling

## 🧪 Testing Strategy

### Unit Tests
- Core logic validation
- Payment flow verification
- Reward distribution testing

### Integration Tests
- End-to-end market lifecycle
- Multi-asset payment flows
- CLMM operations
- Treasury management

### Stress Tests
- High-volume betting scenarios
- Multi-market operations
- Edge case handling

## 🚀 Deployment

### Prerequisites
- Aptos node access
- Circle API credentials
- Hyperion integration setup
- Nodit service configuration

### Environment Setup
```bash
# Copy environment template
cp infra/env.example .env

# Configure variables
APTOS_NETWORK=mainnet
ACCOUNT_ADDRESS=0x...
CIRCLE_API_KEY=...
HYPERION_API_KEY=...
NODIT_WEBHOOK_URL=...
```

### Deployment Commands
```bash
# Deploy contracts
./infra/deploy.sh

# Start infrastructure
docker-compose -f infra/docker-compose.yml up -d

# Run tests
./infra/test.sh
```

## 📈 Monitoring & Analytics

### Metrics Collection
- Transaction volume and frequency
- Market creation and resolution rates
- User participation statistics
- Treasury balance tracking
- CLMM performance metrics

### Alerting
- High error rates
- Low liquidity warnings
- Unusual betting patterns
- System health checks

### Dashboards
- Real-time platform metrics
- Market performance analytics
- User behavior insights
- Financial reporting

## 🔒 Security Features

### Access Control
- Role-based permissions
- Emergency pause functionality
- Admin-only operations
- Multi-signature support

### Risk Management
- Bet amount limits
- Market duration constraints
- Fee and rake caps
- CLMM utilization limits

### Audit Trail
- Comprehensive event logging
- Transaction history tracking
- User action monitoring
- Compliance reporting

## 📚 Documentation

### Technical Guides
- API reference documentation
- Integration tutorials
- Deployment guides
- Troubleshooting guides

### User Guides
- Market creation walkthrough
- Betting process explanation
- Reward claiming instructions
- Platform navigation

### Developer Resources
- Smart contract specifications
- Event schema documentation
- Testing frameworks
- Contribution guidelines

## 🔄 Roadmap

### Phase 1: Core Platform
- ✅ Smart contract development
- ✅ Basic market functionality
- ✅ Payment integration
- ✅ Reward system

### Phase 2: Infrastructure
- ✅ Database design
- ✅ Monitoring setup
- ✅ Docker configuration
- ✅ Deployment automation

### Phase 3: Advanced Features
- 🔄 Advanced market types
- 🔄 Social features
- 🔄 Mobile application
- 🔄 Cross-chain support

### Phase 4: Ecosystem
- 🔄 Third-party integrations
- 🔄 Developer SDK
- 🔄 Governance system
- 🔄 DAO implementation

## 🤝 Support & Community

### Technical Support
- GitHub issues
- Documentation portal
- Developer forums
- Integration helpdesk

### Community Resources
- Discord server
- Telegram group
- Twitter updates
- Blog posts

### Contributing
- Code contributions
- Bug reports
- Feature requests
- Documentation improvements

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

**Oreka Crypto v2** - Building the future of decentralized betting on Aptos blockchain.
