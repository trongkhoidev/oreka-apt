
interface ProfileTabsProps {
  activeTab: 'positions' | 'activity';
  onTabChange: (tab: 'positions' | 'activity') => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-6">
      <button
        onClick={() => onTabChange('positions')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === 'positions'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Positions</span>
        </div>
      </button>
      <button
        onClick={() => onTabChange('activity')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === 'activity'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Activity</span>
        </div>
      </button>
    </div>
  );
}
