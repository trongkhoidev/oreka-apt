import React, { useEffect, useState } from 'react';
import { Box, Skeleton, Text, HStack, Button, Flex } from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartArea,
  TooltipItem,
  ScriptableContext,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { fetchCoinGeckoHistory, CoinGeckoCandle } from '../../services/coinGeckoService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, TimeScale);

const INTERVALS = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '1m', label: '1M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

type IntervalValue = '1h' | '6h' | '24h' | '7d' | '1m' | '6m' | '1y';

interface PriceChartProps {
  binanceSymbol: string;
  coinGeckoId: string;
  strikePrice?: number;
  bg?: string;
  height?: number;
}

type CoinGeckoInterval = '1h' | '24h' | '7d' | '14d' | '30d' | '90d' | '180d' | '365d' | 'max' | '1';

const INTERVAL_MAP: Record<IntervalValue, { cg: CoinGeckoInterval; binance: string; limit: number }> = {
  '1h':   { cg: '1h',   binance: '1m',  limit: 400 },
  '6h':   { cg: '24h',  binance: '5m',  limit: 200 },
  '24h':  { cg: '1',    binance: '1h',  limit: 200 },
  '7d':   { cg: '7d',   binance: '4h',  limit: 200 },
  '1m':   { cg: '30d',  binance: '1d',  limit: 200 },
  '6m':   { cg: '180d', binance: '1d',  limit: 200 },
  '1y':   { cg: '365d', binance: '1w',  limit: 200 },
};

async function fetchBinanceKlines(symbol: string, interval: string, limit: number = 100): Promise<CoinGeckoCandle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: [number, string, string, string, string, string, ...string[]][] = await res.json();
    return data.map((candle) => ({ time: candle[0], close: parseFloat(candle[4]) }));
  } catch {
    return [];
  }
}

function getTimeUnit(min: number, max: number) {
  const diff = max - min;
  if (diff < 2 * 24 * 60 * 60 * 1000) return 'hour';
  if (diff < 60 * 24 * 60 * 60 * 1000) return 'day';
  return 'month';
}

const PriceChart: React.FC<PriceChartProps> = ({ binanceSymbol, coinGeckoId, bg = '#181A20', height = 400 }) => {
  const [interval, setInterval] = useState<IntervalValue>('24h');
  const [chartData, setChartData] = useState<CoinGeckoCandle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    const { cg, binance, limit } = INTERVAL_MAP[interval];
    fetchCoinGeckoHistory(coinGeckoId, cg as any)
      .then(data => {
        if (isMounted && data.length > 0) {
          setChartData(data);
        } else {
          fetchBinanceKlines(binanceSymbol, binance, limit).then(binanceData => {
            if (isMounted) setChartData(binanceData);
          });
        }
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [coinGeckoId, binanceSymbol, interval]);

  const last = chartData.length ? chartData[chartData.length - 1].close : 0;
  const first = chartData.length ? chartData[0].close : 0;
  const change = last && first ? last - first : 0;
  const percent = last && first ? (change / first) * 100 : 0;

  const minTime = chartData.length ? chartData[0].time : Date.now();
  const maxTime = chartData.length ? chartData[chartData.length - 1].time : Date.now();
  const timeUnit = getTimeUnit(minTime, maxTime) as 'hour' | 'day' | 'month';

  const chartJsData = {
    labels: chartData.map(d => d.time),
    datasets: [
      {
        label: 'Price',
        data: chartData.map(d => d.close),
        borderColor: '#3ABEFF',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const chart = ctx.chart;
          const chartArea: ChartArea | undefined = chart.chartArea;
          if (!chartArea) return 'rgba(58,190,255,0.08)';
          const c = chart.ctx as CanvasRenderingContext2D;
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(58,190,255,0.18)');
          gradient.addColorStop(1, 'rgba(58,190,255,0.01)');
          return gradient;
        },
        tension: 0.3,
      },
    ],
  };

  const chartJsOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#23262f',
        titleColor: '#FEDF56',
        bodyColor: '#fff',
        borderColor: '#3ABEFF',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => ` $${ctx.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        },
      },
      title: {
        display: false,
      },
    },
    layout: {
      padding: { left: 0, right: 0, top: 10, bottom: 0 },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeUnit,
          tooltipFormat: timeUnit === 'hour' ? 'MMM d, HH:mm' : (timeUnit === 'day' ? 'MMM d' : 'MMM yyyy'),
          displayFormats: {
            hour: 'MMM d, ha',
            day: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        grid: { color: '#23262f' },
        ticks: {
          color: '#A0AEC0',
          font: { size: 13 },
          autoSkip: true,
          maxTicksLimit: 6,
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        ticks: { color: '#A0AEC0', font: { size: 13 } },
        grid: { color: '#23262f' },
        border: { display: false },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
        borderJoinStyle: 'round' as CanvasLineJoin,
        borderCapStyle: 'round' as CanvasLineCap,
      },
      point: { radius: 0, hitRadius: 8, hoverRadius: 5 },
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    maintainAspectRatio: false,
  };

  if (isLoading) return <Skeleton height={`${height}px`} />;
  if (!chartData.length) return <Box height={`${height}px`} display="flex" alignItems="center" justifyContent="center"><Text color="red.400">No chart data available</Text></Box>;

  return (
    <Box bg="#0A0B10" borderRadius="xl" p={2}>
      <Flex justify="flex-start" align="center" >
        <Box>
          <Text fontWeight="bold" fontSize="3xl" color="white">${last?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</Text>
          <Text fontSize="lg" color={change >= 0 ? '#00D7B5' : '#FF6384'}>
            {isNaN(change) ? 'NaN' : (change >= 0 ? '+' : '') + change.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD ({isNaN(percent) ? '' : (percent >= 0 ? '+' : '') + percent.toFixed(2) + '%' })
          </Text>
        </Box>
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
        <Line data={chartJsData} options={chartJsOptions} style={{ borderRadius: 16 }} />
      </Box>
    </Box>
  );
};

export default PriceChart; 