import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Flex, HStack, Text, Button, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { bid, claim, claimMultiOutcome, resolveMarket, getMarketDetails, getUserBid, getUserMultiOutcomePosition, bidMultiOutcome, withdrawFee, testGetUserMultiOutcomePosition } from '../services/aptosMarketService';
import MarketCharts from './charts/MarketCharts';
import { PriceService } from '../services/PriceService';
import { getAvailableTradingPairs } from '../config/tradingPairs';
import MarketInfo from './customer/MarketInfo';
import MarketTimeline from './customer/MarketTimeline';
import MarketBetPanel from './customer/MarketBetPanel';
import MultiOutcomeBetPanel from './customer/MultiOutcomeBetPanel';
import MarketRules from './customer/MarketRules';
import type { MarketInfo as MarketInfoType } from '../services/aptosMarketService';
import ChartDataPrefetchService from '../services/ChartDataPrefetchService';
import { getMarketBidEvents, buildPositionTimeline, buildMultiOutcomePositionTimeline } from '../services/positionHistoryService';
import { getStandardPairName } from '../config/pairMapping';
import EventListenerService from '../services/EventListenerService';
import { normalizePriceFeedId, fetchAndValidateVAA, base64ToBytes } from '../utils/pythUtils';

enum Side { Long, Short }
enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity'];

// Helper: format claimable amount with 2, 4, or 6 decimals
const formatClaimAmount = (amount: number) => {
  if (!isFinite(amount)) return '--';

  const apt = amount / 1e8;

  if (Number.isInteger(apt * 100)) return apt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (Number(apt * 10000) === 0) return apt.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  return apt.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};



const getClaimableAmount = (market: MarketInfoType | null, userPositions: { long: number; short: number }, userMultiOutcomePositions: number[]) => {
  if (!market || !market.is_resolved) return 0;
  
  // Check if this is a multi-outcome market
  const isMultiOutcome = market.market_type && !market.market_type.is_binary;
  
  if (isMultiOutcome) {
    // Multi-outcome market claimable amount calculation
    const result = Number(market.result);
    const userAmount = userMultiOutcomePositions[result] || 0;
    
    if (userAmount === 0) return 0;
    
    const winnerPool = (market.outcome_amounts && market.outcome_amounts[result]) ? market.outcome_amounts[result] : 0;
    const totalAmount = Number(market.total_amount);
    const loserPool = totalAmount - winnerPool;
    const bonusInjected = market.bonus_injected || 0;
    const distributable = loserPool + bonusInjected;
    
    if (winnerPool === 0) return 0;
    
    const rawAmount = userAmount + Math.floor((userAmount * distributable) / winnerPool);
    const feePercentage = Number(market.fee_percentage);
    const fee = Math.floor((feePercentage * rawAmount) / 1000);
    
    return rawAmount - fee;
  } else {
    // Binary market claimable amount calculation
    if (userPositions.long === 0 && userPositions.short === 0) return 0;
    
    const userLong = userPositions.long;
    const userShort = userPositions.short;
    const result = Number(market.result);
    const longAmount = Number(market.long_amount);
    const shortAmount = Number(market.short_amount);
    const feePercentage = Number(market.fee_percentage);
    let rawAmount = 0;
    
    if (result === 0 && userLong > 0) {
      // LONG win
      const winnerPool = longAmount;
      const winningPool = shortAmount;
      rawAmount = userLong + Math.floor((userLong * winningPool) / winnerPool);
    } else if (result === 1 && userShort > 0) {
      // SHORT win
      const winnerPool = shortAmount;
      const winningPool = longAmount;
      rawAmount = userShort + Math.floor((userShort * winningPool) / winnerPool);
    } else {
      return 0;
    }
    
    // Fee: (fee_percentage * raw_amount) / 1000
    const fee = Math.floor((feePercentage * rawAmount) / 1000);
    return rawAmount - fee;
  }
};

function clearLocalCache() {
  localStorage.removeItem('contractData');
  localStorage.removeItem('selectedContractAddress');
  localStorage.removeItem('allMarketsCache');
}

