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
import React, { useEffect, useState, useCallback, createContext } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FaWallet } from "react-icons/fa";
import { getAptosClient } from "../config/network";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    aptos?: unknown;
    pontem?: unknown;
  }
}

const shortenAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const WalletBalanceContext = createContext<{ refreshBalance: () => void }>({ refreshBalance: () => {} });

export default function ConnectWallet() {
  const toast = useToast();
  const { connect, disconnect, account, connected, wallets, wallet } =
    useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug: Log all wallets and their states
  useEffect(() => {
    console.log('All wallets detected:', wallets.length);
    wallets.forEach(w => {
      console.log(`Wallet: ${w.name}, ReadyState: ${w.readyState}, Type: ${typeof w.readyState}`);
    });
  }, [wallets]);

  // Fetch balance logic
  const fetchBalance = useCallback(async () => {
    if (connected && account?.address) {
      setLoading(true);
      try {
        const aptos = getAptosClient();
        const bal = await aptos.getAccountAPTAmount({
          accountAddress: String(account.address),
        });
        const newBalance = (Number(bal) / 1e8).toFixed(4);
        // Only update state if balance changed
        setBalance(prev => (prev !== newBalance ? newBalance : prev));
      } catch {
        setBalance(null);
      } finally {
        setLoading(false);
      }
    }
  }, [connected, account]);

  // Fetch on connect/account change
  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // Expose refreshBalance for other components
  const refreshBalance = fetchBalance;

  // Manual wallet list for fallback (always show these)
  const MANUAL_WALLETS = [
    {
      name: "Petra",
      icon: "/images/petra.png",
      installUrl: "https://petra.app/",
    },
    {
      name: "Pontem Wallet",
      icon: "/images/pontem.png",
      installUrl: "https://pontem.network/pontem-wallet",
    },
  ];

  // Merge manual list with detected wallets (from useWallet)
  const walletList = MANUAL_WALLETS.map((manual) => {
    const detected = wallets.find((w) => w.name === manual.name);
    return {
      ...manual,
      isInstalled: detected ? ["Installed", "Loadable"].includes(String(detected.readyState)) : false,
      icon: detected ? detected.icon : manual.icon,
    };
  });

  if (!isClient) return null;

  if (connected && account) {
    return (
      <WalletBalanceContext.Provider value={{ refreshBalance }}>
        <HStack
          spacing={3}
          px={3}
          py={2}
          borderRadius="xl"
          bg="#181A20"
          border="1px solid #23262f"
        >
          {wallet && <Image src={wallet.icon} alt={wallet.name} boxSize="28px" />}
          <Text
            fontWeight="bold"
            color="white"
            fontSize="md"
            px={2}
            bg="#23262f"
            borderRadius="md"
            letterSpacing="wider"
          >
            {shortenAddress(account?.address?.toString?.() || "")}
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
            display="flex"
            alignItems="center"
          >
            {loading ? (
              <Spinner size="xs" color="#4F8CFF" />
            ) : balance ? (
              `${balance} APT`
            ) : (
              "--"
            )}
            {/* Optional manual refresh button */}
            <Button onClick={refreshBalance} size="xs" ml={2} variant="ghost" colorScheme="blue" isLoading={loading}>
              ↻
            </Button>
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
      </WalletBalanceContext.Provider>
    );
  }

  return (
    <WalletBalanceContext.Provider value={{ refreshBalance }}>
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
          {walletList.map((wallet) => {
            const handleConnect = async () => {
              if (!wallet.isInstalled) {
                toast({
                  title: `Wallet not installed`,
                  description: `Please install ${wallet.name} extension before connecting.`,
                  status: "warning",
                  duration: 4000,
                  isClosable: true,
                });
                return;
              }
              try {
                await connect(wallet.name);
                toast({
                  title: "Wallet connected!",
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              } catch (error: unknown) {
                toast({
                  title: "Failed to connect wallet",
                  description: error instanceof Error ? error.message : `Make sure ${wallet.name} is unlocked.`,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
              }
            };

            return (
              <MenuItem key={wallet.name}>
                <HStack w="full" justify="space-between">
                  <HStack>
                    <Image src={wallet.icon} alt={wallet.name} boxSize="24px" />
                    <Text color='red' fontWeight='bold'>{wallet.name}</Text>
                  </HStack>
                  {wallet.isInstalled ? (
                    <Button
                      size="sm"
                      colorScheme="brand"
                      variant="solid"
                      borderRadius="md"
                      onClick={handleConnect}
                    >
                      Connect Wallet
                    </Button>
                  ) : (
                    <Button
                      as="a"
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      colorScheme="orange"
                      variant="outline"
                      borderRadius="md"
                      title={`Install ${wallet.name} to use. Click here`}
                    >
                      Install
                    </Button>
                  )}
                </HStack>
              </MenuItem>
            );
          })}
        </MenuList>
      </Menu>
    </WalletBalanceContext.Provider>
  );
}
