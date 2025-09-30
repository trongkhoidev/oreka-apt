'use client';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function SimpleProfilePage() {
  const router = useRouter();
  const { addr } = router.query;
  const address = addr as string;
  
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const result = await fetch(`/api/profile/${address.toLowerCase()}`).then(r => r.json());
        setData(result);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading Profile...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4 text-red-400">Error Loading Profile</div>
          <p className="text-gray-400">Could not load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Profile Test</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
          <div className="space-y-2">
            <p><span className="text-gray-400">Address:</span> {address}</p>
            <p><span className="text-gray-400">Total Bet:</span> {String(((data.totals as Record<string, unknown>)?.bet as Record<string, unknown>)?.human || '0')} APT</p>
            <p><span className="text-gray-400">Total Winning:</span> {String(((data.totals as Record<string, unknown>)?.winning as Record<string, unknown>)?.human || '0')} APT</p>
            <p><span className="text-gray-400">Markets Played:</span> {String((data.counts as Record<string, unknown>)?.played || 0)}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
          <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
