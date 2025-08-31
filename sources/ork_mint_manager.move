module yugo::ork_mint_manager {
    use std::signer;
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    use yugo::types;

    // ============================================================================
    // EVENT STRUCTURES
    // ============================================================================
    
    /// Budget granted event
    struct BudgetGrantedEvent has drop, store {
        minter: address,
        budget: u128,
        granter: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Budget consumed event
    struct BudgetConsumedEvent has drop, store {
        minter: address,
        amount: u128,
        remaining_budget: u128,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Epoch rolled event
    struct EpochRolledEvent has drop, store {
        old_epoch: u64,
        new_epoch: u64,
        new_budget: u128,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    // ============================================================================
    // MINT MANAGER STRUCTURES
    // ============================================================================
    
    /// ORK Mint Manager for controlling token emission
    struct ORKMintManager has key {
        /// Maximum supply cap
        max_supply: u128,
        /// Current circulating supply
        circulating_supply: u128,
        /// Total minted so far
        minted_so_far: u128,
        /// Total burned so far
        burned_so_far: u128,
        /// Current epoch
        current_epoch: u64,
        /// Epoch budget (per epoch)
        epoch_budget: u128,
        /// Next epoch start time
        next_epoch_start: u64,
        /// Minter roles with remaining budgets
        minter_budgets: Table<address, u128>,
        /// Minter roles
        minter_roles: vector<address>,
        /// Whether emission is paused
        emission_paused: bool,
        /// Event handles
        budget_granted_events: EventHandle<BudgetGrantedEvent>,
        budget_consumed_events: EventHandle<BudgetConsumedEvent>,
        epoch_rolled_events: EventHandle<EpochRolledEvent>,
    }
    
    /// Minter info
    struct MinterInfo has store, copy, drop {
        address: address,
        budget: u128,
        minted_this_epoch: u128,
        total_minted: u128,
        last_mint_time: u64,
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    /// Initialize ORK mint manager
    public entry fun initialize_ork_mint_manager(admin: &signer) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        let current_time = timestamp::now_seconds();
        
        let mint_manager = ORKMintManager {
            max_supply: types::get_max_supply(),
            circulating_supply: types::get_initial_supply(),
            minted_so_far: types::get_initial_supply(),
            burned_so_far: 0,
            current_epoch: current_time / types::get_epoch_duration_seconds(),
            epoch_budget: types::get_initial_epoch_budget(),
            next_epoch_start: current_time + types::get_epoch_duration_seconds(),
            minter_budgets: table::new(),
            minter_roles: vector[admin_addr],
            emission_paused: false,
            budget_granted_events: account::new_event_handle<BudgetGrantedEvent>(admin),
            budget_consumed_events: account::new_event_handle<BudgetConsumedEvent>(admin),
            epoch_rolled_events: account::new_event_handle<EpochRolledEvent>(admin),
        };
        
        move_to(admin, mint_manager);
        
        // Grant initial budget to admin
        grant_minter_budget(admin, admin_addr, types::get_initial_epoch_budget());
    }

    // ============================================================================
    // MINTING CONTROL
    // ============================================================================
    
    /// Consume budget for minting (called by ORK token)
    public fun consume_budget(minter: address, amount: u128) acquires ORKMintManager {
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        
        // Check if emission is paused
        assert!(!mint_manager.emission_paused, types::get_eexceeds_epoch_budget());
        
        // Check if minter exists
        assert!(table::contains(&mint_manager.minter_budgets, minter), types::get_eminter_not_found());
        
        // Check minter budget
        let minter_budget = table::borrow_mut(&mut mint_manager.minter_budgets, minter);
        assert!(*minter_budget >= amount, types::get_eminter_budget_exhausted());
        
        // Check epoch budget
        assert!(mint_manager.epoch_budget >= amount, types::get_eexceeds_epoch_budget());
        
        // Check max supply
        assert!(mint_manager.minted_so_far + amount <= mint_manager.max_supply, types::get_eexceeds_max_supply());
        
        // Consume budget
        *minter_budget = *minter_budget - amount;
        mint_manager.epoch_budget = mint_manager.epoch_budget - amount;
        mint_manager.minted_so_far = mint_manager.minted_so_far + amount;
        mint_manager.circulating_supply = mint_manager.circulating_supply + amount;
        
        // Emit budget consumed event
        event::emit_event(&mut mint_manager.budget_consumed_events, BudgetConsumedEvent {
            minter,
            amount,
            remaining_budget: *minter_budget,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Record burn (called by ORK token)
    public fun record_burn(amount: u128) acquires ORKMintManager {
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        mint_manager.burned_so_far = mint_manager.burned_so_far + amount;
        mint_manager.circulating_supply = mint_manager.circulating_supply - amount;
    }

    // ============================================================================
    // BUDGET MANAGEMENT
    // ============================================================================
    
    /// Grant minter budget
    public entry fun grant_minter_budget(
        admin: &signer,
        minter: address,
        budget: u128
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        // Validate parameters
        assert!(budget > 0, 2001); // EINVALID_AMOUNT
        assert!(minter != @0x0, 1004); // EUSER_NOT_FOUND
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        
        // Add minter if not exists
        if (!table::contains(&mint_manager.minter_budgets, minter)) {
            table::add(&mut mint_manager.minter_budgets, minter, 0);
            vector::push_back(&mut mint_manager.minter_roles, minter);
        };
        
        // Grant budget
        let current_budget = table::borrow_mut(&mut mint_manager.minter_budgets, minter);
        *current_budget = *current_budget + budget;
        
        // Emit budget granted event
        event::emit_event(&mut mint_manager.budget_granted_events, BudgetGrantedEvent {
            minter,
            budget,
            granter: admin_addr,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Revoke minter budget
    public entry fun revoke_minter_budget(
        admin: &signer,
        minter: address
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        // Validate parameters
        assert!(minter != @0x0, 1004); // EUSER_NOT_FOUND
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        
        // Check if minter exists
        assert!(table::contains(&mint_manager.minter_budgets, minter), types::get_eminter_not_found());
        
        // Remove minter
        table::remove(&mut mint_manager.minter_budgets, minter);
        
        // Remove from minter roles
        let i = 0;
        let len = vector::length(&mint_manager.minter_roles);
        while (i < len) {
            if (*vector::borrow(&mint_manager.minter_roles, i) == minter) {
                vector::remove(&mut mint_manager.minter_roles, i);
                break
            };
            i = i + 1;
        };
    }
    
    /// Set epoch budget
    public entry fun set_epoch_budget(
        admin: &signer,
        new_budget: u128
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        // Validate budget
        assert!(new_budget > 0, 2001); // EINVALID_AMOUNT
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        mint_manager.epoch_budget = new_budget;
    }
    
    /// Set max supply (only decrease allowed)
    public entry fun set_max_supply(
        admin: &signer,
        new_max_supply: u128
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        // Validate new max supply
        assert!(new_max_supply > 0, 2001); // EINVALID_AMOUNT
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        
        // Only allow decrease
        assert!(new_max_supply <= mint_manager.max_supply, 2005); // EEXCEEDS_MAX_SUPPLY
        
        // Check if new max supply is sufficient for current minted amount
        assert!(new_max_supply >= mint_manager.minted_so_far, 2005); // EEXCEEDS_MAX_SUPPLY
        
        mint_manager.max_supply = new_max_supply;
    }

    // ============================================================================
    // EPOCH MANAGEMENT
    // ============================================================================
    
    /// Roll epoch (reset budgets)
    public entry fun roll_epoch(admin: &signer) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        let current_time = timestamp::now_seconds();
        
        // Calculate new epoch
        let old_epoch = mint_manager.current_epoch;
        let new_epoch = current_time / types::get_epoch_duration_seconds();
        
        // Update epoch
        mint_manager.current_epoch = new_epoch;
        mint_manager.next_epoch_start = current_time + types::get_epoch_duration_seconds();
        
        // Reset epoch budget
        mint_manager.epoch_budget = mint_manager.epoch_budget;
        
        // Reset minter budgets
        let i = 0;
        let len = vector::length(&mint_manager.minter_roles);
        while (i < len) {
            let minter = *vector::borrow(&mint_manager.minter_roles, i);
            if (table::contains(&mint_manager.minter_budgets, minter)) {
                let minter_budget = table::borrow_mut(&mut mint_manager.minter_budgets, minter);
                *minter_budget = mint_manager.epoch_budget;
            };
            i = i + 1;
        };
        
        // Emit epoch rolled event
        event::emit_event(&mut mint_manager.epoch_rolled_events, EpochRolledEvent {
            old_epoch,
            new_epoch,
            new_budget: mint_manager.epoch_budget,
            timestamp: current_time,
            block_height: current_time,
            transaction_hash: vector::empty(),
        });
    }
    
    /// Auto-roll epoch if needed
    public fun auto_roll_epoch_if_needed() acquires ORKMintManager {
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        let current_time = timestamp::now_seconds();
        
        if (current_time >= mint_manager.next_epoch_start) {
            let old_epoch = mint_manager.current_epoch;
            let new_epoch = current_time / types::get_epoch_duration_seconds();
            
            // Update epoch
            mint_manager.current_epoch = new_epoch;
            mint_manager.next_epoch_start = current_time + types::get_epoch_duration_seconds();
            
            // Reset minter budgets
            let i = 0;
            let len = vector::length(&mint_manager.minter_roles);
            while (i < len) {
                let minter = *vector::borrow(&mint_manager.minter_roles, i);
                if (table::contains(&mint_manager.minter_budgets, minter)) {
                    let minter_budget = table::borrow_mut(&mut mint_manager.minter_budgets, minter);
                    *minter_budget = mint_manager.epoch_budget;
                };
                i = i + 1;
            };
            
            // Emit epoch rolled event
            event::emit_event(&mut mint_manager.epoch_rolled_events, EpochRolledEvent {
                old_epoch,
                new_epoch,
                new_budget: mint_manager.epoch_budget,
                timestamp: current_time,
                block_height: current_time,
                transaction_hash: vector::empty(),
            });
        };
    }

    // ============================================================================
    // EMISSION CONTROL
    // ============================================================================
    
    /// Pause emission
    public entry fun pause_emission(
        admin: &signer
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        mint_manager.emission_paused = true;
    }
    
    /// Resume emission
    public entry fun resume_emission(
        admin: &signer
    ) acquires ORKMintManager {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has budget management permission
        yugo::ork_access_control::require_permission(admin_addr, 5); // PERMISSION_MANAGE_BUDGET
        
        let mint_manager = borrow_global_mut<ORKMintManager>(@yugo);
        mint_manager.emission_paused = false;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /// Get mint manager info
    public fun get_mint_manager_info(): (
        u128, u128, u128, u128, u64, u128, u64, bool
    ) acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        (
            mint_manager.max_supply,
            mint_manager.circulating_supply,
            mint_manager.minted_so_far,
            mint_manager.burned_so_far,
            mint_manager.current_epoch,
            mint_manager.epoch_budget,
            mint_manager.next_epoch_start,
            mint_manager.emission_paused
        )
    }
    
    /// Get minter budget
    public fun get_minter_budget(minter: address): u128 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        
        if (table::contains(&mint_manager.minter_budgets, minter)) {
            *table::borrow(&mint_manager.minter_budgets, minter)
        } else {
            0
        }
    }
    
    /// Get all minters
    public fun get_all_minters(): vector<address> acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        *&mint_manager.minter_roles
    }
    
    /// Check if address is minter
    public fun is_minter(addr: address): bool acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        table::contains(&mint_manager.minter_budgets, addr)
    }
    
    /// Get current epoch
    public fun get_current_epoch(): u64 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        mint_manager.current_epoch
    }
    
    /// Get time until next epoch
    public fun get_time_until_next_epoch(): u64 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        let current_time = timestamp::now_seconds();
        
        if (current_time >= mint_manager.next_epoch_start) {
            0
        } else {
            mint_manager.next_epoch_start - current_time
        }
    }
    
    /// Get remaining epoch budget
    public fun get_remaining_epoch_budget(): u128 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        mint_manager.epoch_budget
    }
    
    /// Get total available for minting
    public fun get_total_available_for_minting(): u128 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        mint_manager.max_supply - mint_manager.minted_so_far
    }
    
    /// Get emission rate (tokens per epoch)
    public fun get_emission_rate(): u128 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        mint_manager.epoch_budget
    }
    
    /// Get annual emission rate
    public fun get_annual_emission_rate(): u128 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        mint_manager.epoch_budget * 365
    }
    
    /// Get inflation rate (annual)
    public fun get_inflation_rate(): u64 acquires ORKMintManager {
        let mint_manager = borrow_global<ORKMintManager>(@yugo);
        let annual_emission = mint_manager.epoch_budget * 365;
        
        if (mint_manager.circulating_supply > 0) {
            ((annual_emission * 10000) / mint_manager.circulating_supply as u64)
        } else {
            0
        }
    }
}
