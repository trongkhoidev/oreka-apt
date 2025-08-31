module yugo::clmm_router {
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};

    /// Deposit record for tracking CLMM deposits
    struct DepositRecord has store {
        id: u64,
        pool_address: address,
        asset_type: u8,
        amount: u64,
        timestamp: u64,
        status: u8,
    }
    
    /// Yield record for tracking CLMM yields
    struct YieldRecord has store {
        id: u64,
        pool_address: address,
        asset_type: u8,
        total_yield: u64,
        treasury_amount: u64,
        reward_vault_amount: u64,
        payout_pool_bonus: u64,
        timestamp: u64,
    }
    
    /// Deposit status constants
    const DEPOSIT_STATUS_ACTIVE: u8 = 1;
    const DEPOSIT_STATUS_WITHDRAWN: u8 = 2;
    
    /// Asset type constants
    const ASSET_APT: u8 = 1;
    const ASSET_USDC: u8 = 3;
    const ASSET_ORK: u8 = 2;

    /// CLMM configuration updated event
    struct CLMMConfigUpdatedEvent has drop, store {
        pool_address: address,
        asset_type: u8,
        min_deposit: u64,
        max_deposit: u64,
        yield_target: u64,
        treasury_share: u64,
        reward_vault_share: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Deposit recorded event
    struct DepositRecordedEvent has drop, store {
        deposit_id: u64,
        pool_address: address,
        asset_type: u8,
        amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Withdrawal recorded event
    struct WithdrawalRecordedEvent has drop, store {
        deposit_id: u64,
        amount: u64,
        remaining_amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Yield recorded event
    struct YieldRecordedEvent has drop, store {
        yield_id: u64,
        pool_address: address,
        asset_type: u8,
        total_yield: u64,
        treasury_amount: u64,
        reward_vault_amount: u64,
        payout_pool_bonus: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// CLMM Deposited Event
    struct CLMMDepositedEvent has drop, store {
        pool_address: address,
        asset_type: u8,
        amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// CLMM Withdrawn Event
    struct CLMMWithdrawnEvent has drop, store {
        pool_address: address,
        asset_type: u8,
        amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// CLMM Yield Accrued Event
    struct CLMMYieldAccruedEvent has drop, store {
        pool_address: address,
        asset_type: u8,
        yield_amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// CLMM Router for Hyperion integration
    /// Manages idle capital deployment to CLMM pools
    struct CLMMRouter has key {
        /// Event handles
        clmm_deposited_events: EventHandle<CLMMDepositedEvent>,
        clmm_withdrawn_events: EventHandle<CLMMWithdrawnEvent>,
        clmm_yield_accrued_events: EventHandle<CLMMYieldAccruedEvent>,
        /// Table for deposit records
        deposits: Table<u64, DepositRecord>,
        /// Table for yield records
        yields: Table<u64, YieldRecord>,
        /// Next ID for deposits
        next_deposit_id: u64,
        /// Next ID for yields
        next_yield_id: u64,
        /// Total amount deposited to CLMM
        total_deposited: u64,
        /// Total yield accrued
        total_yield: u64,
        /// Event handles for new operations
        config_updated_events: EventHandle<CLMMConfigUpdatedEvent>,
        deposit_recorded_events: EventHandle<DepositRecordedEvent>,
        withdrawal_recorded_events: EventHandle<WithdrawalRecordedEvent>,
        yield_recorded_events: EventHandle<YieldRecordedEvent>,
    }

    /// CLMM Configuration for Hyperion integration
    struct CLMMConfig has key {
        /// Pool address for CLMM
        pool_address: address,
        /// Asset type (1=APT, 3=USDC, 2=ORK)
        asset_type: u8,
        /// Minimum deposit amount
        min_deposit: u64,
        /// Maximum deposit amount
        max_deposit: u64,
        /// Target yield percentage (in basis points)
        yield_target: u64,
        /// Treasury share of yield (in basis points)
        treasury_share: u64,
        /// Reward vault share of yield (in basis points)
        reward_vault_share: u64,
        /// Whether CLMM is active
        is_active: bool,
        /// Event handle for configuration updates
        config_updated_events: EventHandle<CLMMConfigUpdatedEvent>,
    }

    /// Error constants
    const ECLMM_NOT_ACTIVE: u64 = 1001;
    const EINVALID_AMOUNT: u64 = 1002;
    const EEXIT_BUFFER_NOT_REACHED: u64 = 1003;
    const EMAX_UTIL_EXCEEDED: u64 = 1004;
    const EINSUFFICIENT_DEPOSITS: u64 = 1005;
    const EINVALID_DEPOSIT_LIMITS: u64 = 1006;
    const EINVALID_YIELD_TARGET: u64 = 1007;
    const EINVALID_SHARE_DISTRIBUTION: u64 = 1008;
    const EINVALID_POOL: u64 = 1009;
    const EINVALID_ASSET_TYPE: u64 = 1010;
    const EINSUFFICIENT_DEPOSIT: u64 = 1011;
    const EEXCESSIVE_DEPOSIT: u64 = 1012;
    const EINVALID_DEPOSIT_STATUS: u64 = 1013;
    const EINSUFFICIENT_WITHDRAWAL_AMOUNT: u64 = 1014;

    /// Yield distribution ratios (in basis points)
    const YIELD_PAYOUT_POOL_RATIO: u64 = 5000; // 50% to payout pool (bonus winners)
    const YIELD_TREASURY_RATIO: u64 = 3000;    // 30% to treasury
    const YIELD_REWARD_VAULT_RATIO: u64 = 2000; // 20% to reward vault

    /// Initialize CLMM router
    public entry fun initialize_clmm_router(admin: &signer) {
        let router = CLMMRouter {
            clmm_deposited_events: account::new_event_handle<CLMMDepositedEvent>(admin),
            clmm_withdrawn_events: account::new_event_handle<CLMMWithdrawnEvent>(admin),
            clmm_yield_accrued_events: account::new_event_handle<CLMMYieldAccruedEvent>(admin),
            deposits: table::new(),
            yields: table::new(),
            next_deposit_id: 0,
            next_yield_id: 0,
            total_deposited: 0,
            total_yield: 0,
            config_updated_events: account::new_event_handle<CLMMConfigUpdatedEvent>(admin),
            deposit_recorded_events: account::new_event_handle<DepositRecordedEvent>(admin),
            withdrawal_recorded_events: account::new_event_handle<WithdrawalRecordedEvent>(admin),
            yield_recorded_events: account::new_event_handle<YieldRecordedEvent>(admin),
        };
        move_to(admin, router);
        
        let config = CLMMConfig {
            pool_address: @0x0,
            asset_type: 0,
            min_deposit: 0,
            max_deposit: 0,
            yield_target: 0,
            treasury_share: 0,
            reward_vault_share: 0,
            is_active: false,
            config_updated_events: account::new_event_handle<CLMMConfigUpdatedEvent>(admin),
        };
        move_to(admin, config);
    }

    /// Set CLMM configuration for Hyperion integration
    public entry fun set_clmm_config(
        _admin: &signer,
        pool_address: address,
        asset_type: u8,
        min_deposit: u64,
        max_deposit: u64,
        yield_target: u64,
        treasury_share: u64,
        reward_vault_share: u64
    ) acquires CLMMConfig {
        let config = borrow_global_mut<CLMMConfig>(@yugo);
        
        // Validate parameters
        assert!(min_deposit <= max_deposit, EINVALID_DEPOSIT_LIMITS);
        assert!(yield_target <= 10000, EINVALID_YIELD_TARGET); // Max 100%
        assert!(treasury_share + reward_vault_share <= 10000, EINVALID_SHARE_DISTRIBUTION);
        
        config.pool_address = pool_address;
        config.asset_type = asset_type;
        config.min_deposit = min_deposit;
        config.max_deposit = max_deposit;
        config.yield_target = yield_target;
        config.treasury_share = treasury_share;
        config.reward_vault_share = reward_vault_share;
        config.is_active = true;
        
        // Emit configuration event
        event::emit_event(&mut config.config_updated_events, CLMMConfigUpdatedEvent {
            pool_address,
            asset_type,
            min_deposit,
            max_deposit,
            yield_target,
            treasury_share,
            reward_vault_share,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Record deposit to CLMM pool
    public entry fun record_deposit(
        _admin: &signer,
        pool_address: address,
        asset_type: u8,
        amount: u64
    ) acquires CLMMRouter, CLMMConfig {
        let router = borrow_global_mut<CLMMRouter>(@yugo);
        let _config = borrow_global<CLMMConfig>(@yugo);
        
        // Validate pool configuration
        assert!(_config.is_active, ECLMM_NOT_ACTIVE);
        assert!(_config.pool_address == pool_address, EINVALID_POOL);
        assert!(_config.asset_type == asset_type, EINVALID_ASSET_TYPE);
        assert!(amount >= _config.min_deposit, EINSUFFICIENT_DEPOSIT);
        assert!(amount <= _config.max_deposit, EEXCESSIVE_DEPOSIT);
        
        // Record deposit
        let deposit_id = router.next_deposit_id;
        router.next_deposit_id = router.next_deposit_id + 1;
        
        let deposit = DepositRecord {
            id: deposit_id,
            pool_address,
            asset_type,
            amount,
            timestamp: timestamp::now_seconds(),
            status: DEPOSIT_STATUS_ACTIVE,
        };
        
        table::add(&mut router.deposits, deposit_id, deposit);
        
        // Update total deposited
        router.total_deposited = router.total_deposited + amount;
        
        // Emit deposit event
        event::emit_event(&mut router.deposit_recorded_events, DepositRecordedEvent {
            deposit_id,
            pool_address,
            asset_type,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Record withdrawal from CLMM pool
    public entry fun record_withdraw(
        _admin: &signer,
        deposit_id: u64,
        amount: u64
    ) acquires CLMMRouter, CLMMConfig {
        let router = borrow_global_mut<CLMMRouter>(@yugo);
        let _config = borrow_global<CLMMConfig>(@yugo);
        
        // Get deposit record
        let deposit = table::borrow_mut(&mut router.deposits, deposit_id);
        assert!(deposit.status == DEPOSIT_STATUS_ACTIVE, EINVALID_DEPOSIT_STATUS);
        assert!(amount <= deposit.amount, EINSUFFICIENT_WITHDRAWAL_AMOUNT);
        
        // Update deposit
        deposit.amount = deposit.amount - amount;
        if (deposit.amount == 0) {
            deposit.status = DEPOSIT_STATUS_WITHDRAWN;
        };
        
        // Update total deposited
        router.total_deposited = router.total_deposited - amount;
        
        // Emit withdrawal event
        event::emit_event(&mut router.withdrawal_recorded_events, WithdrawalRecordedEvent {
            deposit_id,
            amount,
            remaining_amount: deposit.amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Record yield harvested from CLMM pool
    public entry fun record_yield(
        _admin: &signer,
        pool_address: address,
        asset_type: u8,
        yield_amount: u64
    ) acquires CLMMRouter, CLMMConfig {
        let router = borrow_global_mut<CLMMRouter>(@yugo);
        let _config = borrow_global<CLMMConfig>(@yugo);
        
        // Validate pool configuration
        assert!(_config.is_active, ECLMM_NOT_ACTIVE);
        assert!(_config.pool_address == pool_address, EINVALID_POOL);
        assert!(_config.asset_type == asset_type, EINVALID_ASSET_TYPE);
        
        // Calculate yield distribution
        let treasury_amount = (yield_amount * _config.treasury_share) / 10000;
        let reward_vault_amount = (yield_amount * _config.reward_vault_share) / 10000;
        let payout_pool_bonus = yield_amount - treasury_amount - reward_vault_amount;
        
        // Record yield
        let yield_id = router.next_yield_id;
        router.next_yield_id = router.next_yield_id + 1;
        
        let yield_record = YieldRecord {
            id: yield_id,
            pool_address,
            asset_type,
            total_yield: yield_amount,
            treasury_amount,
            reward_vault_amount,
            payout_pool_bonus,
            timestamp: timestamp::now_seconds(),
        };
        
        table::add(&mut router.yields, yield_id, yield_record);
        
        // Update total yield
        router.total_yield = router.total_yield + yield_amount;
        
        // Emit yield event
        event::emit_event(&mut router.yield_recorded_events, YieldRecordedEvent {
            yield_id,
            pool_address,
            asset_type,
            total_yield: yield_amount,
            treasury_amount,
            reward_vault_amount,
            payout_pool_bonus,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    // Remove get functions that violate Move safety rules
    // These functions cannot return references to global storage

    /// Pause CLMM for a market (emergency)
    public entry fun pause_clmm(market: address) acquires CLMMConfig {
        let config = borrow_global_mut<CLMMConfig>(market);
        config.is_active = false;
    }

    /// Resume CLMM for a market
    public entry fun resume_clmm(market: address) acquires CLMMConfig {
        let config = borrow_global_mut<CLMMConfig>(market);
        config.is_active = true;
    }
}
