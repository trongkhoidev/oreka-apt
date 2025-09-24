module yugo::pyth_price_adapter {
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use pyth::pyth;
    use pyth::price::Price;
    use pyth::price_identifier;
    use pyth::i64;

    public fun get_price(
        price_feed_id: vector<u8>,
        pyth_price_update: vector<vector<u8>>,
        payer: &signer
    ): Price {
        let price_id = price_identifier::from_byte_vec(price_feed_id);
        let update_fee = pyth::get_update_fee(&pyth_price_update);
        let coins = coin::withdraw<AptosCoin>(payer, update_fee);
        pyth::update_price_feeds(pyth_price_update, coins);
        let price: Price = pyth::get_price(price_id);
        price
    }

    public fun unwrap_i64(i: i64::I64): u64 {
        assert!(!i64::get_is_negative(&i), 9001); // Oracle price must not be negative
        i64::get_magnitude_if_positive(&i)
    }


    public fun get_final_price_from_feed_id(
        price_feed_id: vector<u8>,
        pyth_price_update: vector<vector<u8>>,
        payer: &signer
    ): u64 {
        let price = get_price(price_feed_id, pyth_price_update, payer);
        unwrap_i64(pyth::price::get_price(&price))
    }


    public fun resolve_market_offchain(
        _market_addr: address,
        final_price: u64,
        result: u8
    ): (u64, u8) {
        // Validate result
        assert!(result == 0 || result == 1, 9004); // Invalid result: must be 0 (long) or 1 (short)
        assert!(final_price > 0, 9005); // Final price must be positive
        
        (final_price, result)
    }
} 