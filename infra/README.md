# Oreka Crypto v2 - Integration Guide

## Overview
Oreka Crypto v2 is a decentralized betting platform built on Aptos blockchain, featuring poly-option markets, weighted pari-mutuel payouts, and comprehensive reward systems.

## Nodit Integration

### Event Topics for Indexing

#### Market Events
- **MarketCreatedEvent**: Track new market creation
- **BetPlacedEvent**: Monitor betting activity
- **ResolveEvent**: Track market resolution
- **PrizePaidEvent**: Monitor payout distributions
- **WithdrawFeeEvent**: Track fee withdrawals
- **WithdrawRakeEvent**: Monitor rake distributions

#### Payment Events
- **PaymentCollectedEvent**: Track payment collections
- **PaymentPayoutEvent**: Monitor payment distributions
- **USDCDepositEvent**: USDC deposit tracking
- **USDCWithdrawEvent**: USDC withdrawal monitoring

#### Treasury Events
- **FeeDepositedEvent**: Fee deposits to treasury
- **RakeDepositedEvent**: Rake deposits to treasury
- **DustSweptEvent**: Dust collection events

#### CLMM Events
- **CLMMDepositedEvent**: CLMM deposit tracking
- **CLMMWithdrawnEvent**: CLMM withdrawal monitoring
- **CLMMYieldAccruedEvent**: Yield accrual events

#### Reward Events
- **RewardDistributedEvent**: ORK token distribution
- **PointsUpdatedEvent**: User points updates

### Webhook Usage

#### Market Creation Webhook
```json
{
  "event_type": "MarketCreatedEvent",
  "data": {
    "creator": "0x...",
    "market_address": "0x...",
    "price_feed_id": "0x...",
    "num_outcomes": 3,
    "fee_percentage": 150,
    "rake_percentage": 250,
    "ork_budget": 1000,
    "bidding_start_time": 1234567890,
    "bidding_end_time": 1234567890,
    "timestamp": 1234567890,
    "block_height": 123456
  }
}
```

#### Bet Placement Webhook
```json
{
  "event_type": "BetPlacedEvent",
  "data": {
    "user": "0x...",
    "outcome_index": 1,
    "amount_gross": 1000000,
    "amount_net": 985000,
    "weight": 1000000,
    "market_address": "0x...",
    "timestamp_bid": 1234567890,
    "block_height": 123456
  }
}
```

#### Market Resolution Webhook
```json
{
  "event_type": "ResolveEvent",
  "data": {
    "resolver": "0x...",
    "market_address": "0x...",
    "final_price": 50000000000,
    "winning_outcome": 1,
    "is_void": false,
    "total_net": 10000000,
    "losers_net": 8000000,
    "rake_amount": 200000,
    "timestamp": 1234567890,
    "block_height": 123456
  }
}
```

### Smart Query Templates

#### Active Markets Query
```sql
SELECT 
  market_address,
  creator,
  num_outcomes,
  bidding_start_time,
  bidding_end_time,
  total_net_amount,
  status
FROM markets 
WHERE status = 1 
  AND bidding_end_time > NOW()
ORDER BY bidding_start_time DESC;
```

#### User Betting History
```sql
SELECT 
  m.market_address,
  m.final_price,
  m.winning_outcome,
  b.outcome_index,
  b.amount_gross,
  b.amount_net,
  b.timestamp_bid
FROM bets b
JOIN markets m ON b.market_address = m.market_address
WHERE b.user = '0x...'
ORDER BY b.timestamp_bid DESC;
```

#### Market Performance Analytics
```sql
SELECT 
  DATE(FROM_UNIXTIME(timestamp)) as date,
  COUNT(*) as markets_created,
  SUM(total_net_amount) as total_volume,
  AVG(fee_percentage) as avg_fee_rate
FROM markets 
WHERE timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY))
GROUP BY DATE(FROM_UNIXTIME(timestamp))
ORDER BY date DESC;
```

