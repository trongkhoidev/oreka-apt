import React from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box } from '@chakra-ui/react';
import MarketCharts from '../charts/MarketCharts';

// Define PositionPoint locally if not imported
export type PositionPoint = {
  time: number;
  long: number;
  short: number;
};

// NOTE: positionHistory should be fetched using buildPositionHistoryFromEvents (GraphQL-backed) for accuracy and performance.

export interface Market {
  pair_name: string;
  [key: string]: unknown;
}

export interface MarketChartsTabsProps {
  strike: string;
  positionHistory: PositionPoint[];
  chartSymbol: string;
}

const MarketChartsTabs = ({ strike, positionHistory, chartSymbol }: MarketChartsTabsProps) => (
  <Tabs variant="line" colorScheme="yellow" border="1px solid" borderColor="gray.700" borderRadius="xl" pb={2}>
    <Box pb={1}>
      <TabList borderBottom="2px solid" borderColor="gray.600" px={6} py={3} display="grid" gridTemplateColumns="1fr 1fr" alignItems="center">
        <Tab fontWeight="bold" fontSize="sm">Position Chart</Tab>
        <Tab fontWeight="bold" fontSize="sm">Price Chart</Tab>
      </TabList>
    </Box>
    <TabPanels>
      <TabPanel p={0} pt={4}>
        <Box position="relative" width="100%">
          <MarketCharts chartSymbol={chartSymbol} strikePrice={Number(strike)} chartType="position" data={positionHistory} />
        </Box>
      </TabPanel>
      <TabPanel p={0} pt={4}>
        <Box position="relative" width="100%">
          <MarketCharts chartSymbol={chartSymbol} strikePrice={Number(strike)} chartType="price" />
        </Box>
      </TabPanel>
    </TabPanels>
  </Tabs>
);

export default MarketChartsTabs; 