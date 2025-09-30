import React, { useEffect, useState, useCallback } from 'react';
import { Box, Badge, Text, HStack, VStack, Flex, Icon } from '@chakra-ui/react';
import { FaRegClock } from 'react-icons/fa';
import { getMarketDetails, MarketInfo } from '../../services/aptosMarketService';
import Image from 'next/image';

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
  price_feed_id?: number[] | string | undefined;
  // Multi-outcome market fields
  market_type?: {
    is_binary: boolean;
  };
  price_ranges?: Array<{
    min_price: number;
    max_price: number;
    outcome_name: string;
  }>;
  outcomes?: Array<{
    outcome_index: number;
    price_range: {
      min_price: number;
      max_price: number;
      outcome_name: string;
    };
  }>;
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

// Generate meaningful outcome labels from price ranges (style like the image)
function generateOutcomeLabel(priceRange: { min_price: number | string; max_price: number | string; outcome_name: string }): string {
  console.log('[generateOutcomeLabel] Input priceRange:', priceRange);
  
  // Handle both string and number inputs from API
  const min = typeof priceRange.min_price === 'string' ? Number(priceRange.min_price) : priceRange.min_price;
  const max = typeof priceRange.max_price === 'string' ? Number(priceRange.max_price) : priceRange.max_price;
  
  // Check if values are valid numbers
  if (isNaN(min) || isNaN(max)) {
    console.warn('[generateOutcomeLabel] Invalid price values:', { min, max });
    return 'Invalid Price';
  }
  
  // Always convert from octas to USD (divide by 1e8)
  const minPrice = min / 1e8;
  const maxPrice = max / 1e8;
  
  // Handle special cases - u64::MAX is 18446744073709551615
  const U64_MAX = 18446744073709551615;
  const U64_MAX_APT = U64_MAX / 1e8;
  const U64_MAX_STR = '18446744073709551615';
  
  console.log('[generateOutcomeLabel] Processing:', {
    min_price: priceRange.min_price,
    max_price: priceRange.max_price,
    outcome_name: priceRange.outcome_name,
    min,
    max,
    minPrice,
    maxPrice,
    isMinZero: minPrice === 0,
    isMaxU64: maxPrice >= U64_MAX_APT,
    U64_MAX_APT,
    // Additional debugging
    min_as_apt: min / 1e8,
    max_as_apt: max / 1e8,
    min_raw: min,
    max_raw: max,
    // Check if max is exactly u64::MAX
    is_max_exactly_u64_max: max === U64_MAX,
    max_string: max.toString(),
    u64_max_string: U64_MAX.toString()
  });
  
  // Format: keep up to 4 fraction digits for decimals; avoid trimming integers
  const fmt = (value: number) => value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: 4
  });
  // Check for u64::MAX using string comparison to avoid precision issues
  const isMaxU64 = max.toString() === U64_MAX_STR || maxPrice >= U64_MAX_APT;
  
  if (minPrice === 0 && isMaxU64) {
    return 'Any Price';
  }
  if (minPrice === 0) {
    return `<$${fmt(maxPrice)}`;
  }
  if (isMaxU64) {
    return `≥$${fmt(minPrice)}`;
  }
  
  // Regular range
  const minStr = fmt(minPrice);
  const maxStr = fmt(maxPrice);
  return `≥$${minStr} to <$${maxStr}`;
}

