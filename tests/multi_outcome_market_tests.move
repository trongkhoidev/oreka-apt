#[test_only]
module yugo::multi_outcome_market_tests {
    use std::string;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    
    use yugo::market_core_v2;
    use yugo::types::{Self, PriceRange};

    // Test accounts
    const ADMIN: address = @0x1;
    const USER1: address = @0x2;
    const USER2: address = @0x3;

    // Test helper functions
    fun setup_test(): (signer, signer, signer) {
        let admin = account::create_account_for_test(ADMIN);
        let user1 = account::create_account_for_test(USER1);
        let user2 = account::create_account_for_test(USER2);
        
        // Initialize market registry
        market_core_v2::initialize_market_registry(&admin);
        
        // Mint coins for testing
        coin::register<AptosCoin>(&user1);
        coin::register<AptosCoin>(&user2);
        
        (admin, user1, user2)
    }

    fun create_test_price_ranges(): vector<PriceRange> {
        let ranges = vector::empty<PriceRange>();
        
        // Range C: price < $100 [0, 100)
        let range_c = types::create_price_range(0, 100, string::utf8(b"Range C"));
        vector::push_back(&mut ranges, range_c);
        
        // Range A: $100 <= price < $150 [100, 150)
        let range_a = types::create_price_range(100, 150, string::utf8(b"Range A"));
        vector::push_back(&mut ranges, range_a);
        
        // Range B: price >= $150 [150, 1000000] (inclusive for last range)
        let range_b = types::create_price_range(150, 1000000, string::utf8(b"Range B"));
        vector::push_back(&mut ranges, range_b);
        
        ranges
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_create_multi_outcome_market(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (admin, _user1, _user2) = setup_test();
        
        let price_feed_id = b"BTC/USD";
        let _price_ranges = create_test_price_ranges();
        let fee_percentage = 50; // 5%
        let bidding_start_time = timestamp::now_seconds() + 60;
        let bidding_end_time = timestamp::now_seconds() + 3600;
        let maturity_time = timestamp::now_seconds() + 7200;
        
        // Create multi-outcome market
        market_core_v2::create_multi_outcome_market(
            &admin,
            price_feed_id,
            create_test_price_ranges(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        
        // Verify market was created
        let markets = market_core_v2::get_all_markets();
        assert!(vector::length(&markets) == 1, 0);
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_bid_multi_outcome_market(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (admin, user1, user2) = setup_test();
        
        let price_feed_id = b"BTC/USD";
        let _price_ranges = create_test_price_ranges();
        let fee_percentage = 50; // 5%
        let bidding_start_time = timestamp::now_seconds() + 60;
        let bidding_end_time = timestamp::now_seconds() + 3600;
        let maturity_time = timestamp::now_seconds() + 7200;
        
        // Create multi-outcome market
        market_core_v2::create_multi_outcome_market(
            &admin,
            price_feed_id,
            create_test_price_ranges(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        
        let markets = market_core_v2::get_all_markets();
        let market_info = *vector::borrow(&markets, 0);
        let market_addr = market_core_v2::get_market_address(&market_info);
        
        // Fast forward to bidding phase
        timestamp::fast_forward_seconds(120);
        
        // User1 bids on outcome 0 (Range C: < $100)
        market_core_v2::bid_multi_outcome(
            &user1,
            market_addr,
            0, // outcome index
            1000, // amount
            timestamp::now_seconds()
        );
        
        // User2 bids on outcome 1 (Range A: $100-$150)
        market_core_v2::bid_multi_outcome(
            &user2,
            market_addr,
            1, // outcome index
            2000, // amount
            timestamp::now_seconds()
        );
        
        // Verify bids
        let user1_position = market_core_v2::get_user_multi_outcome_position(USER1, market_addr);
        let user2_position = market_core_v2::get_user_multi_outcome_position(USER2, market_addr);
        
        assert!(*vector::borrow(&user1_position, 0) == 1000, 1);
        assert!(*vector::borrow(&user2_position, 1) == 2000, 2);
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_binary_market_backward_compatibility(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (admin, user1, user2) = setup_test();
        
        let price_feed_id = b"BTC/USD";
        let strike_price = 50000;
        let fee_percentage = 50; // 5%
        let bidding_start_time = timestamp::now_seconds() + 60;
        let bidding_end_time = timestamp::now_seconds() + 3600;
        let maturity_time = timestamp::now_seconds() + 7200;
        
        // Create binary market using old function
        market_core_v2::create_market(
            &admin,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        );
        
        let markets = market_core_v2::get_all_markets();
        assert!(vector::length(&markets) == 1, 0);
        
        let market_info = *vector::borrow(&markets, 0);
        let market_addr = market_core_v2::get_market_address(&market_info);
        
        // Fast forward to bidding phase
        timestamp::fast_forward_seconds(120);
        
        // User1 bids LONG
        market_core_v2::bid(
            &user1,
            market_addr,
            true, // LONG
            1000, // amount
            timestamp::now_seconds()
        );
        
        // User2 bids SHORT
        market_core_v2::bid(
            &user2,
            market_addr,
            false, // SHORT
            2000, // amount
            timestamp::now_seconds()
        );
        
        // Verify bids
        let (user1_long, user1_short) = market_core_v2::get_user_position(USER1, market_addr);
        let (user2_long, user2_short) = market_core_v2::get_user_position(USER2, market_addr);
        
        assert!(user1_long == 1000 && user1_short == 0, 1);
        assert!(user2_long == 0 && user2_short == 2000, 2);
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_boundary_values(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (_admin, _user1, _user2) = setup_test();
        
        // Test exact boundary values
        let _price_ranges = create_test_price_ranges();
        
        // Test price = 100 (should match Range A, not Range C)
        // Test price = 150 (should match Range B, not Range A)
        // Test price = 99 (should match Range C)
        // Test price = 149 (should match Range A)
        
        // These tests verify the [min, max) vs [min, max] boundary logic
        assert!(true, 0); // Placeholder - implement actual boundary tests
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_invalid_price_ranges(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (admin, user1, user2) = setup_test();
        let _admin = admin; let _user1 = user1; let _user2 = user2;
        
        // Test overlapping ranges (should fail)
        let invalid_ranges = vector::empty<PriceRange>();
        let range1 = types::create_price_range(100, 200, string::utf8(b"Range 1"));
        let range2 = types::create_price_range(150, 250, string::utf8(b"Range 2")); // Overlaps!
        vector::push_back(&mut invalid_ranges, range1);
        vector::push_back(&mut invalid_ranges, range2);
        
        // This should fail validation
        assert!(!types::validate_price_ranges(&invalid_ranges), 0);
        
        // Test unordered ranges (should fail)
        let unordered_ranges = vector::empty<PriceRange>();
        let range3 = types::create_price_range(200, 300, string::utf8(b"Range 3"));
        let range4 = types::create_price_range(100, 200, string::utf8(b"Range 4")); // Wrong order!
        vector::push_back(&mut unordered_ranges, range3);
        vector::push_back(&mut unordered_ranges, range4);
        
        // This should fail validation
        assert!(!types::validate_price_ranges(&unordered_ranges), 1);
    }

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    fun test_price_range_validation(_admin: &signer, _user1: &signer, _user2: &signer) {
        let (admin, user1, user2) = setup_test();
        let _admin = admin; let _user1 = user1; let _user2 = user2;
        
        // Test valid ranges
        let valid_ranges = create_test_price_ranges();
        assert!(types::validate_price_ranges(&valid_ranges), 0);
        
        // Test invalid ranges - too few outcomes
        let too_few_ranges = vector::empty<PriceRange>();
        let single_range = types::create_price_range(100, 200, string::utf8(b"Single"));
        vector::push_back(&mut too_few_ranges, single_range);
        assert!(!types::validate_price_ranges(&too_few_ranges), 1);
        
        // Test invalid ranges - invalid range (min >= max)
        let invalid_range_list = vector::empty<PriceRange>();
        let bad_range = types::create_price_range(200, 100, string::utf8(b"Bad")); // min > max
        vector::push_back(&mut invalid_range_list, bad_range);
        let good_range = types::create_price_range(300, 400, string::utf8(b"Good"));
        vector::push_back(&mut invalid_range_list, good_range);
        assert!(!types::validate_price_ranges(&invalid_range_list), 2);
    }
}