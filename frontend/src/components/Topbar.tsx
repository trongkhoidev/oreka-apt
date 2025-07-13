import React, { useState, useRef } from 'react';
import { Flex, InputGroup, InputLeftElement, Input, Box, List, ListItem, Spinner, Text, HStack, Icon, useOutsideClick } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaNewspaper } from 'react-icons/fa';
import ConnectWallet from './ConnectWallet';
import { useRouter } from 'next/router';
import { SearchService, SearchResult } from '../services/SearchService';
import Image from 'next/image';

const Topbar: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
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
    const res = await SearchService.searchAll(value);
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
    <Flex w="full" align="center" justify="space-between" py={6} px={0} position="relative" zIndex={20}>
      <div ref={ref} style={{ position: 'relative', width: '70%', maxWidth: 500 }}>
        <InputGroup>
          <InputLeftElement pointerEvents="none"><SearchIcon color="#4F8CFF" /></InputLeftElement>
          <Input
            placeholder="Search Oreka"
            bg="#181A20"
            color="white"
            borderColor="#fff"
            borderWidth="1px"
            borderRadius="xl"
            fontSize="md"
            py={6}
            px={4}
            boxShadow="0 4px 16px #fff2"
            _placeholder={{ color: '#fff' }}
            _focus={{ borderColor: '#fff', boxShadow: '0 0 0 2px #fff8' }}
            _hover={{ borderColor: '#fff' }}
            value={search}
            onChange={handleSearch}
            onFocus={() => search && setShowDropdown(true)}
            autoComplete="off"
          />
        </InputGroup>
        {showDropdown && (
          <Box position="absolute" top="110%" left={0} w="full" bg="#181A20" borderRadius="xl" boxShadow="xl" mt={2} zIndex={99} maxH="350px" overflowY="auto" border="1.5px solid #4F8CFF">
            {loading ? (
              <HStack p={4} justify="center"><Spinner size="sm" color="#4F8CFF" /><Text color="#A770EF">Searching...</Text></HStack>
            ) : results.length === 0 ? (
              <Text p={4} color="#A770EF">No results found.</Text>
            ) : (
              <List spacing={0}>
                {results.map((item, idx) => (
                  <ListItem
                    key={item.id + idx}
                    px={4}
                    py={3}
                    borderBottom={idx !== results.length - 1 ? '1px solid #23262f' : undefined}
                    _hover={{ bg: '#23262f', cursor: 'pointer' }}
                    onClick={() => handleSelect(item)}
                  >
                    <HStack spacing={3} align="flex-start">
                      {/* Avatar/logo for market */}
                      {item.type === 'market' ? (
                        <Box boxSize={8} borderRadius="full" overflow="hidden" bg="#23262f">
                          <Image
                            src={(item as { imgSrc?: string }).imgSrc || '/images/coinbase.png'}
                            alt={item.pair}
                            width={32}
                            height={32}
                            onError={e => { e.currentTarget.src = '/images/coinbase.png'; }}
                          />
                        </Box>
                      ) : (
                        <Icon as={FaNewspaper} color="#A770EF" boxSize={5} mt={1} />
                      )}
                      <Box flex={1}>
                        <Text color="white" fontWeight="medium" fontSize="md" noOfLines={2}>
                         
                          {item.type === 'market' ? (item as unknown as { cardTitle?: string }).cardTitle : item.title}
                        </Text>
                        
                      </Box>
                      <Text color="#A770EF" fontSize="sm" ml="auto">{item.type === 'market' ? 'Market' : 'News'}</Text>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </div>
      <Box ml={4}><ConnectWallet /></Box>
    </Flex>
  );
};

export default Topbar; 