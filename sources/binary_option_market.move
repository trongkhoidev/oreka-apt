module yugo::binary_option_market {
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

    // Pyth imports
    use pyth::pyth;
    use pyth::price_identifier;

    // Local imports
    use yugo::types::{Self, MarketType, PriceRange, MarketOutcome};

    /// The bid placed by a user (supports both binary and multi-outcome markets)
    struct Bid has store, copy, drop {
        // For binary markets (backward compatibility)
        long_amount: u64,
        short_amount: u64,
        // For multi-outcome markets
        outcome_amounts: vector<u64>,
        market_type: MarketType,
    }

    /// Market information for listing (supports both binary and multi-outcome markets)
    struct MarketInfo has store, copy, drop {
        market_address: address,
        owner: address,
        price_feed_id: vector<u8>,
        market_type: MarketType,
        // For binary markets
        strike_price: u64,
        // For multi-outcome markets
        price_ranges: vector<PriceRange>,
        outcomes: vector<MarketOutcome>,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
        // Bonus info
        bonus_injected: u64,
        bonus_locked: bool,
        is_no_winner: bool,
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
        bid_events: EventHandle<BidEvent>,
        resolve_events: EventHandle<ResolveEvent>,
        claim_events: EventHandle<ClaimEvent>,
        withdraw_fee_events: EventHandle<WithdrawFeeEvent>,
    }

    /// A resource that represents a market (supports both binary and multi-outcome).
    /// This is the main resource that holds all the market data.
    struct Market has key, store {
        /// The creator of the market.
        creator: address,
        /// The price feed id (vector<u8>) for the asset pair, e.g. BTC/USD
        price_feed_id: vector<u8>,
        /// Market type (binary or multi-outcome)
        market_type: MarketType,
        /// Strike price of the option (for binary markets).
        strike_price: u64,
        /// Price ranges for multi-outcome markets
        price_ranges: vector<PriceRange>,
        /// Market outcomes for multi-outcome markets
        outcomes: vector<MarketOutcome>,
        /// Fee percentage for the market.
        fee_percentage: u64,
        /// Total number of bids.
        total_bids: u64,
        /// Number of "LONG" bids (for binary markets).
        long_bids: u64,
        /// Number of "SHORT" bids (for binary markets).
        short_bids: u64,
        /// Total amount of Aptos Coin deposited in the market.
        total_amount: u64,
        /// Total amount for "LONG" bids (for binary markets).
        long_amount: u64,
        /// Total amount for "SHORT" bids (for binary markets).
        short_amount: u64,
        /// Total amounts per outcome (for multi-outcome markets)
        outcome_amounts: vector<u64>,
        /// Number of bids per outcome (for multi-outcome markets)
        outcome_bids: vector<u64>,
        /// Table storing bids from users. Maps bidder's address to their Bid struct.
        bids: table::Table<address, Bid>,
        /// The resolution result of the market. 
        /// For binary: 0 for LONG win, 1 for SHORT win, 2 for unresolved.
        /// For multi-outcome: outcome index, 255 for unresolved.
        result: u8,
        /// Flag indicating if the market has been resolved.
        is_resolved: bool,
        /// The timestamp when the bidding phase starts.
        bidding_start_time: u64,
        /// The timestamp when the bidding phase ends.
        bidding_end_time: u64,
        /// The timestamp when the market matures.
        maturity_time: u64,
        /// The timestamp when the market was created.
        created_at: u64,
        /// The final price of the market.
        final_price: u64,
        fee_withdrawn: bool,
        coin_vault: Coin<AptosCoin>,
        /// Vault to hold fees and dust for owner withdrawal
        fee_vault: Coin<AptosCoin>,
        /// Vault for injected bonus funds (from Global Pool)
        bonus_vault: Coin<AptosCoin>,
        /// Total injected bonus amount
        bonus_injected: u64,
        /// Whether bonus is locked (after bidding_end_time / at resolve)
        bonus_locked: bool,
        /// True when there is no winner (W == 0)
        is_no_winner: bool,
        /// Fee computed at resolve on user pool P
        fee_at_resolve: u64,
        /// Table to track users who have claimed their reward
        claimed_users: table::Table<address, bool>,
    }

    // Event definitions
    #[event]
    struct MarketCreatedEvent has drop, store {
        creator: address,
        market_address: address,
        price_feed_id: vector<u8>,
        market_type: MarketType,
        strike_price: u64, // For binary markets
        price_ranges: vector<PriceRange>, // For multi-outcome markets
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
        bonus_injected: u64,
        bonus_locked: bool,
        is_no_winner: bool,
    }

    #[event]
    struct BidEvent has drop, store {
        user: address,
        prediction: bool, // For binary markets (true = LONG, false = SHORT)
        outcome_index: u8, // For multi-outcome markets
        amount: u64,
        market_address: address,
        timestamp_bid: u64,
    }

    #[event]
    struct ResolveEvent has drop, store {
        resolver: address,
        final_price: u64,
        result: u8,
    }

    #[event]
    struct ClaimEvent has drop, store {
        user: address,
        amount: u64,
        won: bool,
    }

    #[event]
    struct WithdrawFeeEvent has drop, store {
        owner: address,
        amount: u64,
    }

    // === Errors ===
    const ENOT_OWNER: u64 = 102;
    const EMARKET_RESOLVED: u64 = 103;
    const ENOT_IN_BIDDING_PHASE: u64 = 104;
    const EMARKET_NOT_RESOLVED: u64 = 105;
    const ENO_BID_FOUND: u64 = 106;
    const EALREADY_CLAIMED: u64 = 108;
    const EINSUFFICIENT_AMOUNT: u64 = 109;
    const EMARKET_REGISTRY_NOT_INITIALIZED: u64 = 110;

    const PHASE_PENDING: u8 = 0;
    const PHASE_BIDDING: u8 = 1;
    const PHASE_MATURITY: u8 = 2;

    // === Admin Injection Bridge ===
    public entry fun admin_inject_to_market(admin: &signer, market_addr: address, amount: u64) acquires Market {
        let market = borrow_global_mut<Market>(market_addr);
        let now = timestamp::now_seconds();
        assert!(now < market.bidding_end_time && !market.bonus_locked, 8101);
        assert!(signer::address_of(admin) == market.creator, 8102);
        
        let coins = yugo::global_pool::extract_for_injection(market.creator, market_addr, amount);
        coin::merge(&mut market.bonus_vault, coins);
        market.bonus_injected = market.bonus_injected + amount;
    }

    public entry fun admin_cancel_injection(admin: &signer, market_addr: address, amount: u64) acquires Market {
        let market = borrow_global_mut<Market>(market_addr);
        let now = timestamp::now_seconds();
        assert!(now < market.bidding_end_time && !market.bonus_locked, 8103);
        assert!(signer::address_of(admin) == market.creator, 8104);
        assert!(market.bonus_injected >= amount, 8105);
        
        market.bonus_injected = market.bonus_injected - amount;
        let refund = coin::extract(&mut market.bonus_vault, amount);
        yugo::global_pool::return_cancelled_injection(market.creator, market_addr, amount, refund);
    }

    // === Test-only resolve helper (bypasses oracle) ===
    #[test_only]
    public entry fun test_resolve_market_with_price(
        caller: &signer,
        market_addr: address,
        final_price: u64
    ) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        let now = timestamp::now_seconds();
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(now >= market.maturity_time, EMARKET_NOT_RESOLVED);

        // define the outcome based on market type
        let result = if (types::is_binary_market(&market.market_type)) {
            if (final_price >= market.strike_price) { 0 } else { 1 }
        } else {
            // For multi-outcome markets, find winning outcome
            types::find_winning_outcome(final_price, &market.outcomes)
        };

        // Compute fee on user pool P (exclude injection)
        let user_pool = market.total_amount; // user pool only
        let fee = (market.fee_percentage * user_pool) / 1000;
        market.fee_at_resolve = fee;

        // Determine winner pool W
        let winner_pool = if (types::is_binary_market(&market.market_type)) {
            if (result == 0) { market.long_amount } else if (result == 1) { market.short_amount } else { 0 }
        } else {
            if ((result as u64) < vector::length(&market.outcome_amounts)) { *vector::borrow(&market.outcome_amounts, (result as u64)) } else { 0 }
        };

        // Lock injection
        market.bonus_locked = true;
        yugo::global_pool::emit_injection_locked(market.creator, market_addr, market.bonus_injected);

        // No-winner route to global pool
        if (winner_pool == 0) {
            market.is_no_winner = true;
            // route leftover user (P - fee) and refund injection to global pool
            let leftover = coin::extract(&mut market.coin_vault, user_pool - fee);
            let refund = coin::extract(&mut market.bonus_vault, market.bonus_injected);
            yugo::global_pool::deposit_from_market(market.creator, market_addr, leftover, refund, fee);
            market.result = result;
            market.is_resolved = true;
            market.final_price = final_price;
            return;
        };

        // Winner exists
        market.is_no_winner = false;
        market.result = result;
        market.is_resolved = true;
        market.final_price = final_price;

        // Emit ResolveEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.resolve_events, ResolveEvent {
            resolver: signer::address_of(caller),
            final_price,
            result,
        });
    }

    // === Helper Functions for Bid Creation ===

    /// Create a bid for binary market
    public fun create_binary_bid(long_amount: u64, short_amount: u64): Bid {
        Bid {
            long_amount,
            short_amount,
            outcome_amounts: vector::empty<u64>(),
            market_type: types::create_binary_market_type(),
        }
    }

    /// Create a bid for multi-outcome market
    public fun create_multi_outcome_bid(outcome_amounts: vector<u64>): Bid {
        Bid {
            long_amount: 0,
            short_amount: 0,
            outcome_amounts,
            market_type: types::create_multi_outcome_market_type(),
        }
    }

    /// Get amount for specific outcome in multi-outcome market
    public fun get_outcome_amount(bid: &Bid, outcome_index: u8): u64 {
        if (types::is_binary_market(&bid.market_type)) {
            if (outcome_index == 0) {
                bid.long_amount
            } else if (outcome_index == 1) {
                bid.short_amount
            } else {
                0
            }
        } else {
            if ((outcome_index as u64) < vector::length(&bid.outcome_amounts)) {
                *vector::borrow(&bid.outcome_amounts, (outcome_index as u64))
            } else {
                0
            }
        }
    }

    /// Set amount for specific outcome in multi-outcome market
    public fun set_outcome_amount(bid: &mut Bid, outcome_index: u8, amount: u64) {
        if (types::is_binary_market(&bid.market_type)) {
            if (outcome_index == 0) {
                bid.long_amount = amount
            } else if (outcome_index == 1) {
                bid.short_amount = amount
            }
        } else {
            // Ensure vector is large enough
            while (vector::length(&bid.outcome_amounts) <= (outcome_index as u64)) {
                vector::push_back(&mut bid.outcome_amounts, 0)
            };
            *vector::borrow_mut(&mut bid.outcome_amounts, (outcome_index as u64)) = amount
        }
    }

    /// Initialize the global market registry - called once by module publisher
    public entry fun initialize_market_registry(account: &signer) {
        move_to(account, MarketRegistry {
            all_markets: vector::empty<address>(),
            market_info: table::new(),
            owner_markets: table::new(),
            market_created_events: account::new_event_handle<MarketCreatedEvent>(account),
            bid_events: account::new_event_handle<BidEvent>(account),
            resolve_events: account::new_event_handle<ResolveEvent>(account),
            claim_events: account::new_event_handle<ClaimEvent>(account),
            withdraw_fee_events: account::new_event_handle<WithdrawFeeEvent>(account),
        });
    }

    /// Create a new binary option market (backward compatibility)
    public entry fun create_market(
        creator: &signer,
        price_feed_id: vector<u8>,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64
    ) acquires MarketRegistry {
        create_binary_market(
            creator,
            price_feed_id,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time
        )
    }

    /// Create a new binary option market
    public entry fun create_binary_market(
        creator: &signer,
        price_feed_id: vector<u8>,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64
    ) acquires MarketRegistry {
        assert!(bidding_end_time < maturity_time, 1001);
        let current_time = timestamp::now_seconds();
        
        // Create market object
        let constructor_ref = object::create_object(signer::address_of(creator));
        let object_signer = object::generate_signer(&constructor_ref);
        
        let market = Market {
            creator: signer::address_of(creator),
            price_feed_id,
            market_type: types::create_binary_market_type(),
            strike_price,
            price_ranges: vector::empty<PriceRange>(),
            outcomes: vector::empty<MarketOutcome>(),
            fee_percentage,
            total_bids: 0,
            long_bids: 0,
            short_bids: 0,
            total_amount: 0,
            long_amount: 0,
            short_amount: 0,
            outcome_amounts: vector::empty<u64>(),
            outcome_bids: vector::empty<u64>(),
            bids: table::new(),
            result: 2, // unresolved
            is_resolved: false,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            created_at: current_time,
            final_price: 0,
            fee_withdrawn: false,
            coin_vault: coin::zero<AptosCoin>(),
            fee_vault: coin::zero<AptosCoin>(),
            bonus_vault: coin::zero<AptosCoin>(),
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
            fee_at_resolve: 0,
            claimed_users: table::new(),
        };
        
        move_to(&object_signer, market);
        
        let market_obj = object::object_from_constructor_ref<Market>(&constructor_ref);
        let market_address = object::object_address(&market_obj);
        
        // Add to market registry
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        vector::push_back(&mut registry.all_markets, market_address);
        
        let info = MarketInfo {
            market_address,
            owner: signer::address_of(creator),
            price_feed_id,
            market_type: types::create_binary_market_type(),
            strike_price,
            price_ranges: vector::empty<PriceRange>(),
            outcomes: vector::empty<MarketOutcome>(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
        };
        table::add(&mut registry.market_info, market_address, info);
        
        // Add to owner's markets
        if (table::contains(&registry.owner_markets, signer::address_of(creator))) {
            let owner_markets = table::borrow_mut(&mut registry.owner_markets, signer::address_of(creator));
            vector::push_back(owner_markets, market_address);
        } else {
            let new_owner_markets = vector::empty<address>();
            vector::push_back(&mut new_owner_markets, market_address);
            table::add(&mut registry.owner_markets, signer::address_of(creator), new_owner_markets);
        };

        // Emit MarketCreatedEvent
        event::emit_event(&mut registry.market_created_events, MarketCreatedEvent {
            creator: signer::address_of(creator),
            market_address,
            price_feed_id,
            market_type: types::create_binary_market_type(),
            strike_price,
            price_ranges: vector::empty<PriceRange>(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
        });
    }

    /// Create a new multi-outcome market
    public fun create_multi_outcome_market(
        creator: &signer,
        price_feed_id: vector<u8>,
        price_ranges: vector<PriceRange>,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64
    ) acquires MarketRegistry {
        assert!(bidding_end_time < maturity_time, 1001);
        assert!(vector::length(&price_ranges) >= 2, 1002); // At least 2 outcomes
        let current_time = timestamp::now_seconds();
        
        // Validate price ranges (non-overlapping, sorted, and properly formatted)
        assert!(types::validate_price_ranges(&price_ranges), 1003); // Invalid price ranges
        
        // Create outcomes
        let outcomes = vector::empty<MarketOutcome>();
        let outcome_amounts = vector::empty<u64>();
        let outcome_bids = vector::empty<u64>();
        let num_outcomes = vector::length(&price_ranges);
        let i = 0;
        while (i < num_outcomes) {
            let range = *vector::borrow(&price_ranges, i);
            let outcome = types::create_market_outcome(i as u8, range);
            vector::push_back(&mut outcomes, outcome);
            vector::push_back(&mut outcome_amounts, 0);
            vector::push_back(&mut outcome_bids, 0);
            i = i + 1;
        };
        
        // Create market object
        let constructor_ref = object::create_object(signer::address_of(creator));
        let object_signer = object::generate_signer(&constructor_ref);
        
        let market = Market {
            creator: signer::address_of(creator),
            price_feed_id,
            market_type: types::create_multi_outcome_market_type(),
            strike_price: 0, // Not used for multi-outcome
            price_ranges,
            outcomes,
            fee_percentage,
            total_bids: 0,
            long_bids: 0,
            short_bids: 0,
            total_amount: 0,
            long_amount: 0,
            short_amount: 0,
            outcome_amounts,
            outcome_bids,
            bids: table::new(),
            result: 255, // unresolved (255 for multi-outcome)
            is_resolved: false,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            created_at: current_time,
            final_price: 0,
            fee_withdrawn: false,
            coin_vault: coin::zero<AptosCoin>(),
            fee_vault: coin::zero<AptosCoin>(),
            bonus_vault: coin::zero<AptosCoin>(),
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
            fee_at_resolve: 0,
            claimed_users: table::new(),
        };
        
        move_to(&object_signer, market);
        
        let market_obj = object::object_from_constructor_ref<Market>(&constructor_ref);
        let market_address = object::object_address(&market_obj);
        
        // Add to market registry
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        vector::push_back(&mut registry.all_markets, market_address);
        
        let info = MarketInfo {
            market_address,
            owner: signer::address_of(creator),
            price_feed_id,
            market_type: types::create_multi_outcome_market_type(),
            strike_price: 0,
            price_ranges: vector::empty<PriceRange>(),
            outcomes: vector::empty<MarketOutcome>(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
        };
        table::add(&mut registry.market_info, market_address, info);
        
        // Add to owner's markets
        if (table::contains(&registry.owner_markets, signer::address_of(creator))) {
            let owner_markets = table::borrow_mut(&mut registry.owner_markets, signer::address_of(creator));
            vector::push_back(owner_markets, market_address);
        } else {
            let new_owner_markets = vector::empty<address>();
            vector::push_back(&mut new_owner_markets, market_address);
            table::add(&mut registry.owner_markets, signer::address_of(creator), new_owner_markets);
        };

        // Emit MarketCreatedEvent
        event::emit_event(&mut registry.market_created_events, MarketCreatedEvent {
            creator: signer::address_of(creator),
            market_address,
            price_feed_id,
            market_type: types::create_multi_outcome_market_type(),
            strike_price: 0,
            price_ranges: vector::empty<PriceRange>(),
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            bonus_injected: 0,
            bonus_locked: false,
            is_no_winner: false,
        });
    }

    /// Get the current phase of the market.
    public fun get_phase(market_obj: Object<Market>): u8 acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        let now = timestamp::now_seconds();
        if (now < market.bidding_start_time) {
            PHASE_PENDING
        } else if (now >= market.bidding_start_time && now < market.bidding_end_time) {
            PHASE_BIDDING
        } else {
            PHASE_MATURITY
        }
    }

    /// Allows a user to place a bid on a binary market (backward compatibility)
    public entry fun bid(owner: &signer, market_addr: address, prediction: bool, amount: u64, timestamp_bid: u64) acquires Market, MarketRegistry {
        bid_binary(owner, market_addr, prediction, amount, timestamp_bid)
    }

    /// Allows a user to place a bid on a binary market
    public entry fun bid_binary(owner: &signer, market_addr: address, prediction: bool, amount: u64, timestamp_bid: u64) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        
        let now = timestamp::now_seconds();
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(now >= market.bidding_start_time && now < market.bidding_end_time, ENOT_IN_BIDDING_PHASE);
        assert!(amount > 0, EINSUFFICIENT_AMOUNT);
        
        let bidder_address = signer::address_of(owner);
        // Transfer coins from user to market vault
        let coins = coin::withdraw<AptosCoin>(owner, amount);
        coin::merge(&mut market.coin_vault, coins);
        
        let user_bid;
        if (table::contains(&market.bids, bidder_address)) {
            user_bid = table::remove(&mut market.bids, bidder_address);
        } else {
            user_bid = create_binary_bid(0, 0);
        };
        
        let new_user_bid = if (prediction) {
            market.long_bids = market.long_bids + 1;
            market.long_amount = market.long_amount + amount;
            create_binary_bid(
                user_bid.long_amount + amount,
                user_bid.short_amount
            )
        } else {
            market.short_bids = market.short_bids + 1;
            market.short_amount = market.short_amount + amount;
            create_binary_bid(
                user_bid.long_amount,
                user_bid.short_amount + amount
            )
        };
        
        market.total_bids = market.total_bids + 1;
        market.total_amount = market.total_amount + amount;
        table::add(&mut market.bids, bidder_address, new_user_bid);

        // Emit BidEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.bid_events, BidEvent {
            user: bidder_address,
            prediction,
            outcome_index: 0, // Not used for binary markets
            amount,
            market_address: market_addr,
            timestamp_bid,
        });
    }

    /// Allows a user to place a bid on a multi-outcome market
    public entry fun bid_multi_outcome(
        owner: &signer, 
        market_addr: address, 
        outcome_index: u8, 
        amount: u64, 
        timestamp_bid: u64
    ) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        
        let now = timestamp::now_seconds();
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(now >= market.bidding_start_time && now < market.bidding_end_time, ENOT_IN_BIDDING_PHASE);
        assert!(amount > 0, EINSUFFICIENT_AMOUNT);
        assert!(!types::is_binary_market(&market.market_type), 1004); // Must be multi-outcome market
        assert!((outcome_index as u64) < vector::length(&market.outcomes), 1005); // Valid outcome index
        
        let bidder_address = signer::address_of(owner);
        // Transfer coins from user to market vault
        let coins = coin::withdraw<AptosCoin>(owner, amount);
        coin::merge(&mut market.coin_vault, coins);
        
        let user_bid;
        if (table::contains(&market.bids, bidder_address)) {
            user_bid = table::remove(&mut market.bids, bidder_address);
        } else {
            user_bid = create_multi_outcome_bid(vector::empty<u64>());
        };
        
        // Update outcome amounts
        let current_amount = get_outcome_amount(&user_bid, outcome_index);
        set_outcome_amount(&mut user_bid, outcome_index, current_amount + amount);
        
        // Update market statistics
        let current_outcome_amount = *vector::borrow(&market.outcome_amounts, (outcome_index as u64));
        *vector::borrow_mut(&mut market.outcome_amounts, (outcome_index as u64)) = current_outcome_amount + amount;
        
        let current_outcome_bids = *vector::borrow(&market.outcome_bids, (outcome_index as u64));
        *vector::borrow_mut(&mut market.outcome_bids, (outcome_index as u64)) = current_outcome_bids + 1;
        
        market.total_bids = market.total_bids + 1;
        market.total_amount = market.total_amount + amount;
        table::add(&mut market.bids, bidder_address, user_bid);

        // Emit BidEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.bid_events, BidEvent {
            user: bidder_address,
            prediction: false, // Not used for multi-outcome
            outcome_index,
            amount,
            market_address: market_addr,
            timestamp_bid,
        });
    }

    /// Resolves the market using Pyth oracle. Can be called by anyone after maturity_time, only once.
    /// pyth_price_update: lấy từ off-chain (Hermes), truyền vào để cập nhật giá mới nhất.
    public entry fun resolve_market(
        caller: &signer, 
        market_addr: address, 
        pyth_price_update: vector<vector<u8>>
    ) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);

        let now = timestamp::now_seconds();
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(now >= market.maturity_time, EMARKET_NOT_RESOLVED);

        // Update Pyth price feeds on-chain
        let coins = coin::withdraw<AptosCoin>(caller, pyth::get_update_fee(&pyth_price_update));
        pyth::update_price_feeds(pyth_price_update, coins);

        // get price_feed_id from pyth_price_update
        let price_id = price_identifier::from_byte_vec(market.price_feed_id);
        let price_struct = pyth::get_price(price_id);
        let final_price = yugo::pyth_price_adapter::unwrap_i64(pyth::price::get_price(&price_struct));

        // define the outcome based on market type
        let result = if (types::is_binary_market(&market.market_type)) {
            if (final_price >= market.strike_price) { 0 } else { 1 }
        } else {
            // For multi-outcome markets, find winning outcome
            types::find_winning_outcome(final_price, &market.outcomes)
        };

        // Compute fee on user pool P (exclude injection)
        let user_pool = market.total_amount; // user pool only
        let fee = (market.fee_percentage * user_pool) / 1000;
        market.fee_at_resolve = fee;

        // Determine winner pool W
        let winner_pool = if (types::is_binary_market(&market.market_type)) {
            if (result == 0) { market.long_amount } else if (result == 1) { market.short_amount } else { 0 }
        } else {
            if ((result as u64) < vector::length(&market.outcome_amounts)) { *vector::borrow(&market.outcome_amounts, (result as u64)) } else { 0 }
        };

        // Lock injection
        market.bonus_locked = true;
        yugo::global_pool::emit_injection_locked(market.creator, market_addr, market.bonus_injected);

        // No-winner route to global pool
        if (winner_pool == 0) {
            market.is_no_winner = true;
            // route leftover user (P - fee) and refund injection to global pool
            let leftover = coin::extract(&mut market.coin_vault, user_pool - fee);
            let refund = coin::extract(&mut market.bonus_vault, market.bonus_injected);
            yugo::global_pool::deposit_from_market(market.creator, market_addr, leftover, refund, fee);
            market.result = result;
            market.is_resolved = true;
            market.final_price = final_price;
            return;
        };

        // Winner exists
        market.is_no_winner = false;
        market.result = result;
        market.is_resolved = true;
        market.final_price = final_price;

        // Consume injection I from global pool accounting
        if (market.bonus_injected > 0) {
            yugo::global_pool::consume_injection(market.creator, market_addr, market.bonus_injected);
        };

        // Emit ResolveEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.resolve_events, ResolveEvent {
            resolver: signer::address_of(caller),
            final_price,
            result,
        });
    }

    /// Allows a user to claim their winnings or refund (backward compatibility)
    public entry fun claim(owner: &signer, market_addr: address) acquires Market, MarketRegistry {
        let market = borrow_global<Market>(market_addr);
        if (types::is_binary_market(&market.market_type)) {
            claim_binary(owner, market_addr)
        } else {
            claim_multi_outcome(owner, market_addr)
        }
    }

    /// Allows a user to claim their winnings or refund for binary market
    public entry fun claim_binary(owner: &signer, market_addr: address) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        
        let _now = timestamp::now_seconds();
        assert!(market.is_resolved, EMARKET_NOT_RESOLVED);
        let bidder_address = signer::address_of(owner);
        assert!(table::contains(&market.bids, bidder_address), ENO_BID_FOUND);

        // Prevent double claim
        if (table::contains(&market.claimed_users, bidder_address)) {
            abort EALREADY_CLAIMED;
        };

        let user_bid = table::remove(&mut market.bids, bidder_address);

        // If no-winner, abort claim
        assert!(!market.is_no_winner, EMARKET_NOT_RESOLVED);

        let (raw_amount, won) = if (market.result == 0 && user_bid.long_amount > 0) {
            let winner_pool = market.long_amount;
            let loser_pool = market.short_amount;
            let injection = market.bonus_injected;
            let distributable = loser_pool + injection;
            (
                user_bid.long_amount + (user_bid.long_amount * distributable) / winner_pool,
                true
            )
        } else if (market.result == 1 && user_bid.short_amount > 0) {
            let winner_pool = market.short_amount;
            let loser_pool = market.long_amount;
            let injection = market.bonus_injected;
            let distributable = loser_pool + injection;
            (
                user_bid.short_amount + (user_bid.short_amount * distributable) / winner_pool,
                true
            )
        } else {
            (0, false)
        };

        assert!(raw_amount > 0, EALREADY_CLAIMED);

        // Calculate fee and claim amount
        // No second fee on claim. Fee charged at resolve on P only.
        let claim_amount = raw_amount;

        // Transfer coins from market vault to user. Dust (if any leftover from floors across all claims)
        // will remain in vault and later be swept to fee_vault by owner.
        let payout = coin::extract(&mut market.coin_vault, claim_amount);
        coin::deposit(bidder_address, payout);

        // Mark user as claimed
        table::add(&mut market.claimed_users, bidder_address, true);

        // Emit ClaimEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.claim_events, ClaimEvent {
            user: bidder_address,
            amount: claim_amount,
            won,
        });
    }

    /// Allows a user to claim their winnings or refund for multi-outcome market
    public entry fun claim_multi_outcome(owner: &signer, market_addr: address) acquires Market, MarketRegistry {
        let market = borrow_global_mut<Market>(market_addr);
        
        let _now = timestamp::now_seconds();
        assert!(market.is_resolved, EMARKET_NOT_RESOLVED);
        let bidder_address = signer::address_of(owner);
        assert!(table::contains(&market.bids, bidder_address), ENO_BID_FOUND);

        // Prevent double claim
        if (table::contains(&market.claimed_users, bidder_address)) {
            abort EALREADY_CLAIMED;
        };

        let user_bid = table::remove(&mut market.bids, bidder_address);
        let winning_outcome = market.result;
        
        // Check if user has bid on winning outcome
        let user_amount = get_outcome_amount(&user_bid, winning_outcome);
        // If no-winner, abort claim
        assert!(!market.is_no_winner, EMARKET_NOT_RESOLVED);

        let (raw_amount, won) = if (user_amount > 0) {
            let winner_pool = *vector::borrow(&market.outcome_amounts, (winning_outcome as u64));
            let user_pool = market.total_amount;
            let loser_pool = user_pool - winner_pool;
            let injection = market.bonus_injected;
            let distributable = loser_pool + injection;
            (
                user_amount + (user_amount * distributable) / winner_pool,
                true
            )
        } else {
            (0, false)
        };

        assert!(raw_amount > 0, EALREADY_CLAIMED);

        // Calculate fee and claim amount
        let claim_amount = raw_amount;

        // Transfer coins from market vault to user. Dust stays and will be swept to fee_vault.
        let payout = coin::extract(&mut market.coin_vault, claim_amount);
        coin::deposit(bidder_address, payout);

        // Mark user as claimed
        table::add(&mut market.claimed_users, bidder_address, true);

        // Emit ClaimEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.claim_events, ClaimEvent {
            user: bidder_address,
            amount: claim_amount,
            won,
        });
    }

    /// Allows the owner to withdraw the fee after the market is resolved.
    public entry fun withdraw_fee(owner: &signer, market_obj: Object<Market>) acquires Market, MarketRegistry {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global_mut<Market>(market_address);
        
        let _now = timestamp::now_seconds();
        assert!(market.creator == signer::address_of(owner), ENOT_OWNER);
        assert!(market.is_resolved, EMARKET_NOT_RESOLVED);
        assert!(!market.fee_withdrawn, EALREADY_CLAIMED);

        // Use fee_at_resolve (frozen at resolve), do not recompute on mutated totals
        let fee = market.fee_at_resolve;

        // Sweep any remaining dust from coin_vault to fee_vault before payout
        let coin_vault_value = coin::value(&market.coin_vault);
        if (coin_vault_value > 0) {
            let dust = coin::extract(&mut market.coin_vault, coin_vault_value);
            coin::merge(&mut market.fee_vault, dust);
        };

        // Transfer fee coins from fee_vault to owner
        let payout = coin::extract(&mut market.fee_vault, fee);
        coin::deposit(signer::address_of(owner), payout);
        market.fee_withdrawn = true;

        // Emit WithdrawFeeEvent
        let registry = borrow_global_mut<MarketRegistry>(@yugo);
        event::emit_event(&mut registry.withdraw_fee_events, WithdrawFeeEvent {
            owner: signer::address_of(owner),
            amount: fee,
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

    /// Get details of the market.
    public fun get_market_details(market_obj: Object<Market>): (
        address,
        std::string::String, // price_feed_id_hex
        MarketType, // market_type
        u64, // strike_price
        vector<PriceRange>, // price_ranges
        u64, // fee_percentage
        u64, // total_bids
        u64, // long_bids
        u64, // short_bids
        u64, // total_amount
        u64, // long_amount
        u64, // short_amount
        vector<u64>, // outcome_amounts
        u8,  // result
        bool, // is_resolved
        u64, // bidding_start_time
        u64, // bidding_end_time
        u64, // maturity_time
        u64, // final_price
        u64, // bonus_injected
        bool, // bonus_locked
        bool  // is_no_winner
    ) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        (
            market.creator,
            vector_u8_to_hex(market.price_feed_id),
            market.market_type,
            market.strike_price,
            market.price_ranges,
            market.fee_percentage,
            market.total_bids,
            market.long_bids,
            market.short_bids,
            market.total_amount,
            market.long_amount,
            market.short_amount,
            market.outcome_amounts,
            market.result,
            market.is_resolved,
            market.bidding_start_time,
            market.bidding_end_time,
            market.maturity_time,
            market.final_price,
            market.bonus_injected,
            market.bonus_locked,
            market.is_no_winner
        )
    }

    // Get the bid for a specific user (view, by address).
    #[view]
    public fun get_user_position(user: address, market_addr: address): (u64, u64) acquires Market {
        let market = borrow_global<Market>(market_addr);
        if (table::contains(&market.bids, user)) {
            let user_bid = table::borrow(&market.bids, user);
            (user_bid.long_amount, user_bid.short_amount)
        } else {
            (0, 0)
        }
    }

    // Get the bid for a specific user in multi-outcome market (view, by address).
    #[view]
    public fun get_user_multi_outcome_position(user: address, market_addr: address): vector<u64> acquires Market {
        let market = borrow_global<Market>(market_addr);
        if (table::contains(&market.bids, user)) {
            let user_bid = table::borrow(&market.bids, user);
            user_bid.outcome_amounts
        } else {
            vector::empty<u64>()
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

    /// Get market address from MarketInfo
    public fun get_market_address(info: &MarketInfo): address {
        info.market_address
    }

    /// Get is_no_winner from MarketInfo
    public fun get_is_no_winner(info: &MarketInfo): bool {
        info.is_no_winner
    }

    /// Get bonus_locked from MarketInfo
    public fun get_bonus_locked(info: &MarketInfo): bool {
        info.bonus_locked
    }

    /// Get bonus_injected from MarketInfo
    public fun get_bonus_injected(info: &MarketInfo): u64 {
        info.bonus_injected
    }
}
