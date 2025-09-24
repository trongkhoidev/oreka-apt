module yugo::global_pool_tests_new {
    use std::signer;
    use std::string;
    use yugo::global_pool::{Self, GlobalPool, Events};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;

    // Test initialization of global pool
    #[test(admin = @yugo)]
    fun test_init_global_pool(admin: &signer) {
        // Create account for admin
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        
        // Initialize global pool
        global_pool::init_global_pool(admin);
        
        // Verify pool exists
        assert!(exists<GlobalPool>(signer::address_of(admin)), 1);
        assert!(exists<Events>(signer::address_of(admin)), 2);
        
        // Check initial state
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == 0, 3);
        assert!(lifetime_in == 0, 4);
        assert!(lifetime_out == 0, 5);
        assert!(pending_clmm == 0, 6);
        assert!(active_injections == 0, 7);
    }

    // Test duplicate initialization (should fail)
    #[test(admin = @yugo)]
    #[expected_failure(abort_code = 0x8001)] // E_ALREADY_INIT
    fun test_init_global_pool_duplicate(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        
        // Initialize first time
        global_pool::init_global_pool(admin);
        
        // Try to initialize again (should fail)
        global_pool::init_global_pool(admin);
    }

    // Test admin deposit
    #[test(admin = @yugo)]
    fun test_global_deposit_admin(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        global_pool::global_deposit_admin(admin, deposit_amount);
        
        // Verify deposit
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount, 8);
        assert!(lifetime_in == (deposit_amount as u128), 9);
        assert!(lifetime_out == 0, 10);
        assert!(pending_clmm == 0, 11);
        assert!(active_injections == 0, 12);
    }

    // Test multiple deposits
    #[test(admin = @yugo)]
    fun test_multiple_deposits(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit1 = 500;
        let deposit2 = 300;
        let deposit3 = 200;
        
        global_pool::global_deposit_admin(admin, deposit1);
        global_pool::global_deposit_admin(admin, deposit2);
        global_pool::global_deposit_admin(admin, deposit3);
        
        let total_deposit = deposit1 + deposit2 + deposit3;
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == total_deposit, 13);
        assert!(lifetime_in == (total_deposit as u128), 14);
        assert!(lifetime_out == 0, 15);
        assert!(pending_clmm == 0, 16);
        assert!(active_injections == 0, 17);
    }

    // Test withdraw for CLMM
    #[test(admin = @yugo)]
    fun test_withdraw_for_clmm(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let withdraw_amount = 300;
        let memo = string::utf8(b"CLMM test");
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        global_pool::withdraw_for_clmm(admin, withdraw_amount, memo);
        
        // Verify withdrawal
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount - withdraw_amount, 18);
        assert!(lifetime_in == (deposit_amount as u128), 19);
        assert!(lifetime_out == (withdraw_amount as u128), 20);
        assert!(pending_clmm == withdraw_amount, 21);
        assert!(active_injections == 0, 22);
    }

    // Test return from CLMM
    #[test(admin = @yugo)]
    fun test_return_from_clmm(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let withdraw_amount = 300;
        let return_amount = 350; // Including profit
        let memo = string::utf8(b"CLMM return");
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        global_pool::withdraw_for_clmm(admin, withdraw_amount, string::utf8(b"withdraw"));
        global_pool::return_from_clmm(admin, return_amount, true, 50, memo); // profit = 50
        
        // Verify return
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount - withdraw_amount + return_amount, 23);
        assert!(lifetime_in == ((deposit_amount + return_amount) as u128), 24);
        assert!(lifetime_out == (withdraw_amount as u128), 25);
        assert!(pending_clmm == 0, 26); // Should be reset to 0
        assert!(active_injections == 0, 27);
    }

    // Test return from CLMM with loss
    #[test(admin = @yugo)]
    fun test_return_from_clmm_loss(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let withdraw_amount = 300;
        let return_amount = 250; // Including loss
        let memo = string::utf8(b"CLMM loss");
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        global_pool::withdraw_for_clmm(admin, withdraw_amount, string::utf8(b"withdraw"));
        global_pool::return_from_clmm(admin, return_amount, false, 50, memo); // loss = 50
        
        // Verify return with loss
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount - withdraw_amount + return_amount, 28);
        assert!(lifetime_in == ((deposit_amount + return_amount) as u128), 29);
        assert!(lifetime_out == (withdraw_amount as u128), 30);
        assert!(pending_clmm == 0, 31);
        assert!(active_injections == 0, 32);
    }

    // Test extract for injection
    #[test(admin = @yugo)]
    fun test_extract_for_injection(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let injection_amount = 200;
        let market_addr = @0x123;
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        let extracted_coins = global_pool::extract_for_injection(signer::address_of(admin), market_addr, injection_amount);
        
        // Verify extraction
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount - injection_amount, 33);
        assert!(lifetime_in == (deposit_amount as u128), 34);
        assert!(lifetime_out == (injection_amount as u128), 35);
        assert!(pending_clmm == 0, 36);
        assert!(active_injections == injection_amount, 37);
        assert!(coin::value(&extracted_coins) == injection_amount, 38);
        
        // Clean up extracted coins
        coin::deposit(signer::address_of(admin), extracted_coins);
    }

    // Test return cancelled injection
    #[test(admin = @yugo)]
    fun test_return_cancelled_injection(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let injection_amount = 200;
        let market_addr = @0x123;
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        let extracted_coins = global_pool::extract_for_injection(signer::address_of(admin), market_addr, injection_amount);
        
        // Return cancelled injection
        global_pool::return_cancelled_injection(signer::address_of(admin), market_addr, injection_amount, extracted_coins);
        
        // Verify return
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount, 39); // Should be back to original
        assert!(lifetime_in == ((deposit_amount + injection_amount) as u128), 40); // Increased by refund
        assert!(lifetime_out == (injection_amount as u128), 41);
        assert!(pending_clmm == 0, 42);
        assert!(active_injections == 0, 43); // Should be reset
    }

    // Test consume injection
    #[test(admin = @yugo)]
    fun test_consume_injection(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let injection_amount = 200;
        let market_addr = @0x123;
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        let extracted_coins = global_pool::extract_for_injection(signer::address_of(admin), market_addr, injection_amount);
        
        // Consume injection (simulate market using the injection)
        global_pool::consume_injection(signer::address_of(admin), market_addr, injection_amount);
        
        // Verify consumption
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount - injection_amount, 44);
        assert!(lifetime_in == (deposit_amount as u128), 45);
        assert!(lifetime_out == (injection_amount as u128), 46);
        assert!(pending_clmm == 0, 47);
        assert!(active_injections == 0, 48); // Should be consumed
        
        // Clean up extracted coins
        coin::deposit(signer::address_of(admin), extracted_coins);
    }

    // Test deposit from market (no winner case)
    #[test(admin = @yugo)]
    fun test_deposit_from_market(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let deposit_amount = 1000;
        let leftover_amount = 300;
        let refund_injection_amount = 200;
        let fee_amount = 50;
        let market_addr = @0x123;
        
        global_pool::global_deposit_admin(admin, deposit_amount);
        
        // Create leftover and refund coins
        let leftover_coins = coin::withdraw<AptosCoin>(admin, leftover_amount);
        let refund_coins = coin::withdraw<AptosCoin>(admin, refund_injection_amount);
        
        // Deposit from market
        global_pool::deposit_from_market(
            signer::address_of(admin), 
            market_addr, 
            leftover_coins, 
            refund_coins, 
            fee_amount
        );
        
        // Verify deposit from market
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == deposit_amount + leftover_amount + refund_injection_amount, 49);
        assert!(lifetime_in == ((deposit_amount + leftover_amount + refund_injection_amount) as u128), 50);
        assert!(lifetime_out == 0, 51);
        assert!(pending_clmm == 0, 52);
        assert!(active_injections == 0, 53); // Should be reduced by refund
    }

    // Test emit injection locked
    #[test(admin = @yugo)]
    fun test_emit_injection_locked(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let market_addr = @0x123;
        let total_locked = 500;
        
        // This should not fail (just emits event)
        global_pool::emit_injection_locked(signer::address_of(admin), market_addr, total_locked);
        
        // Verify pool state unchanged
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == 0, 54);
        assert!(lifetime_in == 0, 55);
        assert!(lifetime_out == 0, 56);
        assert!(pending_clmm == 0, 57);
        assert!(active_injections == 0, 58);
    }

    // Test get global pool admin
    #[test(admin = @yugo)]
    fun test_get_global_pool_admin(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        let admin_addr = global_pool::get_global_pool_admin();
        assert!(admin_addr == signer::address_of(admin), 59);
    }

    // Test edge case: zero amounts
    #[test(admin = @yugo)]
    fun test_zero_amounts(admin: &signer) {
        aptos_framework::account::create_account_for_test(signer::address_of(admin));
        global_pool::init_global_pool(admin);
        
        // Test zero deposit
        global_pool::global_deposit_admin(admin, 0);
        
        // Test zero withdraw
        global_pool::withdraw_for_clmm(admin, 0, string::utf8(b"zero"));
        
        // Test zero return
        global_pool::return_from_clmm(admin, 0, true, 0, string::utf8(b"zero return"));
        
        // Test zero consume
        global_pool::consume_injection(signer::address_of(admin), @0x123, 0);
        
        // All should remain at zero
        let (balance, lifetime_in, lifetime_out, pending_clmm, active_injections) = 
            global_pool::get_global_pool_summary(signer::address_of(admin));
        assert!(balance == 0, 60);
        assert!(lifetime_in == 0, 61);
        assert!(lifetime_out == 0, 62);
        assert!(pending_clmm == 0, 63);
        assert!(active_injections == 0, 64);
    }
}
