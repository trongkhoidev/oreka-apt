import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Spinner, 
  Center,
  Grid,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';

interface ProfileData {
  user_addr: string;
  totals: {
    bet: { raw: string; human: string };
    winning: { raw: string; human: string };
    owner_fee: { raw: string; human: string };
  };
  counts: {
    played: number;
    created: number;
    won: number;
  };
}

interface ActivityData {
  type: string;
  market_addr: string;
  amount: string;
  amount_raw: string;
  side: number;
  created_at: string;
  status: string;
  time: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { addr } = router.query;
  const address = addr as string;
  
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching profile for:', address);
        const resp = await fetch(`/api/profile/${address.toLowerCase()}`); // update
        const raw = await resp.json();
        console.log('Profile data:', raw);

        // Normalize to guard against partial/error payloads
        const normalized: ProfileData = {
          user_addr: raw?.user_addr || address,
          totals: {
            bet: {
              raw: String(raw?.totals?.bet?.raw ?? '0'),
              human: String(raw?.totals?.bet?.human ?? '0'),
            },
            winning: {
              raw: String(raw?.totals?.winning?.raw ?? '0'),
              human: String(raw?.totals?.winning?.human ?? '0'),
            },
            owner_fee: {
              raw: String(raw?.totals?.owner_fee?.raw ?? '0'),
              human: String(raw?.totals?.owner_fee?.human ?? '0'),
            },
          },
          counts: {
            played: Number(raw?.counts?.played ?? 0),
            created: Number(raw?.counts?.created ?? 0),
            won: Number(raw?.counts?.won ?? 0),
          },
        };

        if (raw?.error && !resp.ok) {
          throw new Error(raw.error);
        }

