module yugo::pyth_price_adapter_tests {
    use std::signer;
    use yugo::pyth_price_adapter;
    use pyth::i64;
    use pyth::price::Price;
    use aptos_framework::account;

    // Test unwrap_i64 function with positive value
    #[test]
    fun test_unwrap_i64_positive() {
        let positive_i64 = i64::new(1000, false);
        let result = pyth_price_adapter::unwrap_i64(positive_i64);
        assert!(result == 1000, 1);
    }

    // Test unwrap_i64 function with zero
    #[test]
    fun test_unwrap_i64_zero() {
        let zero_i64 = i64::new(0, false);
        let result = pyth_price_adapter::unwrap_i64(zero_i64);
        assert!(result == 0, 2);
    }

    // Test unwrap_i64 function with negative value (should abort)
    #[test]
    #[expected_failure(abort_code = 9001)]
    fun test_unwrap_i64_negative() {
        let negative_i64 = i64::new(1000, true);
        pyth_price_adapter::unwrap_i64(negative_i64);
    }

    // Test resolve_market_offchain with valid inputs
    #[test]
    fun test_resolve_market_offchain_valid() {
        let market_addr = @0x123;
        let final_price = 50000;
        let result_long = 0;
        let result_short = 1;

        // Test with result = 0 (long)
        let (price1, res1) = pyth_price_adapter::resolve_market_offchain(market_addr, final_price, result_long);
        assert!(price1 == final_price, 3);
        assert!(res1 == result_long, 4);

        // Test with result = 1 (short)
        let (price2, res2) = pyth_price_adapter::resolve_market_offchain(market_addr, final_price, result_short);
        assert!(price2 == final_price, 5);
        assert!(res2 == result_short, 6);
    }

    // Test resolve_market_offchain with invalid result (should abort)
    #[test]
    #[expected_failure(abort_code = 9004)]
    fun test_resolve_market_offchain_invalid_result() {
        let market_addr = @0x123;
        let final_price = 50000;
        let invalid_result = 2; // Invalid result
        pyth_price_adapter::resolve_market_offchain(market_addr, final_price, invalid_result);
    }

    // Test resolve_market_offchain with zero price (should abort)
    #[test]
    #[expected_failure(abort_code = 9005)]
    fun test_resolve_market_offchain_zero_price() {
        let market_addr = @0x123;
        let zero_price = 0;
        let result = 0;
        pyth_price_adapter::resolve_market_offchain(market_addr, zero_price, result);
    }

    // Test resolve_market_offchain with edge case price = 1
    #[test]
    fun test_resolve_market_offchain_minimum_price() {
        let market_addr = @0x123;
        let min_price = 1;
        let result = 1;
        
        let (price, res) = pyth_price_adapter::resolve_market_offchain(market_addr, min_price, result);
        assert!(price == min_price, 7);
        assert!(res == result, 8);
    }

    // Test resolve_market_offchain with large price
    #[test]
    fun test_resolve_market_offchain_large_price() {
        let market_addr = @0x123;
        let large_price = 1000000000; // 1 billion
        let result = 0;
        
        let (price, res) = pyth_price_adapter::resolve_market_offchain(market_addr, large_price, result);
        assert!(price == large_price, 9);
        assert!(res == result, 10);
    }
}
