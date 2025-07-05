import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Button,
  Flex,
  Spinner,
  Card,
  CardBody,
  Heading,
  IconButton,
  Tooltip,
  useToast,
  Divider,
} from "@chakra-ui/react";
import {
  RepeatIcon,
  TimeIcon,
  ExternalLinkIcon,
  InfoOutlineIcon,
} from "@chakra-ui/icons";
import { NewsService, NewsArticle } from "../services/NewsService";

// --- API constants ---
const CRYPTOPANIC_API_KEY = "8ae0b6a4a27dfdd646c94faea903f8a30d5247f2";
const COINMARKETCAL_API_KEY = "4ECzX3OEyT7uohNB9mKPH5c7yuFrfJ1BIDhdSRob";

const GAINER_SYMBOLS = ["APT", "BTC", "ETH", "SOL", "SUI", "BNB", "WETH"];
const COIN_SYMBOLS = ["APT", "BTC", "ETH", "SOL", "SUI", "BNB", "WETH"];
const COINGECKO_IDS = ["aptos", "bitcoin", "ethereum", "solana", "sui", "binancecoin", "weth"];
const COIN_SYMBOL_MAP: Record<string, string> = {
  aptos: "APT",
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  sui: "SUI",
  binancecoin: "BNB",
  weth: "WETH",
};
const TABS = [
  { key: "1h", label: "1h", field: "price_change_percentage_1h_in_currency" },
  {
    key: "24h",
    label: "24h",
    field: "price_change_percentage_24h_in_currency",
  },
  { key: "7d", label: "7d", field: "price_change_percentage_7d_in_currency" },
];

