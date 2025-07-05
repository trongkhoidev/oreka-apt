import React from 'react';
import { Box, Badge, Text, HStack, Flex, Icon } from '@chakra-ui/react';
import { FaRegClock } from 'react-icons/fa';

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
}

interface ListAddressMarketCardProps {
  market: Market;
  details: any;
  onClick: () => void;
  pairPrices: Record<string, number>;
  getMarketPhase: (market: Market) => string;
  getPhaseColor: (phase: string) => string;
  getStableIndex: (key: string, max: number) => number;
}

const ListAddressMarketCard: React.FC<ListAddressMarketCardProps> = ({
  market, details, onClick, pairPrices, getMarketPhase, getPhaseColor, getStableIndex
}) => {
  const long = details ? Number(details[8]) : 0;
  const short = details ? Number(details[9]) : 0;
  const total = details ? Number(details[7]) : 0;
  const totalDeposited = total > 0 ? (total / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0';
  let percent = { long: 50, short: 50 };
  if ((long + short) > 0) {
    percent = {
      long: Math.round((long / (long + short)) * 100),
      short: Math.round((short / (long + short)) * 100)
    };
  }
  const phase = getMarketPhase(market);
  const phaseColor = getPhaseColor(phase);
  const baseToken = market.pair_name.split('/')[0].toLowerCase();
  const strike = (market.strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maturity = new Date(market.maturity_time * 1000).toLocaleString();
  const title = `${market.pair_name} will reach $${strike} by ${maturity}?`;
  const imgIndex = getStableIndex(market._key || market.pair_name, 10);
  const imgSrc = `/images/${baseToken}/${baseToken}${imgIndex}.png`;
  const now = Math.floor(Date.now() / 1000);
  let biddingStatus = null;
  let biddingColor = '#4F8CFF';
  if (now < market.bidding_start_time) {
    biddingStatus = 'Pending';
    biddingColor = '#A770EF';
  } else if (now >= market.bidding_start_time && now < market.bidding_end_time) {
    const remain = market.bidding_end_time - now;
    if (remain >= 86400) { // > 1 ngày
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
    } else if (remain >= 3600) { // < 1 ngày, > 1 giờ
      const h = Math.floor(remain / 3600);
      const m = Math.floor((remain % 3600) / 60);
      biddingStatus = `${h}h ${m}m`;
    } else if (remain > 0) { // < 1 giờ
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
          alt={market.pair_name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
          onError={e => { e.currentTarget.src = `/images/${baseToken}-logo.png`; }}
        />
        <Badge position="absolute" top={2} left={2} fontSize="xs" px={3} py={1} borderRadius="md" zIndex={2} bg={phaseColor} color="#181A20" fontWeight="bold">
          {phase}
        </Badge>
      </Box>
      {/* Info section */}
      <Box px={2} pt={2} pb={2} flex={1} display="flex" flexDirection="column" justifyContent="space-between">
        <Text fontWeight="bold" fontSize="lg" color="white" mb={1} noOfLines={2}>{title}</Text>
        {/* Bar long/short */}
        <HStack mb={1} spacing={1} align="center" px={0}>
          <Text color="#5FDCC6" fontWeight="bold" minW="36px" fontSize="sm" textAlign="right">{percent.long}%</Text>
          <Box flex={1} h="14px" borderRadius="full" bg="#23262f" position="relative" overflow="hidden" minW="80px">
            {/* Long/Short bar gradient */}
            <Box position="absolute" left={0} top={0} h="100%" w="100%" borderRadius="full" zIndex={2}
              style={{
                background: percent.long === 50 ?
                  'linear-gradient(90deg, #00ea00 0%, #00ea00 50%, #ff3a7a 50%, #ff3a7a 100%)'
                  :
                  `linear-gradient(90deg, #00ea00 0%, #00ea00 ${percent.long}%, #f8ff8b ${percent.long}%, #ff3a7a ${percent.long}%, #ff3a7a 100%)`,
                transition: 'background 0.4s',
              }}
            />
          </Box>
          <Text color="#ED5FA7" fontWeight="bold" minW="36px" fontSize="sm" textAlign="left">{percent.short}%</Text>
        </HStack>
        {/* Asset price + Total deposited + Bidding time */}
        <Flex align="center" justify="space-between" mt={2} mb={1}>
          <HStack spacing={2} align="center">
            <Box boxSize="18px" borderRadius="full" overflow="hidden" bg="#23262f">
              <img src={`/images/${baseToken}-logo.png`} alt={baseToken} style={{ width: '100%', height: '100%' }} />
            </Box>
            <Text color="white" fontWeight="bold" fontSize="sm">
              {pairPrices[market.pair_name] !== undefined
                ? `$${pairPrices[market.pair_name].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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