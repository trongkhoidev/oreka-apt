#!/bin/bash

# Database Setup Script for Oreka API
# This script helps set up the PostgreSQL database for the API

echo "🗄️  Oreka Database Setup"
echo "========================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Get database connection details
echo "📝 Please provide database connection details:"
read -p "Database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database name [oreka_db]: " DB_NAME
DB_NAME=${DB_NAME:-oreka_db}

read -p "Database user [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -s -p "Database password: " DB_PASSWORD
echo ""

# Create database if it doesn't exist
echo "🔧 Creating database '$DB_NAME'..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"

# Run schema
echo "📋 Creating tables..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f api/schema.sql

# Ask if user wants sample data
read -p "Do you want to add sample data for testing? (y/n): " ADD_SAMPLE
if [[ $ADD_SAMPLE =~ ^[Yy]$ ]]; then
    echo "🌱 Adding sample data..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f api/seed.sql
fi

# Create .env file for API
echo "📝 Creating API .env file..."
cat > api/.env << EOF
# Database Configuration
PG_URI=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Server Configuration
PORT=4000
NODE_ENV=development

# Token Configuration
TOKEN_DECIMALS=8

# Timezone
TZ=Asia/Ho_Chi_Minh

# CORS
CORS_ORIGIN=http://localhost:3001
EOF

echo "✅ Database setup complete!"
echo "📊 You can now start the API server with: cd api && npm run dev"
echo "🎨 And the frontend with: cd frontend && npm run dev"
echo "🚀 Or use the combined script: ./start-dev.sh"
