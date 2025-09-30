# Oreka Indexer Deployment Checklist

## Pre-deployment Setup

### 1. Database Setup
- [ ] Create PostgreSQL database: `CREATE DATABASE oreka;`
- [ ] Create database user with appropriate permissions
- [ ] Configure connection pooling if needed
- [ ] Set up database backups

### 2. Environment Configuration
- [ ] Copy `env.example` to `.env`
- [ ] Set correct `PG_URL` with credentials
- [ ] Configure `APTOS_INDEXER` endpoint (mainnet/testnet)
- [ ] Set correct `MODULE_ADDR` for your deployed contract
- [ ] Adjust `BATCH_SIZE` and `POLL_INTERVAL_MS` for your needs

### 3. Dependencies
- [ ] Install Node.js 18+ on server
- [ ] Run `npm install` to install dependencies
- [ ] Verify all packages installed correctly

## Deployment Steps

### 1. Database Migration
```bash
# Run initial migration
npm run migrate

# Verify tables created
psql $PG_URL -c "\dt"
```

### 2. Build and Start
```bash
# Build TypeScript
npm run build

# Start indexer
npm start
```

### 3. Verification
- [ ] Check indexer logs for successful startup
- [ ] Verify cursor initialization in database
- [ ] Test with sample queries
- [ ] Monitor for event processing

## Production Considerations

### 1. Process Management
- [ ] Use PM2 or systemd for process management
- [ ] Configure auto-restart on failure
- [ ] Set up log rotation
- [ ] Monitor memory usage

### 2. Database Optimization
- [ ] Configure PostgreSQL for production workload
- [ ] Set up connection pooling
- [ ] Monitor query performance
- [ ] Regular VACUUM and ANALYZE

### 3. Monitoring
- [ ] Set up health checks
- [ ] Monitor indexer lag
- [ ] Alert on processing errors
- [ ] Track database growth

### 4. Security
- [ ] Use read-only database user for API
- [ ] Implement rate limiting
- [ ] Secure database connections
- [ ] Regular security updates

## Monthly Operations

### 1. Snapshot Creation (Day 4)
```bash
# Create monthly snapshot
node scripts/snapshot.js monthly 2025 8

# Verify snapshot data
node scripts/queries.js leaderboard monthly 2025-08
```

### 2. Reward Distribution (Day 5)
- [ ] Query `leaderboard_monthly_owners` for top performers
- [ ] Execute reward distribution transactions
- [ ] Log reward transactions
- [ ] Update reward status tracking

### 3. Maintenance
- [ ] Update all-time leaderboards
- [ ] Clean up old data if needed
- [ ] Performance analysis
- [ ] Backup verification

## Monitoring Commands

### Health Checks
```bash
# Check indexer status
psql $PG_URL -c "SELECT * FROM indexer_cursors;"

# Check recent activity
psql $PG_URL -c "SELECT COUNT(*) FROM bets WHERE ts > NOW() - INTERVAL '1 hour';"

# Check processing lag
psql $PG_URL -c "SELECT last_processed_at FROM indexer_cursors WHERE name = 'core';"
```

### Performance Monitoring
```bash
# Check database size
psql $PG_URL -c "SELECT pg_size_pretty(pg_database_size('oreka'));"

# Check table sizes
psql $PG_URL -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check slow queries
psql $PG_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Troubleshooting

### Common Issues

1. **Indexer not processing events**
   - Check module address configuration
   - Verify GraphQL endpoint accessibility
   - Check for network connectivity issues

2. **Database connection errors**
   - Verify connection string
   - Check database server status
   - Verify user permissions

3. **Memory issues**
   - Reduce batch size
   - Monitor memory usage
   - Consider server upgrade

4. **Slow performance**
   - Check database indexes
   - Analyze query performance
   - Consider connection pooling

### Recovery Procedures

1. **Indexer restart**
   ```bash
   # Stop indexer
   pm2 stop oreka-indexer
   
   # Start indexer (will resume from last position)
   pm2 start oreka-indexer
   ```

2. **Data recovery**
   ```bash
   # Check last processed version
   psql $PG_URL -c "SELECT last_tx_version FROM indexer_cursors WHERE name = 'core';"
   
   # Manually reset cursor if needed (CAUTION)
   psql $PG_URL -c "UPDATE indexer_cursors SET last_tx_version = <version> WHERE name = 'core';"
   ```

3. **Database recovery**
   ```bash
   # Restore from backup
   pg_restore -d oreka backup_file.dump
   
   # Re-run migrations if needed
   npm run migrate
   ```

## Scaling Considerations

### Horizontal Scaling
- [ ] Multiple indexer instances with different cursor ranges
- [ ] Load balancer for API queries
- [ ] Read replicas for database queries

### Vertical Scaling
- [ ] Increase server resources
- [ ] Optimize database configuration
- [ ] Implement caching layer

## Backup Strategy

### Database Backups
- [ ] Daily automated backups
- [ ] Point-in-time recovery capability
- [ ] Test backup restoration regularly
- [ ] Store backups in multiple locations

### Configuration Backups
- [ ] Version control for configuration files
- [ ] Document all environment variables
- [ ] Backup deployment scripts

## Security Checklist

- [ ] Database user has minimal required permissions
- [ ] Network access restricted to necessary ports
- [ ] Regular security updates applied
- [ ] Monitoring for suspicious activity
- [ ] Encrypted connections for all communications
- [ ] Regular security audits

## Performance Benchmarks

### Expected Performance
- Process 1000+ events per batch
- Sub-second query response times
- 99.9% uptime target
- Handle 10,000+ concurrent users

### Monitoring Metrics
- Events processed per minute
- Database query response times
- Memory and CPU usage
- Network latency
- Error rates

## Rollback Procedures

### Indexer Rollback
1. Stop current indexer
2. Restore previous version
3. Update configuration if needed
4. Restart indexer
5. Verify functionality

### Database Rollback
1. Stop indexer
2. Restore database from backup
3. Update cursor to appropriate version
4. Restart indexer
5. Verify data integrity
