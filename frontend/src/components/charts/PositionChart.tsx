import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Text, HStack, Button, Flex, Badge, Progress } from '@chakra-ui/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import PositionRealtimeService, { PositionData, PositionUpdate } from '../../services/PositionRealtimeService';

interface PositionPoint {
  time: number;
  long: number;
  short: number;
}

interface BidEvent {
  time: number;
  side: 'long' | 'short';
  amount: number;
  user: string;
}

interface ChartDataPoint {
  time: number;
  longPercent: number;
  shortPercent: number;
  total: number;
}

interface PositionChartProps {
  data?: PositionPoint[];
  height?: number;
  marketAddress?: string;
  biddingStartTime?: number;
  biddingEndTime?: number;
  currentTime?: number;
}

const PositionChart: React.FC<PositionChartProps> = ({ 
  data, 
  height = 400, 
  marketAddress,
  biddingStartTime,
  biddingEndTime,
  currentTime = Date.now()
}) => {
  const [realtimeData, setRealtimeData] = useState<PositionData[]>([]);
  const [bidEvents, setBidEvents] = useState<BidEvent[]>([]);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const realtimeService = PositionRealtimeService.getInstance();

  // Calculate timeline progress
  const timelineProgress = useMemo(() => {
    if (!biddingStartTime || !biddingEndTime) return 0;
    const total = biddingEndTime - biddingStartTime;
    const elapsed = currentTime - biddingStartTime;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }, [biddingStartTime, biddingEndTime, currentTime]);

  // Subscribe to realtime updates when marketAddress is provided
  useEffect(() => {
    if (!marketAddress) {
      // Fallback to static data if no marketAddress
      if (data && data.length > 0) {
        const convertedData = data.map(d => ({
          time: d.time,
          long: d.long,
          short: d.short,
          longPercent: d.long + d.short > 0 ? (d.long / (d.long + d.short)) * 100 : 50,
          shortPercent: d.long + d.short > 0 ? (d.short / (d.long + d.short)) * 100 : 50,
          total: d.long + d.short
        }));
        setRealtimeData(convertedData);
      }
      return;
    }

    // Subscribe to realtime updates
    const unsubscribe = realtimeService.subscribe(marketAddress, (update: PositionUpdate) => {
      setRealtimeData(prevData => {
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
      
      setIsRealtime(update.isRealtime);
      setLastUpdate(new Date());
    });

    unsubscribeRef.current = unsubscribe;

    // Load existing history
    const history = realtimeService.getPositionHistory(marketAddress, 'all');
    if (history.length > 0) {
      setRealtimeData(history);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [marketAddress, realtimeService]);

  // Generate complete timeline data with bid events
  const chartData = useMemo(() => {
    if (!biddingStartTime || !biddingEndTime) {
      // Fallback to regular data if no bidding timeline
      const sourceData = marketAddress ? realtimeData : (data || []);
      if (!sourceData || !sourceData.length) {
        return [{ time: currentTime, longPercent: 50, shortPercent: 50, total: 0 }];
      }
      
      return sourceData.map(d => {
        if ('longPercent' in d && 'shortPercent' in d) {
          return {
            time: d.time,
            longPercent: d.longPercent as number,
            shortPercent: d.shortPercent as number,
            total: (d as any).total || 0
          };
        } else {
          const total = d.long + d.short;
          if (total > 0) {
            return {
              time: d.time,
              longPercent: (d.long / total) * 100,
              shortPercent: (d.short / total) * 100,
              total: total
            };
          } else {
            return {
              time: d.time,
              longPercent: 50,
              shortPercent: 50,
              total: 0
            };
          }
        }
      });
    }

    // Generate complete timeline from bidding start to end
    const timelineData: ChartDataPoint[] = [];
    const startTime = biddingStartTime;
    const endTime = biddingEndTime;
    
    // Get all position changes (from realtime service or bid events)
    const positionChanges = marketAddress ? realtimeData : (data || []);
    
    // Start with 50/50 position at bidding start
    timelineData.push({
      time: startTime,
      longPercent: 50,
      shortPercent: 50,
      total: 0
    });

    // Add all position changes that occurred during bidding period
    const biddingPeriodChanges = positionChanges.filter(change => 
      change.time >= startTime && change.time <= endTime
    );

    biddingPeriodChanges.forEach(change => {
      if ('longPercent' in change && 'shortPercent' in change) {
        timelineData.push({
          time: change.time,
          longPercent: change.longPercent as number,
          shortPercent: change.shortPercent as number,
          total: (change as any).total || 0
        });
      } else {
        const total = change.long + change.short;
        if (total > 0) {
          timelineData.push({
            time: change.time,
            longPercent: (change.long / total) * 100,
            shortPercent: (change.short / total) * 100,
            total: total
          });
        }
      }
    });

    // Add current position at current time (if within bidding period)
    if (currentTime >= startTime && currentTime <= endTime) {
      const currentPosition = positionChanges[positionChanges.length - 1];
      if (currentPosition) {
        let longPercent = 50, shortPercent = 50, total = 0;
        
        if ('longPercent' in currentPosition && 'shortPercent' in currentPosition) {
          longPercent = currentPosition.longPercent as number;
          shortPercent = currentPosition.shortPercent as number;
          total = (currentPosition as any).total || 0;
        } else {
          const posTotal = currentPosition.long + currentPosition.short;
          if (posTotal > 0) {
            longPercent = (currentPosition.long / posTotal) * 100;
            shortPercent = (currentPosition.short / posTotal) * 100;
            total = posTotal;
          }
        }

        // Only add if it's different from the last point
        const lastPoint = timelineData[timelineData.length - 1];
        if (!lastPoint || 
            Math.abs(lastPoint.longPercent - longPercent) > 0.01 ||
            Math.abs(lastPoint.time - currentTime) > 1000) {
          timelineData.push({
            time: currentTime,
            longPercent,
            shortPercent,
            total
          });
        }
      }
    }

    // Add final position at bidding end (ONLY if currentTime >= endTime)
    if (currentTime >= endTime) {
      const lastPoint = timelineData[timelineData.length - 1];
      if (lastPoint && Math.abs(lastPoint.time - endTime) > 1000) {
        timelineData.push({
          time: endTime,
          longPercent: lastPoint.longPercent,
          shortPercent: lastPoint.shortPercent,
          total: lastPoint.total
        });
      }
    }

    // Sort by time and remove duplicates
    timelineData.sort((a, b) => a.time - b.time);
    const uniqueData = timelineData.filter((point, index, array) => 
      index === 0 || Math.abs(point.time - array[index - 1].time) > 1000
    );

    return uniqueData.length > 0 ? uniqueData : [{
      time: currentTime,
      longPercent: 50,
      shortPercent: 50,
      total: 0
    }];
  }, [data, realtimeData, marketAddress, biddingStartTime, biddingEndTime, currentTime]);

  const last = chartData.length ? chartData[chartData.length - 1] : { longPercent: 50, shortPercent: 50, total: 0 };

  // Custom legend with timeline progress
  const renderLegend = () => (
    <Flex justify="space-between" align="center" mb={2}>
      <HStack spacing={6}>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="#00E1D6" />
          <Text color="#00E1D6" fontWeight="bold">Long {(last as ChartDataPoint).longPercent.toFixed(1)}%</Text>
        </HStack>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="#FF6B81" />
          <Text color="#FF6B81" fontWeight="bold">Short {(last as ChartDataPoint).shortPercent.toFixed(1)}%</Text>
        </HStack>
      </HStack>
    </Flex>
  );

  // Custom tooltip with timeline info
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) => {
    if (active && payload && payload.length) {
      const time = new Date(label || 0);
      const longPercent = payload[0]?.value || 0;
      const shortPercent = payload[1]?.value || 0;
      
      return (
        <Box bg="#23262f" borderRadius="md" p={3} border="1px solid #444" boxShadow="lg">
          <Text fontSize="sm" color="#A0AEC0" mb={2}>
            {format(time, 'MMM d, yyyy HH:mm:ss')}
          </Text>
          <Text color="#00E1D6" fontWeight="bold">
            Long: {longPercent.toFixed(2)}%
          </Text>
          <Text color="#FF6B81" fontWeight="bold">
            Short: {shortPercent.toFixed(2)}%
          </Text>
          {biddingStartTime && biddingEndTime && (
            <Text fontSize="xs" color="gray.400" mt={1}>
              {time.getTime() < biddingStartTime ? 'Before Bidding' : 
               time.getTime() > biddingEndTime ? 'After Bidding' : 'Bidding Active'}
            </Text>
          )}
        </Box>
      );
    }
    return null;
  };

  // Custom dot for current position: luôn hiển thị dot ở điểm cuối cùng
  const AlwaysShowDot = (color: string) => (props: { cx?: number; cy?: number; index?: number; data?: any[] }) => {
    const { cx, cy, index = 0, data = [] } = props;
    if (index === data.length - 1) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill={color}
          stroke="#fff"
          strokeWidth={3}
          style={{
            filter: 'drop-shadow(0 0 8px ' + color + '88)',
            animation: isRealtime ? 'pulse 2s infinite' : 'none'
          }}
        />
      );
    }
    // Always return an SVG element (empty group)
    return <g />;
  };

  // Timeline tick formatter - show actual time instead of percentage
  const getTimelineTickFormatter = () => {
    if (!biddingStartTime || !biddingEndTime) {
      // Show both date and time for clarity
      return (t: number) => format(new Date(t), 'MMM d HH:mm');
    }
    return (t: number) => {
      const time = new Date(t);
      const start = new Date(biddingStartTime);
      const end = new Date(biddingEndTime);
      if (time < start) return format(start, 'MMM d HH:mm');
      if (time > end) return format(end, 'MMM d HH:mm');
      // Show time in 'MMM d HH:mm:ss' format for clarity
      return format(time, 'MMM d HH:mm');
    };
  };

  // Calculate domain for X-axis
  const getXAxisDomain = () => {
    if (biddingStartTime && biddingEndTime) {
      return [biddingStartTime, biddingEndTime];
    }
    return ['dataMin', 'dataMax'];
  };

  return (
    <Box bg="#0A0B10" borderRadius="xl" p={2}>
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      
      {renderLegend()}
      
      <Box width="100%" height={height}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23262f" />
            <XAxis
              dataKey="time"
              tickFormatter={getTimelineTickFormatter()}
              type="number"
              domain={getXAxisDomain()}
              padding={{ left: 10, right: 10 }}
              stroke="#A0AEC0"
              fontSize={13}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={v => `${v.toFixed(0)}%`} 
              stroke="#A0AEC0" 
              fontSize={13} 
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference lines for bidding timeline */}
            {biddingStartTime && (
              <ReferenceLine 
                x={biddingStartTime} 
                stroke="#4A5568" 
                strokeDasharray="3 3" 
                
              />
            )}
            {biddingEndTime && (
              <ReferenceLine 
                x={biddingEndTime} 
                stroke="#4A5568" 
                strokeDasharray="3 3" 
                
              />
            )}
            
            <Line 
              type="monotone" 
              dataKey="longPercent" 
              stroke="#00E1D6" 
              strokeWidth={3} 
              dot={AlwaysShowDot('#00E1D6')} 
              name="Long"
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Line 
              type="monotone" 
              dataKey="shortPercent" 
              stroke="#FF6B81" 
              strokeWidth={3} 
              dot={AlwaysShowDot('#FF6B81')} 
              name="Short"
              animationDuration={300}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PositionChart; 