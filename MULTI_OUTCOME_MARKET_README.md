# Multi-Outcome Market System

## Tổng quan

Hệ thống market đã được cải tiến để hỗ trợ 2 loại market:

1. **Binary Market** (LONG-SHORT): Market với 2 outcomes như trước
2. **Multi-Outcome Market**: Market với nhiều outcomes dựa trên các khoảng giá

## Cấu trúc dữ liệu mới

### MarketType
```move
struct MarketType has store, copy, drop {
    is_binary: bool,
}
```

### PriceRange
```move
struct PriceRange has store, copy, drop {
    min_price: u64,
    max_price: u64,
    outcome_name: String,
}
```

### MarketOutcome
```move
struct MarketOutcome has store, copy, drop {
    outcome_index: u8,
    price_range: PriceRange,
}
```

## Các hàm chính

### 1. Tạo Binary Market (Backward Compatibility)
```move
public entry fun create_market(
    creator: &signer,
    price_feed_id: vector<u8>,
    strike_price: u64,
    fee_percentage: u64,
    bidding_start_time: u64,
    bidding_end_time: u64,
    maturity_time: u64
)
```

### 2. Tạo Multi-Outcome Market
```move
public entry fun create_multi_outcome_market(
    creator: &signer,
    price_feed_id: vector<u8>,
    price_ranges: vector<PriceRange>,
    fee_percentage: u64,
    bidding_start_time: u64,
    bidding_end_time: u64,
    maturity_time: u64
)
```

### 3. Bidding

#### Binary Market (Backward Compatibility)
```move
public entry fun bid(
    owner: &signer,
    market_addr: address,
    prediction: bool, // true = LONG, false = SHORT
    amount: u64,
    timestamp_bid: u64
)
```

#### Multi-Outcome Market
```move
public entry fun bid_multi_outcome(
    owner: &signer,
    market_addr: address,
    outcome_index: u8, // Index của outcome muốn bid
    amount: u64,
    timestamp_bid: u64
)
```

### 4. Resolution và Claim

#### Resolution (Hỗ trợ cả 2 loại)
```move
public entry fun resolve_market(
    caller: &signer,
    market_addr: address,
    pyth_price_update: vector<vector<u8>>
)
```

#### Claim (Hỗ trợ cả 2 loại)
```move
public entry fun claim(owner: &signer, market_addr: address)
```

## Ví dụ sử dụng

### Tạo Multi-Outcome Market

```move
// Tạo các khoảng giá
let price_ranges = vector::empty<PriceRange>();
let range_a = types::create_price_range(100, 150, string::utf8(b"Range A: $100-$150"));
let range_b = types::create_price_range(150, 1000000, string::utf8(b"Range B: >$150"));
let range_c = types::create_price_range(0, 100, string::utf8(b"Range C: <$100"));

vector::push_back(&mut price_ranges, range_a);
vector::push_back(&mut price_ranges, range_b);
vector::push_back(&mut price_ranges, range_c);

// Tạo market
market_core::create_multi_outcome_market(
    &creator,
    b"BTC/USD",
    price_ranges,
    50, // 5% fee
    bidding_start_time,
    bidding_end_time,
    maturity_time
);
```

### Bidding trên Multi-Outcome Market

```move
// User bid vào outcome 0 (Range A: $100-$150)
market_core::bid_multi_outcome(
    &user,
    market_addr,
    0, // outcome index
    1000, // amount
    timestamp::now_seconds()
);

// User bid vào outcome 1 (Range B: >$150)
market_core::bid_multi_outcome(
    &user,
    market_addr,
    1, // outcome index
    2000, // amount
    timestamp::now_seconds()
);
```

## View Functions

### Lấy thông tin market
```move
public fun get_market_details(market_obj: Object<Market>): (
    address, // creator
    String, // price_feed_id_hex
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
    u8, // result
    bool, // is_resolved
    u64, // bidding_start_time
    u64, // bidding_end_time
    u64, // maturity_time
    u64 // final_price
)
```

### Lấy position của user

#### Binary Market
```move
public fun get_user_position(user: address, market_addr: address): (u64, u64)
// Returns (long_amount, short_amount)
```

#### Multi-Outcome Market
```move
public fun get_user_multi_outcome_position(user: address, market_addr: address): vector<u64>
// Returns vector of amounts for each outcome
```

## Backward Compatibility

Tất cả các hàm cũ vẫn hoạt động bình thường:
- `create_market()` → tạo binary market
- `bid()` → bid trên binary market
- `claim()` → claim cho cả 2 loại market (tự động detect)

## Testing

File test: `sources/multi_outcome_market_tests.move`

Chạy test:
```bash
aptos move test
```

## Lưu ý quan trọng

1. **Price Ranges**: Phải đảm bảo các khoảng giá không overlap và cover toàn bộ range có thể
2. **Outcome Index**: Bắt đầu từ 0, tăng dần theo thứ tự trong vector price_ranges
3. **Resolution**: Hệ thống sẽ tự động tìm outcome phù hợp dựa trên final_price
4. **Claim Logic**: Người thắng sẽ nhận được tiền từ tất cả các pool thua cộng với tiền gốc của họ
5. **Fee**: Được tính trên tổng số tiền thắng, không phải tiền gốc

## Error Codes

- `1001`: Bidding end time must be before maturity time
- `1002`: Multi-outcome market must have at least 2 outcomes
- `1003`: Invalid price range (min_price > max_price)
- `1004`: Function only for multi-outcome markets
- `1005`: Invalid outcome index
