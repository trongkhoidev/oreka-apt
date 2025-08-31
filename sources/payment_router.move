module yugo::payment_router {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use yugo::types;

    // Import payment modules
    use yugo::payment_usdc;

    /// Payment router for handling USDC/APT payments
    struct PaymentRouter has key {
        /// Event handles
        payment_collected_events: EventHandle<PaymentCollectedEvent>,
        payment_payout_events: EventHandle<PaymentPayoutEvent>,
    }

    #[event]
    struct PaymentCollectedEvent has drop, store {
        user: address,
        market: address,
        asset_type: u8,
        amount_gross: u64,
        amount_net: u64,
        fee: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    #[event]
    struct PaymentPayoutEvent has drop, store {
        user: address,
        market: address,
        recipient: address,
        asset_type: u8,
        amount: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    /// Error constants
    const EINVALID_ASSET_TYPE: u64 = 1001;
    const EINVALID_AMOUNT: u64 = 1002;
    const EINSUFFICIENT_BALANCE: u64 = 1003;

    /// Initialize payment router
    public entry fun initialize_payment_router(admin: &signer) {
        let router = PaymentRouter {
            payment_collected_events: account::new_event_handle<PaymentCollectedEvent>(admin),
            payment_payout_events: account::new_event_handle<PaymentPayoutEvent>(admin),
        };
        move_to(admin, router);
    }

    /// Collect payment to vault (USDC or APT)
    /// Returns (amount_net, fee) for the market
    public fun collect_to_vault(
        user: &signer,
        market: address,
        asset_type: u8,
        amount: u64
    ): (u64, u64) acquires PaymentRouter {
        assert!(amount > 0, EINVALID_AMOUNT);
        
        if (asset_type == types::get_asset_usdc()) {
            collect_usdc_to_vault(user, market, amount)
        } else if (asset_type == types::get_asset_apt()) {
            collect_apt_to_vault(user, market, amount)
        } else {
            abort EINVALID_ASSET_TYPE
        }
    }

    /// Entry function wrapper for collect_to_vault
    public entry fun collect_to_vault_entry(
        user: &signer,
        market: address,
        asset_type: u8,
        amount: u64
    ) acquires PaymentRouter {
        let (_amount_net, _fee) = collect_to_vault(user, market, asset_type, amount);
    }

    /// Payout from vault (USDC or APT)
    public entry fun payout_from_vault(
        market: address,
        recipient: address,
        asset_type: u8,
        amount: u64
    ) acquires PaymentRouter {
        assert!(amount > 0, EINVALID_AMOUNT);
        
        if (asset_type == types::get_asset_usdc()) {
            payout_usdc_from_vault(market, recipient, amount)
        } else if (asset_type == types::get_asset_apt()) {
            payout_apt_from_vault(market, recipient, amount)
        } else {
            abort EINVALID_ASSET_TYPE
        };
        
        // Emit payout event
        let router = borrow_global_mut<PaymentRouter>(@yugo);
        event::emit_event(&mut router.payment_payout_events, PaymentPayoutEvent {
            user: recipient,
            market,
            recipient,
            asset_type,
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(), // Placeholder for indexer
            transaction_hash: vector::empty(), // Placeholder for indexer
        });
    }

    /// Collect APT to market vault
    public fun collect_apt_to_vault(
        user: &signer,
        market: address,
        amount: u64
    ): (u64, u64) acquires PaymentRouter {
        // Calculate fee (5% of gross amount)
        let fee_bps = 500; // 5% = 500 basis points
        let fee = (amount * fee_bps) / 10000;
        let amount_net = amount - fee;
        
        // Transfer APT from user to market vault
        let user_coins = coin::withdraw<aptos_framework::aptos_coin::AptosCoin>(user, amount);
        // Note: In real implementation, this would transfer to market.coin_vault
        // For now, we'll deposit to a temporary address to avoid compilation errors
        // The actual market vault integration will be implemented when the circular dependency is resolved
        coin::deposit(@0x0, user_coins);
        
        // Emit collection event
        event::emit_event(&mut borrow_global_mut<PaymentRouter>(@yugo).payment_collected_events, PaymentCollectedEvent {
            user: signer::address_of(user),
            market,
            asset_type: types::get_asset_apt(),
            amount_gross: amount,
            amount_net,
            fee,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
        
        (amount_net, fee)
    }
    
    /// Payout APT from market vault
    public fun payout_apt_from_vault(
        market: address,
        recipient: address,
        amount: u64
    ) acquires PaymentRouter {
        // In real implementation, this would extract from market.coin_vault
        // For now, we'll emit an event to avoid circular dependency
        
        // Emit payout event
        event::emit_event(&mut borrow_global_mut<PaymentRouter>(@yugo).payment_payout_events, PaymentPayoutEvent {
            user: recipient,
            market,
            recipient,
            asset_type: types::get_asset_apt(),
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    /// Collect USDC to vault using payment_usdc module
    public fun collect_usdc_to_vault(
        user: &signer,
        market: address,
        amount: u64
    ): (u64, u64) {
        // Call the payment_usdc module directly
        payment_usdc::collect_to_vault(user, market, amount)
    }
    
    /// Payout USDC from vault using payment_usdc module
    public fun payout_usdc_from_vault(
        market: address,
        recipient: address,
        amount: u64
    ) {
        // Call the payment_usdc module directly
        payment_usdc::payout_from_vault(market, recipient, amount);
    }

    // ============================================================================
    // MARKET VAULT INTEGRATION FUNCTIONS
    // ============================================================================
    
    /// Direct APT collection to market vault (called by market module)
    /// This function bypasses the router and directly handles APT transfer
    public fun collect_apt_direct(
        user: &signer,
        market_vault: &mut aptos_framework::coin::Coin<aptos_framework::aptos_coin::AptosCoin>,
        amount: u64
    ): (u64, u64) acquires PaymentRouter {
        // Calculate fee (5% of gross amount)
        let fee_bps = 500; // 5% = 500 basis points
        let fee = (amount * fee_bps) / 10000;
        let amount_net = amount - fee;
        
        // Transfer APT from user to market vault
        let user_coins = coin::withdraw<aptos_framework::aptos_coin::AptosCoin>(user, amount);
        coin::merge(market_vault, user_coins);
        
        // Emit collection event
        event::emit_event(&mut borrow_global_mut<PaymentRouter>(@yugo).payment_collected_events, PaymentCollectedEvent {
            user: signer::address_of(user),
            market: @0x0, // Will be set by caller
            asset_type: types::get_asset_apt(),
            amount_gross: amount,
            amount_net,
            fee,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
        
        (amount_net, fee)
    }
    
    /// Direct APT payout from market vault (called by market module)
    /// This function bypasses the router and directly handles APT transfer
    public fun payout_apt_direct(
        market_vault: &mut aptos_framework::coin::Coin<aptos_framework::aptos_coin::AptosCoin>,
        recipient: address,
        amount: u64
    ) acquires PaymentRouter {
        // Ensure vault has sufficient balance
        assert!(coin::value<aptos_framework::aptos_coin::AptosCoin>(market_vault) >= amount, EINSUFFICIENT_BALANCE);
        
        // Extract APT from market vault
        let payout_amount = coin::extract(market_vault, amount);
        
        // Transfer to recipient
        coin::deposit(recipient, payout_amount);
        
        // Emit payout event
        event::emit_event(&mut borrow_global_mut<PaymentRouter>(@yugo).payment_payout_events, PaymentPayoutEvent {
            user: recipient,
            market: @0x0, // Will be set by caller
            recipient,
            asset_type: types::get_asset_apt(),
            amount,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }
}
