import React, { useEffect, useState } from 'react';
import { Box, Badge, Text, HStack, Flex, Icon } from '@chakra-ui/react';
import { FaRegClock } from 'react-icons/fa';
import { getMarketDetails } from '../../services/aptosMarketService';
import { getStandardPairName } from '../../config/pairMapping';
import Image from 'next/image';
import { getBinanceSymbolFromPairName } from '../../config/tradingPairs';

interface Market {
  creator: string;
  pair_name: string;
  symbol?: string;
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
  price_feed_id?: number[];
}

interface ListAddressMarketCardProps {
  market: Market;
  onClick: () => void;
  pairPrices: Record<string, number>;
  getMarketPhase: (market: Market) => string;
  getPhaseColor: (phase: string) => string;
  getStableIndex: (key: string, max: number) => number;
}


function getStrikeColor(token: string) {
  switch (token.toUpperCase()) {
    case 'BTC': return '#FFD700'; 
    case 'ETH': return '#4F8CFF'; 
    case 'SOL': return '#A259FF'; 
    case 'APT': return '#3EEBB4'; 
    case 'SUI': return '#00E1D6'; 
    case 'BNB': return '#F3BA2F'; 
    case 'LINK': return '#2A5ADA'; 
    default: return '#FEDF56'; 
  }
}

const POLL_INTERVAL = 15000; // 15s

