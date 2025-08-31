module yugo::ork_token {
    use std::signer;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::string;

    /// ORK Token type
    struct ORK has key, store {}

    /// ORK Token configuration
    struct ORKConfig has key {
        /// Total supply cap
        total_supply_cap: u128,
        /// Current circulating supply
        circulating_supply: u128,
        /// Emission rate per block (in basis points)
        emission_rate_bps: u64,
        /// Last emission timestamp
        last_emission: u64,
        /// Emission interval in seconds
        emission_interval: u64,
        /// Whether emission is paused
        emission_paused: bool,
    }

    /// Treasury for ORK token
    struct Treasury has key {
        /// Treasury address
        treasury_addr: address,
        /// ORK balance in treasury
        ork_balance: Coin<ORK>,
        /// Event handles
        treasury_mint_events: EventHandle<TreasuryMintEvent>,
        treasury_burn_events: EventHandle<TreasuryBurnEvent>,
    }

    /// Treasury mint event
    struct TreasuryMintEvent has drop, store {
        to: address,
        amount: u64,
        timestamp: u64,
    }

    /// Treasury burn event
    struct TreasuryBurnEvent has drop, store {
        from: address,
        amount: u64,
        timestamp: u64,
    }

    /// Treasury seed
    const TREASURY_SEED: vector<u8> = b"oreka_ork_treasury";

    /// Error constants
    const EINVALID_AMOUNT: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const ENO_CAPABILITY: u64 = 3;
    const EINVALID_RECIPIENTS: u64 = 4;
    const ETREASURY_NOT_INITIALIZED: u64 = 5;
    const ESUPPLY_CAP_EXCEEDED: u64 = 6;
    
    /// Initialize ORK token
    public entry fun initialize_ork_token(
        admin: &signer
    ) {
        let admin_addr = signer::address_of(admin);
        
        // Initialize ORK coin
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<ORK>(
            admin,
            string::utf8(b"Oreka Token"),
            string::utf8(b"ORK"),
            8, // decimals
            true, // unlimited supply (controlled by cap)
        );
        
        // Store capabilities
        move_to(admin, ORKMintCapability { mint_cap });
        move_to(admin, ORKBurnCapability { burn_cap });
        move_to(admin, ORKFreezeCapability { freeze_cap });
        
        // Create ORK configuration
        let config = ORKConfig {
            total_supply_cap: 1000000000000000, // 1 trillion ORK (8 decimals)
            circulating_supply: 0,
            emission_rate_bps: 100, // 1% per emission interval
            last_emission: timestamp::now_seconds(),
            emission_interval: 86400, // 24 hours
            emission_paused: false,
        };
        move_to(admin, config);
        
        // Create treasury
        let treasury = Treasury {
            treasury_addr: admin_addr,
            ork_balance: coin::zero<ORK>(),
            treasury_mint_events: account::new_event_handle<TreasuryMintEvent>(admin),
            treasury_burn_events: account::new_event_handle<TreasuryBurnEvent>(admin),
        };
        move_to(admin, treasury);
    }

    /// ORK Mint Capability
    struct ORKMintCapability has key {
        mint_cap: coin::MintCapability<ORK>,
    }

    /// ORK Burn Capability
    struct ORKBurnCapability has key {
        burn_cap: coin::BurnCapability<ORK>,
    }

    /// ORK Freeze Capability
    struct ORKFreezeCapability has key {
        freeze_cap: coin::FreezeCapability<ORK>,
    }

    /// Mint ORK tokens (enforces supply cap)
    public entry fun mint_to(
        admin: &signer,
        recipient: address,
        amount: u64
    ) acquires ORKMintCapability, ORKConfig, Treasury {
        let admin_addr = signer::address_of(admin);
        let mint_cap = borrow_global<ORKMintCapability>(admin_addr);
        let config = borrow_global_mut<ORKConfig>(admin_addr);
        let treasury = borrow_global_mut<Treasury>(admin_addr);
        
        // Check supply cap
        assert!(config.circulating_supply + (amount as u128) <= config.total_supply_cap, ESUPPLY_CAP_EXCEEDED);
        
        // Mint tokens
        let ork_coins = coin::mint<ORK>(amount, &mint_cap.mint_cap);
        
        // Add to treasury balance
        coin::merge(&mut treasury.ork_balance, ork_coins);
        
        // Update circulating supply
        config.circulating_supply = config.circulating_supply + (amount as u128);
        
        // Emit event
        event::emit_event(&mut treasury.treasury_mint_events, TreasuryMintEvent {
            to: recipient,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }
    
    /// Burn ORK tokens
    public entry fun burn_from(
        admin: &signer,
        owner: address,
        amount: u64
    ) acquires ORKBurnCapability, ORKConfig, Treasury {
        let admin_addr = signer::address_of(admin);
        let burn_cap = borrow_global<ORKBurnCapability>(admin_addr);
        let config = borrow_global_mut<ORKConfig>(admin_addr);
        let treasury = borrow_global_mut<Treasury>(admin_addr);
        
        // Extract from treasury
        let ork_coins = coin::extract(&mut treasury.ork_balance, amount);
        
        // Burn tokens
        coin::burn(ork_coins, &burn_cap.burn_cap);
        
        // Update circulating supply
        config.circulating_supply = config.circulating_supply - (amount as u128);
        
        // Emit event
        event::emit_event(&mut treasury.treasury_burn_events, TreasuryBurnEvent {
            from: owner,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Airdrop ORK tokens to multiple recipients
    public entry fun airdrop(
        admin: &signer,
        recipients: vector<address>,
        amounts: vector<u64>
    ) acquires ORKMintCapability, ORKConfig, Treasury {
        let admin_addr = signer::address_of(admin);
        let mint_cap = borrow_global<ORKMintCapability>(admin_addr);
        let config = borrow_global_mut<ORKConfig>(admin_addr);
        let treasury = borrow_global_mut<Treasury>(admin_addr);
        
        let recipients_len = vector::length(&recipients);
        let amounts_len = vector::length(&amounts);
        assert!(recipients_len == amounts_len, EINVALID_RECIPIENTS);
        
        let i = 0;
        let total_amount = 0u128;
        
        // Calculate total amount and check supply cap
        while (i < amounts_len) {
            let amount = *vector::borrow(&amounts, i);
            total_amount = total_amount + (amount as u128);
            i = i + 1;
        };
        
        assert!(config.circulating_supply + total_amount <= config.total_supply_cap, ESUPPLY_CAP_EXCEEDED);
        
        // Mint and distribute tokens
        i = 0;
        while (i < recipients_len) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            
            if (amount > 0) {
                let ork_coins = coin::mint<ORK>(amount, &mint_cap.mint_cap);
                coin::deposit(recipient, ork_coins);
            };
            
            i = i + 1;
        };
        
        // Update circulating supply
        config.circulating_supply = config.circulating_supply + total_amount;
        
        // Emit airdrop event
        event::emit_event(&mut treasury.treasury_mint_events, TreasuryMintEvent {
            to: admin_addr, // Use admin address for airdrop events
            amount: (total_amount as u64),
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Get ORK balance of an account
    public fun balance_of(owner: address): u64 {
        coin::balance<ORK>(owner)
    }

    /// Get treasury address
    public fun get_treasury_address(): address acquires Treasury {
        let treasury = borrow_global<Treasury>(@yugo);
        treasury.treasury_addr
    }

    /// Get ORK token metadata
    public fun get_ork_token_metadata(): (vector<u8>, vector<u8>, u8) {
        (b"Oreka Token", b"ORK", 8)
    }

    /// Get ORK token supply info
    public fun get_ork_token_supply(): (u128, u128) acquires ORKConfig {
        let config = borrow_global<ORKConfig>(@yugo);
        (config.total_supply_cap, config.circulating_supply)
    }

    #[test_only]
    public fun initialize_for_testing(account: &signer) {
        initialize_ork_token(account);
    }
}
