import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Flex, Text, Button, Container, useToast, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { placeBet, claimWinnings, withdrawFees, getMarketDetails, getUserPosition } from '../services/aptosMarketService';
import MarketCharts from './charts/MarketCharts';
import MarketInfo from './customer/MarketInfo';
import MarketTimeline from './customer/MarketTimeline';
import MarketBetPanel from './customer/MarketBetPanel';
import MarketRules from './customer/MarketRules';
import type { Market } from '../types';

enum Phase { Pending = 0, Bidding = 1, Maturity = 2 }

interface CustomerProps {
  contractAddress: string;
}

const phaseNames = ['Pending', 'Bidding', 'Maturity'];

const Customer: React.FC<CustomerProps> = ({ contractAddress }) => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const toast = useToast();

  // State
  const [market, setMarket] = useState<Market | null>(null);
  const [phase, setPhase] = useState<Phase>(Phase.Pending);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [userPositions, setUserPositions] = useState<{ [outcomeIndex: number]: number }>({});
  const [hasClaimed, setHasClaimed] = useState(false);

  // Handlers
  const handleBet = async () => {
    if (selectedOutcome === null || !bidAmount || !signAndSubmitTransaction) return;
    if (!connected || !account?.address) {
      toast({ title: 'Please connect your wallet to perform this action.', status: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      await placeBet(signAndSubmitTransaction, contractAddress, selectedOutcome, parseFloat(bidAmount));
      toast({ title: 'Bet submitted', status: 'success' });
      await fetchMarketData();
      await fetchUserPositions();
    } catch (error) {
      console.error('Error placing bet:', error);
      toast({ title: 'Failed to place bet', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async () => {
    if (!signAndSubmitTransaction || !connected) return;
    setIsSubmitting(true);
    try {
      await claimWinnings(signAndSubmitTransaction, contractAddress);
      toast({ title: 'Claim transaction submitted', status: 'success' });
      await fetchMarketData();
      await fetchUserPositions();
    } catch (error) {
      console.error('Error claiming winnings:', error);
      toast({ title: 'Failed to claim winnings', status: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawFees = async () => {
    if (!signAndSubmitTransaction || !connected) return;
    // Remove reference to non-existent fee_withdrawn property
    try {
      await withdrawFees(signAndSubmitTransaction, contractAddress);
      toast({ title: 'Withdraw fee transaction submitted', status: 'success' });
      await fetchMarketData();
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      toast({ title: 'Failed to withdraw fees', status: 'error' });
    }
  };

  // Fetch user positions
  const fetchUserPositions = useCallback(async () => {
    if (connected && account?.address && contractAddress) {
      try {
        const userPosition = await getUserPosition(account.address.toString(), contractAddress);
        console.log('getUserPosition:', { userPosition, account: account.address.toString(), contractAddress });
        
        if (userPosition) {
          setUserPositions({
            [userPosition.outcome_index]: parseFloat(userPosition.amount_net) / 1e8
          });
        } else {
          setUserPositions({});
        }
      } catch (error) {
        console.error('Error fetching user positions:', error);
        setUserPositions({});
      }
    }
  }, [connected, account?.address, contractAddress]);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    if (!contractAddress) return;
    
    try {
      setIsLoading(true);
      const marketData = await getMarketDetails(contractAddress);
      setMarket(marketData);
      
      if (marketData) {
        // Set phase based on market status
        const now = Math.floor(Date.now() / 1000);
        if (now < marketData.bidding_start_time) {
          setPhase(Phase.Pending);
        } else if (now < marketData.bidding_end_time) {
          setPhase(Phase.Bidding);
        } else {
          setPhase(Phase.Maturity);
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({ title: 'Failed to fetch market data', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, toast]);

  // Check if user has claimed
  const checkClaimStatus = useCallback(async () => {
    if (!account?.address || !contractAddress) return;
    
    try {
      const userPosition = await getUserPosition(account.address.toString(), contractAddress);
      if (userPosition) {
        // Check if user has any positions and if market is resolved
        const hasPosition = Object.values(userPositions).some(pos => pos > 0);
        setHasClaimed(!hasPosition);
      }
    } catch (error) {
      console.error('Error checking claim status:', error);
    }
  }, [account?.address, contractAddress, userPositions]);

  // Effects
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    if (connected && account?.address) {
      fetchUserPositions();
    }
  }, [connected, account?.address, fetchUserPositions]);

  useEffect(() => {
    checkClaimStatus();
  }, [checkClaimStatus]);

  // Memoized calculations
  const outcomePercentages = useMemo(() => {
    if (!market) return [];
    // Calculate percentages for each outcome based on amounts
    const total = Number(market.total_amount) || 0;
    if (total === 0) return market.outcomes.map(() => 0);
    
    return market.outcomes.map((_, index) => {
      const amount = Number(market.outcome_amounts?.[index] || '0');
      return total > 0 ? (amount / total) * 100 : 0;
    });
  }, [market]);

  const outcomeAmounts = useMemo(() => {
    if (!market) return {};
    const amounts: { [outcomeIndex: number]: number } = {};
    market.outcomes.forEach((_, index) => {
      amounts[index] = Number(market.outcome_amounts?.[index] || '0');
    });
    return amounts;
  }, [market]);

  const totalAmount = useMemo(() => {
    return Number(market?.total_amount || '0');
  }, [market]);

  // Check if user can withdraw fees (simplified check)
  const canWithdrawFees = useMemo(() => {
    if (!market || !account?.address) return false;
    // Check if user is creator and has accumulated fees
    return market.creator === account.address.toString() && Number(market.fee_accumulator) > 0;
  }, [market, account?.address]);

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Container>
    );
  }

  if (!market) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text textAlign="center" color="gray.500">
          Market not found or failed to load
        </Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Market</Tab>
          <Tab>Charts</Tab>
          <Tab>Timeline</Tab>
          <Tab>Rules</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Box>
              <MarketInfo 
                assetLogo="/images/oreka.png"
                pairName={market.price_feed_id || 'Unknown'}
                strike={market.outcomes?.[0]?.threshold1 || '0'}
                maturity={new Date((market.bidding_end_time || 0) * 1000).toLocaleDateString()}
                pool={totalAmount.toString()}
                fee={((market.fee_percentage_bps || 0) / 100).toString()}
                phase={phase}
                phaseNames={phaseNames}
              />
              
              <MarketBetPanel
                phase={phase}
                selectedOutcome={selectedOutcome}
                setSelectedOutcome={setSelectedOutcome}
                bidAmount={bidAmount}
                setBidAmount={setBidAmount}
                handleBet={handleBet}
                isSubmitting={isSubmitting}
                connected={connected}
                outcomes={market.outcomes}
                outcomePercentages={outcomePercentages}
                userPositions={userPositions}
                fee={market.fee_percentage_bps.toString()}
                outcomeAmounts={outcomeAmounts}
                totalAmount={totalAmount}
                paymentAsset={market.payment_asset}
              />

              {/* Action Buttons */}
              <Flex gap={4} mt={6} justify="center">
                {phase === Phase.Maturity && !hasClaimed && (
                  <Button
                    colorScheme="green"
                    onClick={handleClaim}
                    isLoading={isSubmitting}
                    loadingText="Claiming..."
                    size="lg"
                  >
                    Claim Winnings
                  </Button>
                )}
                
                {market.creator === account?.address?.toString() && canWithdrawFees && (
                  <Button
                    colorScheme="orange"
                    onClick={handleWithdrawFees}
                    isLoading={isSubmitting}
                    loadingText="Withdrawing..."
                    size="lg"
                  >
                    Withdraw Fees
                  </Button>
                )}
              </Flex>
            </Box>
          </TabPanel>

          <TabPanel>
            <MarketCharts 
              chartSymbol={market.price_feed_id || 'Unknown'}
              strikePrice={Number(market.outcomes?.[0]?.threshold1 || '0')}
              chartType="price"
              height={400}
            />
          </TabPanel>

          <TabPanel>
            <MarketTimeline 
              phase={phase}
              phaseNames={phaseNames}
              market={market}
              maturity={new Date((market.bidding_end_time || 0) * 1000).toLocaleDateString()}
              canResolve={false}
              handleResolve={() => {}}
              isSubmitting={false}
            />
          </TabPanel>

          <TabPanel>
            <MarketRules 
              showRules={showRules}
              setShowRules={setShowRules}
              market={market}
              strike={market.outcomes?.[0]?.threshold1 || '0'}
              fee={((market.fee_percentage_bps || 0) / 100).toString()}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Remove duplicate MarketRules component */}
    </Container>
  );
};

export default Customer; 