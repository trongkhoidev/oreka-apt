import { useState } from 'react';

interface ProfileChartProps {
  data: {
    totals?: {
      bet?: { human?: string };
      winning?: { human?: string };
    };
  };
}

export default function ProfileChart({ data }: ProfileChartProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
  
  const totalBet = parseFloat(data.totals?.bet?.human || '0');
  const totalWinning = parseFloat(data.totals?.winning?.human || '0');
  const profitLoss = totalWinning - totalBet;

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Profit/Loss</h3>
            <p className="text-sm text-gray-400">Trading performance</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="h-48 bg-gray-800/30 rounded-lg flex items-center justify-center mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(4)} APT
          </div>
          <div className="text-sm text-gray-400">
            {timeRange === '1D' ? 'Past Day' : 
             timeRange === '1W' ? 'Past Week' : 
             timeRange === '1M' ? 'Past Month' : 'All Time'}
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Chart visualization coming soon
          </div>
        </div>
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Bet:</span>
          <span className="text-white font-medium">{totalBet.toFixed(4)} APT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Total Winning:</span>
          <span className="text-white font-medium">{totalWinning.toFixed(4)} APT</span>
        </div>
      </div>
    </div>
  );
}
