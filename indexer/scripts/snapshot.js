const { Client } = require('pg');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dotenv').config();

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

async function createMonthlySnapshot(year, month) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    console.log(`Creating monthly snapshot for ${year}-${month.toString().padStart(2, '0')}`);

    const ym = `${year}-${month.toString().padStart(2, '0')}`;
    
    // Calculate time window for the month
    const startTs = dayjs.tz(`${year}-${month.toString().padStart(2, '0')}-01 00:00:00`, TIMEZONE).toDate();
    const endTs = dayjs.tz(`${year}-${month.toString().padStart(2, '0')}-01 00:00:00`, TIMEZONE)
      .add(1, 'month')
      .subtract(1, 'second')
      .toDate();

    console.log(`Time window: ${startTs.toISOString()} to ${endTs.toISOString()}`);

    await pg.query('BEGIN');

    try {
      // 1. Monthly Owners Leaderboard (for rewards)
      console.log('Creating monthly owners leaderboard...');
      await pg.query(`
        WITH owner_volume AS (
          SELECT b.owner_addr, SUM(b.amount_atomic) AS vol
          FROM bets b
          WHERE b.ts BETWEEN $1 AND $2
          GROUP BY b.owner_addr
        ),
        ranked AS (
          SELECT owner_addr, vol, RANK() OVER (ORDER BY vol DESC, owner_addr ASC) AS r
          FROM owner_volume
        )
        INSERT INTO leaderboard_monthly_owners(ym, owner_addr, owner_total_amount_month, rank)
        SELECT $3, owner_addr, vol, r FROM ranked
        ON CONFLICT (ym, owner_addr) DO UPDATE
        SET owner_total_amount_month = EXCLUDED.owner_total_amount_month,
            rank = EXCLUDED.rank
      `, [startTs, endTs, ym]);

      // 2. Monthly Users Leaderboard (for display)
      console.log('Creating monthly users leaderboard...');
      await pg.query(`
        WITH u_amt AS (
          SELECT user_addr, SUM(amount_atomic) total_amount
          FROM bets b
          WHERE b.ts BETWEEN $1 AND $2
          GROUP BY user_addr
        ),
        u_win AS (
          SELECT user_addr, SUM(net_atomic) total_winning
          FROM claims c
          WHERE c.ts BETWEEN $1 AND $2
          GROUP BY user_addr
        ),
        merged AS (
          SELECT COALESCE(a.user_addr, w.user_addr) user_addr,
                 COALESCE(a.total_amount, 0) total_amount,
                 COALESCE(w.total_winning, 0) total_winning
          FROM u_amt a FULL OUTER JOIN u_win w USING(user_addr)
        ),
        rk AS (
          SELECT user_addr, total_amount, total_winning,
                 RANK() OVER (ORDER BY total_winning DESC, total_amount DESC, user_addr ASC) r_w,
                 RANK() OVER (ORDER BY total_amount DESC, total_winning DESC, user_addr ASC) r_a
          FROM merged
        )
        INSERT INTO leaderboard_monthly_users(ym, user_addr, user_total_amount_month, user_total_winning_month, rank_by_winning, rank_by_amount)
        SELECT $3, user_addr, total_amount, total_winning, r_w, r_a
        FROM rk
        ON CONFLICT (ym, user_addr) DO UPDATE
        SET user_total_amount_month = EXCLUDED.user_total_amount_month,
            user_total_winning_month = EXCLUDED.user_total_winning_month,
            rank_by_winning = EXCLUDED.rank_by_winning,
            rank_by_amount = EXCLUDED.rank_by_amount
      `, [startTs, endTs, ym]);

      await pg.query('COMMIT');
      console.log(`✓ Monthly snapshot for ${ym} created successfully`);

    } catch (error) {
      await pg.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Snapshot creation failed:', error);
    process.exit(1);
  } finally {
    await pg.end();
  }
}

async function updateAllTimeLeaderboard() {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    console.log('Updating all-time leaderboard...');

    await pg.query(`
      INSERT INTO leaderboard_alltime_users AS t (user_addr, user_total_amount_alltime, user_total_winning_alltime, rank_by_winning, rank_by_amount)
      SELECT
        u.user_addr,
        u.total_bet_atomic,
        u.total_user_winning_atomic,
        RANK() OVER (ORDER BY u.total_user_winning_atomic DESC, u.total_bet_atomic DESC, u.user_addr ASC),
        RANK() OVER (ORDER BY u.total_bet_atomic DESC, u.total_user_winning_atomic DESC, u.user_addr ASC)
      FROM user_profiles u
      ON CONFLICT (user_addr) DO UPDATE
      SET user_total_amount_alltime = EXCLUDED.user_total_amount_alltime,
          user_total_winning_alltime = EXCLUDED.user_total_winning_alltime,
          rank_by_winning = EXCLUDED.rank_by_winning,
          rank_by_amount = EXCLUDED.rank_by_amount,
          updated_at = now()
    `);

    console.log('✓ All-time leaderboard updated successfully');

  } catch (error) {
    console.error('All-time leaderboard update failed:', error);
    process.exit(1);
  } finally {
    await pg.end();
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (command === 'monthly') {
  const year = parseInt(args[1]);
  const month = parseInt(args[2]);
  
  if (!year || !month || month < 1 || month > 12) {
    console.error('Usage: node snapshot.js monthly <year> <month>');
    console.error('Example: node snapshot.js monthly 2025 8');
    process.exit(1);
  }
  
  createMonthlySnapshot(year, month);
} else if (command === 'alltime') {
  updateAllTimeLeaderboard();
} else {
  console.log('Usage:');
  console.log('  node snapshot.js monthly <year> <month>  - Create monthly snapshot');
  console.log('  node snapshot.js alltime                 - Update all-time leaderboard');
  console.log('');
  console.log('Examples:');
  console.log('  node snapshot.js monthly 2025 8');
  console.log('  node snapshot.js alltime');
}
