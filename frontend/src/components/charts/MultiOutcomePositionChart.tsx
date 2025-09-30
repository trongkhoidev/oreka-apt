/* eslint-disable react/display-name */
import React from 'react';
import { Box, Text, HStack, Flex } from '@chakra-ui/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { format } from 'date-fns';

interface MultiOutcomePositionPoint {
  time: number;
  outcomeAmounts: number[];
}

interface MultiOutcomePositionChartProps {
  data?: MultiOutcomePositionPoint[];
  height?: number;
  biddingStartTime?: number;
  biddingEndTime?: number;
  currentTime?: number;
  priceRanges: Array<{
    min_price: number | string;
    max_price: number | string;
    outcome_name: string;
  }>;
  outcomeAmounts?: number[];
}

// Generate meaningful outcome labels from price ranges
function generateOutcomeLabel(priceRange: { min_price: number | string; max_price: number | string; outcome_name: string }): string {
  const min = typeof priceRange.min_price === 'string' ? Number(priceRange.min_price) : priceRange.min_price;
  const max = typeof priceRange.max_price === 'string' ? Number(priceRange.max_price) : priceRange.max_price;
  if (isNaN(min) || isNaN(max)) return 'Invalid Price';

  // Always convert from octas to USD (divide by 1e8)
  const minPrice = min / 1e8;
  const maxPrice = max / 1e8;

  const U64_MAX = 18446744073709551615;
  const U64_MAX_APT = U64_MAX / 1e8;
  const U64_MAX_STR = '18446744073709551615';

  const fmt = (value: number) => value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: 4
  });

  const isMaxU64 = max.toString() === U64_MAX_STR || maxPrice >= U64_MAX_APT;
  if (minPrice === 0 && isMaxU64) return 'Any Price';
  if (minPrice === 0) return `<$${fmt(maxPrice)}`;
  if (isMaxU64) return `≥$${fmt(minPrice)}`;
  return `≥$${fmt(minPrice)} to <$${fmt(maxPrice)}`;
}

// Generate colors for different outcomes
const getOutcomeColor = (index: number): string => {
  const colors = [
    '#00E1D6', // Teal
    '#FF6B81', // Pink
    '#4F8CFF', // Blue
    '#FEDF56', // Yellow
    '#A770EF', // Purple
    '#FF8A65', // Orange
    '#81C784', // Green
    '#F06292', // Light Pink
    '#64B5F6', // Light Blue
    '#FFB74D', // Light Orange
  ];
  return colors[index % colors.length];
};

