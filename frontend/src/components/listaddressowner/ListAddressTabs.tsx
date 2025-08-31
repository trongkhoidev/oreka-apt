import React from 'react';
import { Box, Tabs, TabList, Tab, Select, Flex } from '@chakra-ui/react';

interface TabType {
  label: string;
  value: string;
}

interface ListAddressTabsProps {
  tabList: TabType[];
  filter: string;
  setFilter: (v: string) => void;
  pairFilter: string;
  setPairFilter: (v: string) => void;
  uniquePairs: string[];
}

const ListAddressTabs: React.FC<ListAddressTabsProps> = ({
  tabList, filter, setFilter, pairFilter, setPairFilter, uniquePairs
}) => {
  return (
    <Box px={{ base: 0, md: 1, lg: 1 }} pt={6} pb={8} w="full" bg="rgba(24, 26, 32, 0.98)" borderBottom="1px solid rgba(255,255,255,0.08)" backdropFilter="blur(15px)">
      <Box maxW="100%" mx="auto">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'start', md: 'center' }} gap={4}>
          {/* Tabs and Pair Filter Container */}
          <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'start', md: 'center' }} gap={4} flex={1}>
            {/* Tabs */}
            <Tabs variant="unstyled" size="lg" flex={1}>
              <TabList display="flex" alignItems="center" flexWrap="wrap" gap={2} justifyContent={{ base: 'center', md: 'flex-start' }} position="relative">
                {/* Active Tab Indicator */}
                <Box
                  position="absolute"
                  bottom={-1}
                  left={0}
                  height="2px"
                  bg="#4F8CFF"
                  borderRadius="full"
                  transition="all 0.2s ease-in-out"
                  transform={`translateX(${tabList.findIndex(tab => tab.value === filter) * (90 + 8)}px)`}
                  width="90px"
                  opacity={1}
                />
                
                {tabList.map(tab => (
                  <Tab 
                    key={tab.value} 
                    onClick={() => setFilter(tab.value)} 
                    bg={filter === tab.value ? '#4F8CFF' : 'rgba(255,255,255,0.05)'}
                    color={filter === tab.value ? 'white' : 'rgba(255,255,255,0.8)'}
                    boxShadow={filter === tab.value ? '0 4px 12px rgba(79, 140, 255, 0.3)' : 'none'}
                    transform={filter === tab.value ? 'translateY(-1px)' : 'translateY(0)'}
                    border={filter === tab.value ? '1px solid rgba(79, 140, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)'}
                    fontWeight={filter === tab.value ? 'semibold' : 'medium'}
                    _hover={{
                      bg: filter === tab.value ? '#4F8CFF' : 'rgba(255,255,255,0.08)',
                      color: 'white',
                      transform: filter === tab.value ? 'translateY(-1px)' : 'translateY(-0.5px)',
                      border: filter === tab.value ? '1px solid rgba(79, 140, 255, 0.4)' : '1px solid rgba(255,255,255,0.15)'
                    }}
                    px={5}
                    py={2.5}
                    borderRadius="lg"
                    fontSize="sm"
                    transition="all 0.2s ease-in-out"
                    position="relative"
                    overflow="hidden"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: filter === tab.value ? '100%' : '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                      transition: 'left 0.4s ease'
                    }}
                  >
                    {tab.label}
                  </Tab>
                ))}
              </TabList>
            </Tabs>

            {/* Pair Filter - Moved closer to tabs */}
            <Box minW={{ base: 'full', md: '180px' }} maxW={{ base: 'full', md: '200px' }}>
              <Box position="relative">
                <Select
                  placeholder="Filter by Asset"
                  value={pairFilter}
                  onChange={e => { setPairFilter(e.target.value); setFilter('all'); }}
                  variant="filled"
                  borderRadius="lg"
                  bg="rgba(255,255,255,0.08)"
                  border="1px solid rgba(255,255,255,0.15)"
                  color="white"
                  fontWeight="medium"
                  fontSize="sm"
                  pl={3}
                  py={2.5}
                  _focus={{ 
                    boxShadow: '0 0 0 2px rgba(79, 140, 255, 0.2)', 
                    bg: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(79, 140, 255, 0.4)'
                  }}
                  _hover={{ 
                    bg: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                  _placeholder={{ color: 'rgba(255,255,255,0.6)' }}
                  size="md"
                  transition="all 0.2s ease-in-out"
                  cursor="pointer"
                  _active={{
                    transform: 'scale(0.99)'
                  }}
                >
                  <option value="" style={{ color: '#222', background: '#fff', fontWeight: 'bold' }}>🌐 All Assets</option>
                  {uniquePairs.map(pair => (
                    <option key={pair} value={pair} style={{ color: '#222', background: '#fff' }}>
                      {pair.includes('APT') ? '🪙 ' : 
                       pair.includes('BTC') ? '₿ ' : 
                       pair.includes('ETH') ? 'Ξ ' : 
                       pair.includes('SOL') ? '◎ ' : 
                       pair.includes('SUI') ? '💧 ' : 
                       pair.includes('BNB') ? '🪙 ' : 
                       pair.includes('WETH') ? '🔷 ' : ''}
                      {pair}
                    </option>
                  ))}
                </Select>
                {/* Filter Icon */}
                <Box
                  position="absolute"
                  right={3}
                  top="50%"
                  transform="translateY(-50%)"
                  pointerEvents="none"
                  opacity={0.8}
                >
                  <Box
                    w={1.5}
                    h={1.5}
                    borderRadius="full"
                    bg="#4F8CFF"
                  />
                </Box>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};

export default ListAddressTabs; 