import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

interface DeployProgressBarProps {
  progress: number;
  isFinishing: boolean;
}

const DeployProgressBar: React.FC<DeployProgressBarProps> = ({ progress, isFinishing }) => (
  <Box mt={10} w="100%">
    <HStack spacing={4} justify="space-between" mb={2}>
      <Text color={progress < 1 ? 'white' : 'white'} fontWeight={progress < 1 ? 'bold' : 'normal'}>Initial</Text>
      <Text color={progress < 100 ? 'white' : 'white'} fontWeight={progress >= 80 && !isFinishing ? 'bold' : 'normal'}>Creating</Text>
      <Text color={progress === 100 ? 'white' : 'gray.400'} fontWeight={progress === 100 ? 'bold' : 'normal'}>Finished</Text>
    </HStack>
    <Box position="relative" h="8px" bg="#23262f" borderRadius="full" w="full">
      <Box position="absolute" left={0} top={0} h="8px" borderRadius="full" bgGradient="linear(to-r, #4F8CFF, #A770EF)" w={`${progress}%`} transition="width 0.4s cubic-bezier(.4,2,.6,1)" />
    </Box>
  </Box>
);

export default DeployProgressBar; 