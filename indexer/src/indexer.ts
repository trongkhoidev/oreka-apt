import { Client } from 'pg';
import { GraphQLClient, gql } from 'graphql-request';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dotenv from 'dotenv';

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

// Configuration
const PG_URL = process.env.PG_URL!;
const APTOS_API_KEY = process.env.APTOS_API_KEY;
const GEOMI_API_KEY = process.env.GEOMI_API_KEY;

// Create GraphQL client with API key if available (support Aptos & Geomi)
const gqlHeaders: Record<string, string> = {};
const indexerUrl = process.env.APTOS_INDEXER!;
if (APTOS_API_KEY) {
  // Aptos Labs may accept x-aptos-api-key or Authorization
  gqlHeaders['Authorization'] = `Bearer ${APTOS_API_KEY}`;
  gqlHeaders['x-aptos-api-key'] = APTOS_API_KEY;
  // If pointed to Geomi, also send x-api-key
  if (indexerUrl.includes('geomi.dev')) {
    gqlHeaders['x-api-key'] = APTOS_API_KEY;
  }
}
if (GEOMI_API_KEY) {
  gqlHeaders['x-api-key'] = GEOMI_API_KEY;
}

const GQL = new GraphQLClient(indexerUrl, { headers: gqlHeaders });
const MODULE_ADDR = (process.env.MODULE_ADDR || '').toLowerCase();
const MODULE_NAME = process.env.MODULE_NAME || 'market_core';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000');
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000'); // 10 seconds to avoid rate limit
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3');
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY_MS || '2000');
const TIMEZONE = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

// Event type mappings
const EVENT_TYPES = {
  MARKET_CREATED: `${MODULE_ADDR}::${MODULE_NAME}::MarketCreatedEvent`,
  BET:            `${MODULE_ADDR}::${MODULE_NAME}::BidEvent`,
  RESOLVE:        `${MODULE_ADDR}::${MODULE_NAME}::ResolveEvent`,
  CLAIM:          `${MODULE_ADDR}::${MODULE_NAME}::ClaimEvent`,
  WITHDRAW_FEE:   `${MODULE_ADDR}::${MODULE_NAME}::WithdrawFeeEvent`,
};

// GraphQL query for events
const EVENTS_QUERY = gql`
query Events($types: [String!], $minVersion: bigint, $limit: Int) {
  events(
    where: {
      type: { _in: $types },
      transaction_version: { _gt: $minVersion }
    }
    order_by: { transaction_version: asc, event_index: asc }
    limit: $limit
  ) {
    transaction_version
    event_index
    account_address
    type
    data
    indexed_type
    transaction_block_height
  }
}
`;

// Utility functions
function tsFromU64(u64: string | number): Date {
  const sec = typeof u64 === 'string' ? parseInt(u64, 10) : u64;
  return dayjs.unix(sec).toDate();
}

function marketIdText(data: any): string {
  // Normalize to a single text id (address hex)
  if (data.market_id) return String(data.market_id).toLowerCase();
  if (data.market_address) return String(data.market_address).toLowerCase();
  if (data.market) return String(data.market).toLowerCase();
  return 'UNKNOWN';
}

function normalizeAddress(addr: string): string {
  return String(addr).toLowerCase();
}

// Event processing functions
async function processMarketCreated(pg: Client, ev: any, data: any, v: number, idx: number, ts: Date, mkt: string) {
  const owner = normalizeAddress(data.creator);
  
  await pg.query(`
    INSERT INTO markets(
      market_id_text, market_addr, owner_addr, price_feed_id, market_type,
      strike_price, fee_percentage, bidding_start_time, bidding_end_time, maturity_time,
      bonus_injected, bonus_locked, is_no_winner, created_at, tx_version_created
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (market_id_text) DO NOTHING
  `, [
    mkt, mkt, owner, 
    data.price_feed_id ? Buffer.from(data.price_feed_id).toString('hex') : null,
    data.market_type || 'binary',
    data.strike_price || null,
    data.fee_percentage || 0,
    data.bidding_start_time ? tsFromU64(data.bidding_start_time) : null,
    data.bidding_end_time ? tsFromU64(data.bidding_end_time) : null,
    data.maturity_time ? tsFromU64(data.maturity_time) : null,
    data.bonus_injected || 0,
    data.bonus_locked || false,
    data.is_no_winner || false,
    ts, v
  ]);

  // Track market creation
  await pg.query(`
    INSERT INTO owner_market_creations(owner_addr, market_id_text, created_at)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [owner, mkt, ts]);
}

async function processBet(pg: Client, ev: any, data: any, v: number, idx: number, ts: Date, mkt: string) {
  const key = `${v}:${idx}`;
  const user = normalizeAddress(data.user);
  const owner = normalizeAddress(data.owner);
  const amount = String(data.amount);
  const prediction = data.prediction !== undefined ? data.prediction : null;
  const outcomeIndex = data.outcome_index !== undefined ? data.outcome_index : null;

  await pg.query(`
    INSERT INTO bets(tx_key, tx_version, event_index, user_addr, owner_addr, market_id_text, amount_atomic, prediction, outcome_index, ts)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT DO NOTHING
  `, [key, v, idx, user, owner, mkt, amount, prediction, outcomeIndex, ts]);

  // Track participation
  await pg.query(`
    INSERT INTO user_market_participations(user_addr, market_id_text, first_bet_at)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [user, mkt, ts]);
}

