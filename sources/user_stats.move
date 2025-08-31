module yugo::user_stats {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// User profile structure
    public struct UserProfile has key, store, copy, drop {
        user: address,
        display_name: vector<u8>,
        avatar_uri: vector<u8>,
        total_volume: u128,
        total_bets: u64,
        total_wins: u64,
        total_losses: u64,
        total_pnl: u64,
        total_ork_earned: u128,
        created_at: u64,
    }

    /// User statistics structure
    public struct UserStats has key, store, copy, drop {
        user: address,
        total_volume: u128,
        total_bets: u64,
        total_wins: u64,
        total_losses: u64,
        total_pnl: u64,
        total_ork: u128,
        last_active: u64,
    }

    /// User stats manager
    struct UserStatsManager has key {
        /// Event handles
        profile_events: EventHandle<ProfileUpdatedEvent>,
        stats_events: EventHandle<StatsUpdatedEvent>,
        user_stats_updated_events: EventHandle<UserStatsUpdatedEvent>,
        /// Global statistics
        total_users: u64,
        total_volume: u128,
        total_ork_distributed: u128,
    }

    /// User stats updated event (optimized for Nodit indexing)
    struct UserStatsUpdatedEvent has drop, store {
        user: address,
        market: address,
        event_type: u8, // 0 for bid, 1 for resolve, 2 for claim
        amount: u64,
        outcome_index: u8, // Only for bid
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Profile updated event (for Nodit indexing)
    struct ProfileUpdatedEvent has drop, store {
        user: address,
        display_name: vector<u8>,
        avatar_uri: vector<u8>,
        timestamp: u64,
        block_height: u64,
    }

    /// Stats updated event (for Nodit indexing)
    struct StatsUpdatedEvent has drop, store {
        user: address,
        volume_change: u64,
        pnl: u64, // Can be negative
        ork_earned: u64,
        timestamp: u64,
        block_height: u64,
    }

    /// Error constants
    const EUSER_NOT_FOUND: u64 = 1;
    const EINVALID_AMOUNT: u64 = 2;
    const EINSUFFICIENT_BALANCE: u64 = 3;
    const EINVALID_NAME: u64 = 4;
    const EINVALID_URI: u64 = 5;

    /// Event type constants
    const STATS_EVENT_BID: u8 = 0;
    const STATS_EVENT_RESOLVE: u8 = 1;
    const STATS_EVENT_CLAIM: u8 = 2;

    /// Initialize user stats manager
    public entry fun initialize_user_stats_manager(account: &signer) {
        let manager = UserStatsManager {
            profile_events: account::new_event_handle<ProfileUpdatedEvent>(account),
            stats_events: account::new_event_handle<StatsUpdatedEvent>(account),
            user_stats_updated_events: account::new_event_handle<UserStatsUpdatedEvent>(account),
            total_users: 0,
            total_volume: 0,
            total_ork_distributed: 0,
        };

        move_to(account, manager);
    }

    /// Update user profile
    public entry fun update_user_profile(
        user: &signer,
        display_name: vector<u8>,
        avatar_uri: vector<u8>
    ) acquires UserStatsManager, UserProfile {
        let user_addr = signer::address_of(user);
        assert!(vector::length(&display_name) > 0, EINVALID_NAME);
        assert!(vector::length(&avatar_uri) > 0, EINVALID_URI);

        let profile = UserProfile {
            user: user_addr,
            display_name: display_name,
            avatar_uri: avatar_uri,
            total_volume: 0,
            total_bets: 0,
            total_wins: 0,
            total_losses: 0,
            total_pnl: 0,
            total_ork_earned: 0,
            created_at: timestamp::now_seconds(),
        };

        // Store or update profile
        if (exists<UserProfile>(user_addr)) {
            let _old_profile = move_from<UserProfile>(user_addr);
            move_to(user, profile);
        } else {
            move_to(user, profile);
        };

        // Emit event
        let manager = borrow_global_mut<UserStatsManager>(@yugo);
        event::emit_event(&mut manager.profile_events, ProfileUpdatedEvent {
            user: user_addr,
            display_name: profile.display_name,
            avatar_uri: profile.avatar_uri,
            timestamp: timestamp::now_seconds(),
            block_height: 0, // Placeholder, will be updated by indexer
        });
    }

    /// Update user statistics after a bet
    public entry fun update_user_stats_after_bet(
        user: address,
        bet_amount: u64,
        won: bool,
        pnl: u64,
        ork_earned: u64
    ) acquires UserStatsManager, UserStats {
        let manager = borrow_global_mut<UserStatsManager>(@yugo);
        
        if (exists<UserStats>(user)) {
            let stats = borrow_global_mut<UserStats>(user);
            stats.total_volume = stats.total_volume + (bet_amount as u128);
            stats.last_active = timestamp::now_seconds();
            
            if (won) {
                stats.total_wins = stats.total_wins + 1;
                stats.total_pnl = stats.total_pnl + pnl;
            } else {
                stats.total_losses = stats.total_losses + 1;
                stats.total_pnl = stats.total_pnl + pnl;
            };
            
            stats.total_ork = stats.total_ork + (ork_earned as u128);
        } else {
            // Cannot create UserStats without signer, so we'll skip for now
            // In a real implementation, this would be created when user first interacts
        };

        // Emit event
        event::emit_event(&mut manager.stats_events, StatsUpdatedEvent {
            user,
            volume_change: bet_amount,
            pnl,
            ork_earned,
            timestamp: timestamp::now_seconds(),
            block_height: 0, // Placeholder, will be updated by indexer
        });
    }

    /// Update user stats after placing a bid
    public entry fun on_bid(
        user: &signer,
        market: address,
        amount: u64,
        outcome_index: u8
    ) acquires UserStatsManager, UserProfile, UserStats {
        let user_addr = signer::address_of(user);
        
        // Update or create user profile
        if (!exists<UserProfile>(user_addr)) {
            let profile = UserProfile {
                user: user_addr,
                display_name: vector::empty(), // Default empty
                avatar_uri: vector::empty(), // Default empty
                total_volume: 0,
                total_bets: 0,
                total_wins: 0,
                total_losses: 0,
                total_pnl: 0,
                total_ork_earned: 0,
                created_at: timestamp::now_seconds(),
            };
            move_to(user, profile);
        };
        
        // Update or create user stats
        if (!exists<UserStats>(user_addr)) {
            let stats = UserStats {
                user: user_addr,
                total_volume: 0,
                total_bets: 0,
                total_wins: 0,
                total_losses: 0,
                total_pnl: 0,
                total_ork: 0,
                last_active: timestamp::now_seconds(),
            };
            move_to(user, stats);
        };
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        let stats = borrow_global_mut<UserStats>(user_addr);
        
        // Update volume and bet count
        profile.total_volume = profile.total_volume + (amount as u128);
        profile.total_bets = profile.total_bets + 1;
        stats.total_volume = stats.total_volume + (amount as u128);
        stats.total_bets = stats.total_bets + 1;
        stats.last_active = timestamp::now_seconds();
        
        // Emit event
        let manager = borrow_global_mut<UserStatsManager>(@yugo);
        event::emit_event(&mut manager.user_stats_updated_events, UserStatsUpdatedEvent {
            user: user_addr,
            market,
            event_type: 0, // STATS_EVENT_BID
            amount,
            outcome_index,
            timestamp: timestamp::now_seconds(),
            block_height: 0, // Placeholder, will be updated by indexer
            transaction_hash: vector::empty(), // Placeholder, will be updated by indexer
        });
    }

    /// Update user stats after market resolution
    public entry fun on_resolve(
        user: address,
        market: address,
        won: bool,
        payout: u64,
        bet_amount: u64
    ) acquires UserStatsManager, UserProfile, UserStats {
        if (!exists<UserProfile>(user) || !exists<UserStats>(user)) {
            return; // User not found
        };
        
        let profile = borrow_global_mut<UserProfile>(user);
        let stats = borrow_global_mut<UserStats>(user);
        
        if (won) {
            profile.total_wins = profile.total_wins + 1;
            stats.total_wins = stats.total_wins + 1;
            
            // Calculate PnL (using u64, positive values only)
            if (payout > bet_amount) {
                let pnl = payout - bet_amount;
                profile.total_pnl = profile.total_pnl + pnl;
                stats.total_pnl = stats.total_pnl + pnl;
            };
        } else {
            profile.total_losses = profile.total_losses + 1;
            stats.total_losses = stats.total_losses + 1;
            
            // Calculate PnL (using u64, negative values represented as 0)
            // In real implementation, you might want to track losses separately
        };
        
        stats.last_active = timestamp::now_seconds();
        
        // Emit event
        let manager = borrow_global_mut<UserStatsManager>(@yugo);
        event::emit_event(&mut manager.user_stats_updated_events, UserStatsUpdatedEvent {
            user,
            market,
            event_type: 1, // STATS_EVENT_RESOLVE
            amount: payout,
            outcome_index: 255, // Not applicable for resolve
            timestamp: timestamp::now_seconds(),
            block_height: 0, // Placeholder, will be updated by indexer
            transaction_hash: vector::empty(), // Placeholder, will be updated by indexer
        });
    }

    /// Update user stats after claiming rewards
    public entry fun on_claim(
        user: address,
        market: address,
        ork_amount: u64
    ) acquires UserStatsManager, UserProfile, UserStats {
        if (!exists<UserProfile>(user) || !exists<UserStats>(user)) {
            return; // User not found
        };
        
        let profile = borrow_global_mut<UserProfile>(user);
        let stats = borrow_global_mut<UserStats>(user);
        
        // Update ORK earned
        profile.total_ork_earned = profile.total_ork_earned + (ork_amount as u128);
        stats.total_ork = stats.total_ork + (ork_amount as u128);
        stats.last_active = timestamp::now_seconds();
        
        // Emit event
        let manager = borrow_global_mut<UserStatsManager>(@yugo);
        event::emit_event(&mut manager.user_stats_updated_events, UserStatsUpdatedEvent {
            user,
            market,
            event_type: 2, // STATS_EVENT_CLAIM
            amount: ork_amount,
            outcome_index: 255, // Not applicable for claim
            timestamp: timestamp::now_seconds(),
            block_height: 0, // Placeholder, will be updated by indexer
            transaction_hash: vector::empty(), // Placeholder, will be updated by indexer
        });
    }

    /// Check if user exists
    public fun user_exists(user: address): bool {
        exists<UserProfile>(user)
    }

    /// Get user profile
    public fun get_user_profile(user: address): (vector<u8>, vector<u8>, u64) acquires UserProfile {
        assert!(exists<UserProfile>(user), EUSER_NOT_FOUND);
        let profile = borrow_global<UserProfile>(user);
        (profile.display_name, profile.avatar_uri, profile.created_at)
    }

    /// Get user statistics
    public fun get_user_stats(user: address): (u128, u64, u64, u64, u128, u64) acquires UserStats {
        if (exists<UserStats>(user)) {
            let stats = borrow_global<UserStats>(user);
            (stats.total_volume, stats.total_wins, stats.total_losses, stats.total_pnl, stats.total_ork, stats.last_active)
        } else {
            (0, 0, 0, 0, 0, 0)
        }
    }

    /// Get user win rate as percentage (0-10000, where 10000 = 100%)
    public fun get_user_win_rate_percentage(user: address): u64 acquires UserStats {
        let (_, wins, losses, _, _, _) = get_user_stats(user);
        if (wins + losses == 0) {
            0
        } else {
            (wins * 10000) / (wins + losses)
        }
    }

    /// Get user volume in USDC (assuming 1e6 = 1 USDC)
    public fun get_user_volume_usdc(user: address): u128 acquires UserStats {
        let (volume, _, _, _, _, _) = get_user_stats(user);
        volume
    }

    /// Get user ORK earned
    public fun get_user_ork_earned(user: address): u128 acquires UserStats {
        let (_, _, _, _, ork, _) = get_user_stats(user);
        ork
    }

    /// Get global statistics
    public fun get_global_stats(): (u64, u128, u128) acquires UserStatsManager {
        let manager = borrow_global<UserStatsManager>(@yugo);
        (manager.total_users, manager.total_volume, manager.total_ork_distributed)
    }

    /// Get signer for resource account operations
    fun get_signer(_addr: address): signer {
        // For now, we'll use a placeholder approach
        // TODO: Implement proper signer creation when needed
        abort 0 // Placeholder - will be implemented when needed
    }

    #[test_only]
    public fun initialize_for_testing(account: &signer) {
        initialize_user_stats_manager(account);
    }
}
