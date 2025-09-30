-- === Core Activity Tables (append-only) ===

CREATE TABLE markets (
  market_id_text   TEXT,         -- canonical string for market id (address hex)
  market_addr      TEXT,         -- market address
  owner_addr       TEXT NOT NULL,
  price_feed_id    TEXT,         -- price feed identifier
  market_type      TEXT,         -- 'binary' or 'multi_outcome'
  strike_price     BIGINT,       -- For binary markets
  fee_percentage   BIGINT,       -- Fee percentage (basis points)
  bidding_start_time TIMESTAMPTZ,
  bidding_end_time   TIMESTAMPTZ,
  maturity_time      TIMESTAMPTZ,
  bonus_injected     NUMERIC(78,0) DEFAULT 0,
  bonus_locked       BOOLEAN DEFAULT false,
  is_no_winner       BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL,
  resolved_at        TIMESTAMPTZ,
  resolution_outcome BIGINT,
  final_price        NUMERIC(78,0),
  tx_version_created BIGINT NOT NULL,
  tx_version_resolved BIGINT,
  PRIMARY KEY (market_id_text)
);

CREATE TABLE bets (
  tx_key           TEXT PRIMARY KEY,   -- version:index, unique idempotent key
  tx_version       BIGINT NOT NULL,
  event_index      INT NOT NULL,
  user_addr        TEXT NOT NULL,
  owner_addr       TEXT NOT NULL,
  market_id_text   TEXT NOT NULL REFERENCES markets(market_id_text),
  amount_atomic    NUMERIC(78,0) NOT NULL,
  prediction       BOOLEAN,            -- For binary markets (true = LONG, false = SHORT)
  outcome_index    INT,                -- For multi-outcome markets
  ts               TIMESTAMPTZ NOT NULL
);

CREATE TABLE claims (
  tx_key           TEXT PRIMARY KEY,   -- version:index
  tx_version       BIGINT NOT NULL,
  event_index      INT NOT NULL,
  user_addr        TEXT NOT NULL,
  market_id_text   TEXT NOT NULL REFERENCES markets(market_id_text),
  payout_atomic    NUMERIC(78,0) NOT NULL,
  principal_atomic NUMERIC(78,0) NOT NULL,
  net_atomic       NUMERIC(78,0) GENERATED ALWAYS AS (payout_atomic - principal_atomic) STORED,
  won              BOOLEAN NOT NULL,
  ts               TIMESTAMPTZ NOT NULL
);

CREATE TABLE owner_fees (
  tx_key           TEXT PRIMARY KEY,   -- version:index
  tx_version       BIGINT NOT NULL,
  event_index      INT NOT NULL,
  owner_addr       TEXT NOT NULL,
  market_id_text   TEXT NOT NULL REFERENCES markets(market_id_text),
  fee_atomic       NUMERIC(78,0) NOT NULL,
  ts               TIMESTAMPTZ NOT NULL
);

-- === Unique Sets for First-time Counting ===
CREATE TABLE user_market_participations (
  user_addr      TEXT NOT NULL,
  market_id_text TEXT NOT NULL,
  first_bet_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_addr, market_id_text)
);

CREATE TABLE user_market_wins (
  user_addr      TEXT NOT NULL,
  market_id_text TEXT NOT NULL,
  first_win_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_addr, market_id_text)
);

CREATE TABLE owner_market_creations (
  owner_addr     TEXT NOT NULL,
  market_id_text TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (owner_addr, market_id_text)
);

-- === Materialized Aggregates (Profiles) ===
CREATE TABLE user_profiles (
  user_addr                 TEXT PRIMARY KEY,
  total_bet_atomic          NUMERIC(78,0) NOT NULL DEFAULT 0,
  total_user_winning_atomic NUMERIC(78,0) NOT NULL DEFAULT 0,
  total_owner_fee_atomic    NUMERIC(78,0) NOT NULL DEFAULT 0,
  markets_played_count      BIGINT NOT NULL DEFAULT 0,
  markets_created_count     BIGINT NOT NULL DEFAULT 0,
  markets_won_count         BIGINT NOT NULL DEFAULT 0,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Monthly Snapshots for Leaderboards ===
CREATE TABLE leaderboard_monthly_owners (
  ym TEXT NOT NULL, -- 'YYYY-MM'
  owner_addr TEXT NOT NULL,
  owner_total_amount_month NUMERIC(78,0) NOT NULL,
  rank INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ym, owner_addr)
);

CREATE TABLE leaderboard_monthly_users (
  ym TEXT NOT NULL,
  user_addr TEXT NOT NULL,
  user_total_amount_month NUMERIC(78,0) NOT NULL,
  user_total_winning_month NUMERIC(78,0) NOT NULL,
  rank_by_winning INT,
  rank_by_amount  INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ym, user_addr)
);

CREATE TABLE leaderboard_alltime_users (
  user_addr TEXT PRIMARY KEY,
  user_total_amount_alltime NUMERIC(78,0) NOT NULL,
  user_total_winning_alltime NUMERIC(78,0) NOT NULL,
  rank_by_winning INT,
  rank_by_amount  INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Indexes for Performance ===
CREATE INDEX idx_bets_user_ts   ON bets(user_addr, ts);
CREATE INDEX idx_bets_owner_ts  ON bets(owner_addr, ts);
CREATE INDEX idx_bets_market_ts ON bets(market_id_text, ts);
CREATE INDEX idx_bets_tx_version ON bets(tx_version);

CREATE INDEX idx_claims_user_ts ON claims(user_addr, ts);
CREATE INDEX idx_claims_tx_version ON claims(tx_version);

CREATE INDEX idx_fees_owner_ts  ON owner_fees(owner_addr, ts);
CREATE INDEX idx_fees_tx_version ON owner_fees(tx_version);

CREATE INDEX idx_markets_owner ON markets(owner_addr);
CREATE INDEX idx_markets_created_at ON markets(created_at);
CREATE INDEX idx_markets_resolved_at ON markets(resolved_at);

-- === Indexer Cursor ===
CREATE TABLE indexer_cursors (
  name TEXT PRIMARY KEY,
  last_tx_version BIGINT NOT NULL DEFAULT 0,
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO indexer_cursors(name, last_tx_version) VALUES ('core', 0)
ON CONFLICT (name) DO NOTHING;

-- === Processing Status for Incremental Updates ===
CREATE TABLE processing_status (
  table_name TEXT PRIMARY KEY,
  last_processed_tx_version BIGINT NOT NULL DEFAULT 0,
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO processing_status(table_name, last_processed_tx_version) VALUES 
  ('user_profiles', 0),
  ('user_market_participations', 0),
  ('user_market_wins', 0),
  ('owner_market_creations', 0)
ON CONFLICT (table_name) DO NOTHING;
