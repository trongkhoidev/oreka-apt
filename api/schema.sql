-- Oreka Prediction Market Database Schema
-- This schema is designed to store events from the Aptos smart contracts

-- Create database (run this separately)
-- CREATE DATABASE oreka_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bets table - stores all betting events
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_addr VARCHAR(66) NOT NULL,
    market_addr VARCHAR(66) NOT NULL,
    amount_raw VARCHAR(20) NOT NULL, -- u64 as string
    side INTEGER NOT NULL, -- 0 for long, 1 for short, or outcome index for multi-outcome
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims table - stores all claim events
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_addr VARCHAR(66) NOT NULL,
    market_addr VARCHAR(66) NOT NULL,
    winning_raw VARCHAR(20) NOT NULL, -- u64 as string
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Owner fees table - stores fee withdrawal events
CREATE TABLE IF NOT EXISTS owner_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_addr VARCHAR(66) NOT NULL,
    market_addr VARCHAR(66) NOT NULL,
    fee_raw VARCHAR(20) NOT NULL, -- u64 as string
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Markets table - stores market creation events
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_addr VARCHAR(66) UNIQUE NOT NULL,
    owner_addr VARCHAR(66) NOT NULL,
    trading_pair VARCHAR(50) NOT NULL,
    market_type JSONB NOT NULL, -- { is_binary: boolean }
    strike_price VARCHAR(20), -- For binary markets
    price_ranges JSONB, -- For multi-outcome markets
    maturity_time BIGINT NOT NULL,
    created_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bets_user_addr ON bets(user_addr);
CREATE INDEX IF NOT EXISTS idx_bets_market_addr ON bets(market_addr);
CREATE INDEX IF NOT EXISTS idx_bets_timestamp ON bets(timestamp);

CREATE INDEX IF NOT EXISTS idx_claims_user_addr ON claims(user_addr);
CREATE INDEX IF NOT EXISTS idx_claims_market_addr ON claims(market_addr);
CREATE INDEX IF NOT EXISTS idx_claims_timestamp ON claims(timestamp);

CREATE INDEX IF NOT EXISTS idx_owner_fees_owner_addr ON owner_fees(owner_addr);
CREATE INDEX IF NOT EXISTS idx_owner_fees_market_addr ON owner_fees(market_addr);
CREATE INDEX IF NOT EXISTS idx_owner_fees_timestamp ON owner_fees(timestamp);

CREATE INDEX IF NOT EXISTS idx_markets_owner_addr ON markets(owner_addr);
CREATE INDEX IF NOT EXISTS idx_markets_created_timestamp ON markets(created_timestamp);

-- Sample data for testing (optional)
-- INSERT INTO bets (user_addr, market_addr, amount_raw, side, timestamp) VALUES
-- ('0x123...', '0xabc...', '100000000', 0, 1640995200),
-- ('0x456...', '0xabc...', '200000000', 1, 1640995200);

-- INSERT INTO claims (user_addr, market_addr, winning_raw, timestamp) VALUES
-- ('0x123...', '0xabc...', '150000000', 1640995200);

-- INSERT INTO owner_fees (owner_addr, market_addr, fee_raw, timestamp) VALUES
-- ('0x789...', '0xabc...', '5000000', 1640995200);

-- INSERT INTO markets (market_addr, owner_addr, trading_pair, market_type, strike_price, maturity_time, created_timestamp) VALUES
-- ('0xabc...', '0x789...', 'APT/USD', '{"is_binary": true}', '100000000', 1640995200, 1640995200);