const MultiOutcomePositionChart = (props: MultiOutcomePositionChartProps) => {
  const { data, height = 400, biddingStartTime, biddingEndTime, currentTime: propCurrentTime, priceRanges, outcomeAmounts = [] } = props;

  const [realtime, setRealtime] = React.useState(Date.now());
  // Keep the last non-empty outcome amounts to avoid flicker/zeroing between fetches
  const lastNonEmptyOutcomeAmountsRef = React.useRef<number[] | null>(null);
  React.useEffect(() => {
    const hasNonZero = Array.isArray(outcomeAmounts) && outcomeAmounts.some(a => Number(a) > 0);
    if (hasNonZero) {
      lastNonEmptyOutcomeAmountsRef.current = outcomeAmounts.map(a => Number(a) || 0);
    }
  }, [outcomeAmounts]);
  const [hoveredOutcome, setHoveredOutcome] = React.useState<number | null>(null);
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
     
      let extended = unique;

      // Always add/update current point for real-time updates
      const lastPoint = extended[extended.length - 1];
      // Coerce incoming amounts to numbers (they may be strings)
      const provided = Array.isArray(outcomeAmounts) ? outcomeAmounts : [];
      const hasProvidedNonZero = provided.some((a: unknown) => Number(a) > 0);
      const source = hasProvidedNonZero
        ? provided
        : (lastNonEmptyOutcomeAmountsRef.current || lastPoint?.outcomeAmounts || []);
      const coercedCurrentAmounts = (source as unknown[]).map((a: unknown) => typeof a === 'string' ? Number(a) : Number(a || 0));

      if (!lastPoint || lastPoint.time < clampedCurrentTime) {
        extended = [...extended, {
          time: clampedCurrentTime,
          outcomeAmounts: coercedCurrentAmounts
        }];
      } else {
        extended[extended.length - 1] = {
          time: clampedCurrentTime,
          outcomeAmounts: coercedCurrentAmounts
        };
      }
      // Do not append artificial end points; let ReferenceLine show the boundary
      
      const result = extended.map(d => {
        const numericAmounts = d.outcomeAmounts.map((a: unknown) => typeof a === 'string' ? Number(a) : Number(a || 0));
        const total = numericAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
        const outcomePercentages = numericAmounts.map((amount: number) =>
          total === 0 ? 0 : (amount / total) * 100
        );
        
        return {
          time: d.time,
          total,
          ...outcomePercentages.reduce((acc, percentage, index) => {
            acc[`outcome${index}Percent`] = percentage;
            return acc;
          }, {} as Record<string, number>)
        };
      });

      return result;
    }
    
    // If no historical data but we have current outcome amounts, create a single current-time point
    if (outcomeAmounts && outcomeAmounts.length > 0) {
      const numericAmounts = outcomeAmounts.map((a: unknown) => typeof a === 'string' ? Number(a) : Number(a || 0));
      const total = numericAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
      const outcomePercentages = numericAmounts.map((amount: number) => total === 0 ? 0 : (amount / total) * 100);
      return [{
        time: clampedCurrentTime,
        total,
        ...outcomePercentages.reduce((acc, percentage, index) => {
          acc[`outcome${index}Percent`] = percentage;
          return acc;
        }, {} as Record<string, number>)
      }];
    }
    
    // If we have priceRanges but no outcomeAmounts, create default data
    if (priceRanges && priceRanges.length > 0) {
      const defaultAmounts = priceRanges.map(() => 0);
      const total = defaultAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
      const defaultPercentages = defaultAmounts.map(amount => 
        total === 0 ? 0 : (amount / total) * 100
      );
      
      const result = [{
        time: clampedCurrentTime,
        total,
        ...defaultPercentages.reduce((acc, percentage, index) => {
          acc[`outcome${index}Percent`] = percentage;
          return acc;
        }, {} as Record<string, number>)
      }];

      return result;
    }

    // Default data with zero amounts
    const defaultPercentages = priceRanges.map(() => 0);
    const result = [{
      time: clampedCurrentTime,
      total: 0,
      ...defaultPercentages.reduce((acc, percentage, index) => {
        acc[`outcome${index}Percent`] = percentage;
        return acc;
      }, {} as Record<string, number>)
    }];

    return result;
  }, [data, clampedCurrentTime, effectiveCurrentTime, biddingEndTime, priceRanges, outcomeAmounts]);

  const last = chartData[chartData.length - 1];

  // Legend
  const renderLegend = () => (
    <Flex justify="space-between" align="center" mb={2}>
      <HStack spacing={4} ml={4} flexWrap="wrap">
        {priceRanges.map((priceRange, index) => {
          const color = getOutcomeColor(index);
          const percentage = last[`outcome${index}Percent` as keyof typeof last] as number || 0;
          const outcomeAmount = last.total > 0 ? (last.total * percentage / 100) : 0;
          const isHovered = hoveredOutcome === index;
          const isHidden = hoveredOutcome !== null && hoveredOutcome !== index;
          
          return (
            <HStack 
              key={index} 
              spacing={2}
              cursor="pointer"
              opacity={isHidden ? 0.3 : 1}
              transform={isHovered ? "scale(1.05)" : "scale(1)"}
              transition="all 0.2s ease"
              onMouseEnter={() => setHoveredOutcome(index)}
              onMouseLeave={() => setHoveredOutcome(null)}
            >
              <Box 
                w={3} 
                h={3} 
                borderRadius="full" 
                bg={color}
                boxShadow={isHovered ? `0 0 8px ${color}` : "none"}
                transition="all 0.2s ease"
              />
              <Text 
                color={isHovered ? "white" : color} 
                fontWeight="bold" 
                fontSize="sm"
                transition="all 0.2s ease"
              >
                {generateOutcomeLabel(priceRange)}: {percentage.toFixed(1)}%
              </Text>
            </HStack>
          );
        })}
      </HStack>
      
    </Flex>
  );

  // Tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: number }) => {
    if (active && payload && payload.length) {
      const time = new Date(label || 0);
      // Find the data point for this time
      const dataPoint = chartData.find(d => d.time === label);
      // Use last data point if current dataPoint not found or has zero total
      const total = (dataPoint?.total && dataPoint.total > 0) ? dataPoint.total : last.total;
      
      console.log('[CustomTooltip] Debug:', {
        hoveredOutcome,
        payload: payload.map(p => ({ dataKey: p.dataKey, value: p.value })),
        total,
        totalFromDataPoint: dataPoint?.total,
        dataPoint: dataPoint ? { time: dataPoint.time, total: dataPoint.total } : null,
        chartDataLength: chartData.length,
        lastChartData: chartData[chartData.length - 1],
        outcomeAmounts
      });
      
      // If hovering over a specific outcome (from legend), only show that outcome
      if (hoveredOutcome !== null) {
        const hoveredEntry = payload.find(entry => {
          const outcomeIndex = parseInt(entry.dataKey.replace('outcome', '').replace('Percent', ''));
          return outcomeIndex === hoveredOutcome;
        });
        
        if (hoveredEntry) {
          const outcomeIndex = hoveredOutcome;
          const color = getOutcomeColor(outcomeIndex);
          
          return (
            <Box bg="#23262f" borderRadius="md" p={3} border="1px solid #444" boxShadow="lg">
              <Text fontSize="sm" color="#A0AEC0" mb={2}>
                {format(time, 'MMM d, HH:mm')}
              </Text>
              <Text color={color} fontWeight="bold">
                {generateOutcomeLabel(priceRanges[outcomeIndex])}: {hoveredEntry.value.toFixed(1)}%
              </Text>
            </Box>
          );
        }
      }
      
      // If no specific outcome is hovered, show all outcomes
      return (
        <Box bg="#23262f" borderRadius="md" p={3} border="1px solid #444" boxShadow="lg">
          <Text fontSize="sm" color="#A0AEC0" mb={2}>
            {format(time, 'MMM d, HH:mm')}
          </Text>
          {payload.map((entry, index) => {
            const outcomeIndex = parseInt(entry.dataKey.replace('outcome', '').replace('Percent', ''));
            const color = getOutcomeColor(outcomeIndex);
            
            return (
              <Text key={index} color={color} fontWeight="bold">
                {generateOutcomeLabel(priceRanges[outcomeIndex])}: {entry.value.toFixed(1)}%
              </Text>
            );
          })}
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
              tickFormatter={v => `${v.toFixed(1)}%`}
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
            {/* Render lines for each outcome */}
            {priceRanges.map((_, index) => {
              const color = getOutcomeColor(index);
              const isHovered = hoveredOutcome === index;
              const isHidden = hoveredOutcome !== null && hoveredOutcome !== index;
              
              console.log(`[MultiOutcomePositionChart] Rendering Line for outcome ${index} with color ${color}`);
              
              return (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={`outcome${index}Percent`}
                  stroke={color}
                  strokeWidth={isHovered ? 5 : 2}
                  strokeOpacity={isHidden ? 0.2 : (isHovered ? 1 : 0.8)}
                  dot={false}
                  activeDot={{ r: 8, stroke: color, strokeWidth: 2, fill: color }}
                  name={`Outcome ${index}`}
                  animationDuration={300}
                  animationEasing="ease-out"
                  onMouseEnter={() => setHoveredOutcome(index)}
                  onMouseLeave={() => setHoveredOutcome(null)}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}40)` : 
                           isHidden ? 'blur(1px)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
            {/* Static dots at current time for each outcome */}
            {(() => {
              const lastPoint = chartData[chartData.length - 1];
              return (
                <>
                  {priceRanges.map((_, index) => {
                    const color = getOutcomeColor(index);
                    const y = (lastPoint[`outcome${index}Percent` as keyof typeof lastPoint] as number) || 0;
                    return (
                      <ReferenceDot
                        key={`refdot-${index}`}
                        x={lastPoint.time}
                        y={y}
                        r={5}
                        fill={color}
                        stroke={color}
                        isFront
                      />
                    );
                  })}
                </>
              );
            })()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

MultiOutcomePositionChart.displayName = 'MultiOutcomePositionChart';

export default MultiOutcomePositionChart;
