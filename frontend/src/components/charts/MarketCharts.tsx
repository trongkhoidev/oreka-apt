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
  marketAddress?: string; // Add market address for realtime updates
  biddingStartTime?: number;
  biddingEndTime?: number;
  currentTime?: number;
}

const MarketCharts: React.FC<MarketChartsProps> = ({ 
  chartSymbol, 
  strikePrice, 
  chartType, 
  data, 
  height = 400, 
  marketAddress,
  biddingStartTime,
  biddingEndTime,
  currentTime
}) => {
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
  // NOTE: The 'data' prop for PositionChart should be fetched using buildPositionHistoryFromEvents (GraphQL-backed) for accuracy and performance.
  return <PositionChart 
    data={data} 
    height={height} 
    marketAddress={marketAddress}
    biddingStartTime={biddingStartTime}
    biddingEndTime={biddingEndTime}
    currentTime={currentTime}
  />;
};

export default MarketCharts; 