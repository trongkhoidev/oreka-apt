import React, { useEffect, useState } from 'react';
import { Box, Badge, Text, HStack, Flex, Icon } from '@chakra-ui/react';
import { FaRegClock } from 'react-icons/fa';
import { getMarketDetails } from '../../services/aptosMarketService';

interface Market {
  creator: string;
  pair_name: string;
  strike_price: number;
  fee_percentage: number;
  total_bids: number;
  long_bids: number;
  short_bids: number;
  total_amount: number;
  long_amount: number;
  short_amount: number;
  result: number;
  is_resolved: boolean;
  bidding_start_time: number;
  bidding_end_time: number;
  maturity_time: number;
  final_price: number;
  fee_withdrawn: boolean;
  _key?: string;
  market_address: string;
}

interface ListAddressMarketCardProps {
  market: Market;
  onClick: () => void;
  pairPrices: Record<string, number>;
  getMarketPhase: (market: Market) => string;
  getPhaseColor: (phase: string) => string;
  getStableIndex: (key: string, max: number) => number;
}

// Thêm hàm chọn màu theo coin
function getStrikeColor(token: string) {
  switch (token.toUpperCase()) {
    case 'BTC': return '#FFD700'; 
    case 'ETH': return '#4F8CFF'; 
    case 'SOL': return '#A259FF'; 
    case 'APT': return '#f2a16'; 
    case 'SUI': return '#00E1D6'; 
    case 'BNB': return '#F3BA2F'; 
    case 'LINK': return '#2A5ADA'; 
    default: return '#FEDF56'; 
  }
}