const News: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [marketCoins, setMarketCoins] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<"1h" | "24h" | "7d">("24h");
  const [events, setEvents] = useState<any[]>([]);
  const [eventError, setEventError] = useState<string | null>(null);
  const toast = useToast();
  const newsService = NewsService.getInstance();

  // --- Fetch News (API cũ) ---
  const fetchNews = async () => {
    setLoading(true);
    try {
      const newsData = await newsService.fetchCryptoNews(30);
      setNews(newsData);
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch news. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch CoinGecko Market Data ---
  const fetchMarketCoins = async () => {
    try {
      const ids = COINGECKO_IDS.join(",");
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=1h,24h,7d`;
      const res = await fetch(url);
      const data = await res.json();
      setMarketCoins(data);
    } catch (error) {
      setMarketCoins([]);
    }
  };

  // --- Fetch CoinMarketCal Events ---
  const fetchEvents = async () => {
    setEventError(null);
    try {
      const res = await fetch("/api/coinmarketcal?max=12");
      if (!res.ok) {
        setEventError("API error: " + res.status + " - " + res.statusText);
        setEvents([]);
        return;
      }
      const data = await res.json();
      if (!data.body || !Array.isArray(data.body) || data.body.length === 0) {
        setEventError("No events found or API returned empty.");
        setEvents([]);
        return;
      }
      setEvents(data.body);
    } catch (error: any) {
      setEventError("API request failed: " + (error?.message || error));
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchMarketCoins();
    fetchEvents();
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleRefresh = () => {
    fetchNews();
    fetchMarketCoins();
    fetchEvents();
  };

  const handleArticleClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --- Layout ---
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={2}
      w="100%"
      p={{ base: 2, md: 2 }}
    >
      {/* Left: News List */}
      <Box flex={{ base: 12, md: 7 }} minW={0}>
        {/* Header */}
        <Flex
          justify="space-between"
          align="center"
          mb={4}
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Heading size="xl" color="white" mb={1} letterSpacing="tight">
              Crypto News
            </Heading>
            <Text color="gray.200" fontSize="md" fontWeight="medium">
              Latest updates from the cryptocurrency world
            </Text>
          </Box>
          <Flex align="center" gap={3} flexWrap="wrap">
            <Tooltip label="Refresh news">
              <IconButton
                aria-label="Refresh news"
                icon={<RepeatIcon />}
                onClick={handleRefresh}
                isLoading={loading}
                colorScheme="brand"
                variant="outline"
                size="sm"
                borderRadius="lg"
              />
            </Tooltip>
            <HStack>
              <TimeIcon color="brand.400" />
              <Text color="brand.300" fontSize="sm">
                {formatTimeAgo(lastUpdated.toISOString())}
              </Text>
            </HStack>
          </Flex>
        </Flex>
        {/* News List */}
        {loading ? (
          <Flex justify="center" align="center" minH="400px">
            <VStack spacing={4}>
              <Spinner size="xl" color="brand.400" />
              <Text color="gray.300">Loading latest news...</Text>
            </VStack>
          </Flex>
        ) : news.length === 0 ? (
          <Card bg="dark.800" border="1px solid" borderColor="dark.700">
            <CardBody textAlign="center" py={12}>
              <Text color="gray.300" fontSize="lg">
                No news found.
              </Text>
              <Button
                mt={4}
                colorScheme="brand"
                onClick={handleRefresh}
                leftIcon={<RepeatIcon />}
              >
                Refresh News
              </Button>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={3} align="stretch">
            {news.slice(0, 20).map((article) => (
              <Card
                key={article.id || article.url}
                bg="dark.800"
                border="1.5px solid"
                borderColor="dark.700"
                boxShadow="md"
                borderRadius="2xl"
                _hover={{
                  borderColor: "brand.500",
                  boxShadow: "0 8px 25px rgba(0, 115, 230, 0.18)",
                  transform: "translateY(-2px) scale(1.012)",
                }}
                transition="all 0.18s"
                cursor="pointer"
                onClick={() => handleArticleClick(article.url)}
                p={0}
                overflow="hidden"
              >
                <Flex direction={{ base: "column", md: "row" }}>
                  <Box
                    minW={{ base: "100%", md: "220px" }}
                    maxW={{ base: "100%", md: "220px" }}
                    h={{ base: "180px", md: "170px" }}
                    bg={
                      article.imageUrl
                        ? "gray.900"
                        : "linear-gradient(135deg, #23262f 60%, #4F8CFF 100%)"
                    }
                    bgImage={
                      article.imageUrl ? `url(${article.imageUrl})` : undefined
                    }
                    bgSize="cover"
                    bgPosition="center"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {!article.imageUrl && (
                      <Box color="whiteAlpha.700" fontSize="5xl">
                        <InfoOutlineIcon boxSize={12} />
                      </Box>
                    )}
                  </Box>
                  <Box
                    flex={1}
                    p={5}
                    display="flex"
                    flexDirection="column"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Heading
                        size="lg"
                        color="white"
                        mb={2}
                        noOfLines={2}
                        letterSpacing="tight"
                      >
                        {article.title}
                      </Heading>
                      <Text
                        color="whiteAlpha.900"
                        fontSize="md"
                        fontWeight="medium"
                        noOfLines={3}
                        mb={3}
                      >
                        {article.description}
                      </Text>
                    </Box>
                    <Flex justify="space-between" align="center" mt={2}>
                      <HStack spacing={3} color="brand.300" fontSize="sm">
                        <Text fontWeight="bold" color="white">
                          {article.source}
                        </Text>
                        <Divider
                          orientation="vertical"
                          h={4}
                          borderColor="gray.300"
                        />
                        <Text color="white">
                          {formatTimeAgo(article.publishedAt)}
                        </Text>
                      </HStack>
                      <Button
                        size="sm"
                        colorScheme="brand"
                        variant="solid"
                        borderRadius="lg"
                        rightIcon={<ExternalLinkIcon />}
                        fontWeight="bold"
                        px={5}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArticleClick(article.url);
                        }}
                      >
                        Read more
                      </Button>
                    </Flex>
                  </Box>
                </Flex>
              </Card>
            ))}
          </VStack>
        )}
      </Box>
      {/* Right: Crypto Info Box */}
      <Box
        flex={{ base: 12, md: 5 }}
        minW={{ base: "100%", md: "320px" }}
        maxW={{ md: "420px" }}
        mt={{ base: 8, md: 0 }}
        display="flex"
        flexDirection="column"
        gap={6}
      >
        {/* Coin List (giống bảng bên phải hình) */}
        <Card
          bg="dark.800"
          borderRadius="2xl"
          boxShadow="lg"
          border="1.5px solid #23262f"
          p={0}
        >
          <CardBody p={4}>
            <Flex gap={2} direction="column">
              <Flex gap={2} mb={2}>
                {TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    size="xs"
                    variant={selectedTab === tab.key ? "solid" : "ghost"}
                    colorScheme={selectedTab === tab.key ? "brand" : "gray"}
                    onClick={() =>
                      setSelectedTab(tab.key as "1h" | "24h" | "7d")
                    }
                  >
                    {tab.label}
                  </Button>
                ))}
              </Flex>
              {marketCoins.map((coin) => (
                <Flex
                  key={coin.id}
                  align="center"
                  justify="space-between"
                  py={1}
                  borderBottom="1px solid #23262f"
                >
                  <Box
                    minW="60px"
                    color={COIN_SYMBOL_MAP[coin.id] === "MC" ? "gold" : "white"}
                    fontWeight="bold"
                  >
                    {COIN_SYMBOL_MAP[coin.id] || coin.symbol.toUpperCase()}
                  </Box>
                  <Box minW="90px" color="white">
                    ${coin.current_price.toLocaleString()}
                  </Box>
                  <Box
                    minW="60px"
                    fontWeight="bold"
                    color={
                      coin[
                        `price_change_percentage_${selectedTab}_in_currency`
                      ] >= 0
                        ? "#00ea00"
                        : "#ff3a7a"
                    }
                  >
                    {coin[
                      `price_change_percentage_${selectedTab}_in_currency`
                    ] >= 0
                      ? "+"
                      : ""}
                    {coin[`price_change_percentage_${selectedTab}_in_currency`]
                      ? coin[
                          `price_change_percentage_${selectedTab}_in_currency`
                        ].toFixed(2)
                      : "0.00"}
                    %
                  </Box>
                </Flex>
              ))}
            </Flex>
          </CardBody>
        </Card>
        {/* Upcoming Events */}
        <Card
          bg="dark.800"
          borderRadius="2xl"
          boxShadow="lg"
          border="1.5px solid #23262f"
          p={0}
        >
          <CardBody p={6}>
            <Heading size="md" color="white" mb={4} letterSpacing="tight">
              Upcoming Events
            </Heading>
            {eventError ? (
              <Box color="red.300" mb={2}>
                <Text fontWeight="bold">
                  Unable to fetch data from CoinMarketCal API.
                </Text>
                <Text fontSize="sm">{eventError}</Text>
                <Text fontSize="sm" mt={2}>
                  <b>API Troubleshooting Guide:</b>
                  <br />
                  1. Check if the API key is still valid and correct.
                  <br />
                  2. Visit{" "}
                  <a
                    href="https://developers.coinmarketcal.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#4F8CFF" }}
                  >
                    CoinMarketCal API Docs
                  </a>{" "}
                  to test directly.
                  <br />
                  3. Check the network request in DevTools (F12) to view
                  detailed errors.
                  <br />
                  4. If the error persists, try generating a new API key or
                  contact CoinMarketCal support.
                  <br />
                </Text>
              </Box>
            ) : events.length === 0 ? (
              <Text color="gray.400">No events found.</Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {events.map((event: any) => (
                  <Flex
                    key={event.id}
                    align="flex-start"
                    gap={3}
                    bg="#181A20"
                    borderRadius="lg"
                    px={2}
                    py={2}
                    as="a"
                    href={event.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ bg: "#23262f", boxShadow: "0 0 0 2px #4F8CFF" }}
                    cursor="pointer"
                    transition="all 0.15s"
                  >
                    {/* Thumbnail */}
                    {event.proof && (
                      <Box
                        minW="44px"
                        maxW="44px"
                        h="44px"
                        mr={2}
                        display="flex"
                        alignItems="center"
                      >
                        <Image
                          src={event.proof}
                          alt="event"
                          boxSize="44px"
                          borderRadius="md"
                          objectFit="cover"
                        />
                      </Box>
                    )}
                    <Box flex={1}>
                      <Text
                        color="white"
                        fontWeight="bold"
                        _hover={{
                          textDecoration: "underline",
                          color: "brand.400",
                        }}
                      >
                        {event.title?.en || event.title}
                      </Text>
                      {/* Category badge */}
                      {event.categories && event.categories.length > 0 && (
                        <HStack spacing={1} mb={1} mt={1}>
                          {event.categories.map((cat: any) => (
                            <Box
                              key={cat.id}
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              bg="brand.900"
                              color="white"
                              fontSize="xs"
                              fontWeight="bold"
                            >
                              {cat.name}
                            </Box>
                          ))}
                        </HStack>
                      )}
                      <Text color="brand.400" fontSize="sm" fontWeight="bold">
                        {event.displayed_date || event.date_event || event.date}
                      </Text>
                      <Text color="gray.300" fontSize="sm">
                        {event.coins && event.coins.length > 0
                          ? event.coins.map((c: any) => c.fullname).join(", ")
                          : ""}
                      </Text>
                      {event.created_date && (
                        <Text color="gray.500" fontSize="xs" mt={1}>
                          Created:{" "}
                          {new Date(event.created_date).toLocaleDateString()}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>
    </Flex>
  );
};

export default News;
