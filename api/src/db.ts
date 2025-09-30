import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.PG_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export { pool };

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to convert raw amounts to human-readable format
export function toHumanAmount(raw: string | number, decimals: number = 8): string {
  const rawNum = typeof raw === 'string' ? parseFloat(raw) : raw;
  const divisor = Math.pow(10, decimals);
  return (rawNum / divisor).toFixed(6).replace(/\.?0+$/, '');
}

// Helper function to get month boundaries in UTC+7
export function getMonthBoundaries(ym: string): { start: Date; end: Date } {
  const [year, month] = ym.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  
  // Convert to UTC+7 (Asia/Ho_Chi_Minh)
  const offset = 7 * 60; // 7 hours in minutes
  start.setMinutes(start.getMinutes() - offset);
  end.setMinutes(end.getMinutes() - offset);
  
  return { start, end };
}
