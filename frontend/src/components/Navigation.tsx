import React from 'react';
import {
  Box,
  VStack,
  Button,
  Icon,
  Text,
  Divider,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FaHome, FaPlus, FaList, FaNewspaper, FaUser, FaTrophy, FaBook } from 'react-icons/fa';
import Link from 'next/link';

const NavigationSidebar: React.FC = () => {
  const router = useRouter();
  return (
    <Box
      w={{ base: '100px', md: '280px' }}
      bg="#0A0B0F"
      color="white"
      py={12}
      px={6}
      boxShadow="0 4px 32px #0A0B0F99"
      display="flex"
      flexDirection="column"
      alignItems="center"
      minH="100vh"
      position="fixed"
      left={0}
      top={0}
      zIndex={100}
      style={{ boxSizing: 'border-box' }}
    >
      <VStack spacing={12} w="full">
        <Box mb={12} textAlign="center">
          <Text fontSize="4xl" fontWeight="extrabold" bgGradient="linear(to-r, #4F8CFF, #A770EF)" bgClip="text" letterSpacing="wider" textShadow="0 0 24px #4F8CFF99" fontFamily="'Orbitron', sans-serif">OREKA</Text>
        </Box>
        <VStack spacing={6} align="stretch" w="full" flex="1">
          <Link href="/" passHref legacyBehavior>
            <Button as="a" leftIcon={<Icon as={FaHome} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
              bg={router.pathname === '/' ? '#23262f' : 'transparent'}
              color={router.pathname === '/' ? 'white' : '#A0A4AE'}
              borderRadius="full"
              fontWeight={router.pathname === '/' ? 'bold' : 'normal'}
              fontSize="xl"
              py={6}
              pl={8}
              _hover={{ bg: router.pathname === '/' ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
              _active={{ bg: '#23262f', color: 'white' }}
            >Home</Button>
          </Link>
          <Link href="/owner" passHref legacyBehavior>
            <Button as="a" leftIcon={<Icon as={FaPlus} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
              bg={router.pathname === '/owner' ? '#23262f' : 'transparent'}
              color={router.pathname === '/owner' ? 'white' : '#A0A4AE'}
              borderRadius="full"
              fontWeight={router.pathname === '/owner' ? 'bold' : 'normal'}
              fontSize="xl"
              py={6}
              pl={8}
              _hover={{ bg: router.pathname === '/owner' ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
              _active={{ bg: '#23262f', color: 'white' }}
            >Create Market</Button>
          </Link>
          <Link href="/listaddress" passHref legacyBehavior>
            <Button
              as="a"
              leftIcon={<Icon as={FaList} fontSize="2xl" />}
              variant="ghost"
              w="full"
              justifyContent="flex-start"
              bg={router.pathname.startsWith('/listaddress') ? '#23262f' : 'transparent'}
              color={router.pathname.startsWith('/listaddress') ? 'white' : '#A0A4AE'}
              borderRadius="full"
              fontWeight={router.pathname.startsWith('/listaddress') ? 'bold' : 'normal'}
              fontSize="xl"
              py={6}
              pl={8}
              _hover={{ bg: router.pathname.startsWith('/listaddress') ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
              _active={{ bg: '#23262f', color: 'white' }}
              onClick={e => {
                if (router.pathname.startsWith('/listaddress')) {
                  e.preventDefault();
                }
              }}
            >
              Markets
            </Button>
          </Link>
          <Link href="/news" passHref legacyBehavior>
            <Button as="a" leftIcon={<Icon as={FaNewspaper} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
              bg={router.pathname === '/news' ? '#23262f' : 'transparent'}
              color={router.pathname === '/news' ? 'white' : '#A0A4AE'}
              borderRadius="full"
              fontWeight={router.pathname === '/news' ? 'bold' : 'normal'}
              fontSize="xl"
              py={6}
              pl={8}
              _hover={{ bg: router.pathname === '/news' ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
              _active={{ bg: '#23262f', color: 'white' }}
            >News</Button>
          </Link>
          <Box mt="auto" w="full">
            <Divider borderColor="#23262f" mb={4} />
          </Box>
          <VStack spacing={4} align="stretch" w="full" mt={4}>
            <Link href="/profiles" passHref legacyBehavior>
              <Button as="a" leftIcon={<Icon as={FaUser} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
                bg={router.pathname === '/profiles' ? '#23262f' : 'transparent'}
                color={router.pathname === '/profiles' ? 'white' : '#A0A4AE'}
                borderRadius="full"
                fontWeight={router.pathname === '/profiles' ? 'bold' : 'normal'}
                fontSize="xl"
                py={6}
                pl={8}
                _hover={{ bg: router.pathname === '/profiles' ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
                _active={{ bg: '#23262f', color: 'white' }}
              >Profiles</Button>
            </Link>
            <Link href="/leaderboards" passHref legacyBehavior>
              <Button as="a" leftIcon={<Icon as={FaTrophy} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
                bg={router.pathname === '/leaderboards' ? '#23262f' : 'transparent'}
                color={router.pathname === '/leaderboards' ? 'white' : '#A0A4AE'}
                borderRadius="full"
                fontWeight={router.pathname === '/leaderboards' ? 'bold' : 'normal'}
                fontSize="xl"
                py={6}
                pl={8}
                _hover={{ bg: router.pathname === '/leaderboards' ? '#23262f' : 'rgba(79,140,255,0.04)', color: 'white' }}
                _active={{ bg: '#23262f', color: 'white' }}
              >Leaderboards</Button>
            </Link>
            <Button as="a" href="https://oreka-documentation.vercel.app/" target="_blank" rel="noreferrer"
              leftIcon={<Icon as={FaBook} fontSize="2xl" />} variant="ghost" w="full" justifyContent="flex-start"
              bg="transparent" color="#A0A4AE" borderRadius="full" fontSize="xl" py={6} pl={8}
              _hover={{ bg: 'rgba(79,140,255,0.04)', color: 'white' }} _active={{ bg: '#23262f', color: 'white' }}
            >Documentation</Button>
          </VStack>
        </VStack>
      </VStack>
      <Box position="absolute" right={0} top={0} w="1.5px" h="100vh" bg="#23262f" zIndex={200} /> // update
    </Box>
  );
};

export default NavigationSidebar; 