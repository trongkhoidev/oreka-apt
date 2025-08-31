-- Oreka Crypto v2 Database Initialization Script
-- This script creates the necessary tables for indexing and analytics

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create markets table
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_address VARCHAR(66) UNIQUE NOT NULL,
    creator VARCHAR(66) NOT NULL,
    price_feed_id VARCHAR(66) NOT NULL,
    num_outcomes INTEGER NOT NULL,
    fee_bps INTEGER NOT NULL,
    rake_bps INTEGER NOT NULL,
    ork_budget BIGINT NOT NULL,
    bidding_start_time BIGINT NOT NULL,
    bidding_end_time BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    total_net_amount BIGINT DEFAULT 0,
    final_price BIGINT,
    winning_outcome INTEGER,
    is_void BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create outcomes table
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_address VARCHAR(66) NOT NULL,
    outcome_index INTEGER NOT NULL,
    comparison_type INTEGER NOT NULL,
    strike_price BIGINT NOT NULL,
    net_amount BIGINT DEFAULT 0,
    weight BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_address) REFERENCES markets(market_address) ON DELETE CASCADE,
    UNIQUE(market_address, outcome_index)
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user VARCHAR(66) NOT NULL,
    market_address VARCHAR(66) NOT NULL,
    outcome_index INTEGER NOT NULL,
    amount_gross BIGINT NOT NULL,
    amount_net BIGINT NOT NULL,
    weight BIGINT NOT NULL,
    timestamp_bid BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_address) REFERENCES markets(market_address) ON DELETE CASCADE
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user VARCHAR(66) NOT NULL,
    market_address VARCHAR(66) NOT NULL,
    asset_type INTEGER NOT NULL,
    amount_gross BIGINT NOT NULL,
    amount_net BIGINT NOT NULL,
    fee BIGINT NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- 'collect' or 'payout'
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_address) REFERENCES markets(market_address) ON DELETE CASCADE
);

-- Create treasury_events table
CREATE TABLE IF NOT EXISTS treasury_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_type INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL, -- 'fee_deposited', 'rake_deposited', 'dust_swept'
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clmm_operations table
CREATE TABLE IF NOT EXISTS clmm_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw', 'yield'
    asset_type INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    pool_address VARCHAR(66),
    yield_amount BIGINT,
    treasury_share BIGINT,
    reward_vault_share BIGINT,
    payout_pool_bonus BIGINT,
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_address VARCHAR(66) NOT NULL,
    user VARCHAR(66) NOT NULL,
    ork_amount BIGINT NOT NULL,
    points BIGINT NOT NULL,
    reward_type VARCHAR(20) NOT NULL, -- 'winner', 'participation', 'creator'
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_address) REFERENCES markets(market_address) ON DELETE CASCADE
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address VARCHAR(66) UNIQUE NOT NULL,
    total_bets INTEGER DEFAULT 0,
    total_volume BIGINT DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_ork_earned BIGINT DEFAULT 0,
    total_points BIGINT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create market_events table for general event tracking
CREATE TABLE IF NOT EXISTS market_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_address VARCHAR(66) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_address) REFERENCES markets(market_address) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_bidding_end_time ON markets(bidding_end_time);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);

CREATE INDEX IF NOT EXISTS idx_outcomes_market ON outcomes(market_address);
CREATE INDEX IF NOT EXISTS idx_outcomes_index ON outcomes(outcome_index);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_address);
CREATE INDEX IF NOT EXISTS idx_bets_timestamp ON bets(timestamp_bid);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user);
CREATE INDEX IF NOT EXISTS idx_payments_market ON payments(market_address);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

CREATE INDEX IF NOT EXISTS idx_treasury_events_type ON treasury_events(event_type);
CREATE INDEX IF NOT EXISTS idx_treasury_events_timestamp ON treasury_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_clmm_operations_type ON clmm_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_clmm_operations_timestamp ON clmm_operations(timestamp);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user);
CREATE INDEX IF NOT EXISTS idx_rewards_market ON rewards(market_address);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type);

CREATE INDEX IF NOT EXISTS idx_user_stats_address ON user_stats(user_address);
CREATE INDEX IF NOT EXISTS idx_user_stats_volume ON user_stats(total_volume);

CREATE INDEX IF NOT EXISTS idx_market_events_market ON market_events(market_address);
CREATE INDEX IF NOT EXISTS idx_market_events_type ON market_events(event_type);
CREATE INDEX IF NOT EXISTS idx_market_events_timestamp ON market_events(timestamp);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_markets_search ON markets USING gin(to_tsvector('english', market_address || ' ' || creator));

-- Create views for common queries
CREATE OR REPLACE VIEW active_markets AS
SELECT 
    m.*,
    COUNT(b.id) as total_bets,
    SUM(b.amount_net) as total_bet_amount
