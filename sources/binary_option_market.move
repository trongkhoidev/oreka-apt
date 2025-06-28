module yugo::binary_option_market {
    friend yugo::factory;

    use std::signer;
    use std::string::String;
    use std::table;
    use aptos_framework::object;
    use aptos_framework::object::Object;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    /// The bid placed by a user.
    struct Bid has store, copy, drop {
        long_amount: u64,
        short_amount: u64,
    }

    /// A resource that represents a binary option market.
    /// This is the main resource that holds all the market data.
    struct Market has key, store {
        /// The creator of the market.
        creator: address,
        /// The name of the trading pair (e.g., "BTC/USD").
        pair_name: String,
        /// Strike price of the option.
        strike_price: u64,
        /// Fee percentage for the market.
        fee_percentage: u64,
        /// Total number of bids.
        total_bids: u64,
        /// Number of "LONG" bids.
        long_bids: u64,
        /// Number of "SHORT" bids.
        short_bids: u64,
        /// Total amount of Aptos Coin deposited in the market.
        total_amount: u64,
        /// Total amount for "LONG" bids.
        long_amount: u64,
        /// Total amount for "SHORT" bids.
        short_amount: u64,
        /// Table storing bids from users. Maps bidder's address to their Bid struct.
        bids: table::Table<address, Bid>,
        /// The resolution result of the market. 0 for LONG win, 1 for SHORT win, 2 for unresolved.
        result: u8,
        /// Flag indicating if the market has been resolved.
        is_resolved: bool,
        /// Flag indicating if the market has been canceled.
        is_canceled: bool,
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
        fee_withdrawn: bool, // new field to track if owner withdrew fee
    }

    // Event definitions
    #[event]
    struct BidEvent has drop, store {
        user: address,
        prediction: bool,
        amount: u64,
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
    #[event]
    struct CancelEvent has drop, store {
        owner: address,
    }
    #[event]
    struct InitializeEvent has drop, store {
        creator: address,
        pair_name: String,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
    }

    // === Errors ===
    const ENOT_OWNER: u64 = 102;
    const EMARKET_RESOLVED: u64 = 103;
    const ENOT_IN_BIDDING_PHASE: u64 = 104;
    const EMARKET_NOT_RESOLVED: u64 = 105;
    const ENO_BID_FOUND: u64 = 106;
    const EMARKET_CANCELED: u64 = 107;
    const EALREADY_CLAIMED: u64 = 108;
    const EINSUFFICIENT_AMOUNT: u64 = 109;

    const PHASE_PENDING: u8 = 0;
    const PHASE_BIDDING: u8 = 1;
    const PHASE_MATURITY: u8 = 2;

    /// Initializes a new binary option market as an Object.
    /// This function is intended to be called by the `factory` module.
    public fun initialize(
        creator: &signer,
        pair_name: String,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
        created_at: u64,
    ): Object<Market> {
        assert!(bidding_end_time < maturity_time, 1001); // Custom error code
        let market = Market {
            creator: signer::address_of(creator),
            pair_name: pair_name,
            strike_price,
            fee_percentage,
            total_bids: 0,
            long_bids: 0,
            short_bids: 0,
            total_amount: 0,
            long_amount: 0,
            short_amount: 0,
            bids: table::new(),
            result: 2, // unresolved
            is_resolved: false,
            is_canceled: false,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            created_at,
            final_price: 0,
            fee_withdrawn: false,
        };
        let constructor_ref = object::create_object(signer::address_of(creator));
        let object_signer = object::generate_signer(&constructor_ref);
        move_to(&object_signer, market);
        event::emit(InitializeEvent {
            creator: signer::address_of(creator),
            pair_name,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
        });
        object::object_from_constructor_ref<Market>(&constructor_ref)
    }

    /// Get the current phase of the market.
    public fun get_phase(market_obj: Object<Market>, now: u64): u8 acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        if (now < market.bidding_start_time) {
            PHASE_PENDING
        } else if (now >= market.bidding_start_time && now < market.bidding_end_time) {
            PHASE_BIDDING
        } else {
            PHASE_MATURITY
        }
    }

    /// Allows a user to place a bid on a market.
    public entry fun bid(owner: &signer, market_addr: address, prediction: bool, amount: u64, now: u64) acquires Market {
        let market = borrow_global_mut<Market>(market_addr);
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(!market.is_canceled, EMARKET_CANCELED);
        assert!(now >= market.bidding_start_time && now < market.bidding_end_time, ENOT_IN_BIDDING_PHASE);
        assert!(amount > 0, EINSUFFICIENT_AMOUNT);
        let bidder_address = signer::address_of(owner);
        let user_bid;
        if (table::contains(&market.bids, bidder_address)) {
            user_bid = table::remove(&mut market.bids, bidder_address);
        } else {
            user_bid = Bid { long_amount: 0, short_amount: 0 };
        };
        let new_user_bid = if (prediction) {
            market.long_bids = market.long_bids + 1;
            market.long_amount = market.long_amount + amount;
            Bid {
                long_amount: user_bid.long_amount + amount,
                short_amount: user_bid.short_amount
            }
        } else {
            market.short_bids = market.short_bids + 1;
            market.short_amount = market.short_amount + amount;
            Bid {
                long_amount: user_bid.long_amount,
                short_amount: user_bid.short_amount + amount
            }
        };
        market.total_bids = market.total_bids + 1;
        market.total_amount = market.total_amount + amount;
        table::add(&mut market.bids, bidder_address, new_user_bid);
        event::emit(BidEvent {
            user: bidder_address,
            prediction,
            amount,
        });
    }

    /// Resolves the market. Can be called by anyone after maturity_time, only once.
    public entry fun resolve_market(caller: &signer, market_addr: address, final_price: u64, now: u64) acquires Market {
        let market = borrow_global_mut<Market>(market_addr);
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        assert!(now >= market.maturity_time, EMARKET_NOT_RESOLVED);
        market.is_resolved = true;
        market.final_price = final_price;
        market.result = if (final_price >= market.strike_price) { 0 } else { 1 };
        event::emit(ResolveEvent {
            resolver: signer::address_of(caller),
            final_price,
            result: market.result,
        });
    }

    /// Cancels the market. Can only be called by the creator before resolution.
    public entry fun cancel_market(owner: &signer, market_obj: Object<Market>, now: u64) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global_mut<Market>(market_address);
        assert!(market.creator == signer::address_of(owner), ENOT_OWNER);
        assert!(!market.is_resolved, EMARKET_RESOLVED);
        market.is_canceled = true;
        event::emit(CancelEvent {
            owner: signer::address_of(owner),
        });
    }

    /// Allows a user to claim their winnings or refund.
    public entry fun claim(owner: &signer, market_addr: address, now: u64) acquires Market {
        let market = borrow_global_mut<Market>(market_addr);
        assert!(market.is_resolved, EMARKET_NOT_RESOLVED);
        let bidder_address = signer::address_of(owner);
        assert!(table::contains(&market.bids, bidder_address), ENO_BID_FOUND);
        let user_bid = table::remove(&mut market.bids, bidder_address);
        let (claim_amount, won) = if (market.result == 0 && user_bid.long_amount > 0) {
            let winner_pool = market.long_amount;
            let winning_pool = market.short_amount;
            (
                user_bid.long_amount + (user_bid.long_amount * winning_pool) / winner_pool,
                true
            )
        } else if (market.result == 1 && user_bid.short_amount > 0) {
            let winner_pool = market.short_amount;
            let winning_pool = market.long_amount;
            (
                user_bid.short_amount + (user_bid.short_amount * winning_pool) / winner_pool,
                true
            )
        } else {
            (0, false)
        };
        assert!(claim_amount > 0, EALREADY_CLAIMED);
        // Coin transfer logic would go here
        event::emit(ClaimEvent {
            user: bidder_address,
            amount: claim_amount,
            won,
        });
    }

    /// Allows the owner to withdraw the fee after the market is resolved.
    public entry fun withdraw_fee(owner: &signer, market_obj: Object<Market>, now: u64) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global_mut<Market>(market_address);
        assert!(market.creator == signer::address_of(owner), ENOT_OWNER);
        assert!(market.is_resolved, EMARKET_NOT_RESOLVED);
        assert!(!market.fee_withdrawn, EALREADY_CLAIMED);
        let fee = (market.fee_percentage * market.total_amount) / 1000; // fee_percentage is per-mille (e.g. 100 = 10%)
        // Coin transfer logic would go here
        market.fee_withdrawn = true;
        event::emit(WithdrawFeeEvent {
            owner: signer::address_of(owner),
            amount: fee,
        });
    }

    // === View Functions ===

    /// Get details of the market.
    public fun get_market_details(market_obj: Object<Market>): (
        address,
        String,
        u64, // strike_price
        u64, // fee_percentage
        u64, // total_bids
        u64, // long_bids
        u64, // short_bids
        u64, // total_amount
        u64, // long_amount
        u64, // short_amount
        u8,  // result
        bool, // is_resolved
        bool, // is_canceled
        u64, // bidding_start_time
        u64, // bidding_end_time
        u64, // maturity_time
        u64, // final_price
    ) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        (
            market.creator,
            market.pair_name,
            market.strike_price,
            market.fee_percentage,
            market.total_bids,
            market.long_bids,
            market.short_bids,
            market.total_amount,
            market.long_amount,
            market.short_amount,
            market.result,
            market.is_resolved,
            market.is_canceled,
            market.bidding_start_time,
            market.bidding_end_time,
            market.maturity_time,
            market.final_price
        )
    }

    /// Get the bid for a specific user.
    public fun get_user_bid(owner: &signer, market_obj: Object<Market>): (u64, bool) acquires Market {
        let market_address = object::object_address(&market_obj);
        let market = borrow_global<Market>(market_address);
        let bidder_address = signer::address_of(owner);
        if (table::contains(&market.bids, bidder_address)) {
            let user_bid = table::borrow(&market.bids, bidder_address);
            (user_bid.long_amount, true)
        } else {
            (0, false)
        }
    }
}
