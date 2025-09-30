# Oreka Development Makefile

.PHONY: help install setup-db start-api start-frontend start-dev test clean

# Default target
help:
	@echo "Oreka Development Commands:"
	@echo "  install      - Install dependencies for both API and frontend"
	@echo "  setup-db     - Set up PostgreSQL database"
	@echo "  start-api    - Start API server only"
	@echo "  start-frontend - Start frontend only"
	@echo "  start-dev    - Start both API and frontend"
	@echo "  test         - Run tests (placeholder)"
	@echo "  clean        - Clean build artifacts"

# Install dependencies
install:
	@echo "📦 Installing API dependencies..."
	cd api && npm install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

# Setup database
setup-db:
	@echo "🗄️  Setting up database..."
	./setup-db.sh

# Start API server
start-api:
	@echo "🔧 Starting API server..."
	cd api && npm run dev

# Start frontend
start-frontend:
	@echo "🎨 Starting frontend..."
	cd frontend && npm run dev

# Start both servers
start-dev:
	@echo "🚀 Starting development environment..."
	./start-dev.sh

# Run tests
test:
	@echo "🧪 Running tests..."
	@echo "No tests configured yet"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	cd api && rm -rf dist
	cd frontend && rm -rf .next
	cd frontend && rm -rf out
