import {
  Button,
  useToast,
  HStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Image,
  Icon,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FaWallet } from "react-icons/fa";
import { getAptosClient } from "../services/aptosMarketService";

const shortenAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function ConnectWallet() {
  const toast = useToast();
  const { connect, disconnect, account, connected, wallets, wallet } =
    useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && account?.address) {
        setLoading(true);
        try {
          const aptos = getAptosClient();
          const bal = await aptos.getAccountAPTAmount({
            accountAddress: String(account.address),
          });
          setBalance((Number(bal) / 1e8).toFixed(4));
        } catch {
          setBalance(null);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBalance();
  }, [connected, account]);

  if (connected && account) {
    return (
      <HStack
        spacing={3}
        px={3}
        py={2}
        borderRadius="xl"
        bg="#181A20"
        border="1px solid #23262f"
      >
        {wallet && <Image src={wallet.icon} alt={wallet.name} boxSize="28px" />}
        <Icon as={FaWallet} color="#4F8CFF" fontSize="xl" />
        <Text
          fontWeight="bold"
          color="white"
          fontSize="md"
          px={2}
          bg="#23262f"
          borderRadius="md"
          letterSpacing="wider"
        >
          {shortenAddress(account.address.toString())}
        </Text>
        <Box
          px={2}
          py={1}
          bg="#23262f"
          borderRadius="md"
          color="#4F8CFF"
          fontWeight="bold"
          fontSize="md"
          minW="90px"
          textAlign="right"
        >
          {loading ? (
            <Spinner size="xs" color="#4F8CFF" />
          ) : balance ? (
            `${balance} APT`
          ) : (
            "--"
          )}
        </Box>
        <Button
          size="sm"
          colorScheme="accent"
          variant="outline"
          borderRadius="md"
          onClick={disconnect}
          color="red"
        >
          Disconnect
        </Button>
      </HStack>
    );
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        leftIcon={<FaWallet />}
        colorScheme="brand"
        borderRadius="xl"
      >
        Connect Wallet
      </MenuButton>
      <MenuList>
        {wallets.map((wallet) => (
          <MenuItem
            key={wallet.name}
            onClick={async () => {
              try {
                await connect(wallet.name);
                toast({
                  title: "Wallet connected!",
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              } catch (error: any) {
                toast({
                  title: "Failed to connect wallet",
                  description:
                    error?.message ||
                    `Please make sure ${wallet.name} is installed and unlocked.`,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
              }
            }}
          >
            <HStack>
              <Image src={wallet.icon} alt={wallet.name} boxSize="24px" />
              <Text>{wallet.name}</Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
