# Oreka Deployment Makefile
# Usage: make [target] [network=mainnet] [profile=production]

# Default values
NETWORK ?= mainnet
PROFILE ?= production

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

.PHONY: help setup deploy verify test clean status logs

# Default target
help:
	@echo "$(BLUE)🚀 Oreka Deployment Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Account Management:$(NC)"
	@echo "  $(YELLOW)make setup$(NC)     [network=mainnet] [profile=production]  - Setup Aptos account"
	@echo "  $(YELLOW)make balance$(NC)   [network=mainnet] [profile=production]  - Check account balance"
	@echo "  $(YELLOW)make info$(NC)      [network=mainnet] [profile=production]  - Show account info"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  $(YELLOW)make deploy$(NC)    [network=mainnet] [profile=production]  - Deploy contracts"
	@echo "  $(YELLOW)make verify$(NC)    [network=mainnet] [profile=production]  - Verify deployment"
	@echo "  $(YELLOW)make multisig$(NC)  [network=mainnet] [profile=production]  - Multisig deployment"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  $(YELLOW)make test$(NC)      [network=mainnet] [profile=production]  - Run tests"
	@echo "  $(YELLOW)make compile$(NC)   [network=mainnet] [profile=production]  - Compile contracts"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  $(YELLOW)make clean$(NC)     [network=mainnet] [profile=production]  - Clean artifacts"
	@echo "  $(YELLOW)make logs$(NC)      [network=mainnet] [profile=production]  - Show logs"
	@echo "  $(YELLOW)make status$(NC)    [network=mainnet] [profile=production]  - Show status"
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  $(YELLOW)make setup network=mainnet profile=production$(NC)"
	@echo "  $(YELLOW)make deploy network=mainnet profile=production$(NC)"
	@echo "  $(YELLOW)make verify network=mainnet profile=production$(NC)"
	@echo ""

# Account management
setup:
	@echo "$(BLUE)🔧 Setting up account for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh setup $(NETWORK) $(PROFILE)

balance:
	@echo "$(BLUE)💰 Checking account balance for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh balance $(NETWORK) $(PROFILE)

info:
	@echo "$(BLUE)ℹ️  Showing account info for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh info $(NETWORK) $(PROFILE)

# Deployment
deploy:
	@echo "$(BLUE)🚀 Deploying contracts to $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh deploy $(NETWORK) $(PROFILE)

verify:
	@echo "$(BLUE)🔍 Verifying deployment on $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh verify $(NETWORK) $(PROFILE)

multisig:
	@echo "$(BLUE)🔐 Running multisig deployment on $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh multisig $(NETWORK) $(PROFILE)

# Testing
test:
	@echo "$(BLUE)🧪 Running tests for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh test $(NETWORK) $(PROFILE)

compile:
	@echo "$(BLUE)🔨 Compiling contracts for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh compile $(NETWORK) $(PROFILE)

# Utilities
clean:
	@echo "$(BLUE)🧹 Cleaning deployment artifacts...$(NC)"
	@./scripts/main.sh clean $(NETWORK) $(PROFILE)

logs:
	@echo "$(BLUE)📋 Showing deployment logs for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh logs $(NETWORK) $(PROFILE)

status:
	@echo "$(BLUE)📊 Showing deployment status for $(NETWORK) with profile $(PROFILE)...$(NC)"
	@./scripts/main.sh status $(NETWORK) $(PROFILE)

# Quick deployment workflow
deploy-full: setup deploy verify
	@echo "$(GREEN)🎉 Full deployment completed successfully!$(NC)"

# Testnet deployment
deploy-testnet:
	@echo "$(BLUE)🧪 Deploying to testnet...$(NC)"
	@$(MAKE) deploy-full network=testnet profile=testnet

# Mainnet deployment
deploy-mainnet:
	@echo "$(BLUE)🚀 Deploying to mainnet...$(NC)"
	@$(MAKE) deploy-full network=mainnet profile=production

# Development deployment
deploy-dev:
	@echo "$(BLUE)🔧 Deploying to development...$(NC)"
	@$(MAKE) deploy-full network=devnet profile=development

# Check prerequisites
check-deps:
	@echo "$(BLUE)🔍 Checking dependencies...$(NC)"
	@which aptos > /dev/null || (echo "$(RED)❌ Aptos CLI not found. Please install it first.$(NC)" && exit 1)
	@which jq > /dev/null || (echo "$(RED)❌ jq not found. Please install it first.$(NC)" && exit 1)
	@echo "$(GREEN)✅ All dependencies are installed$(NC)"

# Install dependencies (Ubuntu/Debian)
install-deps:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@sudo apt-get update
	@sudo apt-get install -y jq curl
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

# Show configuration
show-config:
	@echo "$(BLUE)⚙️  Current configuration:$(NC)"
	@echo "$(BLUE)  Network: $(NETWORK)$(NC)"
	@echo "$(BLUE)  Profile: $(PROFILE)$(NC)"
	@if [ -f "config/$(PROFILE).env" ]; then \
		echo "$(GREEN)✅ Config file exists: config/$(PROFILE).env$(NC)"; \
	else \
		echo "$(RED)❌ Config file not found: config/$(PROFILE).env$(NC)"; \
	fi
