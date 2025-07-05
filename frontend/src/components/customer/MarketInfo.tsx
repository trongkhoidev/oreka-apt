import { Box, HStack, Image, Heading, Text, Icon } from '@chakra-ui/react';
import { PiChartLineUpLight } from 'react-icons/pi';
import { FaRegClock } from 'react-icons/fa';
import { GrInProgress } from 'react-icons/gr';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface MarketInfoProps {
  assetLogo: string;
  pairName: string;
  strike: string;
  maturity: string;
  pool: string;
  fee: string;
  phase: Phase;
  phaseNames: string[];
}

const MarketInfo: React.FC<MarketInfoProps> = ({ assetLogo, pairName, strike, maturity, pool, fee, phase, phaseNames }) => (
  <Box display="flex" alignItems="center" mb={6}>
    <HStack>
      <Image src={assetLogo} alt={pairName} boxSize="50px" mr={4} />
      <Box>
        <Heading size="md" fontSize="30px">
          <HStack>
            <Text color="white" fontSize="30px">{pairName}</Text>
            <Text color="white" fontSize="25px">
              will reach <Text as="span" color="#FEDF56">${strike}</Text> by {maturity}
            </Text>
          </HStack>
        </Heading>
        <HStack spacing={2}>
          <HStack color="gray.400">
            <Icon as={PiChartLineUpLight} />
            <Text color="gray.400" fontSize="sm">{pool} APT |</Text>
          </HStack>
          <HStack color="gray.400">
            <Icon as={FaRegClock} />
            <Text color="gray.400" fontSize="sm">{maturity} |</Text>
          </HStack>
          <HStack color="gray.400">
            <Icon as={GrInProgress} />
            <Text color="gray.400" fontSize="sm">Phase: {phaseNames[phase]} |</Text>
          </HStack>
          <HStack color="gray.400">
            <Text color="gray.400" fontSize="sm">Fee: {fee}%</Text>
          </HStack>
        </HStack>
      </Box>
    </HStack>
  </Box>
);

export default MarketInfo; 