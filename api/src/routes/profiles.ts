import { Router } from 'express';
import { pool, toHumanAmount } from '../db';
import { ProfileResponse } from '../types';

const router = Router();

// GET /profiles/:addr - Get detailed profile for a specific address
router.get('/:addr', async (req, res) => {
  try {
    const { addr } = req.params;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    // Query real database data

    // Get user's betting activity (sum of bet amounts and distinct markets participated)
    const betQuery = `
      SELECT 
        COALESCE(SUM(amount_atomic), 0) AS total_bet_raw,
        COUNT(DISTINCT market_id_text)   AS played_count
      FROM bets 
      WHERE user_addr = $1
    `;

    // Get user's winnings (sum of net winnings and distinct winning markets)
    const winningQuery = `
      SELECT 
        COALESCE(SUM(net_atomic), 0) AS total_winning_raw,
        COUNT(DISTINCT market_id_text) FILTER (WHERE net_atomic > 0) AS won_count
      FROM claims 
      WHERE user_addr = $1
    `;

    // Get user's owner fees
    const ownerFeeQuery = `
      SELECT 
        COALESCE(SUM(fee_atomic), 0) AS total_owner_fee_raw
      FROM owner_fees 
      WHERE owner_addr = $1
    `;

    // Get markets created count (from owner_market_creations)
    const createdCountQuery = `
      SELECT COUNT(DISTINCT market_id_text) AS created_count
      FROM owner_market_creations
      WHERE owner_addr = $1
    `;

    const [betResult, winningResult, ownerFeeResult, createdResult] = await Promise.all([
      pool.query(betQuery, [addr.toLowerCase()]),
      pool.query(winningQuery, [addr.toLowerCase()]),
      pool.query(ownerFeeQuery, [addr.toLowerCase()]),
      pool.query(createdCountQuery, [addr.toLowerCase()])
    ]);

    const totalBetRaw = betResult.rows[0]?.total_bet_raw || '0';
    const totalWinningRaw = winningResult.rows[0]?.total_winning_raw || '0';
    const totalOwnerFeeRaw = ownerFeeResult.rows[0]?.total_owner_fee_raw || '0';

    const response: ProfileResponse = {
      user_addr: addr,
      totals: {
        bet: {
          raw: totalBetRaw,
          human: toHumanAmount(totalBetRaw, decimals)
        },
        winning: {
          raw: totalWinningRaw,
          human: toHumanAmount(totalWinningRaw, decimals)
        },
        owner_fee: {
          raw: totalOwnerFeeRaw,
          human: toHumanAmount(totalOwnerFeeRaw, decimals)
        }
      },
      counts: {
        played: parseInt(betResult.rows[0]?.played_count || '0'),
        created: parseInt(createdResult.rows[0]?.created_count || '0'),
        won: parseInt(winningResult.rows[0]?.won_count || '0')
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profiles/:addr/activity - Get activity feed for a specific address
router.get('/:addr/activity', async (req, res) => {
  try {
    const { addr } = req.params;
    const { limit = 20 } = req.query;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    // Get recent bets
    const betQuery = `
      SELECT 
        'bet' as type,
        market_addr,
        amount_raw,
        side,
        created_at,
        'active' as status
      FROM bets 
      WHERE user_addr = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    // Get recent claims
    const claimQuery = `
      SELECT 
        'claim' as type,
        market_addr,
        winning_raw as amount_raw,
        0 as side,
        created_at,
        'won' as status
      FROM claims 
      WHERE user_addr = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    // Get recent owner fees
    const ownerFeeQuery = `
      SELECT 
        'withdraw_fee' as type,
        market_addr,
        fee_raw as amount_raw,
        0 as side,
        created_at,
        'completed' as status
      FROM owner_fees 
      WHERE owner_addr = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    // Get market creation data (if we have markets table with creator info)
    const marketQuery = `
      SELECT 
        'create' as type,
        market_address as market_addr,
        '0' as amount_raw,
        0 as side,
        created_at,
        'active' as status
      FROM markets 
      WHERE creator_addr = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const [betResult, claimResult, ownerFeeResult, marketResult] = await Promise.all([
      pool.query(betQuery, [addr, limit]),
      pool.query(claimQuery, [addr, limit]),
      pool.query(ownerFeeQuery, [addr, limit]),
      pool.query(marketQuery, [addr, limit]).catch(() => ({ rows: [] })) // Ignore if markets table doesn't have creator_addr
    ]);

    // Combine and format all activities
    const activities = [
      ...betResult.rows.map((row: any) => ({
        type: row.type,
        market_addr: row.market_addr,
        amount: toHumanAmount(row.amount_raw, decimals),
        amount_raw: row.amount_raw,
        side: row.side,
        created_at: row.created_at,
        status: row.status,
        time: formatTimeAgo(row.created_at)
      })),
      ...claimResult.rows.map((row: any) => ({
        type: row.type,
        market_addr: row.market_addr,
        amount: toHumanAmount(row.amount_raw, decimals),
        amount_raw: row.amount_raw,
        side: row.side,
        created_at: row.created_at,
        status: row.status,
        time: formatTimeAgo(row.created_at)
      })),
      ...ownerFeeResult.rows.map((row: any) => ({
        type: row.type,
        market_addr: row.market_addr,
        amount: toHumanAmount(row.amount_raw, decimals),
        amount_raw: row.amount_raw,
        side: row.side,
        created_at: row.created_at,
        status: row.status,
        time: formatTimeAgo(row.created_at)
      })),
      ...marketResult.rows.map((row: any) => ({
        type: row.type,
        market_addr: row.market_addr,
        amount: row.amount_raw,
        amount_raw: row.amount_raw,
        side: row.side,
        created_at: row.created_at,
        status: row.status,
        time: formatTimeAgo(row.created_at)
      }))
    ];

    // Sort by created_at descending and limit
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const limitedActivities = activities.slice(0, parseInt(limit as string));

    res.json({
      activities: limitedActivities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }
}

// GET /profiles?q=&limit= - Search profiles by address prefix
router.get('/', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    // Query real database data

    // Get all unique users with their stats
    const searchQuery = `
      WITH user_stats AS (
        SELECT 
          user_addr,
          COALESCE(SUM(amount_raw::bigint), 0) as total_bet_raw,
          COALESCE(SUM(winning_raw::bigint), 0) as total_winning_raw,
          COUNT(*) as played_count,
          COUNT(CASE WHEN winning_raw::bigint > 0 THEN 1 END) as won_count
        FROM (
          SELECT user_addr, amount_raw::bigint, 0::bigint as winning_raw FROM bets
          UNION ALL
          SELECT user_addr, 0::bigint as amount_raw, winning_raw::bigint FROM claims
        ) combined
        WHERE user_addr ILIKE $1
        GROUP BY user_addr
      ),
      owner_stats AS (
        SELECT 
          owner_addr as user_addr,
          COALESCE(SUM(fee_raw::bigint), 0) as total_owner_fee_raw,
          COUNT(DISTINCT market_addr) as created_count
        FROM owner_fees
        WHERE owner_addr ILIKE $1
        GROUP BY owner_addr
      )
      SELECT 
        COALESCE(u.user_addr, o.user_addr) as user_addr,
        COALESCE(u.total_bet_raw, 0) as total_bet_raw,
        COALESCE(u.total_winning_raw, 0) as total_winning_raw,
        COALESCE(o.total_owner_fee_raw, 0) as total_owner_fee_raw,
        COALESCE(u.played_count, 0) as played_count,
        COALESCE(o.created_count, 0) as created_count,
        COALESCE(u.won_count, 0) as won_count
      FROM user_stats u
      FULL OUTER JOIN owner_stats o ON u.user_addr = o.user_addr
      ORDER BY COALESCE(u.total_winning_raw, 0) DESC
      LIMIT $2
    `;

    const result = await pool.query(searchQuery, [`${q}%`, parseInt(limit as string)]);

    const profiles = result.rows.map((row: any) => ({
      user_addr: row.user_addr,
      totals: {
        bet: {
          raw: row.total_bet_raw,
          human: toHumanAmount(row.total_bet_raw, decimals)
        },
        winning: {
          raw: row.total_winning_raw,
          human: toHumanAmount(row.total_winning_raw, decimals)
        },
        owner_fee: {
          raw: row.total_owner_fee_raw,
          human: toHumanAmount(row.total_owner_fee_raw, decimals)
        }
      },
      counts: {
        played: parseInt(row.played_count),
        created: parseInt(row.created_count),
        won: parseInt(row.won_count)
      }
    }));

    res.json(profiles);
  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