FROM markets m
LEFT JOIN bets b ON m.market_address = b.market_address
WHERE m.status = 1 AND m.bidding_end_time > EXTRACT(EPOCH FROM NOW())
GROUP BY m.id, m.market_address, m.creator, m.price_feed_id, m.num_outcomes, 
         m.fee_bps, m.rake_bps, m.ork_budget, m.bidding_start_time, m.bidding_end_time, 
         m.status, m.total_net_amount, m.final_price, m.winning_outcome, m.is_void, 
         m.created_at, m.updated_at;

CREATE OR REPLACE VIEW user_betting_summary AS
SELECT 
    u.user_address,
    u.total_bets,
    u.total_volume,
    u.total_wins,
    u.total_losses,
    u.total_ork_earned,
    u.total_points,
    u.win_rate,
    COUNT(DISTINCT b.market_address) as markets_participated,
    AVG(b.amount_net) as avg_bet_amount
FROM user_stats u
LEFT JOIN bets b ON u.user_address = b.user
GROUP BY u.user_address, u.total_bets, u.total_volume, u.total_wins, u.total_losses, 
         u.total_ork_earned, u.total_points, u.win_rate;

CREATE OR REPLACE VIEW market_performance AS
SELECT 
    DATE(FROM_UNIXTIME(m.created_at)) as date,
    COUNT(*) as markets_created,
    SUM(m.total_net_amount) as total_volume,
    AVG(m.fee_bps) as avg_fee_rate,
    AVG(m.rake_bps) as avg_rake_rate,
    COUNT(CASE WHEN m.is_void = FALSE THEN 1 END) as resolved_markets,
    COUNT(CASE WHEN m.is_void = TRUE THEN 1 END) as void_markets
FROM markets m
WHERE m.created_at >= EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
GROUP BY DATE(FROM_UNIXTIME(m.created_at))
ORDER BY date DESC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_market_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update market status based on bidding end time
    IF NEW.bidding_end_time <= EXTRACT(EPOCH FROM NOW()) AND NEW.status = 1 THEN
        NEW.status = 2; -- Expired
    END IF;
    
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user stats when a bet is placed
    INSERT INTO user_stats (user_address, total_bets, total_volume, total_ork_earned, total_points)
    VALUES (NEW.user, 1, NEW.amount_net, 0, 0)
    ON CONFLICT (user_address) 
    DO UPDATE SET 
        total_bets = user_stats.total_bets + 1,
        total_volume = user_stats.total_volume + NEW.amount_net,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_market_status
    BEFORE UPDATE ON markets
    FOR EACH ROW
    EXECUTE FUNCTION update_market_status();

CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT ON bets
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Insert sample data for testing
INSERT INTO user_stats (user_address, total_bets, total_volume, total_wins, total_losses, total_ork_earned, total_points, win_rate)
VALUES 
    ('0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d', 0, 0, 0, 0, 0, 0, 0.00)
ON CONFLICT (user_address) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO oreka_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO oreka_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO oreka_user;

-- Create a function to get market statistics
CREATE OR REPLACE FUNCTION get_market_stats(market_addr VARCHAR(66))
RETURNS TABLE(
    total_bets BIGINT,
    total_volume BIGINT,
    unique_users BIGINT,
    avg_bet_amount BIGINT,
    most_popular_outcome INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(b.id)::BIGINT as total_bets,
        COALESCE(SUM(b.amount_net), 0)::BIGINT as total_volume,
        COUNT(DISTINCT b.user)::BIGINT as unique_users,
        COALESCE(AVG(b.amount_net), 0)::BIGINT as avg_bet_amount,
        (SELECT outcome_index 
         FROM bets 
         WHERE market_address = market_addr 
         GROUP BY outcome_index 
         ORDER BY COUNT(*) DESC 
         LIMIT 1)::INTEGER as most_popular_outcome
    FROM bets b
    WHERE b.market_address = market_addr;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user betting history
CREATE OR REPLACE FUNCTION get_user_betting_history(user_addr VARCHAR(66), limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    market_address VARCHAR(66),
    outcome_index INTEGER,
    amount_gross BIGINT,
    amount_net BIGINT,
    timestamp_bid BIGINT,
    market_status INTEGER,
    is_winner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.market_address,
        b.outcome_index,
        b.amount_gross,
        b.amount_net,
        b.timestamp_bid,
        m.status,
        (m.winning_outcome = b.outcome_index AND m.is_void = FALSE) as is_winner
    FROM bets b
    JOIN markets m ON b.market_address = m.market_address
    WHERE b.user = user_addr
    ORDER BY b.timestamp_bid DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
