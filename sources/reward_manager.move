module yugo::reward_manager {

    use std::vector;
    use std::signer;
    use std::table::{Self, Table};
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// Reward amounts in ORK tokens
    const WINNER_REWARD_AMOUNT: u64 = 100; // 100 ORK per winner
    const PARTICIPATION_REWARD_AMOUNT: u64 = 10; // 10 ORK per participant
    const CREATOR_REWARD_AMOUNT: u64 = 50; // 50 ORK for market creator

    /// Reward configuration for market
    struct MarketRewardConfig has key, store, copy, drop {
        /// Total reward budget for this market
        reward_budget: u64,
        /// Winner points pool (70% of budget)
        winner_pool: u64,
        /// Participation points pool (25% of budget)
        participation_pool: u64,
        /// Creator reward (5% of budget)
        creator_reward: u64,
        /// Whether rewards have been distributed
        distributed: bool,
        /// Total ORK minted so far (to enforce budget)
        ork_minted_so_far: u64,
        /// Whether the market has been resolved (e.g., auction ended)
        is_resolved: bool,
        /// Balance of the reward vault
        reward_vault_balance: u64,
    }

    /// User points for a specific market
    struct UserMarketPoints has store, copy, drop {
        /// User's total points in this market
        total_points: u128,
        /// User's winning points (if they won)
        winning_points: u128,
        /// Whether user participated in this market
        participated: bool,
        /// Whether user won in this market
        won: bool,
    }

    /// Global reward manager
    struct RewardManager has key {
        /// Market reward configurations
        market_rewards: Table<address, MarketRewardConfig>,
        /// User points per market
        user_points: Table<address, Table<address, UserMarketPoints>>,
        /// Global statistics
        total_markets: u64,
        total_rewards_distributed: u64,
        /// Event handles
        reward_distributed_events: EventHandle<RewardDistributedEvent>,
        points_updated_events: EventHandle<PointsUpdatedEvent>,
        /// Number of markets with active rewards
        markets_with_rewards: u64,
    }

    // Events
    #[event]
    struct RewardDistributedEvent has drop, store {
        market: address,
        total_amount: u64,
        winners_count: u64,
        participants_count: u64,
        creator: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
        // Legacy fields for compatibility
        user: address,
        ork_amount: u64,
        points: u64,
        reward_type: u8,
    }

    #[event]
    struct PointsUpdatedEvent has drop, store {
        market: address,
        user: address,
        points: u128,
        timestamp: u64,
    }

    /// Reward types
    const REWARD_TYPE_WINNER: u8 = 0;
    const REWARD_TYPE_PARTICIPATION: u8 = 1;
    const REWARD_TYPE_CREATOR: u8 = 2;

    /// Distribution ratios (in basis points)
    const WINNER_RATIO: u64 = 7000; // 70%
    const PARTICIPATION_RATIO: u64 = 2500; // 25%
    const CREATOR_RATIO: u64 = 500; // 5%

    /// Error codes
    const EREWARD_MANAGER_NOT_INITIALIZED: u64 = 1;
    const EINVALID_REWARD_BUDGET: u64 = 2;
    const EREWARDS_ALREADY_DISTRIBUTED: u64 = 3;
    const ENO_POINTS_FOUND: u64 = 4;
    const EINSUFFICIENT_REWARD_BUDGET: u64 = 5;
    const ENOT_ADMIN: u64 = 6;
    const EREWARDS_NOT_READY: u64 = 7;
    const EINSUFFICIENT_REWARDS: u64 = 8;

    /// Initialize reward manager
    public entry fun initialize_reward_manager(account: &signer) {
        move_to(account, RewardManager {
            market_rewards: table::new(),
            user_points: table::new(),
            total_markets: 0,
            total_rewards_distributed: 0,
            reward_distributed_events: account::new_event_handle<RewardDistributedEvent>(account),
            points_updated_events: account::new_event_handle<PointsUpdatedEvent>(account),
            markets_with_rewards: 0,
        });
    }

    /// Create reward configuration for a market
    public entry fun create_market_reward(
        _admin: &signer,
        market: address,
        reward_budget: u64
    ) acquires RewardManager {
        assert!(reward_budget > 0, EINVALID_REWARD_BUDGET);
        
        let reward_manager = borrow_global_mut<RewardManager>(@yugo);
        
        let winner_pool = (reward_budget * WINNER_RATIO) / 10000;
        let participation_pool = (reward_budget * PARTICIPATION_RATIO) / 10000;
        let creator_reward = (reward_budget * CREATOR_RATIO) / 10000;

        let config = MarketRewardConfig {
            reward_budget,
            winner_pool,
            participation_pool,
            creator_reward,
            distributed: false,
            ork_minted_so_far: 0,
            is_resolved: false,
            reward_vault_balance: 0,
        };

        table::add(&mut reward_manager.market_rewards, market, config);
        reward_manager.total_markets = reward_manager.total_markets + 1;
    }

    /// Update user points for a market
    public entry fun update_user_points(
        market: address,
        user: address,
        points: u128,
        is_winner: bool
    ) acquires RewardManager {
        let reward_manager = borrow_global_mut<RewardManager>(@yugo);
        
        // Get or create user points table
        let user_points_table = if (table::contains(&reward_manager.user_points, user)) {
            table::borrow_mut(&mut reward_manager.user_points, user)
        } else {
            table::add(&mut reward_manager.user_points, user, table::new());
            table::borrow_mut(&mut reward_manager.user_points, user)
        };

        // Get or create user market points
        let user_market_points = if (table::contains(user_points_table, market)) {
            table::borrow_mut(user_points_table, market)
        } else {
            let new_points = UserMarketPoints {
                total_points: 0,
                winning_points: 0,
                participated: false,
                won: false,
            };
            table::add(user_points_table, market, new_points);
            table::borrow_mut(user_points_table, market)
        };

        // Update points
        user_market_points.total_points = user_market_points.total_points + points;
        user_market_points.participated = true;
        
        if (is_winner) {
            user_market_points.winning_points = user_market_points.winning_points + points;
            user_market_points.won = true;
        };

        // Emit points updated event
        event::emit_event(&mut reward_manager.points_updated_events, PointsUpdatedEvent {
            market,
            user,
            points,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Distribute rewards from market's reward vault
    /// This function enforces budget limits and distributes ORK tokens
    public entry fun distribute_rewards(
        _admin: &signer,
        market: address,
        winners: vector<address>,
        participants: vector<address>,
        _creator: address
    ) acquires MarketRewardConfig, RewardManager {
        
        let config = borrow_global_mut<MarketRewardConfig>(market);
        let manager = borrow_global_mut<RewardManager>(@yugo);
        
        // Only distribute after market resolution
        assert!(config.is_resolved, EREWARDS_NOT_READY);
        
        // Calculate total rewards needed
        let total_rewards = calculate_total_rewards(winners, participants, _creator);
        
        // Check if we have enough in reward vault
        assert!(config.reward_vault_balance >= total_rewards, EINSUFFICIENT_REWARDS);
        
        // Distribute rewards from vault (not minting new)
        distribute_from_vault(config, winners, participants, _creator, total_rewards);
        
        // Update manager stats
        manager.total_rewards_distributed = manager.total_rewards_distributed + total_rewards;
        manager.markets_with_rewards = manager.markets_with_rewards + 1;
        
        // Emit reward distribution event
        event::emit_event(&mut manager.reward_distributed_events, RewardDistributedEvent {
            market,
            total_amount: total_rewards,
            winners_count: vector::length(&winners),
            participants_count: vector::length(&participants),
            creator: _creator,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
            // Legacy fields
            user: _creator, // Placeholder
            ork_amount: total_rewards, // Placeholder
            points: 0, // Placeholder
            reward_type: 0, // Placeholder
        });
    }

    /// Get user points for a market
    public fun get_user_market_points(user: address, market: address): (u128, u128, bool, bool) acquires RewardManager {
        let reward_manager = borrow_global<RewardManager>(@yugo);
        
        if (!table::contains(&reward_manager.user_points, user)) {
            return (0, 0, false, false)
        };
        
        let user_points_table = table::borrow(&reward_manager.user_points, user);
        if (!table::contains(user_points_table, market)) {
            return (0, 0, false, false)
        };
        
        let user_market_points = table::borrow(user_points_table, market);
        (
            user_market_points.total_points,
            user_market_points.winning_points,
            user_market_points.participated,
            user_market_points.won
        )
    }

    /// Get market reward configuration
    public fun get_market_reward_config(market: address): (u64, u64, u64, u64, bool) acquires RewardManager {
        let reward_manager = borrow_global<RewardManager>(@yugo);
        
        if (!table::contains(&reward_manager.market_rewards, market)) {
            return (0, 0, 0, 0, false)
        };
        
        let config = table::borrow(&reward_manager.market_rewards, market);
        (
            config.reward_budget,
            config.winner_pool,
            config.participation_pool,
            config.creator_reward,
            config.distributed
        )
    }

    /// Get global statistics
    public fun get_global_stats(): (u64, u64) acquires RewardManager {
        let reward_manager = borrow_global<RewardManager>(@yugo);
        (reward_manager.total_markets, reward_manager.total_rewards_distributed)
    }

    #[test_only]
    public fun initialize_for_testing(account: &signer) {
        initialize_reward_manager(account);
    }

    /// Integrate with treasury pool - collect ORK budget from treasury
    public entry fun collect_ork_budget_from_treasury(
        admin: &signer,
        market: address,
        ork_amount: u64
    ) acquires RewardManager {
        let _admin_addr = signer::address_of(admin);
        let reward_manager = borrow_global_mut<RewardManager>(@yugo);
        
        // Get market reward config
        assert!(table::contains(&reward_manager.market_rewards, market), ENO_POINTS_FOUND);
        let config = table::borrow_mut(&mut reward_manager.market_rewards, market);
        
        // Update reward budget from treasury
        config.reward_budget = config.reward_budget + ork_amount;
        
        // Recalculate pools
        config.winner_pool = (config.reward_budget * WINNER_RATIO) / 10000;
        config.participation_pool = (config.reward_budget * PARTICIPATION_RATIO) / 10000;
        config.creator_reward = (config.reward_budget * CREATOR_RATIO) / 10000;
    }

    /// Get total ORK distributed across all markets
    public fun get_total_ork_distributed(): u64 acquires RewardManager {
        let reward_manager = borrow_global<RewardManager>(@yugo);
        reward_manager.total_rewards_distributed
    }

    /// Get winners for a market (placeholder - should be implemented based on market logic)
    fun get_winners_for_market(_market: address): vector<address> {
        // This should be implemented based on actual market resolution logic
        // For now, return empty vector
        vector::empty<address>()
    }

    /// Get participants for a market (placeholder - should be implemented based on market logic)
    fun get_participants_for_market(_market: address): vector<address> {
        // This should be implemented based on actual market participation logic
        // For now, return empty vector
        vector::empty<address>()
    }

    /// Get market creator (placeholder - should be implemented based on market logic)
    fun get_market_creator(_market: address): address {
        // This should be implemented based on actual market data
        // For now, return zero address
        @0x0
    }

    /// Calculate total rewards needed for distribution
    fun calculate_total_rewards(
        winners: vector<address>,
        participants: vector<address>,
        _creator: address
    ): u64 {
        let total = 0u64;
        
        // Winner rewards (fixed amount per winner)
        let num_winners = vector::length(&winners);
        total = total + (num_winners * WINNER_REWARD_AMOUNT);
        
        // Participation rewards (fixed amount per participant)
        let num_participants = vector::length(&participants);
        total = total + (num_participants * PARTICIPATION_REWARD_AMOUNT);
        
        // Creator reward (fixed amount)
        total = total + CREATOR_REWARD_AMOUNT;
        
        total
    }
    
    /// Distribute rewards from the market's reward vault
    fun distribute_from_vault(
        config: &mut MarketRewardConfig,
        winners: vector<address>,
        participants: vector<address>,
        _creator: address,
        total_rewards: u64
    ) {
        // Distribute winner rewards
        let num_winners = vector::length(&winners);
        if (num_winners > 0) {
            let _winner_share = WINNER_REWARD_AMOUNT;
            let i = 0;
            while (i < num_winners) {
                let _winner = *vector::borrow(&winners, i);
                // Transfer ORK from vault to winner
                // Note: This is a placeholder - actual transfer logic would be implemented
                // based on how the reward vault stores ORK tokens
                i = i + 1;
            };
        };
        
        // Distribute participation rewards
        let num_participants = vector::length(&participants);
        if (num_participants > 0) {
            let _participation_share = PARTICIPATION_REWARD_AMOUNT;
            let i = 0;
            while (i < num_participants) {
                let _participant = *vector::borrow(&participants, i);
                // Transfer ORK from vault to participant
                i = i + 1;
            };
        };
        
        // Distribute creator reward
        // Transfer ORK from vault to creator
        
        // Update vault balance
        config.reward_vault_balance = config.reward_vault_balance - total_rewards;
    }
    
    /// Mark market as resolved and ready for reward distribution
    public entry     fun mark_market_resolved(
        _admin: &signer,
        _market: address
    ) acquires MarketRewardConfig {
        let config = borrow_global_mut<MarketRewardConfig>(_market);
        config.is_resolved = true;
    }
    
    /// Add ORK tokens to market's reward vault
    public entry     fun add_rewards_to_vault(
        _admin: &signer,
        _market: address,
        amount: u64
    ) acquires MarketRewardConfig {
        let config = borrow_global_mut<MarketRewardConfig>(_market);
        config.reward_vault_balance = config.reward_vault_balance + amount;
    }
} 
