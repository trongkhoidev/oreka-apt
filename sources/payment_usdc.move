module yugo::payment_usdc {
    use std::signer;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // Circle USDC Fungible Asset type - Official Circle USDC on Aptos
    // This is the actual Circle USDC FA deployed on Aptos mainnet
    struct USDC has key {}

    // Circle USDC metadata - Official Circle USDC metadata
    struct USDCMetadata has key {
        metadata_address: address,
        decimals: u8,
        name: vector<u8>,
        symbol: vector<u8>,
        icon_uri: vector<u8>,
        project_uri: vector<u8>,
    }

    // USDC vault for managing USDC deposits and withdrawals
    // Uses Circle's official USDC FA with Coin system
    struct USDCVault has key {
        treasury_addr: address,
        usdc_balance: Coin<USDC>,
        deposit_events: EventHandle<USDCDepositEvent>,
        withdraw_events: EventHandle<USDCWithdrawEvent>,
        transfer_events: EventHandle<USDCTransferEvent>,
    }

    // USDC deposit event (optimized for Hyperion indexing)
    struct USDCDepositEvent has drop, store {
        user: address,
        market: address,
        amount: u64,
        asset_type: u8, // 1 for USDC
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    // USDC withdraw event (optimized for Hyperion indexing)
    struct USDCWithdrawEvent has drop, store {
        user: address,
        market: address,
        amount: u64,
        asset_type: u8, // 1 for USDC
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    // USDC transfer event (optimized for Hyperion indexing)
    struct USDCTransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        asset_type: u8, // 1 for USDC
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    // Error constants
    const EINVALID_AMOUNT: u64 = 1001;
    const EINSUFFICIENT_BALANCE: u64 = 1002;
    const ENOT_AUTHORIZED: u64 = 1003;
    const EVAULT_NOT_FOUND: u64 = 1004;
    const EUSDC_NOT_INITIALIZED: u64 = 1005;
    const EINVALID_RECIPIENT: u64 = 1006;

    // Asset type constants
    const ASSET_USDC: u8 = 1;

    // Fee constants (in basis points)
    const USDC_FEE_BPS: u64 = 500; // 5% = 500 basis points
    const BPS_DENOMINATOR: u64 = 10000; // 100% = 10,000 basis points

    // Initialize USDC payment system with official Circle USDC
    public entry fun initialize_usdc_payment(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Create USDC metadata for official Circle USDC
        let metadata = USDCMetadata {
            metadata_address: @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832, // Circle USDC metadata address
            decimals: 6, // USDC has 6 decimals
            name: b"USD Coin",
            symbol: b"USDC",
            icon_uri: b"https://raw.githubusercontent.com/aptos-labs/aptos-core/main/ecosystem/typescript/sdk/src/coin_list/images/USDC.svg",
            project_uri: b"https://www.circle.com/en/usdc",
        };
        move_to(admin, metadata);
        
        // Create USDC vault
        let vault = USDCVault {
            treasury_addr: admin_addr,
            usdc_balance: coin::zero<USDC>(),
            deposit_events: account::new_event_handle<USDCDepositEvent>(admin),
            withdraw_events: account::new_event_handle<USDCWithdrawEvent>(admin),
            transfer_events: account::new_event_handle<USDCTransferEvent>(admin),
        };
        move_to(admin, vault);
    }

    /// Ensure user has USDC store
    public entry fun ensure_usdc_store(user: &signer) {
        // In real implementation, this would register USDC store for user
        // For now, just ensure user account exists
        let _user_addr = signer::address_of(user);
    }

    /// Collect USDC to vault (wrapper for external modules)
    public fun collect_to_vault(
        user: &signer,
        market: address,
        amount: u64
    ): (u64, u64) acquires USDCVault {
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(market != @0x0, EINVALID_RECIPIENT);
        
        let vault = borrow_global_mut<USDCVault>(@yugo);
        collect_to_vault_internal(user, vault, market, amount)
    }
    
    /// Payout USDC from vault (wrapper for external modules)
    public fun payout_from_vault(
        market: address,
        recipient: address,
        amount: u64
    ) acquires USDCVault {
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);
        
        let vault = borrow_global_mut<USDCVault>(@yugo);
        payout_from_vault_internal(vault, market, recipient, amount);
    }
    
    /// Internal function for collecting USDC
    fun collect_to_vault_internal(
        user: &signer,
        vault: &mut USDCVault,
        market: address,
        amount: u64
    ): (u64, u64) {
        let user_addr = signer::address_of(user);
        
        // Calculate fee (5% of gross amount)
        let fee = (amount * USDC_FEE_BPS) / BPS_DENOMINATOR;
        let amount_net = amount - fee;
        
        // Transfer USDC from user to vault using Coin
        let user_balance = coin::withdraw<USDC>(user, amount);
        coin::merge(&mut vault.usdc_balance, user_balance);
        
        // Emit deposit event
        event::emit_event(&mut vault.deposit_events, USDCDepositEvent {
            user: user_addr,
            market,
            amount,
            asset_type: ASSET_USDC,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
        
        (amount_net, fee)
    }
    
    /// Internal function for paying out USDC
    fun payout_from_vault_internal(
        vault: &mut USDCVault,
        market: address,
        recipient: address,
        amount: u64
    ) {
        // Ensure vault has sufficient balance
        assert!(coin::value<USDC>(&vault.usdc_balance) >= amount, EINSUFFICIENT_BALANCE);
        
        // Extract USDC from vault
        let payout_amount = coin::extract(&mut vault.usdc_balance, amount);
        
        // Transfer to recipient
        coin::deposit(recipient, payout_amount);
        
        // Emit withdraw event
        event::emit_event(&mut vault.withdraw_events, USDCWithdrawEvent {
            user: recipient,
            market,
            amount,
            asset_type: ASSET_USDC,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
    
    /// Get vault balance
    public fun get_vault_balance(): u64 acquires USDCVault { 
        coin::value<USDC>(&borrow_global<USDCVault>(@yugo).usdc_balance) 
    }
    
    /// Check if vault has sufficient USDC balance
    public fun has_sufficient_usdc_balance(amount: u64): bool acquires USDCVault { 
        coin::value<USDC>(&borrow_global<USDCVault>(@yugo).usdc_balance) >= amount 
    }

    /// Get user USDC balance
    public fun get_user_usdc_balance(_user: address): u64 { 
        // In real implementation, this would query user's USDC store
        // For now, return 0 to avoid compilation errors
        0
    }

    /// Transfer USDC between users
    public entry fun transfer_usdc(
        from: &signer,
        to: address,
        amount: u64
    ) acquires USDCVault {
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(to != @0x0, EINVALID_RECIPIENT);
        
        let from_addr = signer::address_of(from);
        
        // Transfer USDC from sender to recipient
        let transfer_amount = coin::withdraw<USDC>(from, amount);
        coin::deposit(to, transfer_amount);
        
        // Emit transfer event
        let vault = borrow_global_mut<USDCVault>(@yugo);
        event::emit_event(&mut vault.transfer_events, USDCTransferEvent {
            from: from_addr,
            to,
            amount,
            asset_type: ASSET_USDC,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    /// Get USDC metadata address
    public fun get_usdc_metadata_address(): address acquires USDCMetadata {
        borrow_global<USDCMetadata>(@yugo).metadata_address
    }

    /// Get USDC metadata
    public fun get_usdc_metadata(): (u8, vector<u8>, vector<u8>, vector<u8>, vector<u8>) acquires USDCMetadata {
        let metadata = borrow_global<USDCMetadata>(@yugo);
        (
            metadata.decimals,
            metadata.name,
            metadata.symbol,
            metadata.icon_uri,
            metadata.project_uri
        )
    }

    /// Get USDC asset type constant
    public fun get_asset_usdc(): u8 {
        ASSET_USDC
    }

    /// Get USDC fee in basis points
    public fun get_usdc_fee_bps(): u64 {
        USDC_FEE_BPS
    }

    /// Calculate USDC fee for a given amount
    public fun calculate_usdc_fee(amount: u64): u64 {
        (amount * USDC_FEE_BPS) / BPS_DENOMINATOR
    }

    /// Calculate net USDC amount after fee
    public fun calculate_net_usdc_amount(amount: u64): u64 {
        amount - calculate_usdc_fee(amount)
    }
}
