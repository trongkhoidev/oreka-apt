module yugo::test_helpers {
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use yugo::market_core;
    use yugo::global_pool;

    struct TestMintCap has key {
        mint_cap: coin::MintCapability<AptosCoin>
    }

    /// Setup complete test environment (simplified)
    public fun setup_complete_test_environment() acquires TestMintCap {
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::fast_forward_seconds(1000);
        
        // Initialize APT coin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework);
        coin::destroy_burn_cap(burn_cap);
        
        // Store mint cap for later use
        move_to(&aptos_framework, TestMintCap { mint_cap });
        
        // Setup MarketConfig and MarketRegistry for market_core
        let yugo_account = account::create_account_for_test(@yugo);
        market_core::initialize_market_registry(&yugo_account);
        market_core::initialize_market_config(&yugo_account, @yugo);
        
        // Setup GlobalPool at @0x1 (ADMIN address used in tests)
        let admin_account = account::create_account_for_test(@0x1);
        global_pool::init_global_pool(&admin_account);
        
        // Setup GlobalPool at @yugo (for market_core_tests)
        let yugo_admin_account = account::create_account_for_test(@yugo);
        global_pool::init_global_pool(&yugo_admin_account);
        
        // Fund the admin accounts and deposit into global pools
        fund_account(@0x1, 50_000_000_000); // 500 APT for admin account
        global_pool::global_deposit_admin(&admin_account, 50_000_000_000); // Deposit into global pool vault
        
        fund_account(@yugo, 50_000_000_000); // 500 APT for yugo account
        global_pool::global_deposit_admin(&yugo_admin_account, 50_000_000_000); // Deposit into global pool vault
    }

    /// Fund a test account with APT coins
    public fun fund_account(account_addr: address, amount: u64) acquires TestMintCap {
        let account = account::create_account_for_test(account_addr);
        let test_mint_cap = borrow_global<TestMintCap>(@aptos_framework);
        let coins = coin::mint<AptosCoin>(amount, &test_mint_cap.mint_cap);
        coin::register<AptosCoin>(&account);
        coin::deposit(account_addr, coins);
    }

    /// Advance time for testing
    public fun advance_time(seconds: u64) {
        timestamp::fast_forward_seconds(seconds);
    }
}
