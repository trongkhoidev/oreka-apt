// Tests for yugo::binary_option_market
#[test_only]
module yugo::binary_option_market_tests {
    use aptos_framework::account;
    use aptos_framework::object;
    use yugo::binary_option_market;
    use std::vector;
    use std::signer;
    use std::string;
    use std::debug;

    /// Helper: get last market address from registry
    fun get_last_market_addr(): address {
        let registry = borrow_global<binary_option_market::MarketRegistry>(@yugo);
        let n = vector::length(&registry.all_markets);
        *vector::borrow(&registry.all_markets, n - 1)
    }

    #[test]
    public fun test_market_creation() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now + 100;
        let bidding_end_time = now + 200;
        let maturity_time = now + 300;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        let market_obj = object::borrow_global<binary_option_market::Market>(market_addr);
        assert!(binary_option_market::get_phase(market_obj) == 0, 1); // Pending
    }

    #[test]
    public fun test_bidding_phase_and_bid() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        let market_obj = object::borrow_global<binary_option_market::Market>(market_addr);
        assert!(binary_option_market::get_phase(market_obj) == 1, 2); // Bidding
        binary_option_market::bid(&owner, market_addr, true, 100, now);
    }

    #[test]
    #[expected_failure(abort_code = 104)] // ENOT_IN_BIDDING_PHASE
    public fun test_bid_wrong_phase() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now + 100;
        let bidding_end_time = now + 200;
        let maturity_time = now + 300;
        binary_option_market::create_market(
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
        binary_option_market::bid(&owner, market_addr, true, 100, now);
    }

    #[test]
    #[expected_failure(abort_code = 109)] // EINSUFFICIENT_AMOUNT
    public fun test_bid_zero_amount() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        binary_option_market::bid(&owner, market_addr, true, 0, now);
    }

    #[test]
    #[expected_failure(abort_code = 105)] // EMARKET_NOT_RESOLVED
    public fun test_claim_before_resolve() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        binary_option_market::bid(&owner, market_addr, true, 100, now);
        binary_option_market::claim(&owner, market_addr);
    }

    #[test]
    public fun test_resolve_and_claim() {
        let owner = account::create_account_for_test(@yugo);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        binary_option_market::bid(&owner, market_addr, true, 100, now);
        // Giả lập đã qua maturity_time
        let after_maturity = maturity_time + 1;
        binary_option_market::resolve_market(&owner, market_addr, 51000, 0); // result=0: LONG win
        binary_option_market::claim(&owner, market_addr);
    }

    #[test]
    #[expected_failure(abort_code = 108)] // EALREADY_CLAIMED
    public fun test_owner_withdraw_fee() {
        let owner = account::create_account_for_test(@yugo);
        let user = account::create_account_for_test(@1);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 100; // 10%
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        binary_option_market::bid(&user, market_addr, true, 100, now);
        // Đến maturity, resolve với giá thắng cho long
        let after_maturity = maturity_time + 1;
        binary_option_market::resolve_market(&owner, market_addr, 51000, 0); // result=0: LONG win
        // Owner withdraw fee
        let market_obj = object::borrow_global<binary_option_market::Market>(market_addr);
        binary_option_market::withdraw_fee(&owner, market_obj);
        // Try to withdraw fee again - should fail with EALREADY_CLAIMED
        binary_option_market::withdraw_fee(&owner, market_obj);
        // User claim, chỉ nhận được 90 APT (sau khi trừ fee)
        binary_option_market::claim(&user, market_addr);
    }

    #[test]
    public fun test_anyone_can_resolve_market() {
        let owner = account::create_account_for_test(@yugo);
        let user = account::create_account_for_test(@0x123);
        let price_feed_id = vector::utf8(b"BTC/USD");
        let strike_price = 50000;
        let fee_percentage = 50;
        let now = 1000;
        let bidding_start_time = now;
        let bidding_end_time = now + 100;
        let maturity_time = now + 200;
        binary_option_market::create_market(
            &owner,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        let market_addr = get_last_market_addr();
        binary_option_market::bid(&user, market_addr, true, 100, now);
        // Giả lập đã qua maturity_time
        let after_maturity = maturity_time + 1;
        // User (không phải owner) resolve được market
        binary_option_market::resolve_market(&user, market_addr, 51000, 0); // result=0: LONG win
        // Sau đó user hoặc owner đều claim được
        binary_option_market::claim(&user, market_addr);
    }
} 