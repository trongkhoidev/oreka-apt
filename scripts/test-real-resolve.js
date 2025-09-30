#!/usr/bin/env node

/**
 * Test real market resolution with actual market data
 * Usage: node scripts/test-real-resolve.js [market_address]
 */

const https = require('https');

async function testRealResolve(marketAddress) {
  console.log(`🧪 Testing Real Market Resolution`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🎯 Market Address: ${marketAddress || 'Not provided'}`);
  
  if (!marketAddress) {
    console.log(`\n❌ Please provide a market address`);
    console.log(`Usage: node scripts/test-real-resolve.js [market_address]`);
    return;
  }
  
  try {
    // 1. Get market data
    console.log(`\n1️⃣ Fetching market data...`);
    const marketUrl = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${marketAddress}/resource/0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d::market_core_v2::Market`;
    
    const marketResponse = await fetch(marketUrl);
    if (!marketResponse.ok) {
      throw new Error(`Failed to fetch market data: ${marketResponse.status}`);
    }
    
    const marketData = await marketResponse.json();
    console.log(`✅ Market data fetched`);
    
    // Extract key market info
    const market = marketData.data;
    const priceFeedId = Buffer.from(market.price_feed_id, 'base64').toString('hex');
    const isResolved = market.is_resolved;
    const maturityTime = parseInt(market.maturity_time);
    const marketType = market.market_type.is_binary ? 'binary' : 'multi-outcome';
    
    console.log(`- Market Type: ${marketType}`);
    console.log(`- Price Feed ID: ${priceFeedId}`);
    console.log(`- Is Resolved: ${isResolved}`);
    console.log(`- Maturity Time: ${new Date(maturityTime * 1000).toISOString()}`);
    console.log(`- Current Time: ${new Date().toISOString()}`);
    
    if (isResolved) {
      console.log(`\n⚠️  Market is already resolved!`);
      console.log(`- Final Price: ${market.final_price}`);
      console.log(`- Result: ${market.result}`);
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (now < maturityTime) {
      console.log(`\n⚠️  Market not yet mature!`);
      console.log(`- Maturity in: ${maturityTime - now} seconds`);
      return;
    }
    
    // 2. Fetch VAA data
    console.log(`\n2️⃣ Fetching VAA data...`);
    const vaaUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
    
    const vaaResponse = await fetch(vaaUrl);
    if (!vaaResponse.ok) {
      throw new Error(`Failed to fetch VAA data: ${vaaResponse.status}`);
    }
    
    const vaaData = await vaaResponse.json();
    console.log(`✅ VAA data fetched`);
    
    // Process VAA
    let vaas = [];
    if (vaaData && vaaData.binary && vaaData.binary.encoding === 'hex' && Array.isArray(vaaData.binary.data)) {
      vaas = vaaData.binary.data.map((hexStr) => {
        const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
        const bytes = Buffer.from(cleanHex, 'hex');
        return bytes.toString('base64');
      });
    }
    
    if (vaas.length === 0) {
      throw new Error('No VAA data received');
    }
    
    const vaa = vaas[0];
    const decoded = Buffer.from(vaa, 'base64');
    const header = Array.from(decoded.slice(0, 4));
    
    console.log(`- VAA count: ${vaas.length}`);
    console.log(`- VAA size: ${decoded.length} bytes`);
    console.log(`- Header: [${header.join(', ')}] (${header.map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
    console.log(`- PNAU header: ${header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85 ? '✅ Valid' : '❌ Invalid'}`);
    
    // 3. Prepare transaction payload
    console.log(`\n3️⃣ Preparing transaction payload...`);
    const numberArray = Array.from(decoded);
    const payload = [numberArray.slice(0, 1000)]; // Truncate for safety
    
    console.log(`- Payload chunks: ${payload.length}`);
    console.log(`- Total bytes: ${payload[0].length}`);
    console.log(`- First 8 bytes: [${payload[0].slice(0, 8).join(', ')}]`);
    
    // 4. Simulate resolution logic
    console.log(`\n4️⃣ Simulating resolution logic...`);
    
    if (marketType === 'binary') {
      const strikePrice = parseInt(market.strike_price);
      console.log(`- Strike Price: $${strikePrice}`);
      console.log(`- Resolution Logic: Price > Strike = Long (0), Price < Strike = Short (1), Price = Strike = No Winner (255)`);
      
      // Test with different prices
      const testPrices = [strikePrice - 1000, strikePrice, strikePrice + 1000];
      testPrices.forEach(price => {
        const result = price > strikePrice ? 'Long wins (0)' : 
                      price < strikePrice ? 'Short wins (1)' : 'No winner (255)';
        console.log(`  - Price $${price}: ${result}`);
      });
    } else {
      console.log(`- Multi-outcome market detected`);
      console.log(`- Price ranges: ${market.price_ranges?.length || 0} ranges`);
      console.log(`- Outcomes: ${market.outcomes?.length || 0} outcomes`);
    }
    
    // 5. Check for potential issues
    console.log(`\n5️⃣ Checking for potential issues...`);
    
    const issues = [];
    
    if (decoded.length > 2000) {
      issues.push(`VAA size is large (${decoded.length} bytes)`);
    }
    
    if (header[0] !== 80 || header[1] !== 78 || header[2] !== 65 || header[3] !== 85) {
      issues.push('Invalid PNAU header');
    }
    
    if (priceFeedId.length !== 64) {
      issues.push(`Invalid price feed ID length: ${priceFeedId.length}`);
    }
    
    if (issues.length === 0) {
      console.log(`✅ No issues detected`);
    } else {
      console.log(`⚠️  Issues detected:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log(`\n✅ Real market resolution test completed`);
    console.log(`\n💡 Next steps:`);
    console.log(`1. Try resolving this market in the frontend`);
    console.log(`2. Check browser console for detailed logs`);
    console.log(`3. If it fails, check the error messages`);
    
  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
  }
}

async function main() {
  const marketAddress = process.argv[2];
  await testRealResolve(marketAddress);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testRealResolve };
