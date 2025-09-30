#!/bin/bash

# Oreka Project Management Script
# Usage: ./scripts/manage.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND=${1:-help}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Oreka Project Manager${NC}"
echo -e "${BLUE}Command: $COMMAND${NC}"

# Function to show help
show_help() {
    echo -e "${BLUE}📖 Oreka Project Management Commands:${NC}"
    echo ""
    echo -e "${GREEN}Development:${NC}"
    echo -e "  ${YELLOW}dev${NC}                    - Start all development services"
    echo -e "  ${YELLOW}dev:frontend${NC}          - Start frontend development server"
    echo -e "  ${YELLOW}dev:api${NC}               - Start API development server"
    echo -e "  ${YELLOW}dev:indexer${NC}           - Start indexer development server"
    echo -e "  ${YELLOW}dev:db${NC}                - Start PostgreSQL database"
    echo ""
    echo -e "${GREEN}Database:${NC}"
    echo -e "  ${YELLOW}db:setup${NC}              - Setup PostgreSQL database"
    echo -e "  ${YELLOW}db:migrate${NC}            - Run database migrations"
    echo -e "  ${YELLOW}db:seed${NC}               - Seed database with test data"
    echo -e "  ${YELLOW}db:reset${NC}              - Reset database (WARNING: destructive)"
    echo ""
    echo -e "${GREEN}Indexer:${NC}"
    echo -e "  ${YELLOW}indexer:start${NC}         - Start indexer service"
    echo -e "  ${YELLOW}indexer:stop${NC}          - Stop indexer service"
    echo -e "  ${YELLOW}indexer:status${NC}        - Check indexer status"
    echo -e "  ${YELLOW}indexer:snapshot${NC}      - Create monthly snapshot"
    echo ""
    echo -e "${GREEN}Deployment:${NC}"
    echo -e "  ${YELLOW}deploy:testnet${NC}        - Deploy to testnet"
    echo -e "  ${YELLOW}deploy:mainnet${NC}        - Deploy to mainnet"
    echo -e "  ${YELLOW}deploy:verify${NC}         - Verify deployment"
    echo ""
    echo -e "${GREEN}Testing:${NC}"
    echo -e "  ${YELLOW}test${NC}                  - Run all tests"
    echo -e "  ${YELLOW}test:move${NC}             - Run Move tests"
    echo -e "  ${YELLOW}test:api${NC}              - Run API tests"
    echo -e "  ${YELLOW}test:frontend${NC}         - Run frontend tests"
    echo ""
    echo -e "${GREEN}Utilities:${NC}"
    echo -e "  ${YELLOW}clean${NC}                 - Clean all build artifacts"
    echo -e "  ${YELLOW}install${NC}               - Install all dependencies"
    echo -e "  ${YELLOW}build${NC}                 - Build all projects"
    echo -e "  ${YELLOW}logs${NC}                  - Show recent logs"
    echo -e "  ${YELLOW}status${NC}                - Show project status"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo -e "  ${YELLOW}./scripts/manage.sh dev${NC}"
    echo -e "  ${YELLOW}./scripts/manage.sh db:setup${NC}"
    echo -e "  ${YELLOW}./scripts/manage.sh deploy:testnet${NC}"
    echo ""
}

# Function to start development environment
start_dev() {
    echo -e "${BLUE}🔧 Starting development environment...${NC}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    # Start PostgreSQL
    echo -e "${BLUE}Starting PostgreSQL...${NC}"
    docker-compose -f indexer/docker-compose.yml up -d postgres
    
    # Wait for database to be ready
    echo -e "${BLUE}Waiting for database to be ready...${NC}"
    sleep 5
    
    # Setup database
    echo -e "${BLUE}Setting up database...${NC}"
    cd indexer && npm run migrate && cd ..
    
    # Start services
    echo -e "${BLUE}Starting services...${NC}"
    echo -e "${GREEN}✅ Development environment started!${NC}"
    echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
    echo -e "${YELLOW}API: http://localhost:4000${NC}"
    echo -e "${YELLOW}Indexer: Running in background${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${BLUE}🗄️  Setting up database...${NC}"
    
    # Start PostgreSQL if not running
    docker-compose -f indexer/docker-compose.yml up -d postgres
    
    # Wait for database
    sleep 5
    
    # Run migrations
    cd indexer && npm run migrate && cd ..
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
}

# Function to start indexer
start_indexer() {
    echo -e "${BLUE}📊 Starting indexer...${NC}"
    cd indexer && npm run dev &
    echo -e "${GREEN}✅ Indexer started${NC}"
}

# Function to deploy to testnet
deploy_testnet() {
    echo -e "${BLUE}🚀 Deploying to testnet...${NC}"
    ./scripts/main.sh deploy testnet testnet
    echo -e "${GREEN}✅ Testnet deployment completed${NC}"
}