#### Treasury Balance Tracking
```sql
SELECT 
  asset_type,
  SUM(amount) as total_deposited,
  COUNT(*) as transaction_count,
  MAX(timestamp) as last_transaction
FROM treasury_events 
WHERE event_type IN ('FeeDepositedEvent', 'RakeDepositedEvent')
GROUP BY asset_type;
```

### API Endpoints

#### Market Data
- `GET /api/markets` - List all markets
- `GET /api/markets/{address}` - Get market details
- `GET /api/markets/{address}/bets` - Get market bets
- `GET /api/markets/{address}/outcomes` - Get market outcomes

#### User Data
- `GET /api/users/{address}/bets` - Get user betting history
- `GET /api/users/{address}/rewards` - Get user rewards
- `GET /api/users/{address}/stats` - Get user statistics

#### Analytics
- `GET /api/analytics/volume` - Get volume analytics
- `GET /api/analytics/markets` - Get market performance
- `GET /api/analytics/treasury` - Get treasury analytics

### Configuration

#### Webhook Settings
```yaml
webhooks:
  market_events: true
  payment_events: true
  treasury_events: true
  clmm_events: true
  reward_events: true
  
  endpoints:
    - url: "https://your-webhook-endpoint.com/oreka"
      secret: "your-webhook-secret"
      events: ["MarketCreatedEvent", "BetPlacedEvent", "ResolveEvent"]
```

#### Indexing Configuration
```yaml
indexing:
  start_block: 123456
  batch_size: 100
  retry_attempts: 3
  
  filters:
    include_events: true
    include_transactions: false
    include_blocks: false
```

## Hyperion Integration

### CLMM Pool Management
- **Pool Configuration**: Set CLMM parameters for idle capital deployment
- **Yield Distribution**: Automatically distribute yield to treasury, reward vault, and payout pools
- **Risk Management**: Configurable deposit limits and utilization thresholds

### Event Indexing
- **Real-time Updates**: Monitor CLMM operations in real-time
- **Performance Metrics**: Track yield generation and capital efficiency
- **Integration APIs**: RESTful APIs for external system integration

## Circle USDC Integration

### Fungible Asset Standard
- **FA Compliance**: Full compliance with Aptos Fungible Asset standard
- **PFS Support**: Primary Fungible Store integration for user balances
- **CCTP Ready**: Prepared for Cross-Chain Transfer Protocol integration

### Payment Flow
1. User approves USDC spending
2. USDC transferred to market vault
3. Fees calculated and deducted
4. Net amount used for betting
5. Payouts distributed from vault

## Testing and Validation

### Unit Tests
- Core betting logic validation
- Payment flow verification
- Reward distribution testing
- CLMM integration testing

### Integration Tests
- End-to-end market lifecycle
- Multi-asset payment flows
- Treasury operations
- Event emission validation

## Deployment

### Prerequisites
- Aptos node access
- Circle USDC integration setup
- Hyperion CLMM configuration
- Nodit indexing service

### Environment Variables
```bash
APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com
CIRCLE_API_KEY=your_circle_api_key
HYPERION_API_KEY=your_hyperion_api_key
NODIT_WEBHOOK_URL=your_webhook_url
```

### Deployment Commands
```bash
# Deploy contracts
aptos move publish --named-addresses yugo=0x...

# Initialize modules
aptos move run --function-id 'yugo::crypto_market::initialize_market_registry'

# Configure integrations
aptos move run --function-id 'yugo::clmm_router::set_clmm_config'
```

## Support and Maintenance

### Monitoring
- Real-time event monitoring
- Performance metrics tracking
- Error logging and alerting
- Health check endpoints

### Updates
- Regular security updates
- Feature enhancements
- Integration improvements
- Performance optimizations

### Contact
- Technical Support: support@oreka.com
- Integration Help: integration@oreka.com
- Documentation: docs.oreka.com
