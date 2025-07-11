# Pyth Integration Guide for Binary Options Contract

## Tổng quan

Smart contract của bạn hiện tại đã được cập nhật để sử dụng **Hermes API approach** của Pyth. Đây là cách hoạt động:

### 1. **Cách lấy giá từ Pyth (Off-chain)**

#### Hermes API Endpoint
```bash
curl -X 'GET' \
  'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x{price_feed_id}'
```

#### Ví dụ với BTC/USD
```bash
curl -X 'GET' \
  'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'
```

#### Response JSON
```json
{
  "parsed": [
    {
      "id": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
      "price": {
        "price": "6140993501000",
        "conf": "3287868567",
        "expo": -8,
        "publish_time": 1714746101
      }
    }
  ]
}
```

### 2. **Cách resolve market**

#### Frontend/Backend Logic
```javascript
// 1. Lấy giá từ Hermes API
const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x${priceFeedId}`);
const data = await response.json();
const price = parseFloat(data.parsed[0].price.price) * Math.pow(10, data.parsed[0].price.expo);

// 2. Tính toán kết quả
const result = price >= strikePrice ? 0 : 1; // 0: long win, 1: short win

// 3. Gọi smart contract
await resolveMarket(marketAddress, Math.floor(price * 1e8), result);
```

#### Smart Contract Function
```move
public entry fun resolve_market(
    caller: &signer, 
    market_addr: address, 
    final_price: u64, 
    result: u8
) acquires Market
```

### 3. **Price Feed IDs cho các cặp tiền**

| Pair | Price Feed ID |
|------|---------------|
| APT/USD | `03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5` |
| BTC/USD | `e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH/USD | `ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| SOL/USD | `ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d` |
| SUI/USD | `23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744` |
| BNB/USD | `2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f` |
| WETH/USD | `9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6` |

### 4. **Flow hoàn chỉnh**

1. **Tạo market** → Lưu price_feed_id
2. **Bidding phase** → Users đặt cược
3. **Maturity time** → Market kết thúc
4. **Resolve phase** → Frontend/backend:
   - Gọi Hermes API với price_feed_id
   - Lấy giá cuối cùng
   - Tính toán kết quả (long/short win)
   - Gọi `resolve_market` với final_price và result
5. **Claim phase** → Users claim thưởng

### 5. **Bảo mật và Rủi ro**

#### Rủi ro
- **Không trustless**: Ai cũng có thể gọi `resolve_market` với giá tuỳ ý
- **Frontend/backend có thể bị tấn công**
- **Giá có thể bị manipulate**

#### Giải pháp bảo mật (tùy chọn)
1. **Chỉ owner mới được resolve**:
   ```move
   assert!(signer::address_of(caller) == market.creator, ENOT_OWNER);
   ```

2. **Whitelist resolvers**:
   ```move
   assert!(is_authorized_resolver(signer::address_of(caller)), ENOT_AUTHORIZED);
   ```

3. **Lưu hash giá trị để audit**:
   ```move
   market.price_hash = hash(final_price, result);
   ```

### 6. **Testing**

#### Test Hermes API
```bash
# Test BTC/USD price
curl -X 'GET' 'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43' | jq '.parsed[0].price'
```

#### Test Smart Contract
```bash
# Deploy và test
aptos move test
```

### 7. **Lưu ý quan trọng**

- **Giá từ Pyth có độ trễ**: Có thể mất vài giây để cập nhật
- **Network fees**: Mỗi lần resolve cần trả phí transaction
- **Price precision**: Pyth trả về giá với expo, cần convert đúng
- **Error handling**: Luôn handle trường hợp API fail

### 8. **Tài liệu tham khảo**

- [Pyth Hermes API Documentation](https://github.com/pyth-network/pyth-crosschain/blob/main/apps/developer-hub/content/docs/pyth-core/fetch-price-updates.mdx)
- [Pyth Aptos Integration](https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/aptos)
- [Aptos Move Documentation](https://aptos.dev/guides/move-guides/) 