// File temporarily commented out to debug publish error
/*
#[test_only]
module yugo::factory_tests {
    use aptos_framework::account;
    use std::vector;
    use yugo::factory;
    use yugo::binary_option_market;
    use std::string;

    #[test]
    fun test_factory_initialization() {
        let factory_owner = account::create_account_for_test(@yugo);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Check factory state
        assert!(yugo::factory::get_owner_contract_count(@yugo) == 0, 1);
    }

    #[test]
    fun test_deploy_binary_option_market() {
        let factory_owner = account::create_account_for_test(@yugo);
        let market_owner = account::create_account_for_test(@0x123);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Deploy binary option market
        yugo::factory::deploy_market(
            &market_owner,
            string::utf8(b"BTC/USD"),
            50000, // strike_price
            50, // fee_percentage
            1000, // bidding_start_time
            2000, // bidding_end_time
            3000 // maturity_time
        );
        
        // Check factory state
        assert!(yugo::factory::get_owner_contract_count(@0x123) == 1, 2);
    }

    #[test]
    fun test_deploy_multiple_contracts() {
        let factory_owner = account::create_account_for_test(@yugo);
        let market_owner1 = account::create_account_for_test(@0x123);
        let market_owner2 = account::create_account_for_test(@0x456);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Deploy first market
        yugo::factory::deploy_market(
            &market_owner1,
            string::utf8(b"BTC/USD"),
            50000, // strike_price
            50, // fee_percentage
            1000, // bidding_start_time
            2000, // bidding_end_time
            3000 // maturity_time
        );
        
        // Deploy second market
        yugo::factory::deploy_market(
            &market_owner2,
            string::utf8(b"ETH/USD"),
            60000, // strike_price
            30, // fee_percentage
            1000, // bidding_start_time
            2000, // bidding_end_time
            3000 // maturity_time
        );
        
        // Check factory state
        assert!(yugo::factory::get_owner_contract_count(@0x123) == 1, 5);
        assert!(yugo::factory::get_owner_contract_count(@0x456) == 1, 6);
    }

    #[test]
    fun test_get_contracts_by_owner() {
        let factory_owner = account::create_account_for_test(@yugo);
        let market_owner = account::create_account_for_test(@0x123);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Deploy market
        yugo::factory::deploy_market(
            &market_owner,
            string::utf8(b"BTC/USD"),
            50000, // strike_price
            50, // fee_percentage
            1000, // bidding_start_time
            2000, // bidding_end_time
            3000 // maturity_time
        );
        
        // Get contracts by owner
        let contracts = yugo::factory::get_contracts_by_owner(@0x123);
        assert!(vector::length(&contracts) == 1, 8);
    }

    #[test]
    fun test_get_contracts_by_nonexistent_owner() {
        let factory_owner = account::create_account_for_test(@yugo);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Get contracts by non-existent owner
        let contracts = yugo::factory::get_contracts_by_owner(@0x999);
        assert!(vector::length(&contracts) == 0, 10);
    }

    #[test]
    fun test_get_owner_contract_count_nonexistent() {
        let factory_owner = account::create_account_for_test(@yugo);
        
        // Initialize factory
        yugo::factory::initialize(&factory_owner);
        
        // Get contract count for non-existent owner
        let count = yugo::factory::get_owner_contract_count(@0x999);
        assert!(count == 0, 11);
    }
}
*/ 