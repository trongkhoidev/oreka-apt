import { formatHuman } from '@/lib/format';

interface ProfileStatsProps {
  data: {
    totals?: {
      bet?: { human?: string };
      winning?: { human?: string };
      owner_fee?: { human?: string };
    };
    counts?: {
      played?: number;
      created?: number;
      won?: number;
    };
  };
}

export default function ProfileStats({ data }: ProfileStatsProps) {
  const totalBet = parseFloat(data.totals?.bet?.human || '0');
  const totalWinning = parseFloat(data.totals?.winning?.human || '0');
  const profitLoss = totalWinning - totalBet;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Bet */}
      <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-sm font-medium">Total Bet</p>
            <p className="text-white text-xl font-bold">{formatHuman(data.totals?.bet?.human)} APT</p>
          </div>
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Winning */}
      <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-4 border border-green-700/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-300 text-sm font-medium">Total Winning</p>
            <p className="text-white text-xl font-bold">{formatHuman(data.totals?.winning?.human)} APT</p>
          </div>
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Profit/Loss */}
      <div className={`bg-gradient-to-br ${profitLoss >= 0 ? 'from-emerald-900/50 to-emerald-800/30 border-emerald-700/30' : 'from-red-900/50 to-red-800/30 border-red-700/30'} rounded-xl p-4 border`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${profitLoss >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>P&L</p>
            <p className={`text-xl font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(4)} APT
            </p>
          </div>
          <div className={`w-10 h-10 ${profitLoss >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-lg flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={profitLoss >= 0 ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
            </svg>
          </div>
        </div>
      </div>

      {/* Markets Played */}
      <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-4 border border-purple-700/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-sm font-medium">Markets Played</p>
            <p className="text-white text-xl font-bold">{data.counts?.played || 0}</p>
          </div>
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
