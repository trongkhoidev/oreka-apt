module yugo::types {
    public struct MarketCreatedEvent has drop, store {
        market_address: address,
        trading_pair: vector<u8>,
        strike_price: u64,
        maturity_time: u64,
        creator: address,
        timestamp: u64,
    }
} 