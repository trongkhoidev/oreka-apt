import React from 'react';
import { Box, Flex, Divider } from '@chakra-ui/react';
import NavigationSidebar from '../components/Navigation';
import Topbar from '../components/Topbar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <NavigationSidebar />
      <Box ml={{ base: '100px', md: '280px' }} bg="dark.800" minH="100vh" px={{ base: 2, md: 10 }}>
        <Topbar />
        <Box mt={6}>{children}</Box>
      </Box>
    </>
  );
};

export default MainLayout; 