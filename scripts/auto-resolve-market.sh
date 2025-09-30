#!/bin/bash

# Script to automatically resolve market using frontend
echo "🎯 Auto-resolve market using frontend approach"
echo "=============================================="

MARKET_ADDRESS="0xf23bdfc2b5f412054dbd6e0cc071f643e33e84998faf13bd5bfc20150b61c554"

echo ""
echo "📊 Market Information:"
echo "- Address: $MARKET_ADDRESS"
echo "- Type: Multi-outcome market"
echo "- Status: Ready to resolve"
echo "- Current APT price: ~$4.26"
echo ""

echo "🚀 Starting frontend application..."
echo ""

# Navigate to frontend directory
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the frontend development server
echo "🌐 Starting frontend server..."
echo ""
echo "📋 Instructions to resolve market:"
echo "1. Frontend will open at http://localhost:3000"
echo "2. Navigate to the market page"
echo "3. Look for the market with address: $MARKET_ADDRESS"
echo "4. Click the 'Resolve Market' button"
echo "5. The frontend will automatically:"
echo "   - Get Pyth price update data"
echo "   - Format it correctly"
echo "   - Submit the resolve transaction"
echo ""
echo "✅ The frontend handles all the complex Pyth data formatting"
echo "✅ No need to use CLI commands"
echo "✅ TypeScript SDK handles vector<vector<u8>> correctly"
echo ""

# Start the development server
npm run dev
