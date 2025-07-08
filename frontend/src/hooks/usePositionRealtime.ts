import { useState, useEffect, useCallback, useRef } from 'react';
import PositionRealtimeService, { PositionData, PositionUpdate, BidEvent } from '../services/PositionRealtimeService';

interface UsePositionRealtimeOptions {
  marketAddress: string;
  biddingStartTime?: number;
  biddingEndTime?: number;
  autoSubscribe?: boolean;
}

interface UsePositionRealtimeReturn {
  positionData: PositionData[];
  bidEvents: BidEvent[];
  currentPosition: PositionData | null;
  isRealtime: boolean;
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addBidEvent: (bidEvent: Omit<BidEvent, 'marketAddress'>) => void;
  getBidEvents: (startTime?: number, endTime?: number) => BidEvent[];
}

export const usePositionRealtime = ({
  marketAddress,
  biddingStartTime,
  biddingEndTime,
  autoSubscribe = true
}: UsePositionRealtimeOptions): UsePositionRealtimeReturn => {
  const [positionData, setPositionData] = useState<PositionData[]>([]);
  const [bidEvents, setBidEvents] = useState<BidEvent[]>([]);
  const [currentPosition, setCurrentPosition] = useState<PositionData | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const realtimeService = PositionRealtimeService.getInstance();

  // Subscribe to realtime updates
  const subscribe = useCallback(() => {
    if (!marketAddress) return;

    try {
      const unsubscribe = realtimeService.subscribe(marketAddress, (update: PositionUpdate) => {
        setPositionData(prevData => {
          const newData = [...prevData];
          
          // Check if we already have a point at this time (within 1 second)
          const existingIndex = newData.findIndex(point => 
            Math.abs(point.time - update.position.time) < 1000
          );
          
          if (existingIndex >= 0) {
            // Update existing point
            newData[existingIndex] = update.position;
          } else {
            // Add new point
            newData.push(update.position);
          }
          
          // Sort by time and limit to last 1000 points
          newData.sort((a, b) => a.time - b.time);
          if (newData.length > 1000) {
            newData.splice(0, newData.length - 1000);
          }
          
          return newData;
        });
        
        setCurrentPosition(update.position);
        setIsRealtime(update.isRealtime);
        setLastUpdate(new Date());
        setError(null);
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to position updates');
    }
  }, [marketAddress, realtimeService]);

  // Unsubscribe from realtime updates
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!marketAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load position history
      const history = realtimeService.getPositionHistory(marketAddress, 'all');
      setPositionData(history);
      
      if (history.length > 0) {
        setCurrentPosition(history[history.length - 1]);
      }

      // Load bid events
      const events = realtimeService.getBidEvents(marketAddress, biddingStartTime, biddingEndTime);
      setBidEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  }, [marketAddress, biddingStartTime, biddingEndTime, realtimeService]);

  // Refresh data manually
  const refresh = useCallback(async () => {
    if (!marketAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      await realtimeService.refreshPosition(marketAddress);
      
      // Reload data after refresh
      const history = realtimeService.getPositionHistory(marketAddress, 'all');
      setPositionData(history);
      
      if (history.length > 0) {
        setCurrentPosition(history[history.length - 1]);
      }

      const events = realtimeService.getBidEvents(marketAddress, biddingStartTime, biddingEndTime);
      setBidEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [marketAddress, biddingStartTime, biddingEndTime, realtimeService]);

  // Add bid event
  const addBidEvent = useCallback((bidEvent: Omit<BidEvent, 'marketAddress'>) => {
    if (!marketAddress) return;

    try {
      realtimeService.addBidEvent(marketAddress, bidEvent);
      
      // Update bid events list
      const events = realtimeService.getBidEvents(marketAddress, biddingStartTime, biddingEndTime);
      setBidEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bid event');
    }
  }, [marketAddress, biddingStartTime, biddingEndTime, realtimeService]);

  // Get bid events with optional time filter
  const getBidEvents = useCallback((startTime?: number, endTime?: number) => {
    if (!marketAddress) return [];
    return realtimeService.getBidEvents(marketAddress, startTime, endTime);
  }, [marketAddress, realtimeService]);

  // Effect to handle subscription
  useEffect(() => {
    if (autoSubscribe && marketAddress) {
      loadInitialData().then(() => {
        subscribe();
      });
    }

    return () => {
      unsubscribe();
    };
  }, [marketAddress, autoSubscribe, loadInitialData, subscribe, unsubscribe]);

  // Effect to update bid events when timeline changes
  useEffect(() => {
    if (marketAddress) {
      const events = realtimeService.getBidEvents(marketAddress, biddingStartTime, biddingEndTime);
      setBidEvents(events);
    }
  }, [marketAddress, biddingStartTime, biddingEndTime, realtimeService]);

  return {
    positionData,
    bidEvents,
    currentPosition,
    isRealtime,
    lastUpdate,
    isLoading,
    error,
    refresh,
    addBidEvent,
    getBidEvents
  };
}; 