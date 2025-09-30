module yugo::types_v2 {
    use std::vector;
    use std::string::String;

    /// Market type enumeration
    public struct MarketType has store, copy, drop {
        is_binary: bool,
    }

    /// Price range for multi-outcome markets
    public struct PriceRange has store, copy, drop {
        min_price: u64,
        max_price: u64,
        outcome_name: String,
    }

    /// Market outcome definition
    public struct MarketOutcome has store, copy, drop {
        outcome_index: u8,
        price_range: PriceRange,
    }

    /// Market creation event (updated for both types)
    public struct MarketCreatedEvent has drop, store {
        market_address: address,
        trading_pair: vector<u8>,
        market_type: MarketType,
        strike_price: u64, // For binary markets
        price_ranges: vector<PriceRange>, // For multi-outcome markets
        maturity_time: u64,
        creator: address,
        timestamp: u64,
    }

    // === Constants ===
    // Helper functions instead of constants for struct types

    // === Helper Functions ===
    public fun create_binary_market_type(): MarketType {
        MarketType { is_binary: true }
    }

    public fun create_multi_outcome_market_type(): MarketType {
        MarketType { is_binary: false }
    }

    public fun is_binary_market(market_type: &MarketType): bool {
        market_type.is_binary
    }

    public fun create_price_range(min_price: u64, max_price: u64, outcome_name: String): PriceRange {
        PriceRange {
            min_price,
            max_price,
            outcome_name,
        }
    }

    public fun create_market_outcome(outcome_index: u8, price_range: PriceRange): MarketOutcome {
        MarketOutcome {
            outcome_index,
            price_range,
        }
    }

    /// Check if a price falls within a price range
    /// Uses [min_price, max_price) convention to avoid overlap
    public fun price_in_range(price: u64, price_range: &PriceRange): bool {
        price >= price_range.min_price && price < price_range.max_price
    }

    /// Check if a price falls within a price range (inclusive for last range)
    /// This is used for the last range which should include the upper bound
    public fun price_in_range_inclusive(price: u64, price_range: &PriceRange): bool {
        price >= price_range.min_price && price <= price_range.max_price
    }

    /// Find winning outcome index for multi-outcome market
    /// Uses [min, max) for all ranges except the last one which uses [min, max]
    public fun find_winning_outcome(final_price: u64, outcomes: &vector<MarketOutcome>): u8 {
        let len = vector::length(outcomes);
        let i = 0;
        while (i < len) {
            let outcome = vector::borrow(outcomes, i);
            let is_last_range = (i == len - 1);
            let in_range = if (is_last_range) {
                price_in_range_inclusive(final_price, &outcome.price_range)
            } else {
                price_in_range(final_price, &outcome.price_range)
            };
            if (in_range) {
                return outcome.outcome_index
            };
            i = i + 1;
        };
        // If no range matches, return invalid index (255)
        255
    }

    /// Validate price ranges to ensure no overlap and proper ordering
    public fun validate_price_ranges(price_ranges: &vector<PriceRange>): bool {
        let len = vector::length(price_ranges);
        if (len < 2) return false;
        
        let i = 0;
        while (i < len) {
            let range = vector::borrow(price_ranges, i);
            // Check valid range
            if (range.min_price >= range.max_price) {
                return false
            };
            i = i + 1;
        };
        
        // Check ordering and non-overlap
        i = 0;
        while (i < len - 1) {
            let current = vector::borrow(price_ranges, i);
            let next = vector::borrow(price_ranges, i + 1);
            
            // Check ordering
            if (current.min_price >= next.min_price) {
                return false
            };
            
            // Check non-overlap (current.max <= next.min)
            if (current.max_price > next.min_price) {
                return false
            };
            
            i = i + 1;
        };
        
        true
    }
} 