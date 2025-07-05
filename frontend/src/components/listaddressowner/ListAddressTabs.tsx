import React from 'react';
import { Box, Tabs, TabList, Tab, Select } from '@chakra-ui/react';

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
    <Box px={{ base: 4, md: 10 }} pt={2} pb={4} w="full">
      <Tabs variant="soft-rounded" colorScheme="brand">
        <TabList display="flex" alignItems="center">
          {tabList.map(tab => (
            <Tab key={tab.value} onClick={() => setFilter(tab.value)} _selected={{ bg: 'brand.500', color: 'white' }}>{tab.label}</Tab>
          ))}
          <Box ml={2} minW="150px">
            <Select
              placeholder="Pair"
              value={pairFilter}
              onChange={e => { setPairFilter(e.target.value); setFilter('all'); }}
              variant="unstyled"
              borderRadius="xl"
              bg="transparent"
              color="white"
              fontWeight="bold"
              fontSize="md"
              pl={3}
              py={2}
              _focus={{ boxShadow: 'none', bg: 'brand.500', color: 'white' }}
              _hover={{ bg: 'brand.600', color: 'white' }}
              style={{ minWidth: 120, border: 'none', outline: 'none', marginLeft: 0 }}
            >
              {uniquePairs.map(pair => (
                <option key={pair} value={pair} style={{ color: '#222', background: '#fff' }}>{pair}</option>
              ))}
            </Select>
          </Box>
        </TabList>
      </Tabs>
    </Box>
  );
};

export default ListAddressTabs; 