## Oreka – Testnet → Mainnet Playbook

This document captures what was done on Testnet and how to switch to Mainnet quickly and safely.

### 1) Current Testnet State

- Publisher (yugo): `0xcbe32563ed20f2dca2e4a7e917203bb3b5d6eeae2e4281328920c5524346ca41`
- REST URL: `https://fullnode.testnet.aptoslabs.com/v1`
- Published modules (txn):
  - Publish: https://explorer.aptoslabs.com/txn/0x2fd3fa1a3fbda1b21e2777a450c69136ad924e842ea96d11e1eb2a19fd2f0498?network=testnet
  - Init GlobalPool: https://explorer.aptoslabs.com/txn/0x5df52902929189e553844adc8f81510cdd4db4fdc9d5a8ea48fa3792f0a7374e?network=testnet
  - Init MarketRegistry: https://explorer.aptoslabs.com/txn/0x04e8208050fbc7825a6ff0656ea4765417cc7a9cff340f575633b076068964b8?network=testnet
  - Init MarketConfig: https://explorer.aptoslabs.com/txn/0x3e7145ac67114e028d51a65b0539fc81d11ccace0ff43cce4463c7ff9ee5b60e?network=testnet

Named addresses used during publish:
- `yugo = 0xcbe3...ca41` (publisher)
- `pyth = 0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387`
- `deployer = 0xb31e712b26fd295357355f6845e77c888298636609e93bc9b05f0f604049f434`
- `wormhole = 0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625`

### 2) Scripts (automation)

- Testnet publish
  - `deployment/scripts/publish-testnet.sh [yugo_addr]`
  - Auto-reads `yugo` from `Move.toml` if omitted
- Testnet init resources
  - `deployment/scripts/init-testnet.sh [yugo_addr]`
  - Runs: `global_pool::init_global_pool`, `initialize_market_registry`, `initialize_market_config(yugo)`
- Mainnet publish
  - `deployment/scripts/publish-mainnet.sh <yugo_addr>`
  - Note: requires compatibility with any existing on-chain modules or a fresh publisher address

### 3) Indexer + API

- Indexer (Postgres + worker) at `/indexer` (migrations and scripts included)
- Standalone API server at `/api` (Express + pg) with routes:
  - `GET /v1/profile/:addr`
  - `GET /v1/user/:addr/bets`, `GET /v1/user/:addr/claims`
  - `GET /v1/markets/recent`, `GET /v1/market/:id`
  - `GET /v1/leaderboard/monthly/owners?ym=YYYY-MM`
  - `GET /v1/leaderboard/monthly/users?ym=YYYY-MM`
  - `GET /v1/leaderboard/alltime/users`

### 4) Frontend wiring

- Use `NEXT_PUBLIC_API_BASE=http://localhost:3001` (dev) and switch to prod later
- Use Aptos REST `/v1` endpoints for on-chain interactions
- Publisher/module address for testnet: `0xcbe3...ca41`

### 5) Steps to switch to Mainnet

1. Choose mainnet publisher address (recommended: fresh address) and fund it with APT
2. Update `Move.toml` → `yugo = "0xYOUR_MAINNET_ADDR"`
3. Publish modules
   - `export APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1`
   - `./deployment/scripts/publish-mainnet.sh 0xYOUR_MAINNET_ADDR`
   - If upgrade of existing package is needed: keep all public struct layouts backward compatible
4. Initialize resources on mainnet
   - Run the three init calls (mirror of testnet init):
     - `global_pool::init_global_pool`
     - `market_core::initialize_market_registry`
     - `market_core::initialize_market_config(yugo)`
5. Point Indexer + API to mainnet
   - Update `.env` in `/indexer` and `/api` (PG_URL, APTOS_INDEXER, MODULE_ADDR)
   - Re-run migrations if needed; restart indexer worker and API
6. Frontend config
   - Set mainnet API base URL and mainnet publisher address constants

### 6) Known pitfalls and fixes

- Always use REST URLs with `/v1` (e.g., `https://fullnode.mainnet.aptoslabs.com/v1`) to avoid CLI JSON parse errors
- Backward-compatible upgrades only: changing event/struct layouts in published modules will be rejected (BACKWARD_INCOMPATIBLE_MODULE_UPDATE)
- For testnet funding via CLI faucet: if faucet fails, transfer from a funded testnet account

### 7) Quick commands

Testnet:
```
export APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
./deployment/scripts/publish-testnet.sh
./deployment/scripts/init-testnet.sh
```

Mainnet:
```
export APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
./deployment/scripts/publish-mainnet.sh 0xYOUR_MAINNET_ADDR
```