# Function to deploy to mainnet
deploy_mainnet() {
    echo -e "${BLUE}🚀 Deploying to mainnet...${NC}"
    ./scripts/main.sh deploy mainnet production
    echo -e "${GREEN}✅ Mainnet deployment completed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Run Move tests
    echo -e "${BLUE}Running Move tests...${NC}"
    aptos move test
    
    # Run API tests
    echo -e "${BLUE}Running API tests...${NC}"
    cd api && npm test && cd ..
    
    # Run frontend tests
    echo -e "${BLUE}Running frontend tests...${NC}"
    cd frontend && npm test && cd ..
    
    echo -e "${GREEN}✅ All tests completed${NC}"
}

# Function to install dependencies
install_deps() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Install API dependencies
    echo -e "${BLUE}Installing API dependencies...${NC}"
    cd api && npm install && cd ..
    
    # Install frontend dependencies
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
    
    # Install indexer dependencies
    echo -e "${BLUE}Installing indexer dependencies...${NC}"
    cd indexer && npm install && cd ..
    
    echo -e "${GREEN}✅ All dependencies installed${NC}"
}

# Function to build all projects
build_all() {
    echo -e "${BLUE}🔨 Building all projects...${NC}"
    
    # Build API
    echo -e "${BLUE}Building API...${NC}"
    cd api && npm run build && cd ..
    
    # Build frontend
    echo -e "${BLUE}Building frontend...${NC}"
    cd frontend && npm run build && cd ..
    
    # Build indexer
    echo -e "${BLUE}Building indexer...${NC}"
    cd indexer && npm run build && cd ..
    
    echo -e "${GREEN}✅ All projects built${NC}"
}

# Function to clean build artifacts
clean_all() {
    echo -e "${BLUE}🧹 Cleaning build artifacts...${NC}"
    
    # Clean API
    cd api && rm -rf dist && cd ..
    
    # Clean frontend
    cd frontend && rm -rf .next && cd ..
    
    # Clean indexer
    cd indexer && rm -rf dist && cd ..
    
    # Clean Move build
    rm -rf build
    
    echo -e "${GREEN}✅ Build artifacts cleaned${NC}"
}

# Function to show project status
show_status() {
    echo -e "${BLUE}📊 Project Status:${NC}"
    echo ""
    
    # Check Docker
    if docker info > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker: Running${NC}"
    else
        echo -e "${RED}❌ Docker: Not running${NC}"
    fi
    
    # Check PostgreSQL
    if docker ps | grep -q postgres; then
        echo -e "${GREEN}✅ PostgreSQL: Running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: Not running${NC}"
    fi
    
    # Check services
    if pgrep -f "npm run dev" > /dev/null; then
        echo -e "${GREEN}✅ Development servers: Running${NC}"
    else
        echo -e "${YELLOW}⚠️  Development servers: Not running${NC}"
    fi
    
    # Check indexer
    if pgrep -f "indexer" > /dev/null; then
        echo -e "${GREEN}✅ Indexer: Running${NC}"
    else
        echo -e "${YELLOW}⚠️  Indexer: Not running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Available services:${NC}"
    echo -e "  Frontend: http://localhost:3000"
    echo -e "  API: http://localhost:4000"
    echo -e "  API Health: http://localhost:4000/health"
}

# Main command dispatcher
main() {
    case "$COMMAND" in
        "help"|"-h"|"--help")
            show_help
            ;;
        "dev")
            start_dev
            ;;
        "dev:frontend")
            cd frontend && npm run dev
            ;;
        "dev:api")
            cd api && npm run dev
            ;;
        "dev:indexer")
            cd indexer && npm run dev
            ;;
        "dev:db")
            docker-compose -f indexer/docker-compose.yml up postgres
            ;;
        "db:setup")
            setup_database
            ;;
        "db:migrate")
            cd indexer && npm run migrate && cd ..
            ;;
        "db:seed")
            echo -e "${YELLOW}⚠️  Database seeding not implemented yet${NC}"
            ;;
        "db:reset")
            echo -e "${RED}⚠️  Database reset not implemented for safety${NC}"
            ;;
        "indexer:start")
            start_indexer
            ;;
        "indexer:stop")
            pkill -f "indexer" || true
            echo -e "${GREEN}✅ Indexer stopped${NC}"
            ;;
        "indexer:status")
            if pgrep -f "indexer" > /dev/null; then
                echo -e "${GREEN}✅ Indexer is running${NC}"
            else
                echo -e "${RED}❌ Indexer is not running${NC}"
            fi
            ;;
        "indexer:snapshot")
            cd indexer && npm run snapshot && cd ..
            ;;
        "deploy:testnet")
            deploy_testnet
            ;;
        "deploy:mainnet")
            deploy_mainnet
            ;;
        "deploy:verify")
            ./scripts/main.sh verify mainnet production
            ;;
        "test")
            run_tests
            ;;
        "test:move")
            aptos move test
            ;;
        "test:api")
            cd api && npm test && cd ..
            ;;
        "test:frontend")
            cd frontend && npm test && cd ..
            ;;
        "clean")
            clean_all
            ;;
        "install")
            install_deps
            ;;
        "build")
            build_all
            ;;
        "logs")
            echo -e "${BLUE}📋 Recent logs:${NC}"
            find . -name "*.log" -type f -exec ls -la {} \; | head -10
            ;;
        "status")
            show_status
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
            echo -e "${YELLOW}Use 'help' to see available commands${NC}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
