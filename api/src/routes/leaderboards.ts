import { Router } from 'express';
import { pool, toHumanAmount, getMonthBoundaries } from '../db';
import { LeaderboardResponse, LeaderboardEntry } from '../types';

const router = Router();

// GET /leaderboards/monthly/owners?ym=YYYY-MM&limit= - Monthly owners by payout
router.get('/monthly/owners', async (req, res) => {
  try {
    const { ym, limit = 100 } = req.query;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    if (!ym || typeof ym !== 'string') {
      return res.status(400).json({ error: 'Month parameter (ym) is required in YYYY-MM format' });
    }

    // Query real database data
    const { start, end } = getMonthBoundaries(ym as string);
    
    const query = `
      SELECT 
        owner_addr,
        COALESCE(SUM(fee_atomic), 0) AS total_amount_raw,
        COUNT(DISTINCT market_id_text) AS market_count
      FROM owner_fees 
      WHERE ts >= $1 AND ts < $2
      GROUP BY owner_addr
      ORDER BY total_amount_raw DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [start, end, parseInt(limit as string)]);
    
    const entries: LeaderboardEntry[] = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      rank_by_winning: index + 1,
      user_addr: row.owner_addr,
      total_amount: {
        raw: row.total_amount_raw,
        human: toHumanAmount(row.total_amount_raw, decimals)
      },
      market_count: parseInt(row.market_count)
    }));

    const response: LeaderboardResponse = {
      entries,
      total: entries.length,
      month: ym as string
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching monthly owners leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /leaderboards/monthly/users?ym=YYYY-MM&limit= - Monthly users by winning
router.get('/monthly/users', async (req, res) => {
  try {
    const { ym, limit = 100 } = req.query;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    if (!ym || typeof ym !== 'string') {
      return res.status(400).json({ error: 'Month parameter (ym) is required in YYYY-MM format' });
    }

    // Query real database data
    const { start, end } = getMonthBoundaries(ym as string);
    
    const query = `
      WITH user_bets AS (
        SELECT 
          user_addr,
          COALESCE(SUM(amount_atomic), 0) AS total_bet_raw
        FROM bets 
        WHERE ts >= $1 AND ts < $2
        GROUP BY user_addr
      ),
      user_winnings AS (
        SELECT 
          user_addr,
          COALESCE(SUM(net_atomic), 0) AS total_winning_raw
        FROM claims 
        WHERE ts >= $1 AND ts < $2
        GROUP BY user_addr
      )
      SELECT 
        COALESCE(b.user_addr, w.user_addr) AS user_addr,
        COALESCE(b.total_bet_raw, 0) AS total_bet_raw,
        COALESCE(w.total_winning_raw, 0) AS total_winning_raw
      FROM user_bets b
      FULL OUTER JOIN user_winnings w ON b.user_addr = w.user_addr
      WHERE COALESCE(b.total_bet_raw, 0) > 0 OR COALESCE(w.total_winning_raw, 0) > 0
      ORDER BY COALESCE(w.total_winning_raw, 0) DESC, COALESCE(b.total_bet_raw, 0) DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [start, end, parseInt(limit as string)]);
    
    const entries: LeaderboardEntry[] = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      rank_by_winning: index + 1,
      rank_by_amount: index + 1, // Same ranking for now
      user_addr: row.user_addr,
      winning: {
        raw: row.total_winning_raw,
        human: toHumanAmount(row.total_winning_raw, decimals)
      },
      amount: {
        raw: row.total_bet_raw,
        human: toHumanAmount(row.total_bet_raw, decimals)
      }
    }));

    const response: LeaderboardResponse = {
      entries,
      total: entries.length,
      month: ym as string
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching monthly users leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /leaderboards/all-time/users?limit= - All-time users by winning
router.get('/all-time/users', async (req, res) => {
  try {
    const { limit = 1000 } = req.query;
    const decimals = parseInt(process.env.TOKEN_DECIMALS || '8');

    // Query real database data
    const query = `
      WITH user_bets AS (
        SELECT 
          user_addr,
          COALESCE(SUM(amount_atomic), 0) AS total_bet_raw
        FROM bets 
        GROUP BY user_addr
      ),
      user_winnings AS (
        SELECT 
          user_addr,
          COALESCE(SUM(net_atomic), 0) AS total_winning_raw
        FROM claims 
        GROUP BY user_addr
      )
      SELECT 
        COALESCE(b.user_addr, w.user_addr) AS user_addr,
        COALESCE(b.total_bet_raw, 0) AS total_bet_raw,
        COALESCE(w.total_winning_raw, 0) AS total_winning_raw
      FROM user_bets b
      FULL OUTER JOIN user_winnings w ON b.user_addr = w.user_addr
      WHERE COALESCE(b.total_bet_raw, 0) > 0 OR COALESCE(w.total_winning_raw, 0) > 0
      ORDER BY COALESCE(w.total_winning_raw, 0) DESC, COALESCE(b.total_bet_raw, 0) DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);
    
    const entries: LeaderboardEntry[] = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      rank_by_winning: index + 1,
      rank_by_amount: index + 1, // Same ranking for now
      user_addr: row.user_addr,
      winning: {
        raw: row.total_winning_raw,
        human: toHumanAmount(row.total_winning_raw, decimals)
      },
      amount: {
        raw: row.total_bet_raw,
        human: toHumanAmount(row.total_bet_raw, decimals)
      }
    }));

    const response: LeaderboardResponse = {
      entries,
      total: entries.length
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching all-time users leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
