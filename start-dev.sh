#!/bin/bash

# Oreka Development Startup Script
# This script starts both the API server and frontend in parallel

echo "🚀 Starting Oreka Development Environment..."

# Check if .env files exist
if [ ! -f "api/.env" ]; then
    echo "⚠️  API .env file not found. Copying from example..."
    cp api/env.example api/.env
    echo "📝 Please edit api/.env with your database configuration"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  Frontend .env.local file not found. Copying from example..."
    cp frontend/env.local.example frontend/.env.local
    echo "📝 Please edit frontend/.env.local with your configuration"
fi

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $API_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start API server
echo "🔧 Starting API server on port 4000..."
cd api
npm run dev:api &
API_PID=$!
cd ..

# Wait a moment for API to start
sleep 3

# Start frontend
echo "🎨 Starting frontend on port 3000..."
cd frontend
PORT=3000 npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development environment started!"
echo "📊 API Server: http://localhost:4000"
echo "🎨 Frontend: http://localhost:3000"
echo "🏥 Health Check: http://localhost:4000/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait $API_PID $FRONTEND_PID