const Customer: React.FC<CustomerProps> = ({ contractAddress }) => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const toast = useToast();

  // State
  const [market, setMarket] = useState<MarketInfoType | null>(null);
  const [phase, setPhase] = useState<Phase>(Phase.Pending);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetLogo, setAssetLogo] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [userPositions, setUserPositions] = useState<{ long: number; short: number }>({ long: 0, short: 0 });
  const [userMultiOutcomePositions, setUserMultiOutcomePositions] = useState<number[]>([]);
  
  // Debug logging for userMultiOutcomePositions state changes
  useEffect(() => {
    console.log('[Customer] userMultiOutcomePositions state changed:', {
      userMultiOutcomePositions,
      length: userMultiOutcomePositions.length,
      hasPositions: userMultiOutcomePositions.some(pos => pos > 0),
      details: userMultiOutcomePositions.map((pos, idx) => ({
        index: idx,
        value: pos,
        inAPT: (pos / 1e8).toFixed(4)
      }))
    });
  }, [userMultiOutcomePositions]);
  const [positionHistory, setPositionHistory] = useState<{ time: number; long: number; short: number }[]>([]);
  const [multiOutcomePositionHistory, setMultiOutcomePositionHistory] = useState<{ time: number; outcomeAmounts: number[] }[]>([]);
  const [refreshChart, setRefreshChart] = useState(0);
  const [reloadTimeout, setReloadTimeout] = useState<NodeJS.Timeout | null>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [prevMarket, setPrevMarket] = useState<MarketInfoType | null>(null);
  const [prevFeeWithdrawn, setPrevFeeWithdrawn] = useState<boolean>(false);
  const [waitingForResolve, setWaitingForResolve] = useState(false);

  const [hasClaimed, setHasClaimed] = useState(false);

  
  const claimableAmount = useMemo(() => getClaimableAmount(market, userPositions, userMultiOutcomePositions), [market, userPositions, userMultiOutcomePositions]);
  const isOwner = useMemo(() => account?.address && market?.creator && account.address.toString().toLowerCase() === market.creator.toLowerCase(), [account?.address, market?.creator]);
  const canWithdrawFee = useMemo(() => isOwner && market?.is_resolved && !market?.fee_withdrawn, [isOwner, market]);
  const withdrawFeeAmount = useMemo(() => {
    if (!market) return 0;
    const feePercentage = Number(market.fee_percentage);
    const totalAmount = Number(market.total_amount);
    return Math.floor((feePercentage * totalAmount) / 1000);
  }, [market]);

  // Fetch user positions - remove dependency on fetchMarketData
  const fetchUserPositions = useCallback(async () => {
    console.log('[Customer] fetchUserPositions called with:', {
      connected,
      accountAddress: account?.address?.toString(),
      contractAddress,
      marketType: market?.market_type
    });
    
    if (connected && account?.address && contractAddress) {
      try {
        // Check if this is a multi-outcome market
        const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
        console.log('[Customer] Market type check:', { isMultiOutcome, marketType: market?.market_type });
        
        if (isMultiOutcome) {
          // Debug: Check current user address
          console.log('[Customer] Current user address debug:', {
            accountAddress: account.address.toString(),
            contractAddress,
            isMultiOutcome,
            marketType: market?.market_type
          });
          
          // Add delay to avoid rate limit
          console.log('[Customer] Adding delay to avoid rate limit...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Test API call first
          console.log('[Customer] Testing API call...');
          await testGetUserMultiOutcomePosition(account.address.toString(), contractAddress);
          
          // Fetch multi-outcome positions
          console.log('[Customer] About to call main getUserMultiOutcomePosition...');
          const positions = await getUserMultiOutcomePosition(account.address.toString(), contractAddress);
          console.log('[Customer] Main getUserMultiOutcomePosition result:', { 
            positions, 
            positionsType: typeof positions,
            positionsLength: positions?.length,
            account: account.address.toString(), 
            contractAddress,
            isMultiOutcome: true,
            marketPriceRangesLength: market?.price_ranges?.length
          });
          
          // Ensure positions array has correct length for all outcomes
          const expectedLength = market?.price_ranges?.length || 3; // Default to 3 if not available
          const normalizedPositions = Array.from({ length: expectedLength }, (_, index) => 
            positions[index] || 0
          );
          
          console.log('[Customer] Normalized positions:', {
            original: positions,
            normalized: normalizedPositions,
            expectedLength,
            actualLength: positions.length
          });
          
          console.log('[Customer] Setting userMultiOutcomePositions to:', normalizedPositions);
          console.log('[Customer] About to call setUserMultiOutcomePositions...');
          setUserMultiOutcomePositions(normalizedPositions);
          console.log('[Customer] setUserMultiOutcomePositions called successfully');
          // Set binary positions to 0 for multi-outcome markets
          setUserPositions({ long: 0, short: 0 });
        } else {
          // Fetch binary positions
          const [long, short, hasBid] = await getUserBid(account.address.toString(), contractAddress);
          console.log('getUserBid:', { long, short, hasBid, account: account.address.toString(), contractAddress });
          setUserPositions({
            long: Number(long),
            short: Number(short)
          });
          // Clear multi-outcome positions for binary markets
          setUserMultiOutcomePositions([]);
        }
      } catch (error) {
        console.error('fetchUserPositions error:', error);
        setUserPositions({ long: 0, short: 0 });
        setUserMultiOutcomePositions([]);
      }
    } else {
      setUserPositions({ long: 0, short: 0 });
      setUserMultiOutcomePositions([]);
    }
  }, [connected, account, contractAddress, market?.market_type]);

  const fetchMarketData = useCallback(async (forceRefresh: boolean = false) => {
    if (!contractAddress) return;
    setIsLoading(true);
    try {
      // Check for cached data first (unless force refresh)
      let details = null;
      if (!forceRefresh) {
        try {
          const cachedData = localStorage.getItem('contractData');
          if (cachedData) {
            details = JSON.parse(cachedData);
            console.log('[Customer] Using cached market data for instant display');
            // Clear cached data after use
            localStorage.removeItem('contractData');
          }
        } catch (err) {
          console.warn('[Customer] Failed to parse cached data', err);
        }
      }
      
      // If no cached data or force refresh, fetch from API
      if (!details) {
        details = await getMarketDetails(contractAddress, forceRefresh);
      }
      
      if (!details) {
        setIsLoading(false);
        toast({ title: 'Market not found', description: 'This market does not exist or has been removed.', status: 'error' });
        setMarket(null);
        return;
      }
      setMarket(details);
      // Phase logic
      const now = Math.floor(Date.now() / 1000);
      const biddingStart = Number(details.bidding_start_time);
      const biddingEnd = Number(details.bidding_end_time);
      if (details.is_resolved) setPhase(Phase.Maturity);
      else if (now < biddingStart) setPhase(Phase.Pending);
      else if (now >= biddingStart && now < biddingEnd) setPhase(Phase.Bidding);
      else setPhase(Phase.Maturity);
      // Always use getStandard
      const pairName = getStandardPairName(details.pair_name);
      setAssetLogo(`/images/${pairName.split('/')[0].toLowerCase()}-logo.png`);
      if (waitingForResolve && details.is_resolved) setWaitingForResolve(false);
    } catch (error) {
      console.error('fetchMarketData error:', error);
      toast({ title: 'Error', description: 'Could not fetch market data', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, toast, waitingForResolve]);


  useEffect(() => {
    if (!contractAddress) return;
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;
    const poll = async () => {
      await fetchMarketData(waitingForResolve);
      // Remove fetchUserPositions from polling - only fetch when needed
    };
    poll();
    let polling = false;
    if (waitingForResolve || !market?.is_resolved) {
      polling = true;
    }
    
    if (waitingForResolve && prevMarket) {
      if (prevMarket.is_resolved !== market?.is_resolved && Number(market?.final_price) > 0) polling = false;
      if (prevFeeWithdrawn !== market?.fee_withdrawn) polling = false;
    }
    if (polling) {
      interval = setInterval(poll, 2000);
      timeout = setTimeout(() => setWaitingForResolve(false), 30000);
    } else {
      setWaitingForResolve(false);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, fetchMarketData, market?.is_resolved, waitingForResolve, market?.fee_withdrawn, market?.final_price]);

  // Fetch position history for the market - build from BidEvents
  useEffect(() => {
    if (!contractAddress) return;
    let isMounted = true;
    const fetchPositionHistory = async () => {
      try {
        console.log('[Customer] Fetching position history for:', contractAddress);
        
        // Fetch all BidEvents from API
        const bidEvents = await getMarketBidEvents(contractAddress);
        console.log('[Customer] Fetched bid events:', bidEvents.length);

        const market = await getMarketDetails(contractAddress);
        const biddingStartTime = market?.bidding_start_time ? Number(market.bidding_start_time) * 1000 : undefined;
        const biddingEndTime = market?.bidding_end_time ? Number(market.bidding_end_time) * 1000 : undefined;
        
        console.log('[Customer] Market details:', {
          isMultiOutcome: market?.market_type && !market.market_type.is_binary,
          priceRangesLength: market?.price_ranges?.length,
          outcomeAmounts: market?.outcome_amounts,
          biddingStartTime: biddingStartTime ? new Date(biddingStartTime).toISOString() : null,
          biddingEndTime: biddingEndTime ? new Date(biddingEndTime).toISOString() : null
        });
        
        if (biddingStartTime && biddingEndTime) {
          // Check if this is a multi-outcome market
          const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
          
          if (isMultiOutcome && market?.price_ranges) {
            // Multi-outcome market
            const timeline = buildMultiOutcomePositionTimeline(
              bidEvents,
              biddingStartTime,
              biddingEndTime,
              Date.now(),
              market.price_ranges.length
            );
            console.log('[Customer] Built multi-outcome timeline:', timeline.length, 'points');
            if (isMounted) {
              setMultiOutcomePositionHistory(timeline);
              setPositionHistory([]); // Clear binary history
            }
          } else {
            // Binary market
            const timeline = buildPositionTimeline(
              bidEvents,
              biddingStartTime,
              biddingEndTime,
              Date.now()
            );
            console.log('[Customer] Built binary timeline:', timeline.length, 'points');
            if (isMounted) {
              setPositionHistory(timeline);
              setMultiOutcomePositionHistory([]); // Clear multi-outcome history
            }
          }
        } else {
          console.log('[Customer] No bidding times, clearing history');
          if (isMounted) {
            setPositionHistory([]);
            setMultiOutcomePositionHistory([]);
          }
        }
      } catch (error) {
        console.error('[Customer] Error fetching position history:', error);
        if (isMounted) {
          setPositionHistory([]);
          setMultiOutcomePositionHistory([]);
        }
      }
    };
    fetchPositionHistory();
    return () => { isMounted = false; };
  }, [contractAddress, phase, refreshChart]); // Only refresh when refreshChart changes (after bet)

  // Fetch user bid on mount and when contractAddress changes - separate from fetchMarketData
  useEffect(() => {
    if (!contractAddress || !account?.address) return;
    fetchUserPositions(); // initial fetch only
    const unsubscribe = EventListenerService.getInstance().subscribe(contractAddress, (events) => {
      if (
        events.some(
          e =>
            e.type === 'BidEvent' &&
            (typeof e.data === 'object' && e.data !== null && 'user' in e.data) &&
            (e.data as { user?: string }).user?.toLowerCase() === account.address.toString().toLowerCase()
        )
      ) {
        // Only fetch user positions when user actually bets
        console.log('[Customer] User bet detected, fetching positions...');
        fetchUserPositions();
      }
    });
    return () => { 
      if (unsubscribe) unsubscribe();
      // Cleanup timeout on unmount
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [contractAddress, account?.address, fetchUserPositions, reloadTimeout]);

  // Fetch market data on mount and when contractAddress changes
  useEffect(() => { 
    fetchMarketData(); 
  }, [fetchMarketData]);

  // Fetch user positions after market data is loaded - REMOVED to reduce API calls
  // useEffect(() => {
  //   if (market && connected && account?.address) {
  //     fetchUserPositions();
  //   }
  // }, [market, connected, account, fetchUserPositions]);

  // Sửa useEffect cập nhật hasClaimed:
  useEffect(() => {
    if (!account?.address || !contractAddress) return;
    (async () => {
      const [long, short] = await getUserBid(account.address.toString(), contractAddress);
     
      setHasClaimed(!!market?.is_resolved && Number(long) === 0 && Number(short) === 0);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, contractAddress, userPositions.long, userPositions.short, claimableAmount, market?.is_resolved]);

  // Debug log các giá trị quan trọng trước khi render nút Claim Reward
  useEffect(() => {
    console.log('[DEBUG] account.address:', account?.address);
    console.log('[DEBUG] market.is_resolved:', market?.is_resolved);
    console.log('[DEBUG] userPositions:', userPositions);
    console.log('[DEBUG] claimableAmount:', claimableAmount);
  }, [account?.address, market?.is_resolved, userPositions, claimableAmount]);

  // Khi market resolve xong thì fetch lại userPositions để cập nhật UI - REMOVED to reduce API calls
  // useEffect(() => {
  //   if (market?.is_resolved && account?.address) {
  //     fetchUserPositions();
  //   }
  // }, [market?.is_resolved, account?.address]);

  // Fetch asset price
  useEffect(() => {
    if (!market?.pair_name) return;
    const pairName = getStandardPairName(market.pair_name);
    const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
    if (!allowedPairs.includes(pairName)) return;
    const priceService = PriceService.getInstance();
    const unsub = priceService.subscribeToWebSocketPrices((priceData) => {
      if (priceData.symbol.replace('-', '/').toUpperCase() === pairName.toUpperCase()) {
        // setCurrentPrice(priceData.price); // This line was removed
      }
    }, [pairName]);
    return () => { if (unsub) unsub(); };
  }, [market?.pair_name]);

  // Prefetch chart data for all intervals as soon as market loads
  useEffect(() => {
    if (market?.pair_name) {
      const pairName = getStandardPairName(market.pair_name);
      const allowedPairs = getAvailableTradingPairs().map(p => p.pair);
      if (allowedPairs.includes(pairName)) {
        ChartDataPrefetchService.getInstance().prefetchAll(pairName);
      }
    }
  }, [market?.pair_name]);

  // Memoized derived values for correct UI update
  // Derived values
  const maturityTimeMs = market?.maturity_time ? Number(market.maturity_time) * 1000 : 0;
  const canResolve = phase === Phase.Maturity 
    && !market?.is_resolved 
    && maturityTimeMs > 0
    && Date.now() >= maturityTimeMs;
  const long = market?.long_amount ? Number(market.long_amount) : 0;
  const short = market?.short_amount ? Number(market.short_amount) : 0;
  const total = market?.total_amount ? Number(market.total_amount) : long + short;
  const longPercentage = total === 0 ? 50 : (long / total) * 100;
  const shortPercentage = total === 0 ? 50 : (short / total) * 100;
  const pairName = market?.pair_name || '';
  const strike = market?.strike_price ? (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const maturity = market?.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  const fee = market?.fee_percentage ? (Number(market.fee_percentage) / 10).toFixed(1) : '--';


  // Handlers
  const handleBid = async () => {
    if (!bidAmount || !signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    
    // Check if this is a multi-outcome market
    const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
    
    if (isMultiOutcome) {
      // Multi-outcome market bidding
      if (selectedOutcome === null) {
        toast({ title: 'Please select an outcome', status: 'warning' });
        return;
      }
      
      setIsSubmitting(true);
      try {
        const timestampBid = Math.floor(Date.now() / 1000);
        await bidMultiOutcome(signAndSubmitTransaction, contractAddress, selectedOutcome, parseFloat(bidAmount), timestampBid);
        toast({ title: 'Bid submitted', status: 'success' });
        setBidAmount('');
        setSelectedOutcome(null);
        
        console.log('[Customer] Multi-outcome bid successful, refreshing data...');
        
        // Wait a bit for transaction to be processed
        console.log('[Customer] Waiting 3 seconds for transaction to be processed...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Update market, userPositions, and chart
        const details = await getMarketDetails(contractAddress);
        setMarket(details);
        
        console.log('[Customer] Market details updated, fetching user positions...');
        await fetchUserPositions();
        
        console.log('[Customer] User positions fetched, triggering chart refresh...');
        setCurrentTime(Date.now()); // Update current time for chart
        setRefreshChart(c => c + 1); // Trigger chart refresh
        
        // Schedule additional data reload after 30s to ensure accuracy
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }
        const timeout = setTimeout(async () => {
          console.log('[Customer] 30s after bet - reloading data for accuracy...');
          try {
            const details = await getMarketDetails(contractAddress);
            setMarket(details);
            await fetchUserPositions();
            setCurrentTime(Date.now());
            setRefreshChart(c => c + 1);
          } catch (error) {
            console.warn('[Customer] 30s reload failed:', error);
          }
        }, 30000);
        setReloadTimeout(timeout);
      } catch (error: unknown) {
        toast({ title: 'Bid failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Binary market bidding
      if (selectedSide === null) {
        toast({ title: 'Please select a side', status: 'warning' });
        return;
      }
      
      setIsSubmitting(true);
      try {
        const timestampBid = Math.floor(Date.now() / 1000);
        await bid(signAndSubmitTransaction, contractAddress, selectedSide === Side.Long, parseFloat(bidAmount), timestampBid);
        toast({ title: 'Bid submitted', status: 'success' });
        setBidAmount('');
        // Update market, userPositions, and chart
        const details = await getMarketDetails(contractAddress);
        setMarket(details);
        await fetchUserPositions();
        setCurrentTime(Date.now()); // Update current time for chart
        setRefreshChart(c => c + 1); // Trigger chart refresh
        
        // Schedule additional data reload after 30s to ensure accuracy
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }
        const timeout = setTimeout(async () => {
          console.log('[Customer] 30s after bet - reloading data for accuracy...');
          try {
            const details = await getMarketDetails(contractAddress);
            setMarket(details);
            await fetchUserPositions();
            setCurrentTime(Date.now());
            setRefreshChart(c => c + 1);
          } catch (error) {
            console.warn('[Customer] 30s reload failed:', error);
          }
        }, 30000);
        setReloadTimeout(timeout);
      } catch (error: unknown) {
        toast({ title: 'Bid failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResolve = async () => {
    if (!signAndSubmitTransaction || !market) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    setPrevMarket(market);
    try {
      // Normalize price_feed_id from market
      const priceFeedId = normalizePriceFeedId(market.price_feed_id);
      if (!priceFeedId) {
        throw new Error('Invalid or missing price_feed_id in market data');
      }
      
      console.log('[handleResolve] Using price_feed_id:', priceFeedId);
      
      // Fetch and validate VAA data from Hermes API
      const vaas = await fetchAndValidateVAA(priceFeedId);
      console.log('[handleResolve] Retrieved and validated VAAs:', vaas.length, 'first VAA length:', vaas[0]?.length);

      const pythPriceUpdate: number[][] = vaas.map((vaa, idx) => {
        const bytes = base64ToBytes(vaa);
        console.log(`[handleResolve] VAA[${idx}] bytes length:`, bytes.length, 'first:', bytes.slice(0, 8), 'last:', bytes.slice(-8));
        
        // Log VAA header analysis
        if (bytes.length >= 4) {
          const header = bytes.slice(0, 4);
          const headerHex = header.map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`[handleResolve] VAA[${idx}] header:`, header, 'hex:', headerHex);
          
          // Check for PNAU header
          if (header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85) {
            console.log(`[handleResolve] VAA[${idx}] has valid PNAU header`);
          } else {
            console.warn(`[handleResolve] VAA[${idx}] has unexpected header:`, header);
          }
        }
        
        // Ensure all bytes are numbers, not strings
        const normalizedBytes = bytes.map(byte => {
          const num = Number(byte);
          if (isNaN(num) || num < 0 || num > 255) {
            console.warn(`[handleResolve] Invalid byte value:`, byte, 'converted to:', num);
            return 0;
          }
          return num;
        });
        
        console.log(`[handleResolve] VAA[${idx}] normalized length:`, normalizedBytes.length, 'first 8:', normalizedBytes.slice(0, 8));
        return normalizedBytes;
      });
      console.log('[handleResolve] contractAddress:', contractAddress);
      console.log('[handleResolve] pythPriceUpdate count:', pythPriceUpdate.length);
      pythPriceUpdate.forEach((arr, idx) => {
        console.log(`[handleResolve] pythPriceUpdate[${idx}] length:`, arr.length, 'first:', arr.slice(0, 8), 'last:', arr.slice(-8));
      });
      console.log('[handleResolve] typeof pythPriceUpdate:', typeof pythPriceUpdate, 'isArray:', Array.isArray(pythPriceUpdate));
      const totalBytes = pythPriceUpdate.reduce((sum, arr) => sum + arr.length, 0);
      console.log('[handleResolve] total bytes:', totalBytes);
      try {
        await resolveMarket(signAndSubmitTransaction, contractAddress, pythPriceUpdate);
        console.log('[handleResolve] resolveMarket SUCCESS');
        toast({ title: 'Market resolve transaction submitted', status: 'success' });
        const details = await getMarketDetails(contractAddress);
        setMarket(details);
        await fetchMarketData();
        await fetchUserPositions();
        setWaitingForResolve(true);
        clearLocalCache(); // Clear cache after successful resolve
      } catch (err) {
        console.error('[handleResolve] resolveMarket ERROR:', err);
        
        // Check if it's a VAA version error or simulation error and try with different data
        if (err instanceof Error && (err.message.includes('E_WRONG_VERSION') || err.message.includes('Simulation error') || err.message.includes('Generic error'))) {
          console.log('[handleResolve] VAA/simulation error detected, trying alternative approach...');
          
          try {
            // Try with a fresh VAA fetch (maybe the previous one was stale)
            const freshVaas = await fetchAndValidateVAA(priceFeedId);
            
            // Check VAA size and try to optimize if too large
            let freshPythPriceUpdate: number[][] = freshVaas.map((vaa, idx) => {
              const bytes = base64ToBytes(vaa);
              const normalizedBytes = bytes.map(byte => {
                const num = Number(byte);
                return isNaN(num) || num < 0 || num > 255 ? 0 : num;
              });
              return normalizedBytes;
            });
            
            // If VAA is too large, try to truncate it (keep first 1000 bytes for safety)
            const totalBytes = freshPythPriceUpdate.reduce((sum, chunk) => sum + chunk.length, 0);
            if (totalBytes > 1000) {
              console.log(`[handleResolve] VAA too large (${totalBytes} bytes), truncating to 1000 bytes...`);
              freshPythPriceUpdate = freshPythPriceUpdate.map(chunk => chunk.slice(0, 1000));
            }
            
            console.log('[handleResolve] Retrying with fresh VAA data...', {
              originalSize: totalBytes,
              newSize: freshPythPriceUpdate.reduce((sum, chunk) => sum + chunk.length, 0),
              chunks: freshPythPriceUpdate.length
            });
            
            await resolveMarket(signAndSubmitTransaction, contractAddress, freshPythPriceUpdate);
            console.log('[handleResolve] resolveMarket SUCCESS on retry');
            toast({ title: 'Market resolve transaction submitted (retry)', status: 'success' });
            
            const details = await getMarketDetails(contractAddress);
            setMarket(details);
            await fetchMarketData();
            await fetchUserPositions();
            setWaitingForResolve(true);
            clearLocalCache();
            return; // Success on retry
          } catch (retryErr) {
            console.error('[handleResolve] Retry also failed:', retryErr);
            
            // Last resort: try with minimal VAA data
            if (retryErr instanceof Error && (retryErr.message.includes('Simulation error') || retryErr.message.includes('Generic error'))) {
              console.log('[handleResolve] Trying with minimal VAA data as last resort...');
              
              try {
                // Create minimal VAA with just PNAU header
                const minimalVaa = [80, 78, 65, 85, 1, 0, 0, 0]; // PNAU + version
                const minimalPayload = [minimalVaa];
                
                console.log('[handleResolve] Using minimal VAA:', minimalVaa);
                await resolveMarket(signAndSubmitTransaction, contractAddress, minimalPayload);
                console.log('[handleResolve] resolveMarket SUCCESS with minimal VAA');
                toast({ title: 'Market resolve transaction submitted (minimal VAA)', status: 'success' });
                
                const details = await getMarketDetails(contractAddress);
                setMarket(details);
                await fetchMarketData();
                await fetchUserPositions();
                setWaitingForResolve(true);
                clearLocalCache();
                return; // Success with minimal VAA
              } catch (minimalErr) {
                console.error('[handleResolve] Minimal VAA also failed:', minimalErr);
                throw new Error(`Market resolution failed: ${err.message.includes('Simulation error') ? 'Simulation error' : 'VAA error'}. Please try again later. Original error: ${err.message}`);
              }
            }
            
            throw new Error(`Market resolution failed: ${err.message.includes('Simulation error') ? 'Simulation error' : 'VAA error'}. Please try again later. Original error: ${err.message}`);
          }
        }
        
        throw err;
      }
    } catch (error: unknown) {
      console.error('[handleResolve] Resolve error:', error);
      toast({ title: 'Resolve failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async () => {
    if (!signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Check if this is a multi-outcome market
      const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
      
      if (isMultiOutcome) {
        await claimMultiOutcome(signAndSubmitTransaction, contractAddress);
      } else {
        await claim(signAndSubmitTransaction, contractAddress);
      }
      
      toast({ title: 'Claim transaction submitted', status: 'success' });
      await fetchMarketData();
      await fetchUserPositions(); // Luôn fetch lại userPositions sau khi claim
    } catch (error: unknown) {
      toast({ title: 'Claim failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler withdraw fee
  const handleWithdrawFee = async () => {
    if (!signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }
    setIsSubmitting(true);
    setPrevFeeWithdrawn(!!market?.fee_withdrawn);
    try {
      await withdrawFee(signAndSubmitTransaction, contractAddress);
      toast({ title: 'Withdraw fee transaction submitted', status: 'success' });
      await fetchMarketData();
      await fetchUserPositions();
      setWaitingForResolve(true);
      clearLocalCache(); // Clear cache after successful withdraw fee
    } catch (error: unknown) {
      toast({ title: 'Withdraw fee failed', description: error instanceof Error ? error.message : 'An error occurred', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI
  if (isLoading || !market) {
    return (
      <Box bg="dark.900" minH="100vh" py={8}>
        <Container maxW="container.xl" centerContent>
          <Spinner size="xl" />
          <Text mt={4} color="white">Loading market data...</Text>
        </Container>
      </Box>
    );
  }

  const CHART_HEIGHT = 380;

  return (
    <Box bg="dark.900" minH="100vh" py={8}>
      <Container maxW="container.xl">
        {/* Market Info */}
        <MarketInfo
          assetLogo={assetLogo}
          pairName={getStandardPairName(market.pair_name) || ''}
          strike={strike}
          maturity={maturity}
          pool={market?.total_amount ? (Number(market.total_amount) / 1e8).toString() : '--'}
          fee={fee}
          phase={phase}
          phaseNames={phaseNames}
        />
        

        {/* Main Content - 2 Column Layout */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
          {/* Left Side - Charts and Rules */}
          <Box width={{ base: '100%', md: '70%' }} pr={{ base: 0, md: 2 }}>
            <Tabs variant="line" colorScheme="yellow" border="1px solid" borderColor="gray.700" borderRadius="xl" pb={2}>
              <Box pb={1}>
                <TabList
                  borderBottom="2px solid"
                  borderColor="gray.600"
                  px={6}
                  py={3}
                  display="grid"
                  gridTemplateColumns="1fr 1fr"
                  alignItems="center"
                >
                  <Flex justify="center">
                    <Tab
                      fontWeight="bold"
                      fontSize="sm"
                      _selected={{
                        bg: "blue.600",
                        color: "white",
                        borderRadius: "md",
                        boxShadow: "md",
                      }}
                      _hover={{
                        bg: "gray.700",
                        color: "white",
                      }}
                      px={6}
                      py={2}
                      transition="all 0.2s"
                    >
                      Position Chart
                    </Tab>
                  </Flex>
                  <Flex justify="center">
                    <Tab
                      fontWeight="bold"
                      fontSize="sm"
                      _selected={{
                        bg: "green.500",
                        color: "white",
                        borderRadius: "md",
                        boxShadow: "md",
                      }}
                      _hover={{
                        bg: "gray.700",
                        color: "white",
                      }}
                      px={6}
                      py={2}
                      transition="all 0.2s"
                    >
                      Price Chart
                    </Tab>
                  </Flex>
                </TabList>
              </Box>

              <TabPanels>
                <TabPanel p={0} pt={2}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={getStandardPairName(market.pair_name) || market?.pair_name}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="position"
                      data={market?.market_type && !market.market_type.is_binary ? multiOutcomePositionHistory : positionHistory}
                      height={CHART_HEIGHT}
                      biddingStartTime={market?.bidding_start_time ? Number(market.bidding_start_time) * 1000 : undefined}
                      biddingEndTime={market?.bidding_end_time ? Number(market.bidding_end_time) * 1000 : undefined}
                      currentTime={currentTime}
                      isMultiOutcome={market?.market_type && !market.market_type.is_binary}
                      priceRanges={market?.price_ranges || []}
                      outcomeAmounts={market?.outcome_amounts || []}
                    />
                  </Box>
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <Box position="relative" width="100%">
                    <MarketCharts
                      chartSymbol={pairName}
                      strikePrice={market?.strike_price ? Number(market.strike_price) / 1e8 : Number(market?.strike_price || 0)}
                      chartType="price"
                      height={CHART_HEIGHT}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Rules Section */}
            <MarketRules
              showRules={showRules}
              setShowRules={setShowRules}
              market={market}
              strike={strike}
              fee={fee}
            />
          </Box>

          {/* Right Side - Betting Panel and Market Info */}
          <Box width={{ base: '100%', md: '30%' }} ml={{ md: 2 }} minW={{ md: '280px' }} maxW={{ md: '340px' }} alignSelf="flex-start">
            {(() => {
              const isBinary = market?.market_type && market.market_type.is_binary;
              const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
              const showFinalPrice = phase === Phase.Maturity && market?.is_resolved;
              const showWinningRange = phase === Phase.Maturity && market?.is_resolved && isMultiOutcome && market.price_ranges;
              
              // Only show container if there's content to display
              const shouldShowContainer = isBinary || showFinalPrice || showWinningRange;
              
              console.log('[Customer] Container visibility debug:', {
                isBinary,
                isMultiOutcome,
                showFinalPrice,
                showWinningRange,
                shouldShowContainer,
                phase,
                isResolved: market?.is_resolved
              });
              
              return shouldShowContainer;
            })() && (
            <Box
              bg="gray.800"
              p={6}
              borderRadius="2xl"
              mb={6}
              borderWidth={1}
              borderColor="gray.700"
              boxShadow="0 4px 32px 0 rgba(0,0,0,0.25)"
            >
              {(() => {
                const isBinary = market?.market_type && market.market_type.is_binary;
                const isMultiOutcome = market?.market_type && !market.market_type.is_binary;
                
                console.log('[Customer] Market type debug:', {
                  marketType: market?.market_type,
                  isBinary: market?.market_type?.is_binary,
                  isMultiOutcome: isMultiOutcome,
                  shouldShowStrikePrice: isBinary,
                  marketTypeString: JSON.stringify(market?.market_type),
                  phase: phase,
                  isResolved: market?.is_resolved
                });
                
                // Force hide for multi-outcome markets
                if (isMultiOutcome) {
                  console.log('[Customer] Multi-outcome market detected, hiding Strike Price box');
                  return false;
                }
                
                // Force hide if not binary
                if (!isBinary) {
                  console.log('[Customer] Non-binary market detected, hiding Strike Price box');
                  return false;
                }
                
                console.log('[Customer] Binary market detected, showing Strike Price box');
                return isBinary;
              })() && (
                <Flex justify="space-between" align="center" textAlign="center" fontSize="20px" color="white">
                  <HStack justify="center" align="center">
                    <Text color="gray.400">Strike Price: </Text>
                    <Text fontWeight="bold">
                      {strike} 
                    </Text>
                    <Text fontWeight="bold" color="#FEDF56">USD</Text>
                  </HStack>
                </Flex>
              )}

              {/* Show Final Price in Maturity phase */}
              {phase === Phase.Maturity && market?.is_resolved && (
                <Flex justify="space-between" align="center" mt={2}>
                  <HStack fontSize="20px">
                    <Text color="gray.400">Final Price:</Text>
                    <Text fontWeight="bold" color={String(market?.result) === '0' ? 'green' : 'red'}>
                      {(Number(market.final_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </Text>
                    <Text fontWeight="bold" color="#FEDF56">USD</Text>
                  </HStack>
                </Flex>
              )}

              {/* Show Winning Outcome for Multi-Outcome Market */}
              {phase === Phase.Maturity && market?.is_resolved && market?.market_type && !market.market_type.is_binary && market.price_ranges && (
                <Flex justify="space-between" align="center" mt={2}>
                  <HStack fontSize="20px">
                    <Text color="gray.400">Winning Range:</Text>
                    <Text fontWeight="bold" color="green">
                      {market.price_ranges[Number(market.result)]?.outcome_name || `Outcome ${market.result}`}
                    </Text>
                  </HStack>
                </Flex>
              )}

              {phase === Phase.Maturity && claimableAmount > 0 && !hasClaimed && (
                <Button
                  onClick={handleClaim}
                  colorScheme="yellow"
                  bg=""
                  border="1px solid #FEDF56"
                  color="white"
                  _hover={{ bg: "#0d6d0c" }}
                  width="100%"
                  mt={4}
                  isLoading={isSubmitting}
                  rightIcon={<Text fontWeight="bold" color="#00E1D6" ml={2}>{formatClaimAmount(claimableAmount)} APT</Text>}
                >
                  Claim Rewards
                </Button>
              )}
              
              {phase === Phase.Maturity && canWithdrawFee && !market?.fee_withdrawn && withdrawFeeAmount > 0 && (
                <Button
                  onClick={handleWithdrawFee}
                  colorScheme="blue"
                  border="1px solid #4F8CFF"
                  color="white"
                  _hover={{ bg: "#0d6d0c" }}
                  width="100%"
                  mt={4}
                  isLoading={isSubmitting}
                  rightIcon={<Text fontWeight="bold" color="#4F8CFF" ml={2}>{formatClaimAmount(withdrawFeeAmount)} APT</Text>}
                >
                  Withdraw Fee
                </Button>
              )}
            </Box>
            )}

            {/* Betting Panel - Only show during Bidding phase */}
            {(phase === Phase.Pending || phase === Phase.Bidding) && (
              <>
                {/* Multi-outcome market betting panel */}
                {market?.market_type && !market.market_type.is_binary && market.price_ranges && (
                  <MultiOutcomeBetPanel
                    phase={phase}
                    selectedOutcome={selectedOutcome}
                    setSelectedOutcome={setSelectedOutcome}
                    bidAmount={bidAmount}
                    setBidAmount={setBidAmount}
                    handleBid={handleBid}
                    isSubmitting={isSubmitting}
                    connected={connected}
                    userPositions={userMultiOutcomePositions}
                    fee={fee}
                    totalAmount={total}
                    priceRanges={market.price_ranges}
                    outcomeAmounts={market.outcome_amounts || []}
                  />
                )}
                
                {/* Binary market betting panel */}
                {(!market?.market_type || market.market_type.is_binary) && (
                  <MarketBetPanel
                    phase={phase}
                    selectedSide={selectedSide}
                    setSelectedSide={setSelectedSide}
                    bidAmount={bidAmount}
                    setBidAmount={setBidAmount}
                    handleBid={handleBid}
                    isSubmitting={isSubmitting}
                    connected={connected}
                    longPercentage={longPercentage}
                    shortPercentage={shortPercentage}
                    userPositions={userPositions}
                    fee={fee}
                    longAmount={long}
                    shortAmount={short}
                    totalAmount={total}
                  />
                )}
              </>
            )}

            {/* Market Timeline */}
            <MarketTimeline
              phase={phase}
              phaseNames={phaseNames}
              market={market}
              maturity={maturity}
              canResolve={canResolve}
              handleResolve={handleResolve}
              isSubmitting={isSubmitting}
            />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default Customer; 