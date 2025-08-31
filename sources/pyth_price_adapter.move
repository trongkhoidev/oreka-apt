module yugo::pyth_price_adapter {
    use aptos_framework::timestamp;
    use pyth::pyth;
    use pyth::price;
    use pyth::price_identifier::{Self, PriceIdentifier};
    use pyth::i64;

    /// Error constants
    const EINVALID_PRICE_UPDATE: u64 = 1001;
    const EPRICE_TOO_OLD: u64 = 1002;
    const EPRICE_TOO_UNCERTAIN: u64 = 1003;
    const EINVALID_SCALE: u64 = 1004;

    /// Get price with proper scaling and confidence checks
    /// Returns (price_1e8, timestamp) where price is normalized to 1e8 scale
    public fun get_price_with_checks(
        price_feed_id: vector<u8>,
        min_confidence: u64,
        max_age: u64
    ): (u128, u64) {
        // Create PriceIdentifier from feed ID
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        
        // Get price from Pyth oracle using feed ID
        let price = pyth::get_price_no_older_than(price_identifier, max_age);
        
        // Check if price is valid
        assert!(is_price_valid_by_feed_id(price_feed_id, min_confidence, max_age), EINVALID_PRICE_UPDATE);
        
        // Get price data and normalize to 1e8 scale
        let price_value = price::get_price(&price);
        let timestamp = price::get_timestamp(&price);
        
        // Convert I64 to u128 (assuming 1e8 scale)
        let normalized_price = if (i64::get_is_negative(&price_value)) {
            (i64::get_magnitude_if_negative(&price_value) as u128)
        } else {
            (i64::get_magnitude_if_positive(&price_value) as u128)
        };
        
        (normalized_price, timestamp)
    }
    
    /// Get price feed by ID
    public fun get_price_feed(price_feed_id: vector<u8>): PriceIdentifier {
        // Create PriceIdentifier from byte vector
        price_identifier::from_byte_vec(price_feed_id)
    }
    
    /// Check if price is valid (not stale and confident)
    public fun is_price_valid(
        price_feed_id: vector<u8>,
        min_confidence: u64,
        max_age: u64
    ): bool {
        // Create PriceIdentifier from feed ID
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        
        // Check if price feed exists
        if (!pyth::price_feed_exists(price_identifier)) {
            return false
        };
        
        // Get price from Pyth oracle
        let price = pyth::get_price(price_identifier);
        
        // Check if price is not too old
        let current_time = timestamp::now_seconds();
        let price_timestamp = price::get_timestamp(&price);
        if (current_time - price_timestamp > max_age) {
            return false
        };
        
        // Check if price has sufficient confidence
        let confidence = price::get_conf(&price);
        if (confidence < min_confidence) {
            return false
        };
        
        true
    }
    
    /// Check if price is valid by feed ID (not stale and confident)
    public fun is_price_valid_by_feed_id(
        price_feed_id: vector<u8>,
        min_confidence: u64,
        max_age: u64
    ): bool {
        // Create PriceIdentifier from feed ID
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        
        // Check if price feed exists
        if (!pyth::price_feed_exists(price_identifier)) {
            return false
        };
        
        // Get price from Pyth oracle
        let price = pyth::get_price(price_identifier);
        
        // Check if price is not too old
        let current_time = timestamp::now_seconds();
        let price_timestamp = price::get_timestamp(&price);
        if (current_time - price_timestamp > max_age) {
            return false
        };
        
        // Check if price has sufficient confidence
        let confidence = price::get_conf(&price);
        if (confidence < min_confidence) {
            return false
        };
        
        true
    }
    
    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================
    
    /// Get current price from price feed ID
    public fun get_current_price_by_feed_id(price_feed_id: vector<u8>): u128 {
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        let price = pyth::get_price(price_identifier);
        let price_value = price::get_price(&price);
        if (i64::get_is_negative(&price_value)) {
            (i64::get_magnitude_if_negative(&price_value) as u128)
        } else {
            (i64::get_magnitude_if_positive(&price_value) as u128)
        }
    }
    
    /// Get price timestamp from price feed ID
    public fun get_price_timestamp_by_feed_id(price_feed_id: vector<u8>): u64 {
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        let price = pyth::get_price(price_identifier);
        price::get_timestamp(&price)
    }
    
    /// Get price confidence from price feed ID
    public fun get_price_confidence_by_feed_id(price_feed_id: vector<u8>): u64 {
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        let price = pyth::get_price(price_identifier);
        price::get_conf(&price)
    }
    
    /// Check if price feed exists by feed ID
    public fun price_feed_exists_by_feed_id(price_feed_id: vector<u8>): bool {
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        pyth::price_feed_exists(price_identifier)
    }
    
    /// Get price feed status by feed ID
    public fun get_price_feed_status_by_feed_id(price_feed_id: vector<u8>): u8 {
        if (price_feed_exists_by_feed_id(price_feed_id)) {
            1 // Active
        } else {
            0 // Inactive
        }
    }
} 