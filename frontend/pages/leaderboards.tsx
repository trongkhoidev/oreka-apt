import { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Spinner, 
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip
} from '@chakra-ui/react';

interface LeaderboardEntry {
  rank_by_winning: number;
  rank_by_amount?: number;
  user_addr: string;
  winning: { raw: string; human: string };
  amount: { raw: string; human: string };
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
}

export default function LeaderboardsPage() {
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [alltimeData, setAlltimeData] = useState<LeaderboardData | null>(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [isLoadingAlltime, setIsLoadingAlltime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Month selector (YYYY-MM format, UTC+7)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const utc7 = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    return utc7.toISOString().slice(0, 7); // YYYY-MM
  });

  const shorten = (addr: string, head = 6, tail = 4) => {
    if (!addr) return '';
    return addr.length > head + tail ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : addr;
  };

  const formatHuman = (v: string | number | null | undefined) => {
    if (v == null) return '0';
    const s = typeof v === 'number' ? String(v) : v;
    const [int, frac = ''] = s.split('.');
    const intFmt = Number(int).toLocaleString();
    const fracTrim = frac.replace(/0+$/, '');
    return fracTrim ? `${intFmt}.${fracTrim.slice(0, 6)}` : intFmt;
  };

  const fetchMonthlyLeaderboard = async (month: string) => {
    try {
      setIsLoadingMonthly(true);
      setError(null);
      console.log('Fetching monthly leaderboard for:', month);
      
      // Fetch real data from API
      const response = await fetch(`http://localhost:4000/leaderboards/monthly/users?ym=${month}&limit=100`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setMonthlyData(data);
    } catch (err) {
      console.error('Error fetching monthly leaderboard:', err);
      setError('Failed to load monthly leaderboard');
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  const fetchAlltimeLeaderboard = async () => {
    try {
      setIsLoadingAlltime(true);
      setError(null);
      console.log('Fetching all-time leaderboard');
      
      // Fetch real data from API
      const response = await fetch(`http://localhost:4000/leaderboards/all-time/users?limit=1000`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setAlltimeData(data);
    } catch (err) {
      console.error('Error fetching all-time leaderboard:', err);
      setError('Failed to load all-time leaderboard');
    } finally {
      setIsLoadingAlltime(false);
    }
  };

  useEffect(() => {
    fetchMonthlyLeaderboard(selectedMonth);
    fetchAlltimeLeaderboard();
  }, [selectedMonth]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge colorScheme="yellow" variant="solid">🥇</Badge>;
    if (rank === 2) return <Badge colorScheme="gray" variant="solid">🥈</Badge>;
    if (rank === 3) return <Badge colorScheme="orange" variant="solid">🥉</Badge>;
    return <Badge colorScheme="blue" variant="subtle">#{rank}</Badge>;
  };

  return (
    <Box maxW="7xl" mx="auto" p={6}>
      {/* Header */}
      <Box bg="dark.700" rounded="xl" p={6} mb={6} border="1px" borderColor="dark.600">
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="2xl" fontWeight="bold" color="white">🏆 Leaderboards</Text>
            <Text fontSize="sm" color="gray.400">Top performers in OREKA</Text>
          </HStack>
          
          {/* Month Selector */}
          <HStack spacing={4}>
            <Text fontSize="sm" color="gray.400">Month (UTC+7):</Text>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              size="sm"
              w="200px"
              bg="dark.600"
              borderColor="dark.500"
              color="white"
              _focus={{ borderColor: "blue.500" }}
            />
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              onClick={() => fetchMonthlyLeaderboard(selectedMonth)}
              isLoading={isLoadingMonthly}
            >
              Refresh
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Error Display */}
      {error && (
        <Box bg="red.900" border="1px" borderColor="red.600" rounded="lg" p={4} mb={6}>
          <Text color="red.200">{error}</Text>
        </Box>
      )}

      {/* Tabs */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab color="white" _selected={{ color: "blue.400", borderColor: "blue.500" }}>
            📅 Monthly Users
          </Tab>
          <Tab color="white" _selected={{ color: "blue.400", borderColor: "blue.500" }}>
            🏆 All-time Users
          </Tab>
        </TabList>

        <TabPanels>
          {/* Monthly Users Tab */}
          <TabPanel p={0} pt={6}>
            <Box bg="dark.700" rounded="xl" border="1px" borderColor="dark.600">
              <Box p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack>
                    <Text fontSize="lg" fontWeight="semibold" color="white">
                      Monthly Users Leaderboard
                    </Text>
                    <Badge colorScheme="blue" variant="subtle">
                      {selectedMonth}
                    </Badge>
                  </HStack>
                  
                  <Text fontSize="sm" color="gray.400">
                    Ranked by total winnings in {selectedMonth}. Shows top performers for the month.
                  </Text>

                  {isLoadingMonthly ? (
                    <Center py={12}>
                      <VStack spacing={4}>
                        <Spinner size="xl" color="blue.500" />
                        <Text color="gray.400">Loading monthly leaderboard...</Text>
                      </VStack>
                    </Center>
                  ) : (
                    <Table variant="simple" colorScheme="dark">
                      <Thead>
                        <Tr>
                          <Th color="gray.400">Rank</Th>
                          <Th color="gray.400">User Address</Th>
                          <Th color="gray.400">Total Winning</Th>
                          <Th color="gray.400">Total Amount</Th>
                          <Th color="gray.400">Rank by Amount</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {monthlyData?.entries.map((entry) => (
                          <Tr key={entry.user_addr} _hover={{ bg: "dark.600" }}>
                            <Td>
                              <HStack>
                                {getRankBadge(entry.rank_by_winning)}
                              </HStack>
                            </Td>
                            <Td>
                              <Button
                                as="a"
                                href={`/profiles/${entry.user_addr}`}
                                variant="link"
                                color="blue.400"
                                _hover={{ color: "blue.300" }}
                                fontFamily="mono"
                                fontSize="sm"
                              >
                                {shorten(entry.user_addr, 8, 6)}
                              </Button>
                            </Td>
                            <Td>
                              <Tooltip label={`Raw: ${entry.winning.raw}`} placement="top">
                                <Text color="green.400" fontWeight="semibold" cursor="help">
                                  {formatHuman(entry.winning.human)} APT
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Tooltip label={`Raw: ${entry.amount.raw}`} placement="top">
                                <Text color="white" fontWeight="semibold" cursor="help">
                                  {formatHuman(entry.amount.human)} APT
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Badge colorScheme="purple" variant="subtle">
                                #{entry.rank_by_amount || 'N/A'}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </VStack>
              </Box>
            </Box>
          </TabPanel>

          {/* All-time Users Tab */}
          <TabPanel p={0} pt={6}>
            <Box bg="dark.700" rounded="xl" border="1px" borderColor="dark.600">
              <Box p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack>
                    <Text fontSize="lg" fontWeight="semibold" color="white">
                      All-time Users Leaderboard
                    </Text>
                    <Badge colorScheme="purple" variant="subtle">
                      Lifetime
                    </Badge>
                  </HStack>
                  
                  <Text fontSize="sm" color="gray.400">
                    Ranked by total winnings from the beginning. Shows the true champions of OREKA.
                  </Text>

                  {isLoadingAlltime ? (
                    <Center py={12}>
                      <VStack spacing={4}>
                        <Spinner size="xl" color="blue.500" />
                        <Text color="gray.400">Loading all-time leaderboard...</Text>
                      </VStack>
                    </Center>
                  ) : (
                    <Table variant="simple" colorScheme="dark">
                      <Thead>
                        <Tr>
                          <Th color="gray.400">Rank</Th>
                          <Th color="gray.400">User Address</Th>
                          <Th color="gray.400">Total Winning</Th>
                          <Th color="gray.400">Total Amount</Th>
                          <Th color="gray.400">Rank by Amount</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {alltimeData?.entries.map((entry) => (
                          <Tr key={entry.user_addr} _hover={{ bg: "dark.600" }}>
                            <Td>
                              <HStack>
                                {getRankBadge(entry.rank_by_winning)}
                              </HStack>
                            </Td>
                            <Td>
                              <Button
                                as="a"
                                href={`/profiles/${entry.user_addr}`}
                                variant="link"
                                color="blue.400"
                                _hover={{ color: "blue.300" }}
                                fontFamily="mono"
                                fontSize="sm"
                              >
                                {shorten(entry.user_addr, 8, 6)}
                              </Button>
                            </Td>
                            <Td>
                              <Tooltip label={`Raw: ${entry.winning.raw}`} placement="top">
                                <Text color="green.400" fontWeight="semibold" cursor="help">
                                  {formatHuman(entry.winning.human)} APT
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Tooltip label={`Raw: ${entry.amount.raw}`} placement="top">
                                <Text color="white" fontWeight="semibold" cursor="help">
                                  {formatHuman(entry.amount.human)} APT
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Badge colorScheme="purple" variant="subtle">
                                #{entry.rank_by_amount || 'N/A'}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </VStack>
              </Box>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
