# Oreka API Server

API server for the Oreka prediction market platform, providing profiles and leaderboards data from PostgreSQL indexer.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
```

Required environment variables:
- `PG_URI`: PostgreSQL connection string
- `PORT`: Server port (default: 4000)
- `TOKEN_DECIMALS`: Token decimals for APT (default: 8)
- `CORS_ORIGIN`: Frontend URL for CORS

### 3. Database Setup
1. Create PostgreSQL database:
```sql
CREATE DATABASE oreka_db;
```

2. Run schema:
```bash
psql -d oreka_db -f schema.sql
```

### 4. Start Development Server
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Server health and database connection status

### Profiles
- `GET /profiles/:addr` - Get detailed profile for specific address
- `GET /profiles?q=&limit=` - Search profiles by address prefix

### Leaderboards
- `GET /leaderboards/monthly/owners?ym=YYYY-MM&limit=` - Monthly owners by payout
- `GET /leaderboards/monthly/users?ym=YYYY-MM&limit=` - Monthly users by winning
- `GET /leaderboards/all-time/users?limit=` - All-time users by winning

## Data Format

All monetary amounts are returned in both raw (octas) and human-readable format:
```json
{
  "raw": "100000000",
  "human": "1.0"
}
```

## Database Schema

The API expects the following tables:
- `bets`: User betting events
- `claims`: User claim events  
- `owner_fees`: Market owner fee withdrawals
- `markets`: Market creation events

See `schema.sql` for complete schema definition.

## Development

- `npm run dev` - Start with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Integration with Frontend

The frontend should set `NEXT_PUBLIC_API=http://localhost:4000` to connect to this API server.
