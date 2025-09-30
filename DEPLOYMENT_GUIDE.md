# 🚀 OREKA Deployment Guide

## 📋 Tổng quan hệ thống

OREKA là một prediction market platform trên Aptos blockchain với:
- **Smart Contracts**: Move contracts cho binary và multi-outcome markets
- **Frontend**: Next.js với Chakra UI
- **Backend API**: Express.js với PostgreSQL
- **Database**: PostgreSQL với real-time indexing

## ✅ Trạng thái hiện tại

### 🟢 Đã hoàn thành:
- ✅ Smart contracts (Move) - Binary & Multi-outcome markets
- ✅ Frontend (Next.js) - Profile & Leaderboard pages
- ✅ Backend API (Express.js) - Real database integration
- ✅ Database (PostgreSQL) - Schema & sample data
- ✅ Development scripts - Setup & start scripts
- ✅ Real data integration - Không còn mock data

### 🟡 Cần chú ý:
- ⚠️ CORS configuration đã được fix
- ⚠️ Profile page có thể cần refresh sau khi fix CORS

## 🛠️ Hướng dẫn triển khai

### 1. Prerequisites

```bash
# Cài đặt dependencies
- Node.js 18+
- PostgreSQL 14+
- Aptos CLI
- Docker (optional)
```

### 2. Database Setup

```bash
# Khởi động PostgreSQL
brew services start postgresql@14

# Setup database
./setup-db.sh
# Chọn: localhost, 5432, oreka_db, postgres, [password]
# Chọn: y (add sample data)
```

### 3. Backend API

```bash
# Cài đặt dependencies
cd api
npm install

# Cấu hình environment
cp .env.example .env
# Chỉnh sửa .env nếu cần

# Khởi động API server
npm run dev:api
# Server sẽ chạy trên http://localhost:4000
```

### 4. Frontend

```bash
# Cài đặt dependencies
cd frontend
npm install

# Cấu hình environment
cp .env.example .env.local
# Chỉnh sửa .env.local nếu cần

# Khởi động frontend
npm run dev
# Server sẽ chạy trên http://localhost:3000
```

### 5. Smart Contracts (Optional)

```bash
# Deploy contracts (nếu cần)
aptos account create --profile oreka_testnet2
aptos account fund-with-faucet --profile oreka_testnet2
aptos move publish --profile oreka_testnet2
```

## 🚀 Quick Start

```bash
# Sử dụng script tự động
./start-dev.sh
```

Hoặc manual:

```bash
# Terminal 1: Database
brew services start postgresql@14

# Terminal 2: API
cd api && npm run dev:api

# Terminal 3: Frontend
cd frontend && npm run dev
```

## 📊 Kiểm tra hệ thống

### 1. Health Check
```bash
# API Health
curl http://localhost:4000/health

# Database
psql -h localhost -U postgres -d oreka_db -c "SELECT COUNT(*) FROM bets;"
```

### 2. Test Endpoints
```bash
# Profiles
curl http://localhost:4000/profiles/0x3456789012345678901234567890123456789012345678901234567890123456

# Leaderboards
curl http://localhost:4000/leaderboards/all-time/users?limit=5
```

### 3. Frontend Pages
- **Home**: http://localhost:3000
- **Profiles**: http://localhost:3000/profiles
- **Leaderboards**: http://localhost:3000/leaderboards
- **Markets**: http://localhost:3000/listaddress/1

## 🔧 Configuration

### Environment Variables

#### API (.env)
```env
PG_URI=postgres://postgres:password@localhost:5432/oreka_db
PORT=4000
NODE_ENV=development
TOKEN_DECIMALS=8
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API=http://localhost:4000
NEXT_PUBLIC_TOKEN_DECIMALS=8
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
```

## 📁 Cấu trúc project

```
oreka/
├── sources/                 # Move smart contracts
├── api/                     # Express.js API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── db.ts          # Database connection
│   │   └── index.ts       # Server entry point
│   └── schema.sql         # Database schema
├── frontend/               # Next.js frontend
│   ├── pages/             # Pages router
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/          # Utility functions
│   │   └── services/     # API services
│   └── public/           # Static assets
├── setup-db.sh           # Database setup script
├── start-dev.sh          # Development start script
└── Makefile              # Development commands
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Error**
   ```bash
   # Fix: Update CORS_ORIGIN in api/.env
   CORS_ORIGIN=http://localhost:3000
   ```

2. **Database Connection**
   ```bash
   # Check PostgreSQL status
   brew services list | grep postgresql
   
   # Restart if needed
   brew services restart postgresql@14
   ```

3. **Port Conflicts**
   ```bash
   # Kill existing processes
   pkill -f "next dev"
   pkill -f "ts-node-dev"
   ```

4. **Module Not Found**
   ```bash
   # Reinstall dependencies
   cd frontend && rm -rf node_modules && npm install
   cd ../api && rm -rf node_modules && npm install
   ```

## 📈 Performance

### Database Optimization
- Indexes đã được tạo cho performance
- Connection pooling được cấu hình
- Query optimization với CTEs

### Frontend Optimization
- SWR caching cho API calls
- Image optimization
- Code splitting

## 🔒 Security

### Production Checklist
- [ ] Update CORS origins
- [ ] Set secure database passwords
- [ ] Configure HTTPS
- [ ] Set up rate limiting
- [ ] Enable request validation
- [ ] Set up monitoring

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong terminal
2. Verify environment variables
3. Check database connection
4. Restart services nếu cần

---

**🎉 Chúc mừng! Hệ thống OREKA đã sẵn sàng để sử dụng!**
