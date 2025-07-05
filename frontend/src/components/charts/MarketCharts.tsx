import React from 'react';
import PriceChart from './PriceChart';
import PositionChart from './PositionChart';
import { getTradingPairInfo } from '../../config/tradingPairs';

interface PositionPoint {
  time: number;
  long: number;
  short: number;
}

interface MarketChartsProps {
  chartSymbol: string; // e.g. BNB/USD
  strikePrice?: number;
  chartType: 'price' | 'position';
  data?: PositionPoint[];
  height?: number;
}

const MarketCharts: React.FC<MarketChartsProps> = ({ chartSymbol, strikePrice, chartType, data, height = 400 }) => {
  if (chartType === 'price') {
    // Derive API symbols from trading pair info
    const pairInfo = getTradingPairInfo(chartSymbol.replace('/', '-'));
    // Binance: pairInfo?.symbol (e.g. BNBUSDT)
    // CoinGecko: base asset id (e.g. binancecoin)
    // Fallback: chartSymbol
    return <PriceChart 
      binanceSymbol={pairInfo?.symbol || ''}
      coinGeckoId={pairInfo ? pairInfo.pair.split('/')[0] : chartSymbol.split('/')[0]}
      strikePrice={strikePrice}
      height={height}
    />;
  }
  return <PositionChart data={data} height={height} />;
};

export default MarketCharts; 