const ListAddressMarketCard: React.FC<ListAddressMarketCardProps> = ({
  market, onClick, pairPrices, getMarketPhase, getPhaseColor, getStableIndex
}) => {
  const [details, setDetails] = useState<Market | null>(null);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;
    async function fetchRealtimeDetails() {
      setDetails(null);
      const d = await getMarketDetails(market.market_address);
      if (stopped) return;
      if (d) {
        // Đảm bảo price_feed_id là mảng số
        let pfid: number[] = [];
        if (Array.isArray(d.price_feed_id)) {
          pfid = d.price_feed_id as number[];
        } else if (typeof d.price_feed_id === 'string') {
          pfid = d.price_feed_id.match(/.{1,2}/g)?.map(x => parseInt(x, 16)) || [];
        }
        setDetails({
          ...market,
          ...d,
          price_feed_id: pfid,
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
    }
    fetchRealtimeDetails();
    function poll() {
      if (document.visibilityState === 'visible') fetchRealtimeDetails();
      interval = setTimeout(poll, POLL_INTERVAL);
    }
    interval = setTimeout(poll, POLL_INTERVAL);
    return () => { stopped = true; if (interval) clearTimeout(interval); };
  }, [market, setDetails]);

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


  const pairName = market.pair_name || '';
  const symbol = market.symbol || '';
  // Lấy giá từ symbol chuẩn hóa, nếu không có thì thử pair_name, nếu vẫn không có thì '--'
  const price = (symbol && pairPrices[symbol] !== undefined)
    ? `$${pairPrices[symbol].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : (pairName && pairPrices[pairName] !== undefined)
      ? `$${pairPrices[pairName].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '--';

  let baseToken = '';
  if (pairName && pairName.includes('/')) {
    baseToken = pairName.split('/')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  const imgIndex = getStableIndex(data._key || pairName, 10);
  const imgSrc = baseToken ? `/images/${baseToken}/${baseToken}${imgIndex}.png` : '/images/coinbase.png';
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



  const strikeColor = getStrikeColor(baseToken.toUpperCase());
  const strike = (data.strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maturity = new Date(data.maturity_time * 1000).toLocaleString();
  // Title for the market card
  const title = (
    <span>
      {pairName} will reach <span style={{ color: strikeColor, fontWeight: 700 }}>${strike}</span> by {maturity}?
    </span>
  );

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
      minH="320px"
      minW="260px"
      maxW="320px"
      w="100%"
      ml={1}
      mr={2}
      mt={2}
      mb={2}
      display="flex"
      flexDirection="column"
      justifyContent="stretch"
      alignItems="stretch"
    >
      {/* Image + Phase badge */}
      <Box position="relative" borderTopRadius="2xl" borderBottomLeftRadius="lg" borderBottomRightRadius="lg" overflow="hidden" h="45%" minH="160px" bg="#23262f">
        <Image
          src={imgSrc}
          alt={pairName}
          width={300}
          height={180}
          style={{ objectFit: 'cover' }}
          onError={e => { e.currentTarget.src = '/images/coinbase.png'; }}
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
          {phase === 'Maturity' && data.is_resolved && (typeof data.result === 'number' && (data.result === 0 || data.result === 1) || (typeof data.result === 'string' && (data.result === '0' || data.result === '1'))) && (
            (() => {
              let show = null;
              if (typeof data.result === 'number' && (data.result === 0 || data.result === 1)) {
                show = data.result === 0 ? 'LONG' : 'SHORT';
              } else if (typeof data.result === 'string' && (data.result === '0' || data.result === '1')) {
                show = data.result === '0' ? 'LONG' : 'SHORT';
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
          {phase === 'Maturity' && (!data.is_resolved || !((typeof data.result === 'number' && (data.result === 0 || data.result === 1)) || (typeof data.result === 'string' && (data.result === '0' || data.result === '1')))) && total === 0 && (
            <Box flex={1} h="32px" borderRadius="5px" bg="#3D3D3D" display="flex" alignItems="center" justifyContent="center" border="2px solid #444" px={2}>
              <Text color="#A9A9A9" fontWeight="bold" fontSize="xl" letterSpacing={1}>Expired</Text>
            </Box>
          )}
          {/* --- Chỉ hiển thị bar phần trăm khi chưa resolved và còn bid --- */}
          {((phase === 'Pending' || phase === 'Bidding') || (phase === 'Maturity' && !data.is_resolved && total > 0)) && (
            <>
              <Text color="#5FDCC6" fontWeight="bold" minW="36px" fontSize="sm" textAlign="right">{longPercent.toFixed(0)}%</Text>
              <Box flex={1} alignItems="center" w="100%" h="18px" borderRadius="full" bg="gray.800" position="relative" overflow="hidden" mb={1} p={0}
                boxShadow="0 0 4px #f9f9f7, 0 0 2px  #ff3a7a77, inset 0 1px rgba(0,0,0,0.6)">
               
                {longPercent === 100 && (
                  <Box position="absolute" width={`100%`} bgGradient="linear(to-r, #00ea00, #56ff56, #efef8b)" transition="width 0.6s ease" h="100%" left="0" top="0" zIndex={1} />
                )}
                
                {shortPercent === 100 && (
                  <Box position="absolute" width={`100%`} bgGradient="linear(to-r, #FF6B81, #D5006D)" transition="width 0.6s ease" h="100%" left="0" top="0" zIndex={1} />
                )}
                
                {longPercent > 0 && longPercent < 100 && (
                  <Box position="absolute" width={`${longPercent}%`} bgGradient="linear(to-r, #00ea00, #56ff56, #efef8b)" transition="width 0.6s ease" h="100%" left="0" top="0" zIndex={1} />
                )}
                {shortPercent > 0 && shortPercent < 100 && (
                  <Box position="absolute" right="0" top="0" h="100%" width={`${shortPercent}%`} bgGradient="linear(to-r, #FF6B81, #D5006D)" transition="width 0.6s ease" zIndex={0} />
                )}
              </Box>
              <Text color="#ED5FA7" fontWeight="bold" minW="36px" fontSize="sm" textAlign="left">{shortPercent.toFixed(0)}%</Text>
            </>
          )}
        </HStack>
        {/* Asset price + Total deposited + Bidding time */}
        <Flex align="center" justify="space-between" mt={2} mb={1}>
          <HStack spacing={2} align="center">
            <Text color="white" fontWeight="bold" fontSize="sm">
              {price}
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

// Mapping từ price_feed_id (hex string) sang pair_name
const priceFeedIdToPair: Record<string, string> = {
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5": "APT/USD",
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
  "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d": "SOL/USD",
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744": "SUI/USD",
  "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f": "BNB/USD",
  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6": "WETH/USD",
};

function bytesToHex(bytes: number[] | Uint8Array | string | undefined): string {
  if (!bytes) return '';
  if (typeof bytes === 'string') {
    // Nếu là hex string hợp lệ (64 ký tự), trả về luôn
    if (/^[0-9a-fA-F]{64}$/.test(bytes)) return bytes.toLowerCase();
    return '';
  }
  if (!Array.isArray(bytes)) return '';

  const arr = bytes.filter(x => typeof x === 'number' && !isNaN(x) && x >= 0 && x <= 255);

  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getMarketCardTitle(market: Market): string {
  const priceFeedHex = bytesToHex(Array.isArray((market as any).price_feed_id) ? (market as any).price_feed_id : []);
  const pairName = priceFeedIdToPair[priceFeedHex] || market.pair_name || '';
  const strike = (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maturity = market.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  return `${pairName} will reach $${strike} by ${maturity}?`;
}

export function getMarketLogoSrc(market: Market): string {
  const priceFeedHex = bytesToHex(Array.isArray((market as any).price_feed_id) ? (market as any).price_feed_id : []);
  const pairName = priceFeedIdToPair[priceFeedHex] || market.pair_name || '';
  let baseToken = '';
  if (pairName && pairName.includes('/')) {
    baseToken = pairName.split('/')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return baseToken ? `/images/${baseToken}-logo.png` : '/images/coinbase.png';
}

export default ListAddressMarketCard; 