const ListAddressMarketCard: React.FC<ListAddressMarketCardProps> = ({
  market, onClick, pairPrices, getMarketPhase, getPhaseColor, getStableIndex
}) => {
  const [details, setDetails] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealtimeDetails() {
      setLoading(true);
      const d = await getMarketDetails(market.market_address);
      if (d) {
        setDetails({
          ...market,
          ...d,
          long_amount: Number(d.long_amount || 0),
          short_amount: Number(d.short_amount || 0),
          total_amount: Number(d.total_amount || 0),
          result: Number(d.result ?? 2),
          is_resolved: !!d.is_resolved,
          bidding_start_time: Number(d.bidding_start_time),
          bidding_end_time: Number(d.bidding_end_time),
          maturity_time: Number(d.maturity_time),
          strike_price: Number(d.strike_price),
          fee_percentage: Number(d.fee_percentage),
          final_price: Number(d.final_price),
          total_bids: Number(d.total_bids || 0),
          long_bids: Number(d.long_bids || 0),
          short_bids: Number(d.short_bids || 0),
          fee_withdrawn: !!d.fee_withdrawn,
        });
      } else {
        setDetails(null);
      }
      setLoading(false);
    }
    fetchRealtimeDetails();
  }, [market.market_address]);

  // Lấy dữ liệu ưu tiên từ details realtime, fallback sang props market
  const data = details || market;
  const long = Number(data.long_amount || 0);
  const short = Number(data.short_amount || 0);
  const total = Number(data.total_amount || long + short);
  let longPercent = 50;
  let shortPercent = 50;
  if (total > 0) {
    longPercent = (long / total) * 100;
    shortPercent = (short / total) * 100;
  }
  const totalDeposited = total > 0 ? (total / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0';
  const phase = getMarketPhase(data);
  const phaseColor = getPhaseColor(phase);
  const baseToken = data.pair_name.split('/')[0].toUpperCase();
  const strikeColor = getStrikeColor(baseToken);
  const strike = (data.strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maturity = new Date(data.maturity_time * 1000).toLocaleString();
  const title = (
    <span>
      {data.pair_name} will reach <span style={{ color: strikeColor, fontWeight: 700 }}>${strike}</span> by {maturity}?
    </span>
  );
  const imgIndex = getStableIndex(data._key || data.pair_name, 10);
  const imgSrc = `/images/${baseToken}/${baseToken}${imgIndex}.png`;
  const now = Math.floor(Date.now() / 1000);
  let biddingStatus = null;
  let biddingColor = '#4F8CFF';
  if (now < data.bidding_start_time) {
    biddingStatus = 'Pending';
    biddingColor = '#A770EF';
  } else if (now >= data.bidding_start_time && now < data.bidding_end_time) {
    const remain = data.bidding_end_time - now;
    if (remain >= 86400) { 
      const days = Math.floor(remain / 86400);
      if (days >= 365) {
        const years = Math.floor(days / 365);
        biddingStatus = years === 1 ? '1 year' : `${years} years`;
      } else if (days >= 30) {
        const months = Math.floor(days / 30);
        biddingStatus = months === 1 ? '1 month' : `${months} months`;
      } else if (days >= 7) {
        const weeks = Math.floor(days / 7);
        biddingStatus = weeks === 1 ? '1 week' : `${weeks} weeks`;
      } else {
        biddingStatus = days === 1 ? '1 day' : `${days} days`;
      }
    } else if (remain >= 3600) { 
      const h = Math.floor(remain / 3600);
      const m = Math.floor((remain % 3600) / 60);
      biddingStatus = `${h}h ${m}m`;
    } else if (remain > 0) { 
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      biddingStatus = `${m}m ${s}s`;
    } else {
      biddingStatus = 'End';
      biddingColor = '#B0B3B8';
    }
  } else {
    biddingStatus = 'End';
    biddingColor = '#B0B3B8';
  }

  // Xác định trạng thái đặc biệt của bar
  const isMaturity = phase === 'Maturity';
  const isResolved = !!data.is_resolved;
  const result = Number(data.result);
  const isLongWin = isMaturity && isResolved && result === 0;
  const isShortWin = isMaturity && isResolved && result === 1;
  const isExpired = isMaturity && total === 0;

  return (
    <Box
      px={4} py={3}
      borderRadius="2xl"
      boxShadow="lg"
      bg="#181A20"
      border="2px solid transparent"
      style={{
        background: 'linear-gradient(#181A20, #181A20) padding-box, linear-gradient(90deg, #4F8CFF, #A770EF, #4F8CFF) border-box',
      }}
      transition="all 0.18s"
      _hover={{
        boxShadow: 'xl',
        borderColor: '#4F8CFF',
        transform: 'scale(1.025)',
        cursor: 'pointer',
        bg: '#181A20',
      }}
      onClick={onClick}
      position="relative"
      minH="340px"
      minW="280px"
      maxW="330px"
      w="100%"
      display="flex"
      flexDirection="column"
      justifyContent="stretch"
      alignItems="stretch"
    >
      {/* Image + Phase badge */}
      <Box position="relative" borderTopRadius="2xl" borderBottomLeftRadius="lg" borderBottomRightRadius="lg" overflow="hidden" h="52%" minH="160px" bg="#23262f">
        <img
          src={imgSrc}
          alt={data.pair_name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
          onError={e => { e.currentTarget.src = `/images/${baseToken}-logo.png`; }}
        />
        <Badge position="absolute" top={2} left={2} fontSize="xs" px={3} py={1} borderRadius="md" zIndex={2} bg={phaseColor} color="#181A20" fontWeight="bold">
          {phase}
        </Badge>
      </Box>
      {/* Info section */}
      <Box px={2} pt={2} pb={2} flex={1} display="flex" flexDirection="column" justifyContent="space-between">
        <Text fontWeight="bold" fontSize="sm" color="white" mb={1} noOfLines={2}>{title}</Text>
        {/* Bar long/short: linh hoạt theo phase/result/expired */}
        <HStack mb={1} spacing={1} align="center" px={0}>
          {/* --- Maturity phase, resolved: show LONG/SHORT win --- */}
          {phase === 'Maturity' && data.is_resolved && total > 0 && (
            (() => {
              // Ưu tiên dùng result nếu có, nếu không thì so sánh final_price và strike_price
              let show = null;
              if (typeof data.result === 'number' && (data.result === 0 || data.result === 1)) {
                show = data.result === 0 ? 'LONG' : 'SHORT';
              } else if (typeof data.final_price === 'number' && typeof data.strike_price === 'number') {
                show = data.final_price >= data.strike_price ? 'LONG' : 'SHORT';
              }
              if (show === 'LONG') {
                return (
                  <Box flex={1} h="32px" borderRadius="md" bg="#1B3B3F" display="flex" alignItems="center" justifyContent="center" border="1px solid white">
                    <Text color="#22BCBB" fontWeight="bold" fontSize="xl" letterSpacing={2}>Long</Text>
                  </Box>
                );
              } else if (show === 'SHORT') {
                return (
                  <Box flex={1} h="32px" borderRadius="md" bg="#3c1a2b" display="flex" alignItems="center" justifyContent="center" border="1px solid white">
                    <Text color="#ff3a7a" fontWeight="bold" fontSize="xl" letterSpacing={2}>Short</Text>
                  </Box>
                );
              }
              return null;
            })()
          )}
          {/* --- Maturity phase, resolved or not, no bids: show EXPIRED (replace bar) --- */}
          {phase === 'Maturity' && total === 0 && (
            <Box flex={1} h="32px" borderRadius="5px" bg="#3D3D3D" display="flex" alignItems="center" justifyContent="center" border="2px solid #444" px={2}>
              <Text color="#A9A9A9" fontWeight="bold" fontSize="xl" letterSpacing={1}>Expired</Text>
            </Box>
          )}
          {/* --- Chỉ hiển thị bar phần trăm khi chưa resolved và còn bid --- */}
          {((phase === 'Pending' || phase === 'Bidding') || (phase === 'Maturity' && !data.is_resolved && total > 0)) && (
            <>
              {longPercent > 8 && (
                <Text color="#5FDCC6" fontWeight="bold" minW="36px" fontSize="sm" textAlign="right">{longPercent.toFixed(0)}%</Text>
              )}
              <Box flex={1} alignItems="center" w="100%" h="18px" borderRadius="full" bg="gray.800" position="relative" overflow="hidden" mb={1} p={0}
                boxShadow="0 0 4px #f9f9f7, 0 0 2px  #ff3a7a77, inset 0 1px rgba(0,0,0,0.6)">
                <Box position="absolute" width={`${longPercent}%`} bgGradient="linear(to-r, #00ea00, #56ff56, #efef8b)" transition="width 0.6s ease" h="100%" display="flex" alignItems="center" justifyContent="flex-end" pr={3} left="0" top="0" zIndex={1} />
                <Box position="absolute" right="0" top="0" h="100%" width={`${shortPercent}%`} bgGradient="linear(to-r, #FF6B81, #D5006D)" transition="width 0.6s ease" display="flex" alignItems="center" justifyContent="flex-start" pl={3} zIndex={0} />
              </Box>
              {shortPercent > 8 && (
                <Text color="#ED5FA7" fontWeight="bold" minW="36px" fontSize="sm" textAlign="left">{shortPercent.toFixed(0)}%</Text>
              )}
            </>
          )}
        </HStack>
        {/* Asset price + Total deposited + Bidding time */}
        <Flex align="center" justify="space-between" mt={2} mb={1}>
          <HStack spacing={2} align="center">
            <Box boxSize="18px" borderRadius="full" overflow="hidden" bg="#23262f">
              <img src={`/images/${baseToken}-logo.png`} alt={baseToken} style={{ width: '100%', height: '100%' }} />
            </Box>
            <Text color="white" fontWeight="bold" fontSize="sm">
              {pairPrices[data.pair_name] !== undefined
                ? `$${pairPrices[data.pair_name].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '--'}
            </Text>
          </HStack>
          <HStack spacing={2} align="center">
            <Text color="white" fontWeight="bold" fontSize="sm">{totalDeposited} APT</Text>
            <Icon as={FaRegClock} color={biddingColor} boxSize={4} />
            <Text color={biddingColor} fontWeight="bold" fontSize="sm">{biddingStatus}</Text>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default ListAddressMarketCard; 