async function processResolve(pg: Client, ev: any, data: any, v: number, idx: number, ts: Date, mkt: string) {
  const outcome = data.result !== undefined ? data.result : null;
  const finalPrice = data.final_price ? String(data.final_price) : null;

  await pg.query(`
    UPDATE markets 
    SET resolved_at = COALESCE(resolved_at, $2),
        resolution_outcome = COALESCE(resolution_outcome, $3),
        final_price = COALESCE(final_price, $4),
        tx_version_resolved = COALESCE(tx_version_resolved, $1)
    WHERE market_id_text = $5
  `, [v, ts, outcome, finalPrice, mkt]);
}

async function processClaim(pg: Client, ev: any, data: any, v: number, idx: number, ts: Date, mkt: string) {
  const key = `${v}:${idx}`;
  const user = normalizeAddress(data.user);
  const payout = String(data.payout_amount);
  const principal = String(data.principal_returned || 0);
  const won = data.won || false;

  await pg.query(`
    INSERT INTO claims(tx_key, tx_version, event_index, user_addr, market_id_text, payout_atomic, principal_atomic, won, ts)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT DO NOTHING
  `, [key, v, idx, user, mkt, payout, principal, won, ts]);

  // Track wins (only when net > 0)
  const net = BigInt(payout) - BigInt(principal);
  if (net > 0n) {
    await pg.query(`
      INSERT INTO user_market_wins(user_addr, market_id_text, first_win_at)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [user, mkt, ts]);
  }
}

async function processWithdrawFee(pg: Client, ev: any, data: any, v: number, idx: number, ts: Date, mkt: string) {
  const key = `${v}:${idx}`;
  const owner = normalizeAddress(data.owner);
  const fee = String(data.amount);

  await pg.query(`
    INSERT INTO owner_fees(tx_key, tx_version, event_index, owner_addr, market_id_text, fee_atomic, ts)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING
  `, [key, v, idx, owner, mkt, fee, ts]);
}

// Incremental profile updates
async function updateProfiles(pg: Client, lastVersion: number) {
  // Update total bet amounts
  await pg.query(`
    INSERT INTO user_profiles(user_addr, total_bet_atomic)
    SELECT b.user_addr, COALESCE(SUM(b.amount_atomic), 0)
    FROM bets b
    WHERE b.tx_version > $1
    GROUP BY b.user_addr
    ON CONFLICT (user_addr) DO UPDATE
    SET total_bet_atomic = user_profiles.total_bet_atomic + EXCLUDED.total_bet_atomic,
        updated_at = now()
  `, [lastVersion]);

  // Update total user winnings
  await pg.query(`
    INSERT INTO user_profiles(user_addr, total_user_winning_atomic)
    SELECT c.user_addr, COALESCE(SUM(c.net_atomic), 0)
    FROM claims c
    WHERE c.tx_version > $1
    GROUP BY c.user_addr
    ON CONFLICT (user_addr) DO UPDATE
    SET total_user_winning_atomic = user_profiles.total_user_winning_atomic + EXCLUDED.total_user_winning_atomic,
        updated_at = now()
  `, [lastVersion]);

  // Update total owner fees
  await pg.query(`
    INSERT INTO user_profiles(user_addr, total_owner_fee_atomic)
    SELECT f.owner_addr, COALESCE(SUM(f.fee_atomic), 0)
    FROM owner_fees f
    WHERE f.tx_version > $1
    GROUP BY f.owner_addr
    ON CONFLICT (user_addr) DO UPDATE
    SET total_owner_fee_atomic = user_profiles.total_owner_fee_atomic + EXCLUDED.total_owner_fee_atomic,
        updated_at = now()
  `, [lastVersion]);

  // Update counters (using time-based window for simplicity)
  const windowStart = dayjs().subtract(10, 'minutes').toDate();
  
  await pg.query(`
    UPDATE user_profiles u
    SET markets_played_count = u.markets_played_count + v.cnt,
        updated_at = now()
    FROM (
      SELECT user_addr, COUNT(*) cnt
      FROM user_market_participations
      WHERE first_bet_at > $1
      GROUP BY user_addr
    ) v
    WHERE u.user_addr = v.user_addr
  `, [windowStart]);

  await pg.query(`
    UPDATE user_profiles u
    SET markets_won_count = u.markets_won_count + v.cnt,
        updated_at = now()
    FROM (
      SELECT user_addr, COUNT(*) cnt
      FROM user_market_wins
      WHERE first_win_at > $1
      GROUP BY user_addr
    ) v
    WHERE u.user_addr = v.user_addr
  `, [windowStart]);

  await pg.query(`
    UPDATE user_profiles u
    SET markets_created_count = u.markets_created_count + v.cnt,
        updated_at = now()
    FROM (
      SELECT owner_addr AS user_addr, COUNT(*) cnt
      FROM owner_market_creations
      WHERE created_at > $1
      GROUP BY owner_addr
    ) v
    WHERE u.user_addr = v.user_addr
  `, [windowStart]);
}

// Main indexer loop
async function main() {
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();

  console.log(`Starting indexer for module ${MODULE_ADDR}::${MODULE_NAME}`);
  console.log(`Event types:`, Object.values(EVENT_TYPES));

  // Load cursor
  const curRes = await pg.query(`SELECT last_tx_version FROM indexer_cursors WHERE name = 'core'`);
  let cursor = curRes.rows[0]?.last_tx_version ?? 0;

  console.log(`Starting from transaction version: ${cursor}`);

  while (true) {
    try {
      const response = await GQL.request(EVENTS_QUERY, {
        types: Object.values(EVENT_TYPES),
        minVersion: cursor,
        limit: BATCH_SIZE,
      }) as { events: any[] };
      
      const { events } = response;

      if (!events.length) {
        console.log(`No new events, waiting ${POLL_INTERVAL}ms...`);
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        continue;
      }

      console.log(`Processing ${events.length} events from version ${cursor}...`);

      const tx = await pg.query('BEGIN');

      try {
        for (const ev of events) {
          const v = Number(ev.transaction_version);
          const idx = Number(ev.event_index);
          const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          const ts = tsFromU64(data.timestamp_created || data.timestamp_bid || data.timestamp_resolve || data.timestamp_claim || data.timestamp_withdraw || 0);
          const mkt = marketIdText(data);

          switch (ev.type.toLowerCase()) {
            case EVENT_TYPES.MARKET_CREATED.toLowerCase():
              await processMarketCreated(pg, ev, data, v, idx, ts, mkt);
              break;
            case EVENT_TYPES.BET.toLowerCase():
              await processBet(pg, ev, data, v, idx, ts, mkt);
              break;
            case EVENT_TYPES.RESOLVE.toLowerCase():
              await processResolve(pg, ev, data, v, idx, ts, mkt);
              break;
            case EVENT_TYPES.CLAIM.toLowerCase():
              await processClaim(pg, ev, data, v, idx, ts, mkt);
              break;
            case EVENT_TYPES.WITHDRAW_FEE.toLowerCase():
              await processWithdrawFee(pg, ev, data, v, idx, ts, mkt);
              break;
            default:
              console.warn(`Unknown event type: ${ev.type}`);
          }

          cursor = v; // Advance cursor
        }

        // Update profiles incrementally
        await updateProfiles(pg, cursor);

        // Persist cursor
        await pg.query(
          `UPDATE indexer_cursors SET last_tx_version = $1, last_processed_at = now() WHERE name='core'`,
          [cursor]
        );

        await pg.query('COMMIT');
        console.log(`Successfully processed batch, cursor now at ${cursor}`);

      } catch (e) {
        await pg.query('ROLLBACK');
        console.error('Batch processing error:', e);
        throw e;
      }

    } catch (e) {
      console.error('Indexer error:', e);
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
