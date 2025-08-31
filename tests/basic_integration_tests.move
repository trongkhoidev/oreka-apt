#[test_only]
module yugo::basic_integration_tests {
    use std::vector;
    
    use yugo::types;
    
    const YUGO_ADDRESS: address = @yugo;
    
    #[test]
    fun test_types_module() {
        // Test that types module can be imported and used
        let strike_price = 50000000000u128; // $500.00
        
        // Test binary outcomes creation
        let outcomes = types::create_binary_outcomes(strike_price);
        assert!(vector::length(&outcomes) == 2, 0);
        
        // Test first outcome (Price < Strike)
        let outcome1 = vector::borrow(&outcomes, 0);
        let index1 = types::get_outcome_index(outcome1);
        let comparison1 = types::get_outcome_comparison_type(outcome1);
        let threshold1 = types::get_outcome_threshold1(outcome1);
        
        assert!(index1 == 0, 1);
        assert!(comparison1 == 3, 2); // CMP_LT (Less than)
        assert!(threshold1 == strike_price, 3);
        
        // Test second outcome (Price >= Strike)
        let outcome2 = vector::borrow(&outcomes, 1);
        let index2 = types::get_outcome_index(outcome2);
        let comparison2 = types::get_outcome_comparison_type(outcome2);
        let threshold2 = types::get_outcome_threshold2(outcome2);
        
        assert!(index2 == 1, 4);
        assert!(comparison2 == 2, 5); // CMP_GTE (Greater than or equal)
        assert!(threshold2 == 0, 6); // threshold2 is 0 for binary outcomes
    }
    
    #[test]
    fun test_bucket_outcomes() {
        let thresholds = vector[10000000000u128, 20000000000u128, 30000000000u128]; // $100, $200, $300
        
        // Test bucket outcomes creation
        let outcomes = types::create_bucket_outcomes(thresholds);
        assert!(vector::length(&outcomes) == 4, 0); // 4 buckets: <100, 100-200, 200-300, >=300
        
        // Test first bucket (< $100)
        let bucket1 = vector::borrow(&outcomes, 0);
        let index1 = types::get_outcome_index(bucket1);
        let comparison1 = types::get_outcome_comparison_type(bucket1);
        let threshold1 = types::get_outcome_threshold1(bucket1);
        
        assert!(index1 == 0, 1);
        assert!(comparison1 == 3, 2); // CMP_LT (Less than)
        assert!(threshold1 == 10000000000u128, 3);
        
        // Test last bucket (>= $300)
        let bucket4 = vector::borrow(&outcomes, 3);
        let index4 = types::get_outcome_index(bucket4);
        let comparison4 = types::get_outcome_comparison_type(bucket4);
        let threshold4 = types::get_outcome_threshold1(bucket4);
        
        assert!(index4 == 3, 4);
        assert!(comparison4 == 2, 5); // CMP_GTE (Greater than or equal)
        assert!(threshold4 == 30000000000u128, 6);
    }
    
    #[test]
    fun test_custom_outcome() {
        // Test custom outcome creation
        let custom_outcome = types::create_custom_outcome(
            5, // index
            3, // comparison type (BETWEEN)
            10000000000u128, // threshold1
            20000000000u128, // threshold2
            b"Price between $100 and $200"
        );
        
        let index = types::get_outcome_index(&custom_outcome);
        let comparison = types::get_outcome_comparison_type(&custom_outcome);
        let threshold1 = types::get_outcome_threshold1(&custom_outcome);
        let threshold2 = types::get_outcome_threshold2(&custom_outcome);
        let description = types::get_outcome_description(&custom_outcome);
        
        assert!(index == 5, 0);
        assert!(comparison == 3, 1); // BETWEEN
        assert!(threshold1 == 10000000000u128, 2);
        assert!(threshold2 == 20000000000u128, 3);
        assert!(description == b"Price between $100 and $200", 4);
    }
}
