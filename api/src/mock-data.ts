// Mock data for testing when database is not available
import { ProfileResponse, LeaderboardEntry, LeaderboardResponse } from './types';

export const mockProfiles: ProfileResponse[] = [
  {
    user_addr: '0x1234567890123456789012345678901234567890123456789012345678901234',
    totals: {
      bet: { raw: '1000000000', human: '10.0' },
      winning: { raw: '1500000000', human: '15.0' },
      owner_fee: { raw: '50000000', human: '0.5' }
    },
    counts: {
      played: 25,
      created: 3,
      won: 18
    }
  },
  {
    user_addr: '0x2345678901234567890123456789012345678901234567890123456789012345',
    totals: {
      bet: { raw: '800000000', human: '8.0' },
      winning: { raw: '1200000000', human: '12.0' },
      owner_fee: { raw: '30000000', human: '0.3' }
    },
    counts: {
      played: 20,
      created: 2,
      won: 15
    }
  },
  {
    user_addr: '0x3456789012345678901234567890123456789012345678901234567890123456',
    totals: {
      bet: { raw: '500000000', human: '5.0' },
      winning: { raw: '750000000', human: '7.5' },
      owner_fee: { raw: '20000000', human: '0.2' }
    },
    counts: {
      played: 15,
      created: 1,
      won: 12
    }
  }
];

export const mockMonthlyOwners: LeaderboardEntry[] = [
  {
    rank: 1,
    user_addr: '0x7890123456789012345678901234567890123456789012345678901234567890',
    total_amount: { raw: '200000000', human: '2.0' }
  },
  {
    rank: 2,
    user_addr: '0x8901234567890123456789012345678901234567890123456789012345678901',
    total_amount: { raw: '150000000', human: '1.5' }
  },
  {
    rank: 3,
    user_addr: '0x9012345678901234567890123456789012345678901234567890123456789012',
    total_amount: { raw: '100000000', human: '1.0' }
  }
];

export const mockMonthlyUsers: LeaderboardEntry[] = [
  {
    rank: 1,
    user_addr: '0x1234567890123456789012345678901234567890123456789012345678901234',
    winning: { raw: '1500000000', human: '15.0' },
    amount: { raw: '1000000000', human: '10.0' },
    rank_by_winning: 1
  },
  {
    rank: 2,
    user_addr: '0x2345678901234567890123456789012345678901234567890123456789012345',
    winning: { raw: '1200000000', human: '12.0' },
    amount: { raw: '800000000', human: '8.0' },
    rank_by_winning: 2
  },
  {
    rank: 3,
    user_addr: '0x3456789012345678901234567890123456789012345678901234567890123456',
    winning: { raw: '750000000', human: '7.5' },
    amount: { raw: '500000000', human: '5.0' },
    rank_by_winning: 3
  }
];

export const mockAllTimeUsers: LeaderboardEntry[] = [
  {
    rank: 1,
    user_addr: '0x1234567890123456789012345678901234567890123456789012345678901234',
    winning: { raw: '5000000000', human: '50.0' },
    amount: { raw: '3000000000', human: '30.0' },
    rank_by_winning: 1
  },
  {
    rank: 2,
    user_addr: '0x2345678901234567890123456789012345678901234567890123456789012345',
    winning: { raw: '4000000000', human: '40.0' },
    amount: { raw: '2500000000', human: '25.0' },
    rank_by_winning: 2
  },
  {
    rank: 3,
    user_addr: '0x3456789012345678901234567890123456789012345678901234567890123456',
    winning: { raw: '3000000000', human: '30.0' },
    amount: { raw: '2000000000', human: '20.0' },
    rank_by_winning: 3
  }
];
