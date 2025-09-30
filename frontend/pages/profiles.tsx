'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export default function ProfilesPage() {
  const router = useRouter();
  const { account, connected, connect } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!connected || !account) {
          setError('Please connect your wallet first');
          setIsLoading(false);
          return;
        }

        const address = account.address.toString();
        
        // Check if profile exists in database
        try {
          const response = await fetch(`http://localhost:4000/profiles/${address}`);
          
          if (response.ok) {
            // Profile exists, redirect to it
            router.push(`/profiles/${address}`);
          } else if (response.status === 404) {
            // Profile doesn't exist, create new one
            await createNewProfile(address);
            router.push(`/profiles/${address}`);
          } else {
            throw new Error(`API error: ${response.status}`);
          }
        } catch (apiError) {
          console.error('API Error:', apiError);
          // If API fails, still redirect to profile page (it will show loading state)
          router.push(`/profiles/${address}`);
        }
      } catch (error) {
        console.error('Redirect Error:', error);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    handleRedirect();
  }, [connected, account, router]);

  const createNewProfile = async (address: string) => {
    try {
      // Create a new profile with default values
      const newProfile = {
        user_addr: address,
        totals: {
          bet: { raw: "0", human: "0" },
          winning: { raw: "0", human: "0" },
          owner_fee: { raw: "0", human: "0" }
        },
        counts: {
          played: 0,
          created: 0,
          won: 0
        }
      };

      // For now, we'll just log it. In a real app, you'd POST to create the profile
      console.log('Creating new profile for:', address, newProfile);
      
      // You could add a POST request here to create the profile in the database
      // await fetch('http://localhost:4000/profiles', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newProfile)
      // });
      
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Profile</h2>
          <p className="text-gray-400">Redirecting to your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-blue-400">Wallet Required</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => connect?.('Petra')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-gray-400">Please wait while we redirect you to your profile.</p>
      </div>
    </div>
  );
}
