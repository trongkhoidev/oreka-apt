import React, { useState, useRef } from 'react';
import { Flex, InputGroup, InputLeftElement, Input, Box, List, ListItem, Spinner, Text, HStack, Icon, useOutsideClick, Avatar, Menu, MenuButton, MenuList, MenuItem, MenuDivider, VStack, Button, Badge } from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaNewspaper, FaUser, FaCog, FaBook, FaSignOutAlt, FaWallet } from 'react-icons/fa';
import ConnectWallet from './ConnectWallet';
import { useRouter } from 'next/router';
import { SearchService, SearchResult } from '../services/SearchService';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Image from 'next/image';

const Topbar: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { account, connected, disconnect } = useWallet();
  useOutsideClick({ ref, handler: () => setShowDropdown(false) });

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (!value) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    setShowDropdown(true);
    const res = await SearchService.search(value);
    setResults(res);
    setLoading(false);
  };

  const handleSelect = (item: SearchResult) => {
    setShowDropdown(false);
    setSearch('');
    if (item.type === 'market') {
      router.push(`/customer/${item.id}`);
    } else if (item.type === 'news') {
      window.open(item.url, '_blank');
    }
  };

  return (
    <Flex 
      w="full" 
      align="center" 
      justify="space-between" 
      py={4} 
      px={8} 
      position="fixed" 
      top={0} 
      left={0} 
      right={0}
      zIndex={20}
      bg="rgba(24, 26, 32, 0.98)"
      backdropFilter="blur(20px)"
      borderBottom="1px solid rgba(255,255,255,0.08)"
    >
      {/* Logo and Search Bar Container */}
      <Flex align="center" gap={6}>
        {/* Logo */}
        <Box>
          <Text 
            fontSize={{ base: "xl", md: "2xl" }} 
            fontWeight="bold" 
            color="white" 
            cursor="pointer" 
            onClick={() => router.push('/listaddress')}
            bgGradient="linear(to-r, #4F8CFF, #A770EF)"
            bgClip="text"
            _hover={{
              bgGradient: "linear(to-r, #A770EF, #4F8CFF)",
              transform: "scale(1.05)"
            }}
            transition="all 0.3s ease"
            letterSpacing="wider"
          >
            OREKA
          </Text>
        </Box>

        {/* Search Bar */}
        <div ref={ref} style={{ position: 'relative', width: '450px', maxWidth: '500px' }}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="#4F8CFF" boxSize={5} />
            </InputLeftElement>
            <Input
              placeholder="Search markets, creators..."
              bg="rgba(255,255,255,0.06)"
              color="white"
              borderColor="rgba(255,255,255,0.15)"
              borderWidth="1px"
              borderRadius="lg"
              fontSize="sm"
              py={4}
              px={3}
              boxShadow="0 2px 8px rgba(0,0,0,0.1)"
              _placeholder={{ color: 'rgba(255,255,255,0.5)' }}
              _focus={{ 
                borderColor: '#4F8CFF', 
                boxShadow: '0 0 0 2px rgba(79, 140, 255, 0.2)',
                bg: 'rgba(255,255,255,0.08)'
              }}
              _hover={{ 
                borderColor: 'rgba(255,255,255,0.2)',
                bg: 'rgba(255,255,255,0.08)'
              }}
              value={search}
              onChange={handleSearch}
              onFocus={() => search && setShowDropdown(true)}
              autoComplete="off"
              transition="all 0.2s ease"
            />
          </InputGroup>
                  {showDropdown && (
            <Box 
              position="absolute" 
              top="110%" 
              left={0} 
              w="full" 
              bg="rgba(24, 26, 32, 0.98)" 
              borderRadius="lg" 
              boxShadow="0 4px 20px rgba(0,0,0,0.3)" 
              mt={2} 
              zIndex={99} 
              maxH="350px" 
              overflowY="auto" 
              border="1px solid rgba(255,255,255,0.1)"
              backdropFilter="blur(15px)"
            >
              {loading ? (
                <HStack p={4} justify="center">
                  <Spinner size="sm" color="#4F8CFF" />
                  <Text color="#A770EF" fontSize="sm">Searching...</Text>
                </HStack>
              ) : results.length === 0 ? (
                <Text p={4} color="#A770EF" fontSize="sm" textAlign="center">No results found</Text>
              ) : (
                <List spacing={0}>
                  {results.map((item, idx) => (
                    <ListItem
                      key={item.id + idx}
                      px={4}
                      py={3}
                      borderBottom={idx !== results.length - 1 ? '1px solid rgba(255,255,255,0.1)' : undefined}
                      _hover={{ bg: 'rgba(79, 140, 255, 0.1)', cursor: 'pointer' }}
                      onClick={() => handleSelect(item)}
                      transition="all 0.2s ease"
                    >
                      <HStack spacing={3} align="flex-start">
                        {/* Avatar/logo for market */}
                        {item.type === 'market' ? (
                          <Box boxSize={8} borderRadius="full" overflow="hidden" bg="rgba(255,255,255,0.1)">
                            <Image
                              src={(item as { imgSrc?: string }).imgSrc || '/images/coinbase.png'}
                              alt={item.pair || 'Market'}
                              width={32}
                              height={32}
                              onError={e => { e.currentTarget.src = '/images/coinbase.png'; }}
                            />
                          </Box>
                        ) : (
                          <Icon as={FaNewspaper} color="#A770EF" boxSize={5} mt={1} />
                        )}
                        <Box flex={1}>
                          <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                            {item.type === 'market' ? (item as unknown as { cardTitle?: string }).cardTitle : item.title}
                          </Text>
                        </Box>
                        <Badge 
                          size="sm" 
                          variant="outline" 
                          colorScheme="brand"
                          borderRadius="md"
                          px={2}
                          py={1}
                        >
                          {item.type === 'market' ? 'Market' : 'News'}
                        </Badge>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </div>
      </Flex>

      {/* Create Market and Wallet Connection */}
      <Flex align="center" gap={4}>
        {/* Create Market Button */}
        <Button
          onClick={() => router.push('/owner')}
          bg="linear-gradient(135deg, #4F8CFF 0%, #A770EF 100%)"
          color="white"
          _hover={{
            bg: "linear-gradient(135deg, #A770EF 0%, #4F8CFF 100%)",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(79, 140, 255, 0.3)"
          }}
          _active={{
            transform: "translateY(0)"
          }}
          px={6}
          py={2}
          borderRadius="lg"
          fontWeight="semibold"
          fontSize="sm"
          transition="all 0.2s ease"
        >
          Create Market
        </Button>

        {/* Wallet Connection */}
        {!connected ? (
          <ConnectWallet />
        ) : (
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDownIcon />}
            variant="ghost"
            bg="transparent"
            _hover={{ bg: 'rgba(255,255,255,0.1)' }}
            color="white"
            px={4}
            py={2}
            borderRadius="lg"
          >
            <HStack spacing={3}>
              <Avatar 
                size="sm" 
                name={account?.address?.toString().substring(0, 6) || 'User'}
                bg="#4F8CFF"
                color="white"
              />
              <VStack spacing={0} align="start">
                <Text fontSize="sm" fontWeight="medium" color="white">
                  {account?.address?.toString().substring(0, 6)}...{account?.address?.toString().substring(account?.address?.toString().length - 4)}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Connected
                </Text>
              </VStack>
            </HStack>
          </MenuButton>
          <MenuList bg="#181A20" border="1px solid #23262f" borderRadius="lg">
            <MenuItem 
              icon={<FaUser />} 
              onClick={() => router.push('/profile')}
              _hover={{ bg: '#23262f' }}
              color="white"
            >
              Profile
            </MenuItem>
            <MenuItem 
              icon={<FaWallet />} 
              onClick={() => router.push('/listaddress')}
              _hover={{ bg: '#23262f' }}
              color="white"
            >
              Markets
            </MenuItem>
            <MenuItem 
              icon={<FaBook />} 
              onClick={() => router.push('/documentation')}
              _hover={{ bg: '#23262f' }}
              color="white"
            >
              Documentation
            </MenuItem>
            <MenuDivider borderColor="#23262f" />
            <MenuItem 
              icon={<FaCog />} 
              _hover={{ bg: '#23262f' }}
              color="white"
            >
              Settings
            </MenuItem>
            <MenuItem 
              icon={<FaSignOutAlt />} 
              onClick={disconnect}
              _hover={{ bg: '#23262f' }}
              color="white"
            >
              Disconnect
            </MenuItem>
          </MenuList>
        </Menu>
        )}
      </Flex>
    </Flex>
  );
};

export default Topbar; 