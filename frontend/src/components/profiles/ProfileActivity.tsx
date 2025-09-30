interface ProfileActivityProps {
  data: {
    counts?: {
      played?: number;
      created?: number;
      won?: number;
    };
  };
}

export default function ProfileActivity({}: ProfileActivityProps) {
  // Mock activity data - in real app, this would come from API
  const activities = [
    {
      id: 1,
      type: 'bet',
      description: 'Placed bet on BTC/USDT market',
      amount: '0.5 APT',
      time: '2 hours ago',
      status: 'active'
    },
    {
      id: 2,
      type: 'create',
      description: 'Created new market: ETH/USDT',
      amount: '0.1 APT',
      time: '1 day ago',
      status: 'completed'
    },
    {
      id: 3,
      type: 'win',
      description: 'Won bet on SOL/USDT market',
      amount: '1.2 APT',
      time: '3 days ago',
      status: 'completed'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bet':
        return (
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      case 'create':
        return (
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'win':
        return (
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-400 bg-blue-500/10';
      case 'completed':
        return 'text-green-400 bg-green-500/10';
      case 'failed':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>
      
      {/* Activity List */}
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-start space-x-3">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium text-sm">{activity.description}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">{activity.time}</span>
                  <span className="text-white font-medium text-sm">{activity.amount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Load More */}
      <div className="text-center">
        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
          Load More Activity
        </button>
      </div>
    </div>
  );
}