const ListAddressMarketCard: React.FC<ListAddressMarketCardProps> = ({
  market, onClick, pairPrices, getMarketPhase, getPhaseColor, getStableIndex
}) => {
  const [details, setDetails] = useState<MarketInfo | null>(null);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;
    let lastDataHash = '';
    
    async function fetchRealtimeDetails() {
      // Force refresh to ensure we get the latest data
      const d = await getMarketDetails(market.market_address, true);
      if (stopped) return;
      
      if (d) {
        // Create a hash of the data to detect changes
        const dataHash = JSON.stringify({
          total_amount: d.total_amount,
          long_amount: d.long_amount,
          short_amount: d.short_amount,
          is_resolved: d.is_resolved,
          result: d.result,
          final_price: d.final_price
        });
        
        // Only update if data has actually changed
        if (dataHash !== lastDataHash) {
          console.log('[ListAddressMarketCard] Market data changed:', {
            market_address: d.market_address,
            market_type: d.market_type,
            is_multi_outcome: d.market_type && !d.market_type.is_binary,
            outcomes: d.outcomes,
            price_ranges: d.price_ranges,
            dataHash
          });
          
          // Debug price ranges specifically
          if (d.price_ranges && d.price_ranges.length > 0) {
            console.log('[ListAddressMarketCard] Price ranges debug:', d.price_ranges.map((pr, i) => ({
              index: i,
              min_price: pr.min_price,
              max_price: pr.max_price,
              outcome_name: pr.outcome_name,
              min_price_type: typeof pr.min_price,
              max_price_type: typeof pr.max_price,
              generated_label: generateOutcomeLabel(pr)
            })));
          } else {
            console.log('[ListAddressMarketCard] No price_ranges found:', {
              has_price_ranges: !!d.price_ranges,
              price_ranges_length: d.price_ranges?.length,
              market_type: d.market_type,
              is_multi_outcome: d.market_type && !d.market_type.is_binary,
              full_market_data: d
            });
          }
          
          setDetails(d);
          lastDataHash = dataHash;
        }
      } else {
        setDetails(null);
      }
    }
    
    // Initial fetch
    fetchRealtimeDetails();
    
    // Listen for custom events (e.g., when user places a bid)
    const handleMarketUpdate = (event: CustomEvent) => {
      if (event.detail?.marketAddress === market.market_address) {
        console.log('[ListAddressMarketCard] Received market update event:', event.detail);
        fetchRealtimeDetails();
      }
    };
    
    // Add event listener for market updates
    window.addEventListener('marketUpdate', handleMarketUpdate as EventListener);
    
    // Reduced polling frequency - only when page is visible
    function poll() {
      if (document.visibilityState === 'visible') {
        fetchRealtimeDetails();
      }
      interval = setTimeout(poll, POLL_INTERVAL * 2); // Double the interval
    }
    interval = setTimeout(poll, POLL_INTERVAL * 2);
    
    return () => { 
      stopped = true; 
      if (interval) clearTimeout(interval);
      window.removeEventListener('marketUpdate', handleMarketUpdate as EventListener);
    };
  }, [market.market_address]); // Only depend on market address, not the entire market object

  const data = details || market;
  
  // Check if this is a multi-outcome market
  const isMultiOutcome = details && details.market_type && !details.market_type.is_binary;
  
  console.log('[ListAddressMarketCard] Market type detection:', {
    market_address: market.market_address,
    has_details: !!details,
    market_type: details?.market_type,
    is_binary: details?.market_type?.is_binary,
    is_multi_outcome: isMultiOutcome,
    price_ranges_count: details?.price_ranges?.length || 0,
    outcomes_count: details?.outcomes?.length || 0
  });
  
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
  const phase = getMarketPhase(data as Market);
  const phaseColor = getPhaseColor(phase);


  const pairName = data.pair_name || '';
  const symbol = data.symbol || '';
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
  // Use market_address for stable index to ensure consistent image display
  const imgIndex = getStableIndex(market.market_address, 10);
  const imgSrc = baseToken ? `/images/${baseToken}/${baseToken}${imgIndex}.png` : '/images/coinbase.png';
  
  console.log('[ListAddressMarketCard] Image selection:', {
    market_address: market.market_address,
    baseToken,
    imgIndex,
    imgSrc
  });
  const now = Math.floor(Date.now() / 1000);
  let biddingStatus = null;
  let biddingColor = '#4F8CFF';
  const biddingStartTime = Number(data.bidding_start_time);
  const biddingEndTime = Number(data.bidding_end_time);
  if (now < biddingStartTime) {
    biddingStatus = 'Pending';
    biddingColor = '#A770EF';
  } else if (now >= biddingStartTime && now < biddingEndTime) {
    const remain = biddingEndTime - now;
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
  const strike = (Number(data.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Debug maturity_time
  console.log('[ListAddressMarketCard] Maturity time debug:', {
    market_address: market.market_address,
    maturity_time_raw: data.maturity_time,
    maturity_time_type: typeof data.maturity_time,
    maturity_time_number: Number(data.maturity_time),
    maturity_time_date: new Date(Number(data.maturity_time) * 1000),
    maturity_time_formatted: new Date(Number(data.maturity_time) * 1000).toLocaleString()
  });
  
  const maturity = new Date(Number(data.maturity_time) * 1000).toLocaleString();
  
  // Title for the market card - different for binary vs multi-outcome
  const title = isMultiOutcome ? (
    <span>
      {pairName} will reach ____ at {maturity}?
    </span>
  ) : (
    <span>
      {pairName} will reach <span style={{ color: strikeColor, fontWeight: 700 }}>${strike}</span> at {maturity}?
    </span>
  );

  // Determine when to show the ratio bar for binary markets
  const showRatioBar = (!isMultiOutcome) && (((phase === 'Pending' || phase === 'Bidding') || (phase === 'Maturity' && !data.is_resolved && total > 0)));

  function handleQuickSelect(e: React.MouseEvent<HTMLDivElement>, side: 'long' | 'short') {
    e.stopPropagation();
    try {
      localStorage.setItem(`preselectSide:${market.market_address}`, side);
    } catch (err) {
      console.warn('[ListAddressMarketCard] Failed to persist preselectSide', err);
    }
    onClick();
  }

  // Preload market data on hover for faster navigation
  const handleMouseEnter = useCallback(() => {
    // Preload market data in background
    if (!details) {
      getMarketDetails(market.market_address, false).then(data => {
        if (data) {
          // Store in sessionStorage for instant access
          try {
            sessionStorage.setItem(`market_${market.market_address}`, JSON.stringify(data));
          } catch (err) {
            console.warn('[ListAddressMarketCard] Failed to cache market data', err);
          }
        }
      }).catch(err => {
        console.warn('[ListAddressMarketCard] Failed to preload market data', err);
      });
    }
  }, [market.market_address, details]);

  return (
    <Box
      px={3} py={2}
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
      onMouseEnter={handleMouseEnter}
      position="relative"
      minH="280px"
      minW="300px"
      maxW="380px"
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
      <Box position="relative" borderTopRadius="2xl" borderBottomLeftRadius="lg" borderBottomRightRadius="lg" overflow="hidden" h="40%" minH="120px" bg="#23262f">
        <Image
          src={imgSrc}
          alt={pairName}
          width={360}
          height={140}
          style={{ objectFit: 'cover', width: '100%', height: '140px', display: 'block' }}
          onError={e => { e.currentTarget.src = '/images/coinbase.png'; }}
        />
        <Badge position="absolute" top={2} left={2} fontSize="xs" px={3} py={1} borderRadius="md" zIndex={2} bg={phaseColor} color="#181A20" fontWeight="bold">
          {phase}
        </Badge>
      </Box>
      {/* Info section */}
      <Box px={2} pt={2} pb={1} flex={1} display="flex" flexDirection="column" justifyContent="space-between">
        <Text fontWeight="bold" fontSize="sm" color="white" mb={1} noOfLines={2}>{title}</Text>
        {/* Bar long/short: linh hoạt theo phase/result/expired */}
        <HStack mb={1} spacing={1} align="center" px={0}>
          {/* Multi-outcome market: show outcome tags in simple horizontal style */}
          {isMultiOutcome && (() => {
            console.log('[ListAddressMarketCard] Rendering multi-outcome UI:', {
              isMultiOutcome,
              has_details: !!details,
              price_ranges: details?.price_ranges,
              price_ranges_length: details?.price_ranges?.length
            });
            return true;
          })() && (
            <Box 
              flex={1} 
              borderRadius="md" 
              bg="transparent" 
              p={0}
              overflowY="auto"
              maxH="110px"
              css={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#4A5568',
                  borderRadius: '2px',
                },
              }}
            >
              <VStack spacing={2} align="stretch">
                {details && details.price_ranges && details.price_ranges.length > 0 ? (
                  details.price_ranges.map((priceRange, index) => {
                    // Debug logging for each price range
                    console.log(`[ListAddressMarketCard] Processing price range ${index}:`, {
                      priceRange,
                      min_price_type: typeof priceRange.min_price,
                      max_price_type: typeof priceRange.max_price,
                      min_price_value: priceRange.min_price,
                      max_price_value: priceRange.max_price
                    });
                    
                    // Calculate percentage for this outcome (try from amounts if available; else equal split)
                    let pct = 0;
                    const anyDetails = details as { outcome_amounts?: Array<string | number>, total_amount?: string | number };
                    const totalAmountNum = anyDetails?.total_amount ? Number(anyDetails.total_amount) : 0;
                    if (Array.isArray(anyDetails?.outcome_amounts) && totalAmountNum > 0) {
                      const amt = Number(anyDetails.outcome_amounts[index] || 0);
                      pct = Math.max(0, Math.min(100, (amt / totalAmountNum) * 100));
                    } else {
                      const totalOutcomes = details.price_ranges?.length || 1;
                      pct = 100 / totalOutcomes;
                    }
                    const percentageDisplay = pct.toFixed(1);
                    
                    return (
                      <Box key={index} position="relative" borderRadius="12px" bg="#2E3340" px={2} py={2} overflow="hidden">
                        {/* Filled bar to visualize selection percent */}
                        <Box position="absolute" left={0} top={0} bottom={0} width={`${pct}%`} bg="#3A3F4E" opacity={0.9} borderRadius="10px" transition="width 0.3s ease" />
                        <HStack position="relative" spacing={2} align="center">
                          <Text color="white" fontWeight="semibold" fontSize="sm" noOfLines={1} flex={1}>
                            {generateOutcomeLabel(priceRange)}
                          </Text>
                          <Text color="#E2E8F0" fontWeight="bold" fontSize="sm" minW="fit-content">
                            {percentageDisplay}%
                          </Text>
                        </HStack>
                      </Box>
                    );
                  })
                ) : (
                  <Box
                    bg="transparent"
                    borderRadius="sm"
                    p={2}
                    textAlign="center"
                  >
                    <Text color="#9CA3AF" fontSize="xs" fontStyle="italic">
                      {details ? 'No outcomes data' : 'Loading outcomes...'}
                    </Text>
                    {details && (
                      <Text color="#666" fontSize="xs" mt={1}>
                        Debug: {JSON.stringify({
                          has_price_ranges: !!details.price_ranges,
                          price_ranges_length: details.price_ranges?.length,
                          market_type: details.market_type
                        })}
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            </Box>
          )}
          
          {/* Binary market: existing logic - only bar part (top) */}
          {!isMultiOutcome && (
            <>
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
              {/* --- Chỉ hiển thị bar phần trăm (trên) khi chưa resolved và còn bid --- */}
              {showRatioBar && (
                <>
                  <Text color="#5FDCC6" fontWeight="bold" minW="32px" fontSize="sm" textAlign="right">{longPercent.toFixed(0)}%</Text>
                  <Box flex={1} alignItems="center" w="100%" h="14px" borderRadius="full" bg="gray.800" position="relative" overflow="hidden" mb={0} p={0}
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
                  <Text color="#ED5FA7" fontWeight="bold" minW="32px" fontSize="sm" textAlign="left">{shortPercent.toFixed(0)}%</Text>
                </>
              )}
            </>
          )}
        </HStack>
        {/* Quick actions row (below bar) for binary market */}
        {!isMultiOutcome && showRatioBar && (
          <HStack spacing={2} w="100%" mt={2}>
            <Box
              as="button"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => handleQuickSelect(e, 'long')}
              flex={1}
              h="36px"
              borderRadius="16px"
              bgGradient="linear(to-b, #0e3b3b, #143f46)"
              border="1px solid #1c7a6a"
              boxShadow="inset 0 0 0 1px rgba(46, 204, 170, 0.15)"
              _hover={{ filter: 'brightness(1.08)' }}
              _active={{ transform: 'translateY(1px)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="#3EEBB4" fontWeight="bold" fontSize="md" letterSpacing={0.5}>LONG</Text>
            </Box>
            <Box
              as="button"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => handleQuickSelect(e, 'short')}
              flex={1}
              h="36px"
              borderRadius="16px"
              bgGradient="linear(to-b, #2a1a28, #2f2033)"
              border="1px solid #7a2d56"
              boxShadow="inset 0 0 0 1px rgba(255, 58, 122, 0.15)"
              _hover={{ filter: 'brightness(1.08)' }}
              _active={{ transform: 'translateY(1px)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="#FF6B9A" fontWeight="bold" fontSize="md" letterSpacing={0.5}>SHORT</Text>
            </Box>
          </HStack>
        )}
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

// Mapping from price_feed_id (hex string) to pair_name
const priceFeedIdToPair: Record<string, string> = {
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5": "APT/USD",
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
  "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d": "SOL/USD",
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744": "SUI/USD",
  "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f": "BNB/USD",
  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6": "WETH/USD",
};

// Convert bytes to hex string (if valid 64-char hex string, return as is)
function bytesToHex(bytes: number[] | Uint8Array | string | undefined): string {
  if (!bytes) return '';
  if (typeof bytes === 'string') {
    // If already a valid 64-char hex string, return as is
    if (/^[0-9a-fA-F]{64}$/.test(bytes)) return bytes.toLowerCase();
    return '';
  }
  if (!Array.isArray(bytes)) return '';

  const arr = bytes.filter(x => typeof x === 'number' && !isNaN(x) && x >= 0 && x <= 255);

  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getMarketCardTitle(market: Market | MarketInfo): string {
  const priceFeedHex = bytesToHex(Array.isArray((market as MarketInfo).price_feed_id) ? (market as MarketInfo).price_feed_id : []);
  const pairName = priceFeedIdToPair[priceFeedHex] || market.pair_name || '';
  const maturity = market.maturity_time ? new Date(Number(market.maturity_time) * 1000).toLocaleString() : '';
  
  // Check if this is a multi-outcome market
  const isMultiOutcome = (market as MarketInfo).market_type && !(market as MarketInfo).market_type?.is_binary;
  
  if (isMultiOutcome) {
    return `${pairName} will reach ____ at ${maturity}?`;
  } else {
    const strike = (Number(market.strike_price) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${pairName} will reach $${strike} by ${maturity}?`;
  }
}

export function getMarketLogoSrc(market: Market): string {
  const priceFeedHex = bytesToHex(Array.isArray((market as Market).price_feed_id) ? (market as Market).price_feed_id : []);
  const pairName = priceFeedIdToPair[priceFeedHex] || market.pair_name || '';
  let baseToken = '';
  if (pairName && pairName.includes('/')) {
    baseToken = pairName.split('/')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return baseToken ? `/images/${baseToken}-logo.png` : '/images/coinbase.png';
}

export default ListAddressMarketCard; 