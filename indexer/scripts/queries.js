const { Client } = require('pg');
require('dotenv').config();

// Common query functions for API endpoints

async function getUserProfile(userAddr) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT 
        user_addr,
        total_bet_atomic,
        total_user_winning_atomic,
        total_owner_fee_atomic,
        markets_played_count,
        markets_created_count,
        markets_won_count,
        updated_at
      FROM user_profiles 
      WHERE user_addr = $1
    `, [userAddr.toLowerCase()]);
    
    return result.rows[0] || null;
  } finally {
    await pg.end();
  }
}

async function getMonthlyLeaderboard(ym, type = 'users', limit = 100) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    if (type === 'owners') {
      const result = await pg.query(`
        SELECT owner_addr, owner_total_amount_month, rank
        FROM leaderboard_monthly_owners 
        WHERE ym = $1
        ORDER BY rank ASC
        LIMIT $2
      `, [ym, limit]);
      return result.rows;
    } else {
      const result = await pg.query(`
        SELECT user_addr, user_total_amount_month, user_total_winning_month, rank_by_winning, rank_by_amount
        FROM leaderboard_monthly_users 
        WHERE ym = $1
        ORDER BY rank_by_winning ASC
        LIMIT $2
      `, [ym, limit]);
      return result.rows;
    }
  } finally {
    await pg.end();
  }
}

async function getAllTimeLeaderboard(limit = 100) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT user_addr, user_total_amount_alltime, user_total_winning_alltime, rank_by_winning, rank_by_amount
      FROM leaderboard_alltime_users 
      ORDER BY rank_by_winning ASC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } finally {
    await pg.end();
  }
}

async function getUserBets(userAddr, limit = 50, offset = 0) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT 
        b.tx_key,
        b.user_addr,
        b.owner_addr,
        b.market_id_text,
        b.amount_atomic,
        b.prediction,
        b.outcome_index,
        b.ts,
        m.owner_addr as market_owner,
        m.market_type,
        m.strike_price,
        m.resolved_at,
        m.resolution_outcome,
        m.final_price
      FROM bets b
      LEFT JOIN markets m ON b.market_id_text = m.market_id_text
      WHERE b.user_addr = $1
      ORDER BY b.ts DESC
      LIMIT $2 OFFSET $3
    `, [userAddr.toLowerCase(), limit, offset]);
    
    return result.rows;
  } finally {
    await pg.end();
  }
}

async function getUserClaims(userAddr, limit = 50, offset = 0) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT 
        c.tx_key,
        c.user_addr,
        c.market_id_text,
        c.payout_atomic,
        c.principal_atomic,
        c.net_atomic,
        c.won,
        c.ts,
        m.owner_addr as market_owner,
        m.market_type,
        m.strike_price,
        m.final_price,
        m.resolution_outcome
      FROM claims c
      LEFT JOIN markets m ON c.market_id_text = m.market_id_text
      WHERE c.user_addr = $1
      ORDER BY c.ts DESC
      LIMIT $2 OFFSET $3
    `, [userAddr.toLowerCase(), limit, offset]);
    
    return result.rows;
  } finally {
    await pg.end();
  }
}

async function getMarketStats(marketId) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT 
        m.*,
        COUNT(DISTINCT b.user_addr) as unique_bettors,
        COUNT(b.tx_key) as total_bets,
        SUM(b.amount_atomic) as total_bet_amount,
        COUNT(c.tx_key) as total_claims,
        SUM(c.payout_atomic) as total_payouts
      FROM markets m
      LEFT JOIN bets b ON m.market_id_text = b.market_id_text
      LEFT JOIN claims c ON m.market_id_text = c.market_id_text
      WHERE m.market_id_text = $1
      GROUP BY m.market_id_text
    `, [marketId.toLowerCase()]);
    
    return result.rows[0] || null;
  } finally {
    await pg.end();
  }
}

async function getRecentMarkets(limit = 20, offset = 0) {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    
    const result = await pg.query(`
      SELECT 
        m.*,
        COUNT(DISTINCT b.user_addr) as unique_bettors,
        COUNT(b.tx_key) as total_bets,
        SUM(b.amount_atomic) as total_bet_amount
      FROM markets m
      LEFT JOIN bets b ON m.market_id_text = b.market_id_text
      GROUP BY m.market_id_text
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  } finally {
    await pg.end();
  }
}

// CLI interface for testing queries
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'profile':
      const userAddr = args[1];
      if (!userAddr) {
        console.error('Usage: node queries.js profile <user_address>');
        return;
      }
      const profile = await getUserProfile(userAddr);
      console.log('User Profile:', JSON.stringify(profile, null, 2));
      break;
      
    case 'leaderboard':
      const type = args[1] || 'users';
      const ym = args[2];
      if (type === 'monthly' && !ym) {
        console.error('Usage: node queries.js leaderboard monthly <YYYY-MM>');
        return;
      }
      if (type === 'monthly') {
        const monthly = await getMonthlyLeaderboard(ym);
        console.log('Monthly Leaderboard:', JSON.stringify(monthly, null, 2));
      } else {
        const alltime = await getAllTimeLeaderboard();
        console.log('All-time Leaderboard:', JSON.stringify(alltime, null, 2));
      }
      break;
      
    case 'bets':
      const betUser = args[1];
      if (!betUser) {
        console.error('Usage: node queries.js bets <user_address>');
        return;
      }
      const bets = await getUserBets(betUser);
      console.log('User Bets:', JSON.stringify(bets, null, 2));
      break;
      
    case 'claims':
      const claimUser = args[1];
      if (!claimUser) {
        console.error('Usage: node queries.js claims <user_address>');
        return;
      }
      const claims = await getUserClaims(claimUser);
      console.log('User Claims:', JSON.stringify(claims, null, 2));
      break;
      
    case 'market':
      const marketId = args[1];
      if (!marketId) {
        console.error('Usage: node queries.js market <market_id>');
        return;
      }
      const market = await getMarketStats(marketId);
      console.log('Market Stats:', JSON.stringify(market, null, 2));
      break;
      
    case 'markets':
      const markets = await getRecentMarkets();
      console.log('Recent Markets:', JSON.stringify(markets, null, 2));
      break;
      
    default:
      console.log('Available commands:');
      console.log('  profile <user_address>           - Get user profile');
      console.log('  leaderboard [monthly <YYYY-MM>]  - Get leaderboard');
      console.log('  bets <user_address>              - Get user bets');
      console.log('  claims <user_address>            - Get user claims');
      console.log('  market <market_id>               - Get market stats');
      console.log('  markets                          - Get recent markets');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getUserProfile,
  getMonthlyLeaderboard,
  getAllTimeLeaderboard,
  getUserBets,
  getUserClaims,
  getMarketStats,
  getRecentMarkets
};
