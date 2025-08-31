module yugo::treasury_pool {
    use std::signer;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::AptosCoin;
    use yugo::payment_usdc::USDC;
    use yugo::ork_token::ORK;

    // Import ORK token for treasury management
    // use yugo::ork_token::{Self, ORK}; // Removed unused import

    /// Asset type constants
    const ASSET_APT: u8 = 1;
    const ASSET_ORK: u8 = 2;
    const ASSET_USDC: u8 = 3; // Added for USDC

    /// Fee type constants
    const FEE_TYPE_OWNER: u8 = 1;
    const FEE_TYPE_RAKE: u8 = 2;
    const FEE_TYPE_DUST: u8 = 3;

    /// Treasury pool for managing global funds
    struct TreasuryPool has key {
        apt_balance: Coin<AptosCoin>,
        usdc_balance: Coin<USDC>,
        ork_balance: Coin<ORK>,
        total_fees_collected: u128,
        total_rake_collected: u128,
        total_dust_collected: u128,
        created_at: u64,
        treasury_deposit_events: EventHandle<TreasuryDepositEvent>,
        treasury_withdraw_events: EventHandle<TreasuryWithdrawEvent>,
        fee_collected_events: EventHandle<FeeCollectedEvent>,
        rake_collected_events: EventHandle<RakeCollectedEvent>,
        fee_deposited_events: EventHandle<FeeDepositedEvent>, // Added for deposit_fee_apt
        rake_deposited_events: EventHandle<RakeDepositedEvent>, // Added for deposit_rake_apt
        dust_swept_events: EventHandle<DustSweptEvent>, // Added for sweep_dust
    }

    /// Treasury configuration
    struct TreasuryConfig has key {
        /// Admin address
        admin: address,
        /// Whether treasury is paused
        is_paused: bool,
        /// Maximum bet amount
        max_bet_amount: u128,
        /// Minimum bet amount
        min_bet_amount: u64,
        /// Maximum rake in basis points
        max_rake_bps: u64,
        /// Maximum fee in basis points
        max_fee_bps: u64,
        /// Configuration update timestamp
        updated_at: u64,
    }

    /// Treasury deposit event (optimized for Hyperion indexing)
    struct TreasuryDepositEvent has drop, store {
        user: address,
        asset_type: u8, // 1 for APT, 2 for ORK
        amount: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Treasury withdraw event (optimized for Hyperion indexing)
    struct TreasuryWithdrawEvent has drop, store {
        user: address,
        asset_type: u8, // 1 for APT, 2 for ORK
        amount: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Fee collected event (optimized for Hyperion indexing)
    struct FeeCollectedEvent has drop, store {
        market: address,
        fee_amount: u64,
        fee_type: u8,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Rake collected event (optimized for Hyperion indexing)
    struct RakeCollectedEvent has drop, store {
        market: address,
        rake_amount: u64,
        total_pool: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Fee deposited event (optimized for Hyperion indexing)
    struct FeeDepositedEvent has drop, store {
        asset_type: u8, // 1 for APT, 3 for USDC
        amount: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Rake deposited event (optimized for Hyperion indexing)
    struct RakeDepositedEvent has drop, store {
        asset_type: u8, // 1 for APT, 3 for USDC
        amount: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Dust swept event (optimized for Hyperion indexing)
    struct DustSweptEvent has drop, store {
        asset_type: u8, // 1 for APT, 3 for USDC, 2 for ORK
        amount: u64,
        timestamp: u64,
        // Additional fields for better indexing
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Error constants
    const ENOT_ADMIN: u64 = 1001;
    const EINSUFFICIENT_BALANCE: u64 = 1002;
    const EINVALID_AMOUNT: u64 = 1003;
    const ETREASURY_PAUSED: u64 = 1004;
    const ETREASURY_NOT_INITIALIZED: u64 = 1005;
    const ECONFIG_NOT_INITIALIZED: u64 = 1006;

    /// Initialize treasury pool
    public entry fun initialize_treasury_pool(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Create treasury pool
        let treasury = TreasuryPool {
            apt_balance: coin::zero<AptosCoin>(),
            usdc_balance: coin::zero<USDC>(),
            ork_balance: coin::zero<ORK>(),
            total_fees_collected: 0,
            total_rake_collected: 0,
            total_dust_collected: 0,
            created_at: timestamp::now_seconds(),
            treasury_deposit_events: account::new_event_handle<TreasuryDepositEvent>(admin),
            treasury_withdraw_events: account::new_event_handle<TreasuryWithdrawEvent>(admin),
            fee_collected_events: account::new_event_handle<FeeCollectedEvent>(admin),
            rake_collected_events: account::new_event_handle<RakeCollectedEvent>(admin),
            fee_deposited_events: account::new_event_handle<FeeDepositedEvent>(admin),
            rake_deposited_events: account::new_event_handle<RakeDepositedEvent>(admin),
            dust_swept_events: account::new_event_handle<DustSweptEvent>(admin),
        };
        
        move_to(admin, treasury);
        
        // Create treasury configuration
        let config = TreasuryConfig {
            admin: admin_addr,
            is_paused: false,
            max_bet_amount: 1000000000000, // 1000 APT
            min_bet_amount: 1000000, // 0.001 APT
            max_rake_bps: 500, // 5%
            max_fee_bps: 300, // 3%
            updated_at: timestamp::now_seconds(),
        };
        
        move_to(admin, config);
    }

    /// Deposit APT to treasury
    public entry fun deposit_apt(
        user: &signer,
        amount: u64
    ) acquires TreasuryPool {
        let user_addr = signer::address_of(user);
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        assert!(amount > 0, EINVALID_AMOUNT);
        
        // Transfer APT from user to treasury
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::merge(&mut treasury.apt_balance, coins);
        
        // Emit deposit event
        event::emit_event(&mut treasury.treasury_deposit_events, TreasuryDepositEvent {
            user: user_addr,
            asset_type: ASSET_APT,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Deposit ORK to treasury (placeholder - ORK integration removed)
    /// This function is kept for future ORK integration
    public entry fun deposit_ork(
        _sender: &signer,
        _amount: u64
    ) {
        // Placeholder for future ORK integration
        // Currently disabled
    }

    /// Collect owner fee from market
    public entry fun collect_owner_fee(
        market: address,
        fee_amount: u64
    ) acquires TreasuryPool, TreasuryConfig {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let config = borrow_global<TreasuryConfig>(@yugo);
        
        assert!(!config.is_paused, ETREASURY_PAUSED);
        assert!(fee_amount > 0, EINVALID_AMOUNT);
        
        treasury.total_fees_collected = treasury.total_fees_collected + (fee_amount as u128);
        
        event::emit_event(&mut treasury.fee_collected_events, FeeCollectedEvent {
            market,
            fee_amount,
            fee_type: FEE_TYPE_OWNER,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder, will be updated by indexer
            transaction_hash: vector::empty(), // Placeholder, will be updated by indexer
        });
    }

    /// Collect protocol rake from markets
    /// This function accumulates rake into the treasury
    public entry fun collect_protocol_rake(
        market: address,
        rake_amount: u64,
        total_pool: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        // Accumulate rake
        treasury.total_rake_collected = treasury.total_rake_collected + (rake_amount as u128);
        
        // Emit rake collected event
        event::emit_event(&mut treasury.rake_collected_events, RakeCollectedEvent {
            market,
            rake_amount,
            total_pool,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Collect dust from market (admin only)
    /// This function collects small amounts that are too small to distribute
    public entry fun collect_dust(
        admin: &signer,
        market: address,
        dust_amount: u64
    ) acquires TreasuryPool, TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let config = borrow_global<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        assert!(!config.is_paused, ETREASURY_PAUSED);
        assert!(dust_amount > 0, EINVALID_AMOUNT);
        
        // Accumulate dust
        treasury.total_dust_collected = treasury.total_dust_collected + (dust_amount as u128);
        
        // Emit dust collected event
        event::emit_event(&mut treasury.fee_collected_events, FeeCollectedEvent {
            market,
            fee_amount: dust_amount,
            fee_type: FEE_TYPE_DUST,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Accrue owner fee from market
    /// This function is called by markets to accumulate owner fees
    public entry fun accrue_fee_owner(
        market: address,
        fee_amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        // Accumulate fee
        treasury.total_fees_collected = treasury.total_fees_collected + (fee_amount as u128);
        
        // Emit fee collected event
        event::emit_event(&mut treasury.fee_collected_events, FeeCollectedEvent {
            market,
            fee_amount,
            fee_type: FEE_TYPE_OWNER,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Accrue rake from market
    /// This function is called by markets to accumulate rake
    public entry fun accrue_rake(
        market: address,
        rake_amount: u64,
        total_pool: u64
    ) acquires TreasuryPool {
        collect_protocol_rake(market, rake_amount, total_pool);
    }

    /// Withdraw APT from treasury (admin only)
    public entry fun withdraw_apt(
        admin: &signer,
        user: address,
        amount: u64
    ) acquires TreasuryPool, TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let config = borrow_global<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        assert!(!config.is_paused, ETREASURY_PAUSED);
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(coin::value<AptosCoin>(&treasury.apt_balance) >= amount, EINSUFFICIENT_BALANCE);
        
        // Transfer APT from treasury to user
        let coins = coin::extract(&mut treasury.apt_balance, amount);
        coin::deposit(user, coins);
        
        // Emit withdraw event
        event::emit_event(&mut treasury.treasury_withdraw_events, TreasuryWithdrawEvent {
            user,
            asset_type: ASSET_APT,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Withdraw ORK from treasury (placeholder - ORK integration removed)
    /// This function is kept for future ORK integration
    public entry fun withdraw_ork(
        _admin: &signer,
        _recipient: address,
        _amount: u64
    ) {
        // Placeholder for future ORK integration
        // Currently disabled
    }

    /// Update treasury configuration (admin only)
    public entry fun update_treasury_config(
        admin: &signer,
        max_bet_amount: u128,
        min_bet_amount: u64,
        max_rake_bps: u64,
        max_fee_bps: u64
    ) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        assert!(max_bet_amount > (min_bet_amount as u128), EINVALID_AMOUNT);
        assert!(max_rake_bps <= 1000, EINVALID_AMOUNT); // Max 10%
        assert!(max_fee_bps <= 1000, EINVALID_AMOUNT); // Max 10%
        
        config.max_bet_amount = max_bet_amount;
        config.min_bet_amount = min_bet_amount;
        config.max_rake_bps = max_rake_bps;
        config.max_fee_bps = max_fee_bps;
        config.updated_at = timestamp::now_seconds();
    }

    /// Pause treasury operations (admin only)
    public entry fun pause_treasury(admin: &signer) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        config.is_paused = true;
    }

    /// Unpause treasury operations (admin only)
    public entry fun unpause_treasury(admin: &signer) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        config.is_paused = false;
    }

    /// Deposit owner fees to treasury (APT)
    public entry fun deposit_fee_apt(
        _admin: &signer,
        amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let admin_coins = coin::withdraw<AptosCoin>(_admin, amount);
        coin::merge(&mut treasury.apt_balance, admin_coins);
        
        // Emit event
        event::emit_event(&mut treasury.fee_deposited_events, FeeDepositedEvent {
            asset_type: ASSET_APT,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Deposit owner fees to treasury (USDC)
    public entry fun deposit_fee_usdc(
        admin: &signer,
        amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        // Transfer USDC from admin to treasury using Coin
        let admin_usdc = coin::withdraw<USDC>(admin, amount);
        coin::merge(&mut treasury.usdc_balance, admin_usdc);
        
        // Emit event
        event::emit_event(&mut treasury.fee_deposited_events, FeeDepositedEvent {
            asset_type: ASSET_USDC,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Deposit protocol rake to treasury (APT)
    public entry fun deposit_rake_apt(
        _admin: &signer,
        amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let admin_coins = coin::withdraw<AptosCoin>(_admin, amount);
        coin::merge(&mut treasury.apt_balance, admin_coins);
        
        // Emit event
        event::emit_event(&mut treasury.rake_deposited_events, RakeDepositedEvent {
            asset_type: ASSET_APT,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Deposit protocol rake to treasury (USDC)
    public entry fun deposit_rake_usdc(
        admin: &signer,
        amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        // Transfer USDC from admin to treasury using Coin
        let admin_usdc = coin::withdraw<USDC>(admin, amount);
        coin::merge(&mut treasury.usdc_balance, admin_usdc);
        
        // Emit event
        event::emit_event(&mut treasury.rake_deposited_events, RakeDepositedEvent {
            asset_type: ASSET_USDC,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Withdraw USDC from treasury (admin only)
    public entry fun withdraw_usdc(
        admin: &signer,
        recipient: address,
        amount: u64
    ) acquires TreasuryPool, TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        let config = borrow_global<TreasuryConfig>(@yugo);
        
        assert!(admin_addr == config.admin, ENOT_ADMIN);
        assert!(!config.is_paused, ETREASURY_PAUSED);
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(coin::value<USDC>(&treasury.usdc_balance) >= amount, EINSUFFICIENT_BALANCE);
        
        // Transfer USDC from treasury to recipient
        let usdc_coins = coin::extract(&mut treasury.usdc_balance, amount);
        coin::deposit(recipient, usdc_coins);
        
        // Emit withdraw event
        event::emit_event(&mut treasury.treasury_withdraw_events, TreasuryWithdrawEvent {
            user: recipient,
            asset_type: ASSET_USDC,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Sweep dust amounts to treasury
    public entry fun sweep_dust(
        admin: &signer,
        asset_type: u8,
        amount: u64
    ) acquires TreasuryPool {
        let treasury = borrow_global_mut<TreasuryPool>(@yugo);
        
        if (asset_type == ASSET_APT) {
            let admin_coins = coin::withdraw<AptosCoin>(admin, amount);
            coin::merge(&mut treasury.apt_balance, admin_coins);
        } else if (asset_type == ASSET_USDC) {
            // Transfer USDC dust using Coin
            let admin_usdc = coin::withdraw<USDC>(admin, amount);
            coin::merge(&mut treasury.usdc_balance, admin_usdc);
        } else if (asset_type == ASSET_ORK) {
            // Transfer ORK dust
            let admin_ork = coin::withdraw<ORK>(admin, amount);
            coin::merge(&mut treasury.ork_balance, admin_ork);
        };
        
        // Emit event
        event::emit_event(&mut treasury.dust_swept_events, DustSweptEvent {
            asset_type,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    /// Get treasury balance for specific asset
    public fun get_treasury_balance_by_asset(asset_type: u8): u64 acquires TreasuryPool {
        let treasury = borrow_global<TreasuryPool>(@yugo);
        
        if (asset_type == ASSET_APT) {
            coin::value<AptosCoin>(&treasury.apt_balance)
        } else if (asset_type == ASSET_USDC) {
            coin::value<USDC>(&treasury.usdc_balance)
        } else if (asset_type == ASSET_ORK) {
            coin::value<ORK>(&treasury.ork_balance)
        } else {
            0
        }
    }

    /// Get treasury balance (legacy function - returns APT balance)
    public fun get_treasury_balance(): u64 acquires TreasuryPool {
        get_treasury_balance_by_asset(ASSET_APT)
    }

    /// Get treasury statistics with asset breakdown
    public fun get_treasury_stats_detailed(): (u64, u64, u64, u128, u128, u128, u64) acquires TreasuryPool {
        let treasury = borrow_global<TreasuryPool>(@yugo);
        (
            coin::value<AptosCoin>(&treasury.apt_balance),      // APT balance
            coin::value<USDC>(&treasury.usdc_balance),          // USDC balance
            coin::value<ORK>(&treasury.ork_balance),            // ORK balance
            treasury.total_fees_collected,                      // Total fees collected
            treasury.total_rake_collected,                      // Total rake collected
            treasury.total_dust_collected,                      // Total dust collected
            treasury.created_at                                  // Created timestamp
        )
    }

    /// Get treasury statistics
    public fun get_treasury_stats(): (u64, u128, u128, u128, u64) acquires TreasuryPool {
        let treasury = borrow_global<TreasuryPool>(@yugo);
        (
            coin::value<AptosCoin>(&treasury.apt_balance),
            treasury.total_fees_collected,
            treasury.total_rake_collected,
            treasury.total_dust_collected,
            treasury.created_at
        )
    }

    /// Get treasury configuration
    public fun get_treasury_config(): (address, bool, u128, u64, u64, u64, u64) acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@yugo);
        (
            config.admin,
            config.is_paused,
            config.max_bet_amount,
            config.min_bet_amount,
            config.max_rake_bps,
            config.max_fee_bps,
            config.updated_at
        )
    }

    /// Check if treasury is paused
    public fun is_treasury_paused(): bool acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@yugo);
        config.is_paused
    }

    // Remove get function that violates Move safety rules
    // This function cannot return reference to global storage

    #[test_only]
    public fun initialize_for_testing(account: &signer) {
        initialize_treasury_pool(account);
    }
}
