import React from 'react';
import { Button } from '@chakra-ui/react';
import { FaRocket } from 'react-icons/fa';

interface DeployButtonProps {
  isDeploying: boolean;
  deployContractWithCheck: () => void;
  progress: number;
  signAndSubmitTransaction: any;
}

const DeployButton: React.FC<DeployButtonProps> = ({ isDeploying, deployContractWithCheck, progress, signAndSubmitTransaction }) => (
  <Button
    colorScheme="brand"
    onClick={deployContractWithCheck}
    isLoading={isDeploying}
    loadingText="Submitting..."
    size="lg"
    w="300px"
    borderRadius="xl"
    fontSize="xl"
    h="56px"
    _hover={{ bg: '#4F8CFF', color: 'white', boxShadow: '0 4px 16px #4F8CFF33' }}
    isDisabled={progress < 80 || !signAndSubmitTransaction}
    leftIcon={<FaRocket />}
    mt={8}
    display="block"
    mx="auto"
  >
    {isDeploying ? 'Deploying Market...' : 'Create Market'}
  </Button>
);

export default DeployButton; 