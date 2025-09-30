#!/usr/bin/env node

/**
 * Debug script to analyze resolve market logic
 * Checks VAA data, price feed ID matching, and resolution logic
 * Usage: node scripts/debug-resolve-logic.js
 */

const https = require('https');

async function debugResolveLogic() {
  console.log(`🔍 Debugging Resolve Market Logic`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  // Test data
  const testMarkets = [
    {
      name: 'Binary Market (BTC/USD)',
      priceFeedId: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
      strikePrice: 50000,
      marketType: 'binary'
    },
    {
      name: 'Multi-Outcome Market (ETH/USD)',
      priceFeedId: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      priceRanges: [
        { min: 0, max: 2000, outcome: 0 },
        { min: 2000, max: 3000, outcome: 1 },
        { min: 3000, max: 5000, outcome: 2 },
        { min: 5000, max: 10000, outcome: 3 }
      ],
      marketType: 'multi-outcome'
    }
  ];
  
  for (const market of testMarkets) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing ${market.name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // 1. Fetch VAA data
      console.log(`\n1️⃣ Fetching VAA data...`);
      const vaaData = await fetchVAAData(market.priceFeedId);
      console.log(`✅ VAA data fetched: ${vaaData.length} VAAs`);
      
      // 2. Analyze VAA structure
      console.log(`\n2️⃣ Analyzing VAA structure...`);
      const vaa = vaaData[0];
      const decoded = Buffer.from(vaa, 'base64');
      const header = Array.from(decoded.slice(0, 4));
      
      console.log(`- VAA size: ${decoded.length} bytes`);
      console.log(`- Header: [${header.join(', ')}] (${header.map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
      console.log(`- PNAU header: ${header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85 ? '✅ Valid' : '❌ Invalid'}`);
      
      // 3. Test price extraction (simulate)
      console.log(`\n3️⃣ Testing price extraction...`);
      const simulatedPrices = [45000, 50000, 55000, 2500, 3500, 5500];
      
      for (const price of simulatedPrices) {
        console.log(`\nTesting with price: $${price}`);
        
        if (market.marketType === 'binary') {
          const result = price > market.strikePrice ? 'Long wins (0)' : 
                        price < market.strikePrice ? 'Short wins (1)' : 'No winner (255)';
          console.log(`  Binary result: ${result}`);
        } else if (market.marketType === 'multi-outcome') {
          const winningOutcome = market.priceRanges.findIndex(range => 
            price >= range.min && price < range.max
          );
          const result = winningOutcome >= 0 ? `Outcome ${winningOutcome} wins` : 'No winner (255)';
          console.log(`  Multi-outcome result: ${result}`);
        }
      }
      
      // 4. Test VAA payload format
      console.log(`\n4️⃣ Testing VAA payload format...`);
      const numberArray = Array.from(decoded);
      const payload = [numberArray.slice(0, 1000)]; // Truncate for safety
      
      console.log(`- Payload chunks: ${payload.length}`);
      console.log(`- Total bytes: ${payload[0].length}`);
      console.log(`- First 8 bytes: [${payload[0].slice(0, 8).join(', ')}]`);
      console.log(`- Last 8 bytes: [${payload[0].slice(-8).join(', ')}]`);
      
      // 5. Check for potential issues
      console.log(`\n5️⃣ Checking for potential issues...`);
      
      // Check VAA size
      if (decoded.length > 2000) {
        console.log(`⚠️  VAA size is large (${decoded.length} bytes) - might cause transaction issues`);
      } else {
        console.log(`✅ VAA size is reasonable (${decoded.length} bytes)`);
      }
      
      // Check byte values
      const invalidBytes = numberArray.filter(b => b < 0 || b > 255);
      if (invalidBytes.length > 0) {
        console.log(`❌ Invalid byte values found: ${invalidBytes.length}`);
      } else {
        console.log(`✅ All byte values are valid`);
      }
      
      // Check price feed ID format
      if (market.priceFeedId.length !== 64) {
        console.log(`❌ Price feed ID length is ${market.priceFeedId.length}, expected 64`);
      } else {
        console.log(`✅ Price feed ID format is correct`);
      }
      
      console.log(`\n✅ ${market.name} analysis completed`);
      
    } catch (error) {
      console.error(`❌ ${market.name} analysis failed:`, error.message);
    }
  }
  
  // 6. Summary and recommendations
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY & RECOMMENDATIONS`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\n🔧 Potential Issues:`);
  console.log(`1. VAA data size might be too large for transaction`);
  console.log(`2. Price feed ID might not match between market and VAA`);
  console.log(`3. Pyth contract might not be properly deployed`);
  console.log(`4. Price conversion from Pyth might have issues`);
  
  console.log(`\n💡 Recommendations:`);
  console.log(`1. Use smaller VAA data (truncate to 1000 bytes)`);
  console.log(`2. Verify price feed ID matches market configuration`);
  console.log(`3. Check Pyth contract deployment status`);
  console.log(`4. Add more detailed logging for price extraction`);
  console.log(`5. Test with minimal VAA data first`);
  
  console.log(`\n🚀 Next Steps:`);
  console.log(`1. Check if Pyth contract is deployed on the network`);
  console.log(`2. Verify price feed ID in market data matches VAA data`);
  console.log(`3. Test with a simple binary market first`);
  console.log(`4. Add price extraction logging to see actual prices`);
}

async function fetchVAAData(priceFeedId) {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data || !data.binary || data.binary.encoding !== 'hex' || !Array.isArray(data.binary.data)) {
    throw new Error('Invalid VAA response format');
  }
  
  // Convert hex to base64
  const vaas = data.binary.data.map((hexStr) => {
    const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
    const bytes = Buffer.from(cleanHex, 'hex');
    return bytes.toString('base64');
  });
  
  return vaas;
}

async function main() {
  try {
    await debugResolveLogic();
  } catch (error) {
    console.error(`💥 Debug failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugResolveLogic };
