# Oreka PostgreSQL Indexer

PostgreSQL indexer for Oreka prediction markets on Aptos blockchain.

## Overview

This indexer listens to on-chain events from the Oreka prediction markets smart contract and maintains a PostgreSQL database with:

- **Activity Tables**: Raw events (bets, claims, fees, market creation/resolution)
- **Profile Tables**: Aggregated user statistics and leaderboards
- **Monthly Snapshots**: Time-based leaderboards for rewards distribution

## Architecture

```
Aptos Blockchain → GraphQL Indexer → PostgreSQL → API/Frontend
```

### Event Types Processed

- `MarketCreatedEvent`: Market creation with metadata
- `BidEvent`: User bets with position and amount
- `ResolveEvent`: Market resolution with outcome
- `ClaimEvent`: User claim payouts
- `WithdrawFeeEvent`: Owner fee withdrawals

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Access to Aptos GraphQL indexer

### 2. Installation

```bash
cd indexer
npm install
```

### 3. Configuration

Copy environment template:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# PostgreSQL Database
PG_URL=postgres://user:password@localhost:5432/oreka

# Aptos Indexer
APTOS_INDEXER=https://indexer.mainnet.aptoslabs.com/v1/graphql

# Module Configuration
MODULE_ADDR=0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d
MODULE_NAME=market_core

# Indexer Settings
BATCH_SIZE=1000
POLL_INTERVAL_MS=1500
```

### 4. Database Setup

Create PostgreSQL database:
```sql
CREATE DATABASE oreka;
```

Run migrations:
```bash
npm run migrate
```

### 5. Start Indexer

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Database Schema

### Core Tables

- **`markets`**: Market metadata and lifecycle
- **`bets`**: Individual user bets
- **`claims`**: User claim payouts
- **`owner_fees`**: Owner fee withdrawals

### Aggregation Tables

- **`user_profiles`**: User statistics and totals
- **`user_market_participations`**: First-time participation tracking
- **`user_market_wins`**: First-time win tracking
- **`owner_market_creations`**: Market creation tracking

### Leaderboard Tables

- **`leaderboard_monthly_owners`**: Monthly owner rankings (for rewards)
- **`leaderboard_monthly_users`**: Monthly user rankings (for display)
- **`leaderboard_alltime_users`**: All-time user rankings

## Scripts

### Migration
```bash
npm run migrate
```

### Monthly Snapshots
```bash
# Create snapshot for August 2025
node scripts/snapshot.js monthly 2025 8

# Update all-time leaderboard
node scripts/snapshot.js alltime
```

### Query Testing
```bash
# Get user profile
node scripts/queries.js profile 0x123...

# Get monthly leaderboard
node scripts/queries.js leaderboard monthly 2025-08

# Get all-time leaderboard
node scripts/queries.js leaderboard alltime

# Get user bets
node scripts/queries.js bets 0x123...

# Get user claims
node scripts/queries.js claims 0x123...

# Get market stats
node scripts/queries.js market 0x456...

# Get recent markets
node scripts/queries.js markets
```

## Monthly Reward Cycle

### Freeze (Day 4 of next month)
```bash
# Example: Freeze August 2025 on September 4th
node scripts/snapshot.js monthly 2025 8
```

### Payout (Day 5 of next month)
- Use `leaderboard_monthly_owners` table for reward distribution
- Top N owners by total bet volume receive rewards

## API Integration

The indexer provides query functions that can be used in your API:

```javascript
const { getUserProfile, getMonthlyLeaderboard } = require('./scripts/queries');

// Get user profile
const profile = await getUserProfile('0x123...');

// Get monthly leaderboard
const leaderboard = await getMonthlyLeaderboard('2025-08');
```

## Monitoring

### Health Checks

Check indexer status:
```sql
SELECT * FROM indexer_cursors WHERE name = 'core';
```

Check recent activity:
```sql
SELECT COUNT(*) as recent_bets 
FROM bets 
WHERE ts > NOW() - INTERVAL '1 hour';
```

### Performance

- Indexer processes events in batches of 1000
- Polls for new events every 1.5 seconds
- Incremental profile updates for efficiency
- Proper indexing for fast queries

## Troubleshooting

### Common Issues

1. **Connection errors**: Check PostgreSQL connection string
2. **No events**: Verify module address and event types
3. **Slow queries**: Check database indexes
4. **Memory issues**: Reduce batch size

### Logs

The indexer logs:
- Batch processing status
- Error details
- Cursor advancement
- Performance metrics

### Recovery

If indexer stops:
1. Check last processed version in `indexer_cursors`
2. Restart indexer (it will resume from last position)
3. Verify data integrity with query scripts

## Security Considerations

- Use read-only database user for API queries
- Implement rate limiting for API endpoints
- Monitor for unusual activity patterns
- Regular database backups

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('bets', 'claims', 'markets');
```

### Indexer Tuning

- Adjust `BATCH_SIZE` based on available memory
- Tune `POLL_INTERVAL_MS` for latency vs. efficiency
- Monitor database connection pool usage

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Test with both mainnet and testnet data

## License

MIT
