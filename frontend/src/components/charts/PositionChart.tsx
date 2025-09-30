/* eslint-disable react/display-name */
import React from 'react';
import { Box, Text, HStack, Flex, VStack } from '@chakra-ui/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { format } from 'date-fns';

interface PositionPoint {
  time: number;
  long: number;
  short: number;
}

interface PositionChartProps {
  data?: PositionPoint[];
  height?: number;
  biddingStartTime?: number;
  biddingEndTime?: number;
  currentTime?: number;
}

const PositionChart = (props: PositionChartProps) => {
  const { data, height = 400, biddingStartTime, biddingEndTime, currentTime: propCurrentTime } = props;

  const [realtime, setRealtime] = React.useState(Date.now());
  React.useEffect(() => {
    if (!biddingEndTime || (propCurrentTime && propCurrentTime >= biddingEndTime)) return;
    const interval = setInterval(() => {
      setRealtime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [biddingEndTime, propCurrentTime]);
  const effectiveCurrentTime = typeof propCurrentTime === 'number' ? propCurrentTime : realtime;
  const clampedCurrentTime = typeof biddingEndTime === 'number'
    ? Math.min(effectiveCurrentTime, biddingEndTime)
    : effectiveCurrentTime;


  const chartData = React.useMemo(() => {
    if (data && data.length > 0) {
      // Sort by time ascending
      const sorted = [...data].sort((a, b) => a.time - b.time);
      // Remove duplicate timestamps (keep last occurrence)
      const unique: typeof sorted = [];
      let lastTime = -1;
      for (let i = 0; i < sorted.length; ++i) {
        if (sorted[i].time !== lastTime) {
          unique.push(sorted[i]);
          lastTime = sorted[i].time;
        } else {
          // Replace last if duplicate time
          unique[unique.length - 1] = sorted[i];
        }
      }

      // Ensure we have a point at current time while bidding is active
      let extended = unique;
      if (biddingEndTime && effectiveCurrentTime < biddingEndTime) {
        const last = unique[unique.length - 1];
        if (last && last.time < clampedCurrentTime) {
          extended = [...unique, { ...last, time: clampedCurrentTime }];
        }
      } else if (biddingEndTime) {
        // Ensure we have a terminal point exactly at biddingEndTime so the dot can freeze there
        const last = unique[unique.length - 1];
        if (last && last.time < biddingEndTime) {
          extended = [...unique, { ...last, time: biddingEndTime }];
        }
      }
      return extended.map(d => {
        const total = d.long + d.short;
        return {
          time: d.time,
          longPercent: total === 0 ? 50 : (d.long / total) * 100,
          shortPercent: total === 0 ? 50 : (d.short / total) * 100,
          total
        };
      });
    }

    return [{ time: clampedCurrentTime, longPercent: 50, shortPercent: 50, total: 0 }];
  }, [data, clampedCurrentTime, biddingEndTime, effectiveCurrentTime]);

 
  const last = chartData[chartData.length - 1];

  // Legend
  const renderLegend = () => (
    <Flex justify="space-between" align="center" mb={2}>
      <HStack spacing={6} ml={12}>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="#00E1D6" />
          <Text color="#00E1D6" fontWeight="bold">Long {last.longPercent.toFixed(1)}%</Text>
        </HStack>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="#FF6B81" />
          <Text color="#FF6B81" fontWeight="bold">Short {last.shortPercent.toFixed(1)}%</Text>
        </HStack>
      </HStack>
      <VStack spacing={2.5}>
        <HStack mr={10}>
          <Text color="#00E1D6" fontWeight="bold" fontSize="lg">Long: {(last.total * last.longPercent / 100 / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 })} </Text>
          <Text color="white" fontWeight="bold" fontSize="lg">APT</Text>
        </HStack>
        <HStack mr={10}>
          <Text color="#FF6B81" fontWeight="bold" fontSize="lg">Short: {(last.total * last.shortPercent / 100 / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 })} </Text>
          <Text color="white" fontWeight="bold" fontSize="lg">APT</Text>
        </HStack>
      </VStack>
    </Flex>
  );

  // Tooltip
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
        </Box>
      );
    }
    return null;
  };




  const getXAxisDomain = () => {
    if (biddingStartTime && biddingEndTime) {
      return [biddingStartTime, biddingEndTime];
    }
    return ['dataMin', 'dataMax'];
  };

  
  const getTimelineTickFormatter = () => {
    return (t: number) => format(new Date(t), 'MMM d HH:mm');
  };


  return (
    <Box bg="#0A0B10" borderRadius="xl" p={2}>
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
              dot={false}
              activeDot={false}
              name="Long"
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="shortPercent"
              stroke="#FF6B81"
              strokeWidth={3}
              dot={false}
              activeDot={false}
              name="Short"
              animationDuration={300}
              animationEasing="ease-out"
            />
            {(() => {
              const lastPoint = chartData[chartData.length - 1];
              return (
                <>
                  <ReferenceDot x={lastPoint.time} y={lastPoint.longPercent} r={5} fill="#00E1D6" stroke="#00E1D6" isFront />
                  <ReferenceDot x={lastPoint.time} y={lastPoint.shortPercent} r={5} fill="#FF6B81" stroke="#FF6B81" isFront />
                </>
              );
            })()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

PositionChart.displayName = 'PositionChart';

export default PositionChart; 