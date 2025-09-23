module yugo::global_pool {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::account;

    /// GlobalPool holds surplus liquidity for routing and injection
    struct GlobalPool has key {
        vault: Coin<AptosCoin>,
        lifetime_in: u128,
        lifetime_out: u128,
        pending_clmm: u64,
        active_injections: u64,
        admin: address,
    }

    // ==== Events ====
    struct NoWinnerRoutedEvent has drop, store { market: address, fee: u64, leftover_user: u64, refund_injection: u64 }
    struct InjectionCreatedEvent has drop, store { market: address, amount: u64 }
    struct InjectionCanceledEvent has drop, store { market: address, amount: u64 }
    struct InjectionLockedEvent has drop, store { market: address, total_locked: u64 }
    struct CLMMWithdrawEvent has drop, store { amount: u64, memo: std::string::String }
    struct CLMMReturnEvent has drop, store { amount: u64, pnl_sign: bool, pnl_abs: u64, memo: std::string::String }
    struct GlobalPoolUpdatedEvent has drop, store { balance: u64, pending_clmm: u64, active_injections: u64 }

    struct Events has key {
        no_winner_routed: event::EventHandle<NoWinnerRoutedEvent>,
        injection_created: event::EventHandle<InjectionCreatedEvent>,
        injection_canceled: event::EventHandle<InjectionCanceledEvent>,
        injection_locked: event::EventHandle<InjectionLockedEvent>,
        clmm_withdraw: event::EventHandle<CLMMWithdrawEvent>,
        clmm_return: event::EventHandle<CLMMReturnEvent>,
        pool_updated: event::EventHandle<GlobalPoolUpdatedEvent>,
    }

    /// Global pool already initialized
    const E_ALREADY_INIT: u64 = 8001;
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 8002;
    /// Global pool not found
    const E_NO_POOL: u64 = 8003;

    /// Initialize global pool. Should be called once by admin (publisher).
    public entry fun init_global_pool(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<GlobalPool>(admin_addr), E_ALREADY_INIT);
        move_to(admin, GlobalPool {
            vault: coin::zero<AptosCoin>(),
            lifetime_in: 0,
            lifetime_out: 0,
            pending_clmm: 0,
            active_injections: 0,
            admin: admin_addr,
        });
        move_to(admin, Events {
            no_winner_routed: account::new_event_handle<NoWinnerRoutedEvent>(admin),
            injection_created: account::new_event_handle<InjectionCreatedEvent>(admin),
            injection_canceled: account::new_event_handle<InjectionCanceledEvent>(admin),
            injection_locked: account::new_event_handle<InjectionLockedEvent>(admin),
            clmm_withdraw: account::new_event_handle<CLMMWithdrawEvent>(admin),
            clmm_return: account::new_event_handle<CLMMReturnEvent>(admin),
            pool_updated: account::new_event_handle<GlobalPoolUpdatedEvent>(admin),
        });
    }

    fun assert_admin(admin: &signer) acquires GlobalPool {
        let pool = borrow_global<GlobalPool>(signer::address_of(admin));
        assert!(signer::address_of(admin) == pool.admin, E_NOT_ADMIN)
    }

    /// Admin deposits coins into global pool
    public entry fun global_deposit_admin(admin: &signer, amount: u64) acquires GlobalPool, Events {
        assert_admin(admin);
        let pool = borrow_global_mut<GlobalPool>(signer::address_of(admin));
        let events = borrow_global_mut<Events>(signer::address_of(admin));
        let coins = coin::withdraw<AptosCoin>(admin, amount);
        coin::merge(&mut pool.vault, coins);
        pool.lifetime_in = pool.lifetime_in + (amount as u128);
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
    }

    /// Withdraw to CLMM
    public entry fun withdraw_for_clmm(admin: &signer, amount: u64, memo: std::string::String) acquires GlobalPool, Events {
        assert_admin(admin);
        let pool = borrow_global_mut<GlobalPool>(signer::address_of(admin));
        let events = borrow_global_mut<Events>(signer::address_of(admin));
        let out = coin::extract(&mut pool.vault, amount);
        coin::deposit(signer::address_of(admin), out);
        pool.pending_clmm = pool.pending_clmm + amount;
        pool.lifetime_out = pool.lifetime_out + (amount as u128);
        event::emit_event(&mut events.clmm_withdraw, CLMMWithdrawEvent { amount, memo });
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
    }

    /// Return from CLMM back to pool, along with pnl for audit
    public entry fun return_from_clmm(admin: &signer, amount: u64, pnl_sign: bool, pnl_abs: u64, memo: std::string::String) acquires GlobalPool, Events {
        assert_admin(admin);
        let pool = borrow_global_mut<GlobalPool>(signer::address_of(admin));
        let events = borrow_global_mut<Events>(signer::address_of(admin));
        let coins = coin::withdraw<AptosCoin>(admin, amount);
        let returned = amount;
        coin::merge(&mut pool.vault, coins);
        // For simplicity, reduce pending fully when admin returns any amount.
        pool.pending_clmm = 0;
        pool.lifetime_in = pool.lifetime_in + (returned as u128);
        event::emit_event(&mut events.clmm_return, CLMMReturnEvent { amount: returned, pnl_sign, pnl_abs, memo });
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
    }

    // View summary
    #[view]
    public fun get_global_pool_summary(admin_addr: address): (u64, u128, u128, u64, u64) acquires GlobalPool {
        let pool = borrow_global<GlobalPool>(admin_addr);
        (coin::value(&pool.vault), pool.lifetime_in, pool.lifetime_out, pool.pending_clmm, pool.active_injections)
    }

    // Return the admin address of the Global Pool stored under @yugo
    #[view]
    public fun get_global_pool_admin(): address acquires GlobalPool {
        let pool = borrow_global<GlobalPool>(@yugo);
        pool.admin
    }

    /// Accept routed funds from a market when no-winner, and emit event
    public fun deposit_from_market(admin_addr: address, market: address, leftover_user: Coin<AptosCoin>, refund_injection: Coin<AptosCoin>, fee: u64) acquires GlobalPool, Events {
        assert!(exists<GlobalPool>(admin_addr), E_NO_POOL);
        let pool = borrow_global_mut<GlobalPool>(admin_addr);
        let events = borrow_global_mut<Events>(admin_addr);
        let left_val = coin::value(&leftover_user);
        let inj_val = coin::value(&refund_injection);
        coin::merge(&mut pool.vault, leftover_user);
        coin::merge(&mut pool.vault, refund_injection);
        if (inj_val > 0) {
            // active injections reduced when refunded on no-winner
            if (pool.active_injections >= inj_val) { pool.active_injections = pool.active_injections - inj_val; } else { pool.active_injections = 0; };
        };
        pool.lifetime_in = pool.lifetime_in + ((left_val + inj_val) as u128);
        event::emit_event(&mut events.no_winner_routed, NoWinnerRoutedEvent { market, fee, leftover_user: left_val, refund_injection: inj_val });
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
    }

    /// Extract coins for injection (called by market module)
    public fun extract_for_injection(admin_addr: address, market: address, amount: u64): Coin<AptosCoin> acquires GlobalPool, Events {
        let pool = borrow_global_mut<GlobalPool>(admin_addr);
        let events = borrow_global_mut<Events>(admin_addr);
        let coins = coin::extract(&mut pool.vault, amount);
        pool.active_injections = pool.active_injections + amount;
        pool.lifetime_out = pool.lifetime_out + (amount as u128);
        event::emit_event(&mut events.injection_created, InjectionCreatedEvent { market, amount });
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
        coins
    }

    /// Return coins from cancelled injection (called by market module)
    public fun return_cancelled_injection(admin_addr: address, market: address, amount: u64, refund: Coin<AptosCoin>) acquires GlobalPool, Events {
        let pool = borrow_global_mut<GlobalPool>(admin_addr);
        let events = borrow_global_mut<Events>(admin_addr);
        let refund_val = coin::value(&refund);
        coin::merge(&mut pool.vault, refund);
        pool.active_injections = pool.active_injections - amount;
        pool.lifetime_in = pool.lifetime_in + (refund_val as u128);
        event::emit_event(&mut events.injection_canceled, InjectionCanceledEvent { market, amount });
        event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent { balance: coin::value(&pool.vault), pending_clmm: pool.pending_clmm, active_injections: pool.active_injections });
    }

    /// Emit lock event from market at resolve time
    public fun emit_injection_locked(admin_addr: address, market: address, total_locked: u64) acquires Events {
        let events = borrow_global_mut<Events>(admin_addr);
        event::emit_event(&mut events.injection_locked, InjectionLockedEvent { market, total_locked });
    }

    /// Decrease active injections when a market consumes injection on winner case
    public fun consume_injection(admin_addr: address, _market: address, amount: u64) acquires GlobalPool, Events {
        let pool = borrow_global_mut<GlobalPool>(admin_addr);
        let events = borrow_global_mut<Events>(admin_addr);
        if (amount > 0) {
            pool.active_injections = pool.active_injections - amount;
            // Emit pool updated after consumption
            event::emit_event(&mut events.pool_updated, GlobalPoolUpdatedEvent {
                balance: coin::value(&pool.vault),
                pending_clmm: pool.pending_clmm,
                active_injections: pool.active_injections,
            });
        }
    }
}


