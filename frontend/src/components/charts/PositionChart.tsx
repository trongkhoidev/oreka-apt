import React, { useMemo, useState } from 'react';
import { Box, Text, HStack, Button, Flex } from '@chakra-ui/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface PositionPoint {
  time: number;
  long: number;
  short: number;
}

interface PositionChartProps {
  data?: PositionPoint[];
  height?: number;
}

const INTERVALS = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'ALL' },
];

type IntervalValue = '24h' | '7d' | '30d' | 'all';

function filterByInterval(data: any[], interval: IntervalValue): any[] {
  if (!data.length) return data;
  if (interval === 'all') return data;
  const now = Date.now();
  let ms = 0;
  if (interval === '24h') ms = 24 * 60 * 60 * 1000;
  if (interval === '7d') ms = 7 * 24 * 60 * 60 * 1000;
  if (interval === '30d') ms = 30 * 24 * 60 * 60 * 1000;
  return data.filter(d => d.time >= now - ms);
}

const PositionChart: React.FC<PositionChartProps> = ({ data, height = 400 }) => {
  const [interval, setInterval] = useState<IntervalValue>('all');

  // Normalize data: always provide longPercent/shortPercent
  const chartData = useMemo(() => {
    if (!data || !data.length) {
      return [{ time: Date.now(), longPercent: 50, shortPercent: 50 }];
    }
    return data.map(d => {
      const total = d.long + d.short;
      if (total > 0) {
        return {
          time: d.time,
          longPercent: (d.long / total) * 100,
          shortPercent: (d.short / total) * 100,
        };
      } else {
        return {
          time: d.time,
          longPercent: 50,
          shortPercent: 50,
        };
      }
    });
  }, [data]);

  // Filter by interval
  const filteredData = useMemo(() => filterByInterval(chartData, interval), [chartData, interval]);
  const last = filteredData.length ? filteredData[filteredData.length - 1] : chartData[chartData.length - 1];

  // Custom legend
  const renderLegend = () => (
    <Flex justify="flex-start" align="center" gap={6} mt={2} mb={2}>
      <HStack>
        <Box w={3} h={3} borderRadius="full" bg="#00E1D6" />
        <Text color="#00E1D6" fontWeight="bold">Long {last.longPercent.toFixed(1)}%</Text>
      </HStack>
      <HStack>
        <Box w={3} h={3} borderRadius="full" bg="#FF6B81" />
        <Text color="#FF6B81" fontWeight="bold">Short {last.shortPercent.toFixed(1)}%</Text>
      </HStack>
    </Flex>
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box bg="#23262f" borderRadius="md" p={3} border="1px solid #444">
          <Text fontSize="sm" color="#A0AEC0">{format(new Date(label), 'MMM d, yyyy HH:mm')}</Text>
          <Text color="#00E1D6">Long: {payload[0].value.toFixed(2)}%</Text>
          <Text color="#FF6B81">Short: {payload[1].value.toFixed(2)}%</Text>
        </Box>
      );
    }
    return null;
  };

  // Custom dot for last point
  const CustomDot = (color: string) => (props: { cx?: number; cy?: number; index?: number; data?: any[] }) => {
    const { cx, cy, index = 0, data = [] } = props;
    if (index === data.length - 1) {
      return (
        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#0A0B10" strokeWidth={2} />
      );
    }
    // Render a transparent dot for other points
    return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
  };

  return (
    <Box bg="#0A0B10" borderRadius="xl" p={6}>
      <Flex align="center" mb={2}>
        {renderLegend()}
        <Box flex={1} />
        <HStack spacing={2} bg="transparent" borderRadius="md" p={0}>
          {INTERVALS.map(i => (
            <Button
              key={i.value}
              size="md"
              fontSize="md"
              fontWeight={interval === i.value ? 'bold' : 'normal'}
              variant="ghost"
              borderWidth={2}
              borderColor={interval === i.value ? '#fff' : '#23262f'}
              bg="transparent"
              color={interval === i.value ? '#fff' : '#7B8CA6'}
              boxShadow={interval === i.value ? '0 0 8px #fff5' : undefined}
              px={4}
              py={2}
              borderRadius="lg"
              _hover={{ borderColor: '#fff', color: '#fff', bg: 'transparent' }}
              _active={{ borderColor: '#fff', color: '#fff', bg: 'transparent' }}
              transition="all 0.15s"
              onClick={() => setInterval(i.value as IntervalValue)}
            >
              {i.label}
            </Button>
          ))}
        </HStack>
      </Flex>
      <Box width="100%" height={height}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23262f" />
            <XAxis
              dataKey="time"
              tickFormatter={t => format(new Date(t), 'MMM d')}
              type="number"
              domain={['dataMin', 'dataMax']}
              padding={{ left: 20, right: 20 }}
              stroke="#A0AEC0"
              fontSize={13}
            />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v.toFixed(0)}%`} stroke="#A0AEC0" fontSize={13} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="longPercent" stroke="#00E1D6" strokeWidth={3} dot={CustomDot('#00E1D6')} name="Long" />
            <Line type="monotone" dataKey="shortPercent" stroke="#FF6B81" strokeWidth={3} dot={CustomDot('#FF6B81')} name="Short" />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PositionChart; 