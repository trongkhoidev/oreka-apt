# Hướng dẫn Deploy Mainnet - Chi tiết từng bước

## Tình huống hiện tại
Bạn cần tạo profile mainnet để deploy. Có 2 lựa chọn:

## Lựa chọn 1: Sử dụng Account có sẵn

### Bước 1: Tạo profile với private key có sẵn
```bash
aptos init --profile mainnet --network mainnet
# Khi được hỏi private key, nhập: 0x<your_private_key_here>
```

### Bước 2: Kiểm tra account
```bash
aptos account list --profile mainnet
```

### Bước 3: Kiểm tra balance
```bash
aptos account list --profile mainnet --query balance
```

**Yêu cầu**: Cần ít nhất 10-20 APT trong account

## Lựa chọn 2: Tạo Account mới

### Bước 1: Tạo profile mới
```bash
aptos init --profile mainnet --network mainnet
# Nhấn Enter để tạo private key mới
```

### Bước 2: Lưu thông tin account
```bash
# Lưu lại private key và address được tạo
aptos config show-profiles
```

### Bước 3: Fund account
```bash
# Chuyển APT từ wallet khác vào account này
# Hoặc sử dụng faucet (nếu có)
```

## Bước tiếp theo sau khi có profile

### 1. Compile contracts
```bash
aptos move compile --named-addresses yugo=0x13ab16ba5958681d30efd10c8f6f218df79cd21e43de111b99c5a0a8fa384a1d --profile mainnet
```

### 2. Deploy contracts
```bash
aptos move publish \
  --named-addresses yugo=0x13ab16ba5958681d30efd10c8f6f218df79cd21e43de111b99c5a0a8fa384a1d \
  --profile mainnet \
  --package-dir . \
  --skip-framework-check
```

### 3. Initialize factory
```bash
aptos move run \
  --function-id 0x13ab16ba5958681d30efd10c8f6f218df79cd21e43de111b99c5a0a8fa384a1d::factory::initialize \
  --profile mainnet
```

## Cách lấy Private Key từ Wallet

### Petra Wallet:
1. Mở Petra Wallet
2. Vào Settings > Security & Privacy
3. Export Private Key
4. Copy private key (format: 0x...)

### Pontem Wallet:
1. Mở Pontem Wallet  
2. Vào Settings > Security
3. Export Private Key
4. Copy private key

### Martian Wallet:
1. Mở Martian Wallet
2. Vào Settings > Export Private Key
3. Copy private key

## Lưu ý quan trọng

⚠️ **Security**: 
- Không chia sẻ private key với ai
- Sử dụng account riêng cho deployment
- Backup private key an toàn

⚠️ **Balance**: 
- Cần ít nhất 10-20 APT để deploy
- Gas fees khoảng 1-2 APT
- Account creation fee: 0.1 APT

⚠️ **Testing**:
- Test trên devnet trước
- Verify tất cả functions
- Check gas estimates

## Commands để kiểm tra

```bash
# Kiểm tra profile
aptos config show-profiles

# Kiểm tra account
aptos account list --profile mainnet

# Kiểm tra balance  
aptos account list --profile mainnet --query balance

# Test compile
aptos move compile --profile mainnet

# Test simulation
aptos move run --dry-run --profile mainnet
```

---

**Bạn muốn chọn lựa chọn nào?**
1. Sử dụng account có sẵn (cung cấp private key)
2. Tạo account mới
3. Cần hướng dẫn thêm về wallet 