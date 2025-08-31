import React from 'react';
import { Box } from '@chakra-ui/react';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box bg="dark.800" minH="100vh">
      {children}
    </Box>
  );
};

export default MainLayout; 