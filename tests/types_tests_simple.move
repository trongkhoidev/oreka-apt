module yugo::types_tests_simple {
    use std::vector;
    use std::string;
    use yugo::types;

    // Test MarketType creation and checking
    #[test]
    fun test_market_type_binary() {
        let binary_type = types::create_binary_market_type();
        assert!(types::is_binary_market(&binary_type), 1);
    }

    #[test]
    fun test_market_type_multi_outcome() {
        let multi_type = types::create_multi_outcome_market_type();
        assert!(!types::is_binary_market(&multi_type), 2);
    }

    // Test PriceRange creation (only test that it doesn't crash)
    #[test]
    fun test_create_price_range() {
        let min_price = 1000;
        let max_price = 2000;
        let outcome_name = string::utf8(b"Bullish");
        
        let _price_range = types::create_price_range(min_price, max_price, outcome_name);
        // Can't access fields from outside module, so just test creation succeeds
    }

    // Test MarketOutcome creation (only test that it doesn't crash)
    #[test]
    fun test_create_market_outcome() {
        let outcome_index = 1;
        let min_price = 1000;
        let max_price = 2000;
        let outcome_name = string::utf8(b"Bearish");
        let price_range = types::create_price_range(min_price, max_price, outcome_name);
        
        let _market_outcome = types::create_market_outcome(outcome_index, price_range);
        // Can't access fields from outside module, so just test creation succeeds
    }

    // Test price_in_range function
    #[test]
    fun test_price_in_range() {
        let min_price = 1000;
        let max_price = 2000;
        let outcome_name = string::utf8(b"Range");
        let price_range = types::create_price_range(min_price, max_price, outcome_name);
        
        // Test price within range
        assert!(types::price_in_range(1500, &price_range), 9);
        
        // Test price at minimum (inclusive)
        assert!(types::price_in_range(1000, &price_range), 10);
        
        // Test price at maximum (exclusive)
        assert!(!types::price_in_range(2000, &price_range), 11);
        
        // Test price below range
        assert!(!types::price_in_range(500, &price_range), 12);
        
        // Test price above range
        assert!(!types::price_in_range(2500, &price_range), 13);
    }

    // Test price_in_range_inclusive function
    #[test]
    fun test_price_in_range_inclusive() {
        let min_price = 1000;
        let max_price = 2000;
        let outcome_name = string::utf8(b"Range");
        let price_range = types::create_price_range(min_price, max_price, outcome_name);
        
        // Test price within range
        assert!(types::price_in_range_inclusive(1500, &price_range), 14);
        
        // Test price at minimum (inclusive)
        assert!(types::price_in_range_inclusive(1000, &price_range), 15);
        
        // Test price at maximum (inclusive)
        assert!(types::price_in_range_inclusive(2000, &price_range), 16);
        
        // Test price below range
        assert!(!types::price_in_range_inclusive(500, &price_range), 17);
        
        // Test price above range
        assert!(!types::price_in_range_inclusive(2500, &price_range), 18);
    }

    // Test find_winning_outcome function
    #[test]
    fun test_find_winning_outcome() {
        let outcomes = vector::empty();
        
        // Create three price ranges: [0, 1000), [1000, 2000), [2000, 3000]
        let range1 = types::create_price_range(0, 1000, string::utf8(b"Low"));
        let outcome1 = types::create_market_outcome(0, range1);
        vector::push_back(&mut outcomes, outcome1);
        
        let range2 = types::create_price_range(1000, 2000, string::utf8(b"Medium"));
        let outcome2 = types::create_market_outcome(1, range2);
        vector::push_back(&mut outcomes, outcome2);
        
        let range3 = types::create_price_range(2000, 3000, string::utf8(b"High"));
        let outcome3 = types::create_market_outcome(2, range3);
        vector::push_back(&mut outcomes, outcome3);
        
        // Test price in first range
        assert!(types::find_winning_outcome(500, &outcomes) == 0, 19);
        
        // Test price at boundary (should go to second range)
        assert!(types::find_winning_outcome(1000, &outcomes) == 1, 20);
        
        // Test price in second range
        assert!(types::find_winning_outcome(1500, &outcomes) == 1, 21);
        
        // Test price at second boundary
        assert!(types::find_winning_outcome(2000, &outcomes) == 2, 22);
        
        // Test price in third range
        assert!(types::find_winning_outcome(2500, &outcomes) == 2, 23);
        
        // Test price at maximum of last range (inclusive)
        assert!(types::find_winning_outcome(3000, &outcomes) == 2, 24);
        
        // Test price outside all ranges
        assert!(types::find_winning_outcome(3500, &outcomes) == 255, 25);
    }

    // Test validate_price_ranges function
    #[test]
    fun test_validate_price_ranges_valid() {
        let price_ranges = vector::empty();
        
        // Create valid non-overlapping ranges
        let range1 = types::create_price_range(0, 1000, string::utf8(b"Low"));
        vector::push_back(&mut price_ranges, range1);
        
        let range2 = types::create_price_range(1000, 2000, string::utf8(b"Medium"));
        vector::push_back(&mut price_ranges, range2);
        
        let range3 = types::create_price_range(2000, 3000, string::utf8(b"High"));
        vector::push_back(&mut price_ranges, range3);
        
        assert!(types::validate_price_ranges(&price_ranges), 26);
    }

    #[test]
    fun test_validate_price_ranges_insufficient_ranges() {
        let price_ranges = vector::empty();
        
        // Only one range (insufficient)
        let range1 = types::create_price_range(0, 1000, string::utf8(b"Single"));
        vector::push_back(&mut price_ranges, range1);
        
        assert!(!types::validate_price_ranges(&price_ranges), 27);
    }

    #[test]
    fun test_validate_price_ranges_invalid_range() {
        let price_ranges = vector::empty();
        
        // Invalid range: min >= max
        let range1 = types::create_price_range(1000, 1000, string::utf8(b"Invalid"));
        vector::push_back(&mut price_ranges, range1);
        
        let range2 = types::create_price_range(1000, 2000, string::utf8(b"Valid"));
        vector::push_back(&mut price_ranges, range2);
        
        assert!(!types::validate_price_ranges(&price_ranges), 28);
    }

    #[test]
    fun test_validate_price_ranges_overlapping() {
        let price_ranges = vector::empty();
        
        // Overlapping ranges
        let range1 = types::create_price_range(0, 1500, string::utf8(b"Overlap1"));
        vector::push_back(&mut price_ranges, range1);
        
        let range2 = types::create_price_range(1000, 2000, string::utf8(b"Overlap2"));
        vector::push_back(&mut price_ranges, range2);
        
        assert!(!types::validate_price_ranges(&price_ranges), 29);
    }

    #[test]
    fun test_validate_price_ranges_wrong_order() {
        let price_ranges = vector::empty();
        
        // Wrong order: second range starts before first
        let range1 = types::create_price_range(1000, 2000, string::utf8(b"Second"));
        vector::push_back(&mut price_ranges, range1);
        
        let range2 = types::create_price_range(0, 1000, string::utf8(b"First"));
        vector::push_back(&mut price_ranges, range2);
        
        assert!(!types::validate_price_ranges(&price_ranges), 30);
    }

    // Test edge cases
    #[test]
    fun test_edge_cases() {
        // Test with minimum valid range
        let min_range = types::create_price_range(0, 1, string::utf8(b"Min"));
        assert!(types::price_in_range(0, &min_range), 31);
        assert!(!types::price_in_range(1, &min_range), 32);
        assert!(types::price_in_range_inclusive(1, &min_range), 33);
        
        // Test with large numbers
        let large_range = types::create_price_range(1000000, 2000000, string::utf8(b"Large"));
        assert!(types::price_in_range(1500000, &large_range), 34);
        assert!(!types::price_in_range(2000000, &large_range), 35);
    }
}