        setData(normalized);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchActivity = async () => {
      try {
        setIsLoadingActivity(true);
        console.log('Fetching activity for:', address);
        const response = await fetch(`http://localhost:4000/profiles/${address}/activity?limit=10`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const activityResponse = await response.json();
        console.log('Activity data:', activityResponse);
        setActivityData(activityResponse.activities || []);
      } catch (err) {
        console.error('Error fetching activity:', err);
        setActivityData([]); // Fallback to empty array
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchProfile();
    fetchActivity();
  }, [address]);

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

  if (error) {
    return (
      <Center minH="50vh">
        <VStack spacing={4}>
          <Text fontSize="xl" color="red.400">Error Loading Profile</Text>
          <Text color="gray.400">Error: {error.message}</Text>
          <Button 
            onClick={() => window.location.reload()}
            colorScheme="blue"
          >
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }
  
  if (isLoading || !data) {
    return (
      <Center minH="50vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.400">Loading profile...</Text>
        </VStack>
      </Center>
    );
  }

  // Real activity data from API

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bet': return '🎯';
      case 'claim': return '🏆';
      case 'create': return '➕';
      case 'withdraw_fee': return '💰';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'bet': return 'blue';
      case 'claim': return 'green';
      case 'create': return 'purple';
      case 'withdraw_fee': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Box maxW="7xl" mx="auto" p={6}>
      {/* Header */}
      <Box bg="dark.700" rounded="xl" p={6} mb={6} border="1px" borderColor="dark.600">
        <HStack justify="space-between">
          <HStack spacing={4}>
            <Box 
              w={16} 
              h={16} 
              bgGradient="linear(to-br, blue.500, purple.600)" 
              rounded="full" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
            >
              <Text color="white" fontSize="xl" fontWeight="bold">
                {address.slice(2, 4).toUpperCase()}
              </Text>
            </Box>
            <VStack align="start" spacing={1}>
              <HStack spacing={2}>
                <Text fontFamily="mono" fontSize="lg" color="gray.400">
                  Wallet Address: {shorten(address, 10, 8)}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(address)}
                  color="blue.400"
                  _hover={{ color: "blue.300" }}
                >
                  📋
                </Button>
              </HStack>
            </VStack>
          </HStack>
          
          <Button
            as="a"
            href={`/profiles/${address}`}
            size="sm"
            variant="link"
            color="blue.400"
            _hover={{ color: "blue.300" }}
          >
            🔗 Permalink
          </Button>
        </HStack>
      </Box>

      {/* Stats Section - 2 Columns */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={6}>
        {/* User Stats Column */}
        <Box bg="dark.700" rounded="xl" p={6} border="1px" borderColor="dark.600">
          <VStack spacing={4} align="stretch">
            <HStack>
              <Text fontSize="lg" fontWeight="semibold" color="blue.400">👤 User Statistics</Text>
              <Badge colorScheme="blue" variant="subtle">As Bettor</Badge>
            </HStack>
            
            <VStack spacing={3} align="stretch">
              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Markets Bet</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                      {data.counts.played}
                    </Text>
                    <Text fontSize="xs" color="gray.500">Total markets participated</Text>
                  </VStack>
                  <Text fontSize="2xl">🎯</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Markets Won</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">
                      {data.counts.won}
                    </Text>
                    <Text fontSize="xs" color="gray.500">Successful claims</Text>
                  </VStack>
                  <Text fontSize="2xl">🏆</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Total Bet Amount</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                      {formatHuman(data.totals.bet.human)} APT
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      Raw: {data.totals.bet.raw}
                    </Text>
                  </VStack>
                  <Text fontSize="2xl">💰</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Total Winnings</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">
                      {formatHuman(data.totals.winning.human)} APT
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      Raw: {data.totals.winning.raw}
                    </Text>
                  </VStack>
                  <Text fontSize="2xl">💎</Text>
                </HStack>
              </Box>
            </VStack>
          </VStack>
        </Box>

        {/* Owner Stats Column */}
        <Box bg="dark.700" rounded="xl" p={6} border="1px" borderColor="dark.600">
          <VStack spacing={4} align="stretch">
            <HStack>
              <Text fontSize="lg" fontWeight="semibold" color="purple.400">👑 Owner Statistics</Text>
              <Badge colorScheme="purple" variant="subtle">As Creator</Badge>
            </HStack>
            
            <VStack spacing={3} align="stretch">
              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Markets Created</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                      {data.counts.created}
                    </Text>
                    <Text fontSize="xs" color="gray.500">Markets created as owner</Text>
                  </VStack>
                  <Text fontSize="2xl">➕</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Total Fee Earned</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.400">
                      {formatHuman(data.totals.owner_fee.human)} APT
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      Raw: {data.totals.owner_fee.raw}
                    </Text>
                  </VStack>
                  <Text fontSize="2xl">👑</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Win Rate</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">
                      {data.counts.played > 0 ? ((data.counts.won / data.counts.played) * 100).toFixed(1) : 0}%
                    </Text>
                    <Text fontSize="xs" color="gray.500">Success rate as bettor</Text>
                  </VStack>
                  <Text fontSize="2xl">📊</Text>
                </HStack>
              </Box>

              <Box bg="dark.600" rounded="lg" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.400">Net Profit</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">
                      {formatHuman((parseFloat(data.totals.winning.human) - parseFloat(data.totals.bet.human)).toFixed(6))} APT
                    </Text>
                    <Text fontSize="xs" color="gray.500">Winnings - Bets</Text>
                  </VStack>
                  <Text fontSize="2xl">📈</Text>
                </HStack>
              </Box>
            </VStack>
          </VStack>
        </Box>
      </Grid>

      {/* Activity Section */}
      <Box bg="dark.700" rounded="xl" border="1px" borderColor="dark.600">
        <Box p={6}>
          <Text fontSize="lg" fontWeight="semibold" color="white" mb={4}>📋 Activity Feed</Text>
          
          <Table variant="simple" colorScheme="dark">
            <Thead>
              <Tr>
                <Th color="gray.400">Type</Th>
                <Th color="gray.400">Market</Th>
                <Th color="gray.400">Amount</Th>
                <Th color="gray.400">Status</Th>
                <Th color="gray.400">Time</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoadingActivity ? (
                <Center py={4}>
                  <Spinner size="sm" color="blue.500" />
                  <Text ml={2} fontSize="sm" color="gray.400">Loading activity...</Text>
                </Center>
              ) : activityData.length > 0 ? (
                activityData.map((activity, index) => (
                <Tr key={index}>
                  <Td>
                    <HStack>
                      <Text fontSize="lg">{getActivityIcon(activity.type)}</Text>
                      <Badge colorScheme={getActivityColor(activity.type)} variant="subtle">
                        {activity.type.toUpperCase()}
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>
                    <Text color="white" fontSize="sm" fontFamily="mono">
                      {shorten(activity.market_addr, 8, 6)}
                    </Text>
                  </Td>
                  <Td>
                    <Text color="white" fontWeight="semibold">
                      {activity.amount}
                    </Text>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={activity.status === 'won' || activity.status === 'completed' ? 'green' : 
                                  activity.status === 'lost' ? 'red' : 'blue'} 
                      variant="subtle"
                    >
                      {activity.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Text color="gray.400" fontSize="sm">
                      {activity.time}
                    </Text>
                  </Td>
                </Tr>
              ))) : (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={8}>
                    <Text color="gray.500">No activity found</Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}