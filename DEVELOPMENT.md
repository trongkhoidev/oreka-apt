# Oreka Development Guide

Hướng dẫn phát triển và chạy hệ thống Oreka Prediction Market.

## 🏗️ Kiến trúc hệ thống

```
Oreka/
├── sources/           # Smart contracts (Move)
├── frontend/          # Next.js frontend
├── api/              # Express.js API server
└── scripts/          # Development scripts
```

**Luồng dữ liệu:**
1. Smart contracts emit events (BetEvent, ClaimEvent, etc.)
2. PostgreSQL indexer lưu trữ events
3. API server cung cấp REST endpoints
4. Frontend fetch data từ API

## 🚀 Quick Start

### 1. Cài đặt dependencies
```bash
make install
# hoặc
cd api && npm install
cd frontend && npm install
```

### 2. Setup database
```bash
make setup-db
# hoặc
./setup-db.sh
```

### 3. Chạy development environment
```bash
make start-dev
# hoặc
./start-dev.sh
```

## 📊 API Endpoints

### Health Check
- `GET /health` - Kiểm tra trạng thái server và database

### Profiles
- `GET /profiles/:addr` - Lấy thông tin chi tiết profile
- `GET /profiles?q=&limit=` - Tìm kiếm profiles theo địa chỉ

### Leaderboards
- `GET /leaderboards/monthly/owners?ym=YYYY-MM&limit=` - Top owners theo tháng
- `GET /leaderboards/monthly/users?ym=YYYY-MM&limit=` - Top users theo tháng
- `GET /leaderboards/all-time/users?limit=` - Top users all-time

## 🗄️ Database Schema

### Tables
- `bets` - Sự kiện đặt cược
- `claims` - Sự kiện rút thắng
- `owner_fees` - Phí của market owner
- `markets` - Thông tin markets

### Sample Data
File `api/seed.sql` chứa dữ liệu mẫu để test.

## 🔧 Development Commands

```bash
# Chạy riêng API server
make start-api
cd api && npm run dev

# Chạy riêng frontend
make start-frontend
cd frontend && npm run dev

# Chạy cả hai
make start-dev

# Setup database
make setup-db

# Clean build artifacts
make clean
```

## 🌐 Network Configuration

Frontend tự động chuyển đổi giữa các network:
- Testnet: `https://fullnode.testnet.aptoslabs.com/v1`
- Mainnet: `https://fullnode.mainnet.aptoslabs.com/v1`
- Devnet: `https://fullnode.devnet.aptoslabs.com/v1`

Sử dụng scripts trong `frontend/scripts/` để chuyển network.

## 📝 Environment Variables

### API (.env)
```env
PG_URI=postgres://user:pass@host:5432/db
PORT=4000
TOKEN_DECIMALS=8
CORS_ORIGIN=http://localhost:3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API=http://localhost:4000
NEXT_PUBLIC_TOKEN_DECIMALS=8
NEXT_PUBLIC_APTOS_NETWORK=testnet
```

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:4000/health

# Get profile
curl http://localhost:4000/profiles/0x123...

# Search profiles
curl "http://localhost:4000/profiles?q=0x123&limit=10"

# Monthly leaderboard
curl "http://localhost:4000/leaderboards/monthly/users?ym=2024-01&limit=10"
```

### Frontend Testing
1. Mở http://localhost:3001
2. Navigate đến `/profiles` và `/leaderboards`
3. Kiểm tra data loading và formatting

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Kiểm tra PostgreSQL
psql -d oreka_db -c "SELECT 1;"

# Kiểm tra .env file
cat api/.env
```

### API Server Issues
```bash
# Kiểm tra logs
cd api && npm run dev

# Test health endpoint
curl http://localhost:4000/health
```

### Frontend Issues
```bash
# Kiểm tra environment variables
cat frontend/.env.local

# Clear Next.js cache
cd frontend && rm -rf .next
```

## 📚 Smart Contract Integration

### Events được emit từ contracts:
- `MarketCreatedEvent` - Khi tạo market mới
- `BetEvent` - Khi user đặt cược
- `ClaimEvent` - Khi user rút thắng
- `WithdrawFeeEvent` - Khi owner rút phí

### Indexer cần parse các events này và lưu vào PostgreSQL.

## 🔄 Data Flow

1. **User tạo market** → Smart contract emit `MarketCreatedEvent`
2. **User đặt cược** → Smart contract emit `BetEvent`
3. **Market resolve** → Smart contract emit `ResolveEvent`
4. **User claim** → Smart contract emit `ClaimEvent`
5. **Owner rút phí** → Smart contract emit `WithdrawFeeEvent`

Indexer lắng nghe events và lưu vào database. API server query database và trả về cho frontend.

## 🚀 Production Deployment

### API Server
```bash
cd api
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

### Database
- Sử dụng managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Setup connection pooling
- Configure SSL certificates
- Setup monitoring và backups
