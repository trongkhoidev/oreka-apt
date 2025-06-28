import React, { useEffect, useState, useMemo } from 'react';
import { Box, Skeleton, Text } from '@chakra-ui/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import { PriceService } from '../../services/PriceService';
import { format } from 'date-fns';

interface MarketChartsProps {
  chartSymbol: string;
  strikePrice?: number;
}

const MarketCharts: React.FC<MarketChartsProps> = ({ chartSymbol, strikePrice }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const priceService = PriceService.getInstance();

    const fetchKlines = async () => {
      try {
        // Ensure chartSymbol is in a format the service expects, e.g., 'BTC-USD'
        const formattedSymbol = chartSymbol.replace('/', '-');
        const klines = await priceService.fetchKlines(formattedSymbol);
        if (isMounted) {
          // Assuming klines are [timestamp, price]
          const formattedData = klines.map(kline => ({ time: kline[0], price: kline[1] }));
          setChartData(formattedData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Error fetching klines for ${chartSymbol}:`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (chartSymbol) {
        fetchKlines();
    } else {
        setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [chartSymbol]);

  const formatPriceXAxisTick = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm');
  };
  
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);


  if (isLoading) {
    return <Skeleton height="300px" />;
  }

  if (chartData.length === 0) {
      return <Box height="300px" display="flex" alignItems="center" justifyContent="center"><Text>No chart data available for {chartSymbol}</Text></Box>
  }

  return (
    <Box position="relative">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={formatPriceXAxisTick}
            type="number"
            domain={['dataMin', 'dataMax']}
            padding={{ left: 20, right: 20 }}
          />
          <YAxis domain={yAxisDomain} allowDataOverflow={true} />
          <Tooltip
            labelFormatter={(value) => format(new Date(value), 'HH:mm:ss dd/MM/yyyy')}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
          {strikePrice && (
            <ReferenceLine
              y={strikePrice}
              stroke="red"
              strokeDasharray="3 3"
              label={{ value: `Strike: $${strikePrice.toFixed(2)}`, position: 'right' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MarketCharts; 