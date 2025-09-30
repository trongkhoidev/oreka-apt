# Oreka Scripts

This directory contains all management and deployment scripts for the Oreka project.

## Quick Start

Use the main management script for most operations:

```bash
# Show all available commands
./scripts/manage.sh help

# Start development environment
./scripts/manage.sh dev

# Setup database
./scripts/manage.sh db:setup

# Deploy to testnet
./scripts/manage.sh deploy:testnet
```

## Available Scripts

### Main Management Script

- **`manage.sh`** - Main project management script with all common operations

### Deployment Scripts

- **`main.sh`** - Main deployment manager for smart contracts
- **`deploy.sh`** - Core deployment script
- **`setup-account.sh`** - Account setup script
- **`verify.sh`** - Deployment verification
- **`multisig-deploy.sh`** - Multi-signature deployment
- **`publish-mainnet.sh`** - Publish to mainnet
- **`publish-testnet.sh`** - Publish to testnet
- **`init-testnet.sh`** - Initialize testnet

### Testing Scripts

- **`test.sh`** - Run Move tests

## Usage Examples

### Development

```bash
# Start all development services
./scripts/manage.sh dev

# Start individual services
./scripts/manage.sh dev:frontend
./scripts/manage.sh dev:api
./scripts/manage.sh dev:indexer
./scripts/manage.sh dev:db
```

### Database Management

```bash
# Setup database
./scripts/manage.sh db:setup

# Run migrations
./scripts/manage.sh db:migrate

# Check database status
./scripts/manage.sh status
```

### Indexer Management

```bash
# Start indexer
./scripts/manage.sh indexer:start

# Stop indexer
./scripts/manage.sh indexer:stop

# Check indexer status
./scripts/manage.sh indexer:status

# Create monthly snapshot
./scripts/manage.sh indexer:snapshot
```

### Deployment

```bash
# Deploy to testnet
./scripts/manage.sh deploy:testnet

# Deploy to mainnet
./scripts/manage.sh deploy:mainnet

# Verify deployment
./scripts/manage.sh deploy:verify
```

### Testing

```bash
# Run all tests
./scripts/manage.sh test

# Run specific tests
./scripts/manage.sh test:move
./scripts/manage.sh test:api
./scripts/manage.sh test:frontend
```

### Utilities

```bash
# Install all dependencies
./scripts/manage.sh install

# Build all projects
./scripts/manage.sh build

# Clean build artifacts
./scripts/manage.sh clean

# Show project status
./scripts/manage.sh status

# Show recent logs
./scripts/manage.sh logs
```

## Direct Script Usage

You can also use individual scripts directly:

### Deployment Scripts

```bash
# Setup account
./scripts/main.sh setup mainnet production

# Deploy contracts
./scripts/main.sh deploy mainnet production

# Verify deployment
./scripts/main.sh verify mainnet production

# Check balance
./scripts/main.sh balance mainnet production
```

### Move Testing

```bash
# Run Move tests
./scripts/test.sh
```

## Environment Configuration

Make sure you have the following environment files configured:

- `deployment/config/production.env` - Mainnet configuration
- `deployment/config/testnet.env` - Testnet configuration
- `indexer/.env` - Indexer configuration
- `api/.env` - API configuration
- `frontend/.env.local` - Frontend configuration

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Aptos CLI
- PostgreSQL (via Docker)

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker Desktop or Docker daemon
   docker info
   ```

2. **Database connection issues**
   ```bash
   # Check PostgreSQL status
   ./scripts/manage.sh status
   
   # Restart database
   docker-compose -f indexer/docker-compose.yml restart postgres
   ```

3. **Indexer not processing events**
   ```bash
   # Check indexer status
   ./scripts/manage.sh indexer:status
   
   # Restart indexer
   ./scripts/manage.sh indexer:stop
   ./scripts/manage.sh indexer:start
   ```

4. **Deployment failures**
   ```bash
   # Check account balance
   ./scripts/main.sh balance mainnet production
   
   # Verify configuration
   cat deployment/config/production.env
   ```

### Getting Help

- Use `./scripts/manage.sh help` to see all available commands
- Check individual script help with `./scripts/main.sh help`
- Review logs with `./scripts/manage.sh logs`

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive configuration
- Test on testnet before mainnet deployment
- Use multi-signature for production deployments

## Contributing

When adding new scripts:

1. Follow the existing naming conventions
2. Add proper error handling
3. Include help text
4. Update this README
5. Test on both testnet and mainnet
