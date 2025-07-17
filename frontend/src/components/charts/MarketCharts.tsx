import React from 'react';
import PriceChart from './PriceChart';
import PositionChart from './PositionChart';
import { getTradingPairInfo } from '../../config/tradingPairs';
import { getCoinGeckoId } from '../../utils/symbolToCoinGeckoId';

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
  biddingStartTime,
  biddingEndTime,
  currentTime
}) => {

  if (chartType === 'price') {
    // Derive API symbols from trading pair info
    const pairInfo = getTradingPairInfo(chartSymbol);
    let baseSymbol = '';
    if (pairInfo && pairInfo.pair) {
      baseSymbol = pairInfo.pair.split('/')[0];
    } else if (chartSymbol.includes('/')) {
      baseSymbol = chartSymbol.split('/')[0];
    } else {
      baseSymbol = chartSymbol;
    }
    const coinGeckoId = getCoinGeckoId(baseSymbol);
    if (!pairInfo || !coinGeckoId) {
      return <div style={{height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red'}}>Asset not supported for price chart</div>;
    }
    return <PriceChart 
      binanceSymbol={pairInfo.symbol}
      coinGeckoId={coinGeckoId}
      strikePrice={strikePrice}
      height={height}
    />;
  }
  
  
  return <PositionChart 
    data={data} 
    height={height} 
    biddingStartTime={biddingStartTime}
    biddingEndTime={biddingEndTime}
    currentTime={currentTime}
  />;
};

export default MarketCharts; 