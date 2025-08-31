module yugo::types {
    use std::vector;

    /// Asset type constants for dual payment support
    const ASSET_USDC: u8 = 1;
    const ASSET_APT: u8 = 2;

    /// Get USDC asset type
    public fun get_asset_usdc(): u8 { ASSET_USDC }
    
    /// Get APT asset type
    public fun get_asset_apt(): u8 { ASSET_APT }

    /// Outcome comparison types for poly-option markets
    const CMP_GT: u8 = 1;             // Greater than: price > a
    const CMP_GTE: u8 = 2;            // Greater than or equal: price >= a
    const CMP_LT: u8 = 3;             // Less than: price < a
    const CMP_LTE: u8 = 4;            // Less than or equal: price <= a
    const CMP_INCL_RANGE: u8 = 5;     // Range inclusive: a <= price <= b
    const CMP_OPEN_RANGE: u8 = 6;     // Range open: a < price < b

    /// Market status constants - simplified to 2 phases
    const MARKET_STATUS_ACTIVE: u8 = 1;    // Active: from deploy to bidding end time
    const MARKET_STATUS_EXPIRED: u8 = 2;   // Expired: after bidding end time

    /// Error constants
    const EINVALID_FEE: u64 = 1001;
    const EINSUFFICIENT_BALANCE: u64 = 1002;
    const EINVALID_WEIGHT: u64 = 1003;
    const EINVALID_OUTCOME: u64 = 1004;
    const EPOOL_EMPTY: u64 = 1005;
    const EUSER_NOT_FOUND: u64 = 1006;
    const EMARKET_NOT_FOUND: u64 = 1007;
    const EREWARDS_NOT_READY: u64 = 1008;

    /// Constants for weighting system (in basis points - BPS)
    const ALPHA: u64 = 15; // 0.15% = 15 basis points
    const BETA: u64 = 40; // 0.4% = 40 basis points
    const RISK_MAX: u64 = 175; // 1.75% = 175 basis points
    const FEE_OWNER_BPS: u64 = 150; // 1.5% = 150 basis points
    const FIXED_POINT: u128 = 1_000_000_000; // 1e9 for precision
    const BPS_DENOMINATOR: u64 = 10_000; // 100% = 10,000 basis points

    /// Poly-option outcome structure
    public struct Outcome has store, copy, drop {
        /// Outcome index
        index: u8,
        /// Comparison type (GT, GTE, LT, LTE, RANGE_INC, RANGE_OPEN)
        comparison_type: u8,
        /// First threshold value (fixed-point)
        threshold1: u128,
        /// Second threshold value (for ranges, fixed-point)
        threshold2: u128,
        /// Outcome description
        description: vector<u8>,
        /// Whether this outcome is active
        is_active: bool,
    }

    /// Market configuration for poly-option system
    public struct MarketConfig has store, copy, drop {
        /// Market creator address
        creator: address,
        /// Asset symbol (BTC, ETH, etc.)
        asset_symbol: vector<u8>,
        /// Payment asset type (USDC or APT)
        payment_asset: u8,
        /// Vector of outcomes
        outcomes: vector<Outcome>,
        /// Owner fee in basis points (BPS)
        owner_fee_bps: u64,
        /// Protocol rake in basis points (BPS)
        protocol_rake_bps: u64,
        /// ORK reward budget for this market
        ork_budget: u64,
        /// Market open time
        open_time: u64,
        /// Market lock time
        lock_time: u64,
        /// Market status
        status: u8,
        /// Pyth price feed ID
        price_feed_id: vector<u8>,
    }

    /// User bet structure for poly-option system
    public struct UserBet has store, copy, drop {
        /// User address
        user: address,
        /// Outcome index
        outcome_index: u8,
        /// Bet amount (raw)
        amount: u64,
        /// Net amount after fees
        amount_net: u64,
        /// Calculated weight
        weight: u128,
        /// Bet timestamp
        timestamp: u64,
    }

    /// Get comparison type constants
    public fun get_cmp_gt(): u8 { CMP_GT }
    public fun get_cmp_gte(): u8 { CMP_GTE }
    public fun get_cmp_lt(): u8 { CMP_LT }
    public fun get_cmp_lte(): u8 { CMP_LTE }
    public fun get_cmp_incl_range(): u8 { CMP_INCL_RANGE }
    public fun get_cmp_open_range(): u8 { CMP_OPEN_RANGE }

    /// Get Outcome field values
    public fun get_outcome_index(outcome: &Outcome): u8 { outcome.index }
    public fun get_outcome_comparison_type(outcome: &Outcome): u8 { outcome.comparison_type }
    public fun get_outcome_threshold1(outcome: &Outcome): u128 { outcome.threshold1 }
    public fun get_outcome_threshold2(outcome: &Outcome): u128 { outcome.threshold2 }
    public fun get_outcome_description(outcome: &Outcome): vector<u8> { outcome.description }
    public fun get_outcome_is_active(outcome: &Outcome): bool { outcome.is_active }

    /// Get market status active constant
    public fun get_market_status_active(): u8 { MARKET_STATUS_ACTIVE }
    
    /// Get market status expired constant
    public fun get_market_status_expired(): u8 { MARKET_STATUS_EXPIRED }

    /// Get time-based weight multiplier
    public fun get_time_weight(
        bet_time: u64,
        market_open: u64,
        market_close: u64
    ): u64 {
        if (bet_time <= market_open) {
            return 100 + ALPHA; // Maximum bonus for early bets
        };
        
        if (bet_time >= market_close) {
            return 100; // No bonus for late bets
        };
        
        let time_ratio = (market_close - bet_time) * 100 / (market_close - market_open);
        let weight = 100 + (ALPHA * time_ratio) / 100;
        
        if (weight > 100 + ALPHA) {
            100 + ALPHA
        } else {
            weight
        }
    }

    /// Get risk-based weight multiplier (clamped to RISK_MAX)
    public fun get_risk_weight(
        outcome_weight: u128,
        total_weights: u128
    ): u64 {
        if (total_weights == 0 || outcome_weight == 0) {
            100 // Default weight
        } else {
            let risk_ratio = (total_weights * 100) / outcome_weight;
            let risk_weight = (risk_ratio * (BETA as u128)) / 100;
            
            if (risk_weight > (RISK_MAX as u128)) {
                RISK_MAX
            } else {
                (risk_weight as u64)
            }
        }
    }

    /// Calculate bet weight
    public fun calculate_bet_weight(
        amount_net: u64,
        time_weight: u64,
        risk_weight: u64
    ): u128 {
        let weight = (amount_net as u128) * (time_weight as u128) * (risk_weight as u128);
        weight / 10000 // Normalize by 100^2 (both weights are in basis points)
    }

    /// Calculate owner fee in basis points
    public fun calculate_owner_fee_bps(amount: u64, fee_bps: u64): u64 {
        (amount * fee_bps) / BPS_DENOMINATOR
    }

    /// Calculate protocol rake in basis points
    public fun calculate_protocol_rake_bps(amount: u64, rake_bps: u64): u64 {
        (amount * rake_bps) / BPS_DENOMINATOR
    }

    /// Calculate net amount after fee
    public fun calculate_net_amount(amount: u64, fee_bps: u64): u64 {
        amount - calculate_owner_fee_bps(amount, fee_bps)
    }

    /// Function to match outcome based on price and comparison type
    public fun match_outcome(
        outcomes: &vector<Outcome>,
        price_fp: u128
    ): u8 {
        let i = 0;
        let len = vector::length(outcomes);
        
        while (i < len) {
            let outcome = vector::borrow(outcomes, i);
            if (outcome.is_active) {
                let matches = if (outcome.comparison_type == CMP_GT) {
                    price_fp > outcome.threshold1
                } else if (outcome.comparison_type == CMP_GTE) {
                    price_fp >= outcome.threshold1
                } else if (outcome.comparison_type == CMP_LT) {
                    price_fp < outcome.threshold1
                } else if (outcome.comparison_type == CMP_LTE) {
                    price_fp <= outcome.threshold1
                } else if (outcome.comparison_type == CMP_INCL_RANGE) {
                    price_fp >= outcome.threshold1 && price_fp <= outcome.threshold2
                } else if (outcome.comparison_type == CMP_OPEN_RANGE) {
                    price_fp > outcome.threshold1 && price_fp < outcome.threshold2
                } else {
                    false
                };
                
                if (matches) {
                    return outcome.index;
                };
            };
            i = i + 1;
        };
        
        // No outcome matches - market should be void
        255 // Invalid outcome index
    }

    /// Validate that outcomes don't overlap (called during market creation)
    public fun validate_outcomes_no_overlap(outcomes: &vector<Outcome>): bool {
        let len = vector::length(outcomes);
        if (len < 2) {
            return true; // Single outcome or no outcomes
        };
        
        let i = 0;
        while (i < len) {
            let outcome_i = vector::borrow(outcomes, i);
            if (!outcome_i.is_active) {
                i = i + 1;
                continue;
            };
            
            let j = i + 1;
            while (j < len) {
                let outcome_j = vector::borrow(outcomes, j);
                if (!outcome_j.is_active) {
                    j = j + 1;
                    continue;
                };
                
                if (outcomes_overlap(outcome_i, outcome_j)) {
                    return false; // Found overlap
                };
                j = j + 1;
            };
            i = i + 1;
        };
        true
    }

    /// Check if two outcomes overlap
    fun outcomes_overlap(a: &Outcome, b: &Outcome): bool {
        if (a.comparison_type == CMP_INCL_RANGE || a.comparison_type == CMP_OPEN_RANGE) {
            if (b.comparison_type == CMP_INCL_RANGE || b.comparison_type == CMP_OPEN_RANGE) {
                // Both are ranges - check for overlap
                let a_min = if (a.comparison_type == CMP_OPEN_RANGE) { a.threshold1 + 1 } else { a.threshold1 };
                let a_max = if (a.comparison_type == CMP_OPEN_RANGE) { a.threshold2 - 1 } else { a.threshold2 };
                let b_min = if (b.comparison_type == CMP_OPEN_RANGE) { b.threshold1 + 1 } else { b.threshold1 };
                let b_max = if (b.comparison_type == CMP_OPEN_RANGE) { b.threshold2 - 1 } else { b.threshold2 };
                
                !(a_max < b_min || b_max < a_min)
            } else {
                // a is range, b is single threshold
                let a_min = if (a.comparison_type == CMP_OPEN_RANGE) { a.threshold1 + 1 } else { a.threshold1 };
                let a_max = if (a.comparison_type == CMP_OPEN_RANGE) { a.threshold2 - 1 } else { a.threshold2 };
                
                b.threshold1 >= a_min && b.threshold1 <= a_max
            }
        } else if (b.comparison_type == CMP_INCL_RANGE || b.comparison_type == CMP_OPEN_RANGE) {
            // a is single threshold, b is range
            let b_min = if (b.comparison_type == CMP_OPEN_RANGE) { b.threshold1 + 1 } else { b.threshold1 };
            let b_max = if (b.comparison_type == CMP_OPEN_RANGE) { b.threshold2 - 1 } else { b.threshold2 };
            
            a.threshold1 >= b_min && a.threshold1 <= b_max
        } else {
            // Both are single thresholds - check if they're the same
            a.threshold1 == b.threshold1
        }
    }

    /// Create a binary outcome pair (e.g., < K and >= K)
    public fun create_binary_outcomes(strike_price: u128): vector<Outcome> {
        let outcomes = vector::empty<Outcome>();
        
        // Outcome 1: < K
        let outcome1 = Outcome {
            index: 0,
            comparison_type: CMP_LT,
            threshold1: strike_price,
            threshold2: 0,
            description: b"Price < Strike",
            is_active: true,
        };
        vector::push_back(&mut outcomes, outcome1);
        
        // Outcome 2: >= K
        let outcome2 = Outcome {
            index: 1,
            comparison_type: CMP_GTE,
            threshold1: strike_price,
            threshold2: 0,
            description: b"Price >= Strike",
            is_active: true,
        };
        vector::push_back(&mut outcomes, outcome2);
        
        outcomes
    }

    /// Create bucket outcomes from a list of thresholds
    public fun create_bucket_outcomes(thresholds: vector<u128>): vector<Outcome> {
        let outcomes = vector::empty<Outcome>();
        let len = vector::length(&thresholds);
        
        if (len == 0) {
            return outcomes;
        };
        
        let i = 0;
        while (i <= len) {
            let outcome = if (i == 0) {
                // First bucket: < first_threshold
                Outcome {
                    index: (i as u8),
                    comparison_type: CMP_LT,
                    threshold1: *vector::borrow(&thresholds, 0),
                    threshold2: 0,
                    description: b"Price < First Threshold",
                    is_active: true,
                }
            } else if (i == len) {
                // Last bucket: >= last_threshold
                Outcome {
                    index: (i as u8),
                    comparison_type: CMP_GTE,
                    threshold1: *vector::borrow(&thresholds, len - 1),
                    threshold2: 0,
                    description: b"Price >= Last Threshold",
                    is_active: true,
                }
            } else {
                // Middle bucket: [prev_threshold, current_threshold)
                Outcome {
                    index: (i as u8),
                    comparison_type: CMP_INCL_RANGE,
                    threshold1: *vector::borrow(&thresholds, i - 1),
                    threshold2: *vector::borrow(&thresholds, i),
                    description: b"Price in Range",
                    is_active: true,
                }
            };
            
            vector::push_back(&mut outcomes, outcome);
            i = i + 1;
        };
        
        outcomes
    }

    /// Create custom outcome with specific parameters
    public fun create_custom_outcome(
        index: u8,
        comparison_type: u8,
        threshold1: u128,
        threshold2: u128,
        description: vector<u8>
    ): Outcome {
        Outcome {
            index,
            comparison_type,
            threshold1,
            threshold2,
            description,
            is_active: true,
        }
    }

    // ============================================================================
    // ORK TOKEN CONSTANTS
    // ============================================================================
    
    /// ORK token constants
    public fun get_max_supply(): u128 { 1000000000000000 } // 1 trillion ORK (8 decimals)
    public fun get_initial_supply(): u128 { 100000000000000 } // 100 billion ORK initial
    public fun get_initial_epoch_budget(): u128 { 10000000000000 } // 10 billion ORK per epoch
    public fun get_epoch_duration_seconds(): u64 { 86400 } // 24 hours



    // ============================================================================
    // ADDITIONAL ERROR CODES
    // ============================================================================
    
    /// Additional error codes for ORK token operations
    public fun get_eexceeds_max_supply(): u64 { 2005 }
    public fun get_eexceeds_epoch_budget(): u64 { 3001 }
    public fun get_eexceeds_minter_budget(): u64 { 2007 }
    public fun get_eminter_not_found(): u64 { 2008 }
    public fun get_eminter_budget_exhausted(): u64 { 2009 }
} 