// Tests for yugo::market_core
#[test_only]
module yugo::market_core_tests {
    use aptos_framework::account;
    use aptos_framework::object;
    use aptos_framework::timestamp;
    use yugo::market_core;
    use yugo::test_helpers;
    use std::vector;
    // use std::string; // unused

    /// Helper: setup test environment
    fun setup_test_environment() {
        test_helpers::setup_complete_test_environment();
        // Fund test accounts with APT
        test_helpers::fund_account(@yugo, 10_000_000_000); // 100 APT
        test_helpers::fund_account(@1, 10_000_000_000);    // 100 APT
        test_helpers::fund_account(@0x123, 10_000_000_000); // 100 APT
    }

    /// Helper: get last market address from registry
    fun get_last_market_addr(): address {
        let markets = market_core::get_all_markets();
        let n = vector::length(&markets);
        let market_info = *vector::borrow(&markets, n - 1);
        market_core::get_market_address(&market_info)
    }

    #[test]
    public fun test_market_creation() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now + 100;
        let bidding_end_time = now + 200;
        let maturity_time = now + 300;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        let market_obj = object::address_to_object<market_core::Market>(market_addr);
        assert!(market_core::get_phase(market_obj) == 0, 1); // Pending
    }

    #[test]
    public fun test_bidding_phase_and_bid() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        let market_obj = object::address_to_object<market_core::Market>(market_addr);
        assert!(market_core::get_phase(market_obj) == 1, 2); // Bidding
        market_core::bid(&owner, market_addr, true, 100, now);
    }

    #[test]
    #[expected_failure(location = yugo::market_core, abort_code = 104)] // ENOT_IN_BIDDING_PHASE
    public fun test_bid_wrong_phase() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now + 100;
        let bidding_end_time = now + 200;
        let maturity_time = now + 300;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        // Bidding chưa bắt đầu
        market_core::bid(&owner, market_addr, true, 100, now);
    }

    #[test]
    #[expected_failure(location = yugo::market_core, abort_code = 109)] // EINSUFFICIENT_AMOUNT
    public fun test_bid_zero_amount() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        market_core::bid(&owner, market_addr, true, 0, now);
    }

    #[test]
    #[expected_failure(location = yugo::market_core, abort_code = 105)] // EMARKET_NOT_RESOLVED
    public fun test_claim_before_resolve() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        market_core::bid(&owner, market_addr, true, 100, now);
        market_core::claim(&owner, market_addr);
    }

    #[test]
    public fun test_resolve_and_claim() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        market_core::bid(&owner, market_addr, true, 100, now);
        // Advance time to after maturity_time
        test_helpers::advance_time(maturity_time + 1 - now);
        market_core::test_resolve_market_with_price(&owner, market_addr, 51000); // result=0: LONG win
        market_core::claim(&owner, market_addr);
    }

    #[test]
    #[expected_failure(location = yugo::market_core, abort_code = 108)] // EALREADY_CLAIMED
    public fun test_owner_withdraw_fee() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let user = account::create_account_for_test(@1);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 100; // 10%
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        market_core::bid(&user, market_addr, true, 100, now);
        // Advance time to after maturity_time
        test_helpers::advance_time(maturity_time + 1 - now);
        market_core::test_resolve_market_with_price(&owner, market_addr, 51000); // result=0: LONG win
        // Owner withdraw fee
        let market_obj = object::address_to_object<market_core::Market>(market_addr);
        market_core::withdraw_fee(&owner, market_obj);
        // Try to withdraw fee again - should fail with EALREADY_CLAIMED
        market_core::withdraw_fee(&owner, market_obj);
        // User claim, chỉ nhận được 90 APT (sau khi trừ fee)
        market_core::claim(&user, market_addr);
    }

    #[test]
    public fun test_anyone_can_resolve_market() {
        setup_test_environment();
        let owner = account::create_account_for_test(@yugo);
        let user = account::create_account_for_test(@0x123);
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        market_core::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        market_core::bid(&user, market_addr, true, 100, now);
        // Advance time to after maturity_time
        test_helpers::advance_time(maturity_time + 1 - now);
        // User (không phải owner) resolve được market
        market_core::test_resolve_market_with_price(&user, market_addr, 51000); // result=0: LONG win
        // Sau đó user hoặc owner đều claim được
        market_core::claim(&user, market_addr);
    }
} 