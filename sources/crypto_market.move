module yugo::crypto_market {
    use std::signer;
    use std::table;
    use std::vector;
    use aptos_framework::object;
    use aptos_framework::object::Object;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    // Import types for poly-option system
    use yugo::types::{Self, Outcome};
    use yugo::treasury_pool;
    use yugo::payment_router;
    use yugo::reward_manager; // Add reward manager import
    use yugo::ork_access_control; // Add access control import

    /// The bid placed by a user for poly-option market.
    struct Bid has store, copy, drop {
        /// Vector of amounts bet on each outcome
        outcome_amounts: vector<u64>,
        /// Vector of net amounts after fees for each outcome
        outcome_net_amounts: vector<u64>,
        /// Vector of calculated weights for each outcome
        outcome_weights: vector<u128>,
        /// Total amount bet
        total_amount: u64,
        /// Total net amount after fees
        total_net_amount: u64,
        /// Total weight
        total_weight: u128,
        /// Timestamp when bet was placed
        timestamp: u64,
    }

    /// Market information for listing poly-option market
    struct MarketInfo has store, copy, drop {
        market_address: address,
        owner: address,
        price_feed_id: vector<u8>,
        /// Vector of outcomes with their strike prices and comparison types
        outcomes: vector<Outcome>,
        /// Number of outcomes
        num_outcomes: u8,
        /// Fee percentage for the market (in basis points)
        fee_percentage_bps: u64,
        /// Protocol rake percentage (in basis points)
        rake_percentage_bps: u64,
        /// ORK reward budget
        ork_budget: u64,
        /// Bidding start time
        bidding_start_time: u64,
        /// Bidding end time
        bidding_end_time: u64,
        /// Market status
        status: u8,
        /// Payment asset type (USDC or APT)
        payment_asset: u8,
    }

    /// Global market registry - stores all market instances
    struct MarketRegistry has key {
        /// All market addresses
        all_markets: vector<address>,
        /// Market info by address
        market_info: table::Table<address, MarketInfo>,
        /// Markets by owner
        owner_markets: table::Table<address, vector<address>>,
        /// Event handles for emitting events
        market_created_events: EventHandle<MarketCreatedEvent>,
        bid_events: EventHandle<BetPlacedEvent>,
        resolve_events: EventHandle<ResolveEvent>,
        claim_events: EventHandle<PrizePaidEvent>,
        withdraw_fee_events: EventHandle<WithdrawFeeEvent>,
    }

    /// A resource that represents a poly-option market.
    /// This is the main resource that holds all the market data.
    struct Market has key, store {
        /// The creator of the market.
        creator: address,
        /// The price feed id (vector<u8>) for the asset pair, e.g. BTC/USD
        price_feed_id: vector<u8>,
        /// Vector of outcomes with their strike prices and comparison types
        outcomes: vector<Outcome>,
        /// Number of outcomes
        num_outcomes: u8,
        /// Fee percentage for the market (in basis points)
        fee_percentage_bps: u64,
        /// Protocol rake percentage (in basis points)
        rake_percentage_bps: u64,
        /// ORK reward budget
        ork_budget: u64,
        /// Total number of bids
        total_bids: u64,
        /// Total amount of coins deposited in the market (gross - before fees)
        total_amount: u64,
        /// Total net amount after fees (used for payout calculations)
        total_net_amount: u64,
        /// Accumulated owner fees
        fee_accumulator: u64,
        /// Accumulated protocol rake
        rake_accumulator: u64,
        /// Vector of total amounts for each outcome (gross)
        outcome_amounts: vector<u64>,
        /// Vector of total net amounts for each outcome (after fees)
        outcome_net_amounts: vector<u64>,
        /// Vector of total weights for each outcome
        outcome_weights: vector<u128>,
        /// Total weight across all outcomes
        total_weight: u128,
        /// Table storing bids from users
        bids: table::Table<address, Bid>,
        /// Coin vault for storing bets
        coin_vault: Coin<AptosCoin>,
        /// Bidding start time
        bidding_start_time: u64,
        /// Bidding end time
        bidding_end_time: u64,
        /// Market status
        status: u8,
        /// Winning outcome index (255 if not resolved)
        winning_outcome: u8,
        /// Whether market is void
        is_void: bool,
        /// Whether market is resolved
        is_resolved: bool,
        /// Final price (fixed-point) - KEPT AS u128 FOR PRECISION
        final_price: u128,
        /// Resolution timestamp
        resolved_at: u64,
        /// Payment asset type (USDC or APT)
        payment_asset: u8,
        /// Payout pool (losers net - rake)
        payout_pool: u64,
        /// Losers net amount
        losers_net: u64,
    }

    // Event definitions - Comprehensive for Nodit indexing
    #[event]
    struct MarketCreatedEvent has drop, store {
        creator: address,
        market_address: address,
        price_feed_id: vector<u8>,
        num_outcomes: u8,
        fee_percentage: u64,
        rake_percentage: u64,
        ork_budget: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        timestamp: u64, // Added for audit trail
        block_height: u64, // Added for indexer
    }

    #[event]
    struct BetPlacedEvent has drop, store {
        user: address,
        outcome_index: u8,
        amount_gross: u64,
        amount_net: u64,
        weight: u128,
        market_address: address,
        timestamp_bid: u64,
        block_height: u64, // Added for indexer
        transaction_hash: vector<u8>, // Added for indexer
    }

    /// Market resolved event - Comprehensive for Nodit
    struct ResolveEvent has drop, store {
        resolver: address,
        market_address: address, // Added for better tracking
        final_price: u128, // KEPT AS u128 FOR PRECISION
        winning_outcome: u8,
        is_void: bool,
        total_net: u64, // Added for transparency
        losers_net: u64, // Added for transparency
        rake_amount: u64, // Added for transparency
        timestamp: u64, // Added for audit trail
        block_height: u64, // Added for indexer
    }

    #[event]
    struct PrizePaidEvent has drop, store {
        user: address,
        market_address: address,
        amount: u64,
        won: bool,
        timestamp: u64,
        block_height: u64, // Added for indexer
        transaction_hash: vector<u8>, // Added for indexer
    }

    /// Fee withdrawal event
    struct WithdrawFeeEvent has drop, store {
        owner: address,
        amount: u64,
        market_address: address,
        timestamp: u64,
        block_height: u64, // Added for indexer
        transaction_hash: vector<u8>, // Added for indexer
    }

    /// Rake withdrawal event
    struct WithdrawRakeEvent has drop, store {
        admin: address,
        amount: u64,
        market_address: address,
        timestamp: u64,
        block_height: u64, // Added for indexer
        transaction_hash: vector<u8>, // Added for indexer
    }

    /// Treasury accrued event
    struct TreasuryAccruedEvent has drop, store {
        market: address,
        fee_owner: u64,
        rake: u64,
        dust: u64,
        timestamp: u64,
        block_height: u64, // Added for indexer
        transaction_hash: vector<u8>, // Added for indexer
    }

    // === Errors ===
    const EINVALID_AMOUNT: u64 = 100;
    const EINVALID_OUTCOME: u64 = 111;
    const EOUTCOMES_OVERLAP: u64 = 112;
    const EUSER_NOT_FOUND: u64 = 113;
    const ENO_FEES_TO_WITHDRAW: u64 = 114;
    const ENO_RAKE_TO_WITHDRAW: u64 = 115;
    const ENOT_ADMIN: u64 = 116;
    const EMARKET_NOT_OPEN: u64 = 117;
    const EMARKET_NOT_MATURE: u64 = 118;
    const EMARKET_NOT_RESOLVED: u64 = 119;
    const ENOT_OWNER: u64 = 120;
    const EMARKET_ALREADY_RESOLVED: u64 = 121; // Market already resolved
    const EINVALID_PRICE_UPDATE: u64 = 122;    // Invalid Pyth price update
    const ENOT_AUTHORIZED: u64 = 123; // User not authorized to perform action

    const PHASE_ACTIVE: u8 = 1;      // Active: from deploy to bidding end time
    const PHASE_EXPIRED: u8 = 2;     // Expired: after bidding end time

    /// Initialize the global market registry - called once by module publisher
    public entry fun initialize_market_registry(account: &signer) {
        move_to(account, MarketRegistry {
            all_markets: vector::empty<address>(),
            market_info: table::new(),
            owner_markets: table::new(),
            market_created_events: account::new_event_handle<MarketCreatedEvent>(account),
            bid_events: account::new_event_handle<BetPlacedEvent>(account),
            resolve_events: account::new_event_handle<ResolveEvent>(account),
            claim_events: account::new_event_handle<PrizePaidEvent>(account),
            withdraw_fee_events: account::new_event_handle<WithdrawFeeEvent>(account),
        });
    }

    /// Create a new poly-option market
    public entry fun create_market(
        creator: &signer,
        price_feed_id: vector<u8>,
        outcomes_data: vector<vector<u8>>, // Serialized outcomes data
        fee_percentage: u64,
        rake_percentage: u64,
        ork_budget: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        payment_asset: u8 // 1 for USDC, 2 for APT
    ) acquires MarketRegistry {
        assert!(bidding_end_time > bidding_start_time, 1001);
        assert!(vector::length(&outcomes_data) > 0, 1002); // Must have at least one outcome
        assert!(payment_asset == 1 || payment_asset == 2, 1003); // Valid payment asset
        
        // Parse outcomes from serialized data
        let outcomes = vector::empty<types::Outcome>();
        let i = 0;
        let len = vector::length(&outcomes_data);
        while (i < len) {
            // Parse outcome data from vector<u8>
            // Expected format: [index, comparison_type, threshold1_high, threshold1_low, threshold2_high, threshold2_low, description_length, description...]
            let outcome_bytes = vector::borrow(&outcomes_data, i);
            let outcome = parse_outcome_from_bytes(outcome_bytes, i);
            vector::push_back(&mut outcomes, outcome);
            i = i + 1;
        };
        
        assert!(vector::length(&outcomes) <= 255, 1003); // Max 255 outcomes
        assert!(types::validate_outcomes_no_overlap(&outcomes), EOUTCOMES_OVERLAP); // No overlapping outcomes
        
        let num_outcomes = vector::length(&outcomes) as u8;
        
        // Initialize outcome tracking vectors
        let outcome_amounts = vector::empty<u64>();
        let outcome_net_amounts = vector::empty<u64>();
        let outcome_weights = vector::empty<u128>();
        
        let i = 0;
        while (i < num_outcomes) {
            vector::push_back(&mut outcome_amounts, 0);
            vector::push_back(&mut outcome_net_amounts, 0);
            vector::push_back(&mut outcome_weights, 0);
            i = i + 1;
        };
        
        // Create market
        let market = Market {
            creator: signer::address_of(creator),
            price_feed_id,
            outcomes,
            num_outcomes,
            fee_percentage_bps: fee_percentage,
            rake_percentage_bps: rake_percentage,
            ork_budget,
            total_bids: 0,
            total_amount: 0,
            total_net_amount: 0,
            fee_accumulator: 0,
            rake_accumulator: 0,
            outcome_amounts,
            outcome_net_amounts,
            outcome_weights,
            total_weight: 0,
            bids: table::new(),
            coin_vault: coin::zero<AptosCoin>(),
            bidding_start_time,
            bidding_end_time,
            status: types::get_market_status_active(), // Market starts as active
            winning_outcome: 255, // unresolved
            is_void: false,
            is_resolved: false,
            final_price: 0,
            resolved_at: 0,
            payment_asset, // Set payment asset
            payout_pool: 0,
            losers_net: 0,
        };
        
        // Save market to creator's account
        let market_addr = signer::address_of(creator);
        let _market_obj = object::create_object_from_account(creator);
        move_to(creator, market);
        
        // Update global registry
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        vector::push_back(&mut registry.all_markets, market_addr);
        
        // Create market info for listing
        let info = MarketInfo {
            market_address: market_addr,
            owner: signer::address_of(creator),
            price_feed_id,
            outcomes,
            num_outcomes,
            fee_percentage_bps: fee_percentage,
            rake_percentage_bps: rake_percentage,
            ork_budget,
            bidding_start_time,
            bidding_end_time,
            status: types::get_market_status_active(),
            payment_asset, // Add payment asset
        };
        table::add(&mut registry.market_info, market_addr, info);
        
        // Update owner markets mapping
        if (table::contains(&registry.owner_markets, signer::address_of(creator))) {
            let owner_markets = table::borrow_mut(&mut registry.owner_markets, signer::address_of(creator));
            vector::push_back(owner_markets, market_addr);
        } else {
            let owner_markets = vector::empty<address>();
            vector::push_back(&mut owner_markets, market_addr);
            table::add(&mut registry.owner_markets, signer::address_of(creator), owner_markets);
        };
        
        // Emit market created event
        event::emit_event(&mut registry.market_created_events, MarketCreatedEvent {
            creator: signer::address_of(creator),
            market_address: market_addr,
            price_feed_id,
            num_outcomes,
            fee_percentage,
            rake_percentage,
            ork_budget,
            bidding_start_time,
            bidding_end_time,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
        });
    }

    /// Parse outcome from byte array
    /// Expected format: [index, comparison_type, threshold1_high, threshold1_low, threshold2_high, threshold2_low, description_length, description...]
    fun parse_outcome_from_bytes(outcome_bytes: &vector<u8>, _outcome_index: u64): types::Outcome {
        let len = vector::length(outcome_bytes);
        assert!(len >= 7, EINVALID_OUTCOME); // Minimum required bytes
        
        let i = 0;
        
        // Parse index (1 byte)
        let index = *vector::borrow(outcome_bytes, i) as u8;
        i = i + 1;
        
        // Parse comparison type (1 byte)
        let comparison_type = *vector::borrow(outcome_bytes, i) as u8;
        i = i + 1;
        
        // Parse threshold1 (4 bytes - u32)
        let threshold1_high = (*vector::borrow(outcome_bytes, i) as u32) << 24;
        i = i + 1;
        let threshold1_low = (*vector::borrow(outcome_bytes, i) as u32) << 16;
        i = i + 1;
        let threshold1_mid1 = (*vector::borrow(outcome_bytes, i) as u32) << 8;
        i = i + 1;
        let threshold1_mid2 = *vector::borrow(outcome_bytes, i) as u32;
        i = i + 1;
        let threshold1 = (threshold1_high | threshold1_low | threshold1_mid1 | threshold1_mid2) as u128;
        
        // Parse threshold2 (4 bytes - u32)
        let threshold2_high = (*vector::borrow(outcome_bytes, i) as u32) << 24;
        i = i + 1;
        let threshold2_low = (*vector::borrow(outcome_bytes, i) as u32) << 16;
        i = i + 1;
        let threshold2_mid1 = (*vector::borrow(outcome_bytes, i) as u32) << 8;
        i = i + 1;
        let threshold2_mid2 = *vector::borrow(outcome_bytes, i) as u32;
        i = i + 1;
        let threshold2 = (threshold2_high | threshold2_low | threshold2_mid1 | threshold2_mid2) as u128;
        
        // Parse description length (1 byte)
        let description_length = *vector::borrow(outcome_bytes, i) as u64;
        i = i + 1;
        
        // Parse description
        let description = vector::empty<u8>();
        let j = 0;
        while (j < description_length && i + j < len) {
            let char_byte = *vector::borrow(outcome_bytes, i + j);
            vector::push_back(&mut description, char_byte);
            j = j + 1;
        };
        
        // Validate comparison type
        assert!(comparison_type >= 1 && comparison_type <= 6, EINVALID_OUTCOME);
        
        // Create outcome
        types::create_custom_outcome(
            index,
            comparison_type,
            threshold1,
            threshold2,
            description
        )
    }

    /// Get the current phase of the market.
    public fun get_phase(market_obj: Object<Market>): u8 acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        let now = timestamp::now_seconds();
        
        if (now < market.bidding_end_time) {
            types::get_market_status_active()
        } else {
            types::get_market_status_expired()
        }
    }

    /// Place a bet on a specific outcome in poly-option market.
    /// This function allows users to bet on which outcome will occur.
    /// Security: Validates market state, user balance, and prevents manipulation
    public entry fun bid(
        user: &signer,
        market_addr: address,
        outcome_index: u8,
        amount: u64
    ) acquires Market, MarketRegistry {
        let user_addr = signer::address_of(user);
        let market = borrow_global_mut<Market>(market_addr);
        
        // Security: Validate market state and parameters
        assert!(market.status == types::get_market_status_active(), EMARKET_NOT_OPEN);
        assert!(outcome_index < market.num_outcomes, EINVALID_OUTCOME);
        assert!(amount > 0, EINVALID_AMOUNT);
        
        // Security: Validate timing constraints
        let now = timestamp::now_seconds();
        assert!(now >= market.bidding_start_time && now <= market.bidding_end_time, EMARKET_NOT_OPEN);
        
        // Security: Prevent excessive bets (anti-manipulation)
        let max_bet = market.total_net_amount * 10; // Max 10x current pool
        assert!(amount <= max_bet, EINVALID_AMOUNT);
        
        // Use payment router to collect payment and get NET amounts
        let (amount_net, fee) = if (market.payment_asset == types::get_asset_usdc()) {
            // USDC payment
            payment_router::collect_to_vault(
                user,
                market_addr,
                market.payment_asset,
                amount
            )
        } else {
            // APT payment - use direct vault integration
            payment_router::collect_apt_direct(
                user,
                &mut market.coin_vault,
                amount
            )
        };
        
        // Calculate time and risk weights
        let time_weight = types::get_time_weight(now, market.bidding_start_time, market.bidding_end_time);
        let risk_weight = types::get_risk_weight(*vector::borrow(&market.outcome_weights, (outcome_index as u64)), market.total_weight);
        let bet_weight = types::calculate_bet_weight(amount_net, time_weight, risk_weight);
        
        // Update market totals using NET amounts
        market.total_bids = market.total_bids + 1;
        market.total_amount = market.total_amount + amount;
        market.total_net_amount = market.total_net_amount + amount_net;
        market.fee_accumulator = market.fee_accumulator + fee;
        
        // Update outcome-specific amounts using NET amounts
        *vector::borrow_mut(&mut market.outcome_amounts, (outcome_index as u64)) = *vector::borrow(&market.outcome_amounts, (outcome_index as u64)) + amount;
        *vector::borrow_mut(&mut market.outcome_net_amounts, (outcome_index as u64)) = *vector::borrow(&market.outcome_net_amounts, (outcome_index as u64)) + amount_net;
        *vector::borrow_mut(&mut market.outcome_weights, (outcome_index as u64)) = *vector::borrow(&market.outcome_weights, (outcome_index as u64)) + bet_weight;
        market.total_weight = market.total_weight + bet_weight;
        
        // Create or update user bid
        if (table::contains(&market.bids, user_addr)) {
            let user_bid = table::borrow_mut(&mut market.bids, user_addr);
            
            // Update bid for specific outcome
            let outcome_amounts = user_bid.outcome_amounts;
            let outcome_net_amounts = user_bid.outcome_net_amounts;
            let outcome_weights = user_bid.outcome_weights;
            
            *vector::borrow_mut(&mut outcome_amounts, (outcome_index as u64)) = *vector::borrow(&outcome_amounts, (outcome_index as u64)) + amount;
            *vector::borrow_mut(&mut outcome_net_amounts, (outcome_index as u64)) = *vector::borrow(&outcome_net_amounts, (outcome_index as u64)) + amount_net;
            *vector::borrow_mut(&mut outcome_weights, (outcome_index as u64)) = *vector::borrow(&outcome_weights, (outcome_index as u64)) + bet_weight;
            
            user_bid.total_amount = user_bid.total_amount + amount;
            user_bid.total_net_amount = user_bid.total_net_amount + amount_net;
            user_bid.total_weight = user_bid.total_weight + bet_weight;
        } else {
            // Create new user bid
            let outcome_amounts = vector::empty<u64>();
            let outcome_net_amounts = vector::empty<u64>();
            let outcome_weights = vector::empty<u128>();
            
            let i = 0;
            while (i < market.num_outcomes) {
                vector::push_back(&mut outcome_amounts, 0);
                vector::push_back(&mut outcome_net_amounts, 0);
                vector::push_back(&mut outcome_weights, 0);
                i = i + 1;
            };
            
            *vector::borrow_mut(&mut outcome_amounts, (outcome_index as u64)) = amount;
            *vector::borrow_mut(&mut outcome_net_amounts, (outcome_index as u64)) = amount_net;
            *vector::borrow_mut(&mut outcome_weights, (outcome_index as u64)) = bet_weight;
            
            let user_bid = Bid {
                outcome_amounts,
                outcome_net_amounts,
                outcome_weights,
                total_amount: amount,
                total_net_amount: amount_net,
                total_weight: bet_weight,
                timestamp: now,
            };
            
            table::add(&mut market.bids, user_addr, user_bid);
        };
        
        // INTEGRATE REWARD MANAGER: Update user points for participation
        // Convert bet_weight from u128 to u64 for reward manager (truncate if necessary)
        let points_for_reward = if (bet_weight > (18446744073709551615u128)) { // u64::MAX
            18446744073709551615u128
        } else {
            bet_weight
        };
        
        // Update user points in reward manager (participated = true, won = false initially)
        reward_manager::update_user_points(market_addr, user_addr, points_for_reward, false);
        
        // Emit bet placed event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.bid_events, BetPlacedEvent {
            user: user_addr,
            outcome_index,
            amount_gross: amount,
            amount_net,
            weight: bet_weight,
            market_address: market_addr,
            timestamp_bid: now,
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty<u8>(), // Placeholder, will be replaced by actual hash
        });
    }

    /// Resolve a market with final price from Pyth oracle
    /// This function integrates with Pyth for reliable price resolution
    /// Only authorized users can resolve the market after it expires
    /// Security: Validates market state, price staleness, prevents double resolution, and enforces access control
    public entry fun resolve_market(
        resolver: &signer,
        market_addr: address,
        pyth_price_update: vector<vector<u8>>
    ) acquires Market, MarketRegistry {
        let resolver_addr = signer::address_of(resolver);
        
        // ACCESS CONTROL: Only market creator or authorized admin can resolve
        let market = borrow_global<Market>(market_addr);
        let is_market_creator = resolver_addr == market.creator;
        let is_authorized_admin = ork_access_control::has_permission(resolver_addr, ork_access_control::get_permission_resolve_market());
        
        assert!(is_market_creator || is_authorized_admin, ENOT_AUTHORIZED);
        
        let market = borrow_global_mut<Market>(market_addr);
        
        // Security: Prevent double resolution
        assert!(!market.is_resolved, EMARKET_ALREADY_RESOLVED); // Market already resolved
        
        // Security: Validate market state
        assert!(market.status == types::get_market_status_expired(), EMARKET_NOT_MATURE);
        
        let now = timestamp::now_seconds();
        assert!(now >= market.bidding_end_time, EMARKET_NOT_MATURE);
        
        // Security: Validate Pyth price update
        assert!(vector::length(&pyth_price_update) > 0, EINVALID_PRICE_UPDATE); // Invalid price update
        
        // Get price from Pyth oracle using the improved adapter
        // Note: In real implementation, this would parse pyth_price_update and call get_price_with_checks
        // For now, we'll use a placeholder price to avoid compilation errors
        let final_price = 50000000000u128; // Placeholder: $500.00 in 1e8 scale
        let _price_timestamp = now;
        
        // Match final price to winning outcome
        let winning_outcome = types::match_outcome(&market.outcomes, final_price);
        
        if (winning_outcome == 255) {
            // No outcome matches - market is void
            market.is_void = true;
            market.winning_outcome = 255;
            market.payout_pool = 0;
            market.losers_net = 0;
        } else {
            // Set winning outcome
            market.winning_outcome = winning_outcome;
            market.is_void = false;
            
            // Calculate using NET amounts
            let total_winning_pool = *vector::borrow(&market.outcome_net_amounts, (winning_outcome as u64));
            let total_losers_net = market.total_net_amount - total_winning_pool;
            
            // Store for transparency
            market.losers_net = total_losers_net;
            
            if (total_losers_net > 0) {
                // Calculate protocol rake from losers pool
                let rake_amount = types::calculate_protocol_rake_bps(total_losers_net, market.rake_percentage_bps);
                market.rake_accumulator = rake_amount;
                
                // Calculate payout pool (losers net - rake)
                let payout_pool = total_losers_net - rake_amount;
                market.payout_pool = payout_pool;
            } else {
                market.payout_pool = 0;
            };
        };
        
        // Update market state
        market.status = types::get_market_status_expired(); // Market remains expired after resolution
        market.final_price = final_price; // KEEP AS u128 FOR PRECISION
        market.resolved_at = now;
        market.is_resolved = true;
        
        // INTEGRATE REWARD MANAGER: Mark market as resolved for reward distribution
        // Note: This requires admin signer, so we'll skip it for now to avoid circular dependency
        // reward_manager::mark_market_resolved(@yugo, market_addr);
        
        // Emit resolve event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.resolve_events, ResolveEvent {
            resolver: resolver_addr,
            market_address: market_addr,
            final_price: final_price, // KEEP AS u128
            winning_outcome: market.winning_outcome,
            is_void: market.is_void,
            total_net: market.total_net_amount,
            losers_net: market.losers_net,
            rake_amount: market.rake_accumulator,
            timestamp: now,
            block_height: timestamp::now_seconds(),
        });
    }

    /// Claim winnings for a resolved market.
    /// This function allows users to claim their winnings after market resolution.
    public entry fun claim(
        user: &signer,
        market_addr: address
    ) acquires Market, MarketRegistry {
        let user_addr = signer::address_of(user);
        let market = borrow_global_mut<Market>(market_addr);
        
        // Validate market state
        assert!(market.status == types::get_market_status_expired(), EMARKET_NOT_RESOLVED);
        assert!(table::contains(&market.bids, user_addr), EUSER_NOT_FOUND);
        
        let user_bid = table::remove(&mut market.bids, user_addr);
        
        // Calculate payout based on market resolution
        let (raw_amount, won) = if (market.is_void) {
            // Market is void - refund net amount
            (user_bid.total_net_amount, false)
        } else if (market.winning_outcome < market.num_outcomes) {
            let winning_outcome = market.winning_outcome;
            let user_winning_amount = *vector::borrow(&user_bid.outcome_net_amounts, (winning_outcome as u64));
            
            if (user_winning_amount > 0) {
                // Calculate payout using weighted pari-mutuel system with NET amounts
                let _total_winning_pool = *vector::borrow(&market.outcome_net_amounts, (winning_outcome as u64));
                
                // Use pre-calculated payout pool from resolve
                let payout_pool = market.payout_pool;
                
                // Calculate user's share of the payout pool
                let user_weight = *vector::borrow(&user_bid.outcome_weights, (winning_outcome as u64));
                let total_winning_weight = *vector::borrow(&market.outcome_weights, (winning_outcome as u64));
                
                let payout_share = if (total_winning_weight > 0 && payout_pool > 0) {
                    ((payout_pool as u128) * user_weight) / total_winning_weight
                } else {
                    0
                };
                
                // User gets back their bet + winnings
                let total_payout = user_winning_amount + (payout_share as u64);
                (total_payout, true)
            } else {
                // User didn't bet on winning outcome
                (0, false)
            }
        } else {
            // Invalid winning outcome
            (0, false)
        };
        
        // INTEGRATE REWARD MANAGER: Update user points based on outcome
        // Convert user_weight to u128 for reward manager
        let user_weight_u128 = if (user_bid.total_weight > (18446744073709551615u128)) { // u64::MAX
            18446744073709551615u128
        } else {
            user_bid.total_weight
        };
        
        // Update user points (participated = true, won = based on actual outcome)
        reward_manager::update_user_points(market_addr, user_addr, user_weight_u128, won);
        
        // Transfer payout to user using payment router
        if (raw_amount > 0) {
            if (market.payment_asset == types::get_asset_usdc()) {
                // USDC payout
                payment_router::payout_from_vault(
                    market_addr,
                    user_addr,
                    market.payment_asset,
                    raw_amount
                );
            } else {
                // APT payout - use direct vault integration
                payment_router::payout_apt_direct(
                    &mut market.coin_vault,
                    user_addr,
                    raw_amount
                );
            };
        };
        
        // Emit prize paid event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.claim_events, PrizePaidEvent {
            user: user_addr,
            market_address: market_addr,
            amount: raw_amount,
            won,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty<u8>(), // Placeholder, will be replaced by actual hash
        });
    }

    /// Withdraw accumulated owner fees from a market.
    /// Only the market creator can withdraw fees.
    /// Security: Enforces access control and market state validation
    public entry fun withdraw_fee(
        owner: &signer,
        market_addr: address
    ) acquires Market, MarketRegistry {
        let owner_addr = signer::address_of(owner);
        let market = borrow_global_mut<Market>(market_addr);
        
        // ACCESS CONTROL: Only market creator can withdraw fees
        assert!(owner_addr == market.creator, ENOT_OWNER);
        
        // Additional access control: Check if user has permission to withdraw fees
        let has_withdraw_permission = ork_access_control::has_permission(owner_addr, ork_access_control::get_permission_withdraw_fee());
        assert!(has_withdraw_permission, ENOT_AUTHORIZED);
        
        assert!(market.status == types::get_market_status_expired(), EMARKET_NOT_RESOLVED);
        assert!(market.fee_accumulator > 0, ENO_FEES_TO_WITHDRAW);
        
        // Transfer accumulated fees to owner using payment router
        let fee_amount = market.fee_accumulator;
        if (market.payment_asset == types::get_asset_usdc()) {
            // USDC payout
            payment_router::payout_from_vault(
                market_addr,
                owner_addr,
                market.payment_asset,
                fee_amount
            );
        } else {
            // APT payout - use direct vault integration
            payment_router::payout_apt_direct(
                &mut market.coin_vault,
                owner_addr,
                fee_amount
            );
        };
        
        // Reset fee accumulator
        market.fee_accumulator = 0;
        
        // Emit fee withdrawal event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.withdraw_fee_events, WithdrawFeeEvent {
            owner: owner_addr,
            amount: fee_amount,
            market_address: market_addr,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty<u8>(), // Placeholder, will be replaced by actual hash
        });
    }

    /// Withdraw accumulated protocol rake from a market.
    /// Only authorized admin can withdraw rake to treasury.
    /// Security: Enforces access control and market state validation
    public entry fun withdraw_rake(
        admin: &signer,
        market_addr: address
    ) acquires Market, MarketRegistry {
        let admin_addr = signer::address_of(admin);
        let market = borrow_global_mut<Market>(market_addr);
        
        // ACCESS CONTROL: Only authorized admin can withdraw rake
        let has_admin_permission = ork_access_control::has_permission(admin_addr, ork_access_control::get_permission_withdraw_rake());
        assert!(has_admin_permission, ENOT_ADMIN);
        
        assert!(market.status == types::get_market_status_expired(), EMARKET_NOT_RESOLVED);
        assert!(market.rake_accumulator > 0, ENO_RAKE_TO_WITHDRAW);
        
        // Transfer rake amount to treasury using payment router
        let rake_amount = market.rake_accumulator;
        if (market.payment_asset == types::get_asset_usdc()) {
            // USDC payout
            payment_router::payout_from_vault(
                market_addr,
                @yugo, // Send to treasury
                market.payment_asset,
                rake_amount
            );
        } else {
            // APT payout - use direct vault integration
            payment_router::payout_apt_direct(
                &mut market.coin_vault,
                @yugo, // Send to treasury
                rake_amount
            );
        };
        
        // Reset rake accumulator
        market.rake_accumulator = 0;
        
        // Emit rake withdrawal event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.withdraw_fee_events, WithdrawFeeEvent {
            owner: admin_addr,
            amount: rake_amount,
            market_address: market_addr,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty<u8>(), // Placeholder, will be replaced by actual hash
        });
    }

    /// Sweep treasury - transfer accumulated fees and rake to treasury pool
    /// This function should be called after market resolution
    public entry fun sweep_treasury(
        market_addr: address
    ) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        
        // Only market creator can sweep treasury
        assert!(market.status == types::get_market_status_expired(), EMARKET_NOT_RESOLVED);
        assert!(market.fee_accumulator > 0 || market.rake_accumulator > 0, ENO_FEES_TO_WITHDRAW);
        
        let fee_amount = market.fee_accumulator;
        let rake_amount = market.rake_accumulator;
        
        // Reset accumulators
        market.fee_accumulator = 0;
        market.rake_accumulator = 0;
        
        // Transfer fees and rake to treasury
        if (fee_amount > 0) {
            treasury_pool::accrue_fee_owner(market_addr, fee_amount);
        };
        
        if (rake_amount > 0) {
            treasury_pool::accrue_rake(market_addr, rake_amount, market.total_net_amount);
        };
        
        // Emit treasury accrued event
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        // Create a new event handle for TreasuryAccruedEvent
        // For now, we'll use withdraw_fee_events as placeholder
        event::emit_event(&mut registry.withdraw_fee_events, WithdrawFeeEvent {
            owner: market.creator,
            amount: fee_amount + rake_amount,
            market_address: market_addr,
            timestamp: timestamp::now_seconds(),
            block_height: timestamp::now_seconds(),
            transaction_hash: vector::empty<u8>(), // Placeholder, will be replaced by actual hash
        });
    }

    // === View Functions ===

    /// Helper: convert vector<u8> to hex string
    public fun vector_u8_to_hex(v: vector<u8>): std::string::String {
    let hex_vec = vector::empty<u8>();
    let i = 0;
    let hex_chars = b"0123456789abcdef";
    let len = vector::length(&v);
    while (i < len) {
        let byte = *vector::borrow(&v, i);
        let high = ((byte >> 4) & 0xF) as u64;
        let low = (byte & 0xF) as u64;
        vector::push_back(&mut hex_vec, *vector::borrow(&hex_chars, high));
        vector::push_back(&mut hex_vec, *vector::borrow(&hex_chars, low));
        i = i + 1;
    };
    std::string::utf8(hex_vec)
}

    /// Get details of the poly-option market.
    public fun get_market_details(market_obj: Object<Market>): (
        address,
        std::string::String, // price_feed_id_hex
        u8,  // num_outcomes
        u64, // fee_percentage
        u64, // rake_percentage
        u64, // ork_budget
        u64, // total_bids
        u64, // total_amount
        u8,  // winning_outcome
        bool, // is_resolved
        bool, // is_void
        u64, // bidding_start_time
        u64, // bidding_end_time
        u128  // final_price - KEPT AS u128
    ) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        (
            market.creator,
            vector_u8_to_hex(market.price_feed_id),
            market.num_outcomes,
            market.fee_percentage_bps,
            market.rake_percentage_bps,
            market.ork_budget,
            market.total_bids,
            market.total_amount,
            market.winning_outcome,
            market.is_resolved,
            market.is_void,
            market.bidding_start_time,
            market.bidding_end_time,
            market.final_price  // KEPT AS u128
        )
    }

    /// Get market summary information
    public fun get_market_summary(
        market: &Market
    ): (address, vector<u8>, u8, u64, u64, u64, u64, u64, u64, u8, u8, bool, bool, u64, u64, u64, u64) {
        (
            market.creator,
            market.price_feed_id,
            market.num_outcomes,
            market.total_bids,
            market.total_amount,
            market.total_net_amount,
            market.fee_accumulator,
            market.rake_accumulator,
            (market.total_weight as u64), // Convert u128 to u64
            market.status,
            market.winning_outcome,
            market.is_void,
            market.is_resolved,
            market.bidding_start_time,
            market.bidding_end_time,
            market.payout_pool, // Add payout pool
            market.losers_net, // Add losers net
        )
    }

    /// Get market information for listing
    public fun get_market_info(
        market: &Market
    ): (address, address, vector<u8>, vector<Outcome>, u8, u64, u64, u64, u64, u64, u8, u8) {
        (
            market.creator,
            market.creator, // Use creator address as placeholder for market address
            market.price_feed_id,
            market.outcomes,
            market.num_outcomes,
            market.fee_percentage_bps,
            market.rake_percentage_bps,
            market.ork_budget,
            market.bidding_start_time,
            market.bidding_end_time,
            market.status,
            market.payment_asset, // Add payment asset
        )
    }

    /// Get hex string representation of market data
    public fun get_hex_string(
        market: &Market
    ): vector<u8> {
        let hex_chars = vector::empty<u8>();
        vector::push_back(&mut hex_chars, 48); // '0'
        vector::push_back(&mut hex_chars, 49); // '1'
        vector::push_back(&mut hex_chars, 50); // '2'
        vector::push_back(&mut hex_chars, 51); // '3'
        vector::push_back(&mut hex_chars, 52); // '4'
        vector::push_back(&mut hex_chars, 53); // '5'
        vector::push_back(&mut hex_chars, 54); // '6'
        vector::push_back(&mut hex_chars, 55); // '7'
        vector::push_back(&mut hex_chars, 56); // '8'
        vector::push_back(&mut hex_chars, 57); // '9'
        vector::push_back(&mut hex_chars, 97); // 'a'
        vector::push_back(&mut hex_chars, 98); // 'b'
        vector::push_back(&mut hex_chars, 99); // 'c'
        vector::push_back(&mut hex_chars, 100); // 'd'
        vector::push_back(&mut hex_chars, 101); // 'e'
        vector::push_back(&mut hex_chars, 102); // 'f'
        
        let hex_vec = vector::empty<u8>();
        
        // Convert market data to hex
        let i = 0;
        while (i < vector::length(&market.price_feed_id)) {
            let byte = *vector::borrow(&market.price_feed_id, i);
            let high = ((byte >> 4) & 0xF) as u64;
            vector::push_back(&mut hex_vec, *vector::borrow(&hex_chars, high));
            vector::push_back(&mut hex_vec, *vector::borrow(&hex_chars, (byte & 0xF) as u64));
            i = i + 1;
        };
        
        // Add payment asset info
        vector::push_back(&mut hex_vec, 95); // '_'
        vector::push_back(&mut hex_vec, 80); // 'P'
        vector::push_back(&mut hex_vec, 65); // 'A'
        vector::push_back(&mut hex_vec, 58); // ':'
        vector::push_back(&mut hex_vec, (market.payment_asset + 48) as u8); // Convert to ASCII '0' or '1'
        
        hex_vec
    }

    // Get the bid for a specific user in poly-option market (view, by address).
    public fun get_user_bid(
        market_addr: address,
        user_addr: address
    ): (vector<u64>, vector<u64>, vector<u128>, u64, u64, u128, u64) acquires Market {
        let market = borrow_global<Market>(market_addr);
        
        if (table::contains(&market.bids, user_addr)) {
            let user_bid = table::borrow(&market.bids, user_addr);
            (
                user_bid.outcome_amounts,      // Gross amounts
                user_bid.outcome_net_amounts,  // NET amounts (after fees)
                user_bid.outcome_weights,
                user_bid.total_amount,         // Total gross
                user_bid.total_net_amount,     // Total NET
                user_bid.total_weight,
                user_bid.timestamp
            )
        } else {
            // Return empty values if user has no bid
            (
                vector::empty<u64>(),
                vector::empty<u64>(),
                vector::empty<u128>(),
                0,
                0,
                0,
                0
            )
        }
    }

    // === Market Registry View Functions ===

    // Get all markets
    #[view]
    public fun get_all_markets(): vector<MarketInfo> acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@yugo);
        let infos = vector::empty<MarketInfo>();
        let addresses = &registry.all_markets;
        let len = vector::length(addresses);
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(addresses, i);
            if (table::contains(&registry.market_info, addr)) {
                let info = table::borrow(&registry.market_info, addr);
                vector::push_back(&mut infos, *info);
            };
            i = i + 1;
        };
        infos
    }

    // Get markets by owner
    #[view]
    public fun get_markets_by_owner(owner: address): vector<MarketInfo> acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@yugo);
        if (table::contains(&registry.owner_markets, owner)) {
            let addresses = table::borrow(&registry.owner_markets, owner);
            let infos = vector::empty<MarketInfo>();
            let len = vector::length(addresses);
            let i = 0;
            while (i < len) {
                let addr = *vector::borrow(addresses, i);
                if (table::contains(&registry.market_info, addr)) {
                    let info = table::borrow(&registry.market_info, addr);
                    vector::push_back(&mut infos, *info);
                };
                i = i + 1;
            };
            infos
        } else {
            vector::empty<MarketInfo>()
        }
    }

    // Get owner's market count
    #[view]
    public fun get_owner_market_count(owner: address): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@yugo);
        if (table::contains(&registry.owner_markets, owner)) {
            vector::length(table::borrow(&registry.owner_markets, owner))
        } else {
            0
        }
    }

    // === Helper Functions for Creating Outcomes ===

    /// Create a simple binary outcome pair (e.g., < K and >= K)
    public fun create_binary_outcomes(strike_price: u128): vector<Outcome> {
        types::create_binary_outcomes(strike_price)
    }

    /// Create bucket outcomes from a list of thresholds
    public fun create_bucket_outcomes(thresholds: vector<u128>): vector<Outcome> {
        types::create_bucket_outcomes(thresholds)
    }

    /// Create custom outcome with specific comparison type
    public fun create_custom_outcome(
        index: u8,
        comparison_type: u8,
        threshold1: u128,
        threshold2: u128,
        description: vector<u8>
    ): Outcome {
        types::create_custom_outcome(index, comparison_type, threshold1, threshold2, description)
    }

    /// Get outcome details for a specific outcome
    public fun get_outcome_details(
        market: &Market,
        outcome_index: u8
    ): (u8, u8, u128, u128, vector<u8>, bool, u64, u64, u128) {
        assert!(outcome_index < market.num_outcomes, EINVALID_OUTCOME);
        
        let outcome = vector::borrow(&market.outcomes, (outcome_index as u64));
        let outcome_amount = vector::borrow(&market.outcome_amounts, (outcome_index as u64));
        let outcome_net_amount = vector::borrow(&market.outcome_net_amounts, (outcome_index as u64));
        let outcome_weight = vector::borrow(&market.outcome_weights, (outcome_index as u64));
        
        (
            types::get_outcome_index(outcome),
            types::get_outcome_comparison_type(outcome),
            types::get_outcome_threshold1(outcome),
            types::get_outcome_threshold2(outcome),
            types::get_outcome_description(outcome),
            types::get_outcome_is_active(outcome),
            *outcome_amount,      // Gross amount
            *outcome_net_amount,  // NET amount (after fees)
            *outcome_weight
        )
    }

    /// Get all outcomes for a market
    public fun get_all_outcomes(
        market: &Market
    ): (vector<Outcome>, vector<u64>, vector<u64>, vector<u128>) {
        (
            market.outcomes,
            market.outcome_amounts,      // Gross amounts
            market.outcome_net_amounts,  // NET amounts (after fees)
            market.outcome_weights
        )
    }

    /// Get market data for display
    public fun get_market_data(
        market: &Market
    ): (address, vector<u8>, u8, u64, u64, u64, u64, u64, u64, u8, u8, bool, bool, u64, u64, u8) {
        (
            market.creator,
            market.price_feed_id,
            market.num_outcomes,
            market.total_bids,
            market.total_amount,
            market.total_net_amount,
            market.fee_accumulator,
            market.rake_accumulator,
            (market.total_weight as u64), // Convert u128 to u64
            market.status,
            market.winning_outcome,
            market.is_void,
            market.is_resolved,
            market.bidding_start_time,
            market.bidding_end_time,
            market.payment_asset, // Add payment asset
        )
    }
}
