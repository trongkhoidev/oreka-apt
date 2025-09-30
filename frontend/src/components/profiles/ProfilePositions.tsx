interface ProfilePositionsProps {
  data: {
    counts?: {
      played?: number;
      created?: number;
      won?: number;
    };
  };
}

export default function ProfilePositions({ data }: ProfilePositionsProps) {
  return (
    <div className="space-y-6">
      {/* Positions Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Active Positions</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>AVG</span>
          <span>CURRENT</span>
          <span>VALUE</span>
          <button className="ml-4 p-1 hover:bg-gray-700/50 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Positions List */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30">
        {data.counts?.played === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-300 mb-2">No Active Positions</h4>
            <p className="text-gray-500 text-sm">You haven&apos;t placed any bets yet</p>
            <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Start Trading
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center text-gray-400 text-sm">
              Loading positions...
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{data.counts?.played || 0}</div>
          <div className="text-sm text-gray-400">Markets Played</div>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{data.counts?.created || 0}</div>
          <div className="text-sm text-gray-400">Markets Created</div>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{data.counts?.won || 0}</div>
          <div className="text-sm text-gray-400">Markets Won</div>
        </div>
      </div>
    </div>
  );
}
