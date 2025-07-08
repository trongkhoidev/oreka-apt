import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Button, Badge } from '@chakra-ui/react';
import PositionChart from './PositionChart';
import PositionRealtimeService from '../../services/PositionRealtimeService';

const PositionChartDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [bidEvents, setBidEvents] = useState<Array<{time: number, side: 'long' | 'short', amount: number}>>([]);
  
  // Demo bidding timeline: 5 minutes duration
  const biddingStartTime = Date.now() - 2 * 60 * 1000; // 2 minutes ago
  const biddingEndTime = Date.now() + 3 * 60 * 1000; // 3 minutes from now
  
  const realtimeService = PositionRealtimeService.getInstance();
  const demoMarketAddress = 'demo-market-123';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
        
        // Simulate bid events every 30 seconds
        if (Math.random() < 0.3) { // 30% chance
          const newBid = {
            time: Date.now(),
            side: Math.random() > 0.5 ? 'long' : 'short' as 'long' | 'short',
            amount: Math.random() * 1000 + 100
          };
          setBidEvents(prev => [...prev, newBid]);
          
          // Add bid event to realtime service (this will automatically update position)
          realtimeService.addBidEvent(demoMarketAddress, {
            time: newBid.time,
            side: newBid.side,
            amount: newBid.amount,
            user: `user_${Math.floor(Math.random() * 1000)}`
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, realtimeService]);

  const startDemo = () => {
    setIsRunning(true);
    // Initialize with 50/50 position by adding initial bid events
    realtimeService.addBidEvent(demoMarketAddress, {
      time: biddingStartTime,
      side: 'long',
      amount: 1000,
      user: 'initial_long'
    });
    
    realtimeService.addBidEvent(demoMarketAddress, {
      time: biddingStartTime + 1000, // 1 second later
      side: 'short',
      amount: 1000,
      user: 'initial_short'
    });
  };

  const stopDemo = () => {
    setIsRunning(false);
  };

  const resetDemo = () => {
    setIsRunning(false);
    setBidEvents([]);
    setCurrentTime(Date.now());
    realtimeService.clearHistory(demoMarketAddress);
  };

  const addRandomBid = () => {
    const newBid = {
      time: Date.now(),
      side: Math.random() > 0.5 ? 'long' : 'short' as 'long' | 'short',
      amount: Math.random() * 1000 + 100
    };
    setBidEvents(prev => [...prev, newBid]);
    
    // Add bid event to realtime service
    realtimeService.addBidEvent(demoMarketAddress, {
      time: newBid.time,
      side: newBid.side,
      amount: newBid.amount,
      user: `user_${Math.floor(Math.random() * 1000)}`
    });
  };

  const addLongBid = () => {
    const newBid = {
      time: Date.now(),
      side: 'long' as const,
      amount: Math.random() * 500 + 200
    };
    setBidEvents(prev => [...prev, newBid]);
    
    realtimeService.addBidEvent(demoMarketAddress, {
      time: newBid.time,
      side: 'long',
      amount: newBid.amount,
      user: `long_user_${Math.floor(Math.random() * 1000)}`
    });
  };

  const addShortBid = () => {
    const newBid = {
      time: Date.now(),
      side: 'short' as const,
      amount: Math.random() * 500 + 200
    };
    setBidEvents(prev => [...prev, newBid]);
    
    realtimeService.addBidEvent(demoMarketAddress, {
      time: newBid.time,
      side: 'short',
      amount: newBid.amount,
      user: `short_user_${Math.floor(Math.random() * 1000)}`
    });
  };

  const currentPosition = realtimeService.getCurrentPosition(demoMarketAddress);
  const timelineProgress = ((currentTime - biddingStartTime) / (biddingEndTime - biddingStartTime)) * 100;
  const storedBidEvents = realtimeService.getBidEvents(demoMarketAddress, biddingStartTime, biddingEndTime);

  return (
    <Box p={6} bg="#0A0B10" minH="100vh">
      <VStack spacing={6} align="stretch">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color="white" mb={2}>
            Position Chart Demo - Bidding Timeline with BidEvents
          </Text>
          <Text color="gray.400" mb={4}>
            Demo cách 2: Timeline từ bidding start đến end với realtime movement và lưu trữ đầy đủ lịch sử BidEvents
          </Text>
        </Box>

        {/* Controls */}
        <Box bg="#23262f" p={4} borderRadius="lg">
          <HStack spacing={4} mb={4}>
            <Button 
              colorScheme={isRunning ? "red" : "green"} 
              onClick={isRunning ? stopDemo : startDemo}
            >
              {isRunning ? "Stop Demo" : "Start Demo"}
            </Button>
            <Button colorScheme="blue" onClick={addRandomBid}>
              Add Random Bid
            </Button>
            <Button colorScheme="cyan" onClick={addLongBid}>
              Add Long Bid
            </Button>
            <Button colorScheme="red" onClick={addShortBid}>
              Add Short Bid
            </Button>
            <Button colorScheme="gray" onClick={resetDemo}>
              Reset
            </Button>
          </HStack>
          
          <HStack spacing={6}>
            <Box>
              <Text fontSize="sm" color="gray.400">Current Position:</Text>
              <HStack>
                <Badge colorScheme="cyan">Long: {currentPosition?.longPercent?.toFixed(1)}%</Badge>
                <Badge colorScheme="red">Short: {currentPosition?.shortPercent?.toFixed(1)}%</Badge>
              </HStack>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.400">Timeline Progress:</Text>
              <Text fontSize="sm" color="white">{timelineProgress.toFixed(1)}%</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.400">Total Bid Events:</Text>
              <Text fontSize="sm" color="white">{storedBidEvents.length}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.400">Total Amount:</Text>
              <Text fontSize="sm" color="white">{currentPosition?.total?.toFixed(2) || '0.00'} USDT</Text>
            </Box>
          </HStack>
        </Box>

        {/* Chart */}
        <Box>
          <PositionChart
            height={400}
            marketAddress={demoMarketAddress}
            biddingStartTime={biddingStartTime}
            biddingEndTime={biddingEndTime}
            currentTime={currentTime}
          />
        </Box>

        {/* Bid Events Log */}
        <Box bg="#23262f" p={4} borderRadius="lg" maxH="300px" overflowY="auto">
          <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>
            Bid Events Log (Stored in Service)
          </Text>
          {storedBidEvents.length === 0 ? (
            <Text color="gray.400">No bid events yet...</Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {storedBidEvents.slice(-15).reverse().map((bid, index) => (
                <HStack key={index} justify="space-between" bg="#1a1b1f" p={2} borderRadius="md">
                  <HStack>
                    <Badge colorScheme={bid.side === 'long' ? 'cyan' : 'red'}>
                      {bid.side.toUpperCase()}
                    </Badge>
                    <Text color="white" fontSize="sm">
                      {bid.amount.toFixed(2)} USDT
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      by {bid.user}
                    </Text>
                  </HStack>
                  <Text color="gray.400" fontSize="xs">
                    {new Date(bid.time).toLocaleTimeString()}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

        {/* Position History */}
        <Box bg="#23262f" p={4} borderRadius="lg" maxH="200px" overflowY="auto">
          <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>
            Position History (Last 10 Changes)
          </Text>
          {(() => {
            const history = realtimeService.getPositionHistory(demoMarketAddress, 'all');
            const recentHistory = history.slice(-10).reverse();
            
            return recentHistory.length === 0 ? (
              <Text color="gray.400">No position history yet...</Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {recentHistory.map((position, index) => (
                  <HStack key={index} justify="space-between" bg="#1a1b1f" p={2} borderRadius="md">
                    <HStack>
                      <Badge colorScheme="cyan">Long: {position.longPercent.toFixed(1)}%</Badge>
                      <Badge colorScheme="red">Short: {position.shortPercent.toFixed(1)}%</Badge>
                      <Text color="gray.400" fontSize="xs">
                        Total: {position.total.toFixed(2)} USDT
                      </Text>
                    </HStack>
                    <Text color="gray.400" fontSize="xs">
                      {new Date(position.time).toLocaleTimeString()}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            );
          })()}
        </Box>
      </VStack>
    </Box>
  );
};

export default PositionChartDemo; 