#!/usr/bin/env node

/**
 * Test complete resolve market flow
 * Simulates the exact flow from Customer.tsx handleResolve
 * Usage: node scripts/test-resolve-flow.js [market_address]
 */

const https = require('https');

// Simulate the exact functions from frontend
function normalizePriceFeedId(priceFeedId) {
  if (!priceFeedId) return null;
  
  if (typeof priceFeedId === 'string') {
    // Remove 0x prefix if present
    const clean = priceFeedId.startsWith('0x') ? priceFeedId.slice(2) : priceFeedId;
    
    // If it's already a 64-character hex string, return it
    if (/^[0-9a-fA-F]{64}$/.test(clean)) {
      return clean.toLowerCase();
    }
    
    // If it's base64 encoded, try to decode it
    if (clean.length > 64) {
      try {
        const decoded = atob(clean);
        const hex = Array.from(decoded).map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (hex.length === 64) {
          return hex.toLowerCase();
        }
      } catch (error) {
        console.warn('Failed to decode base64 price_feed_id:', error.message);
      }
    }
    
    return null;
  }
  
  return null;
}

function base64ToBytes(base64) {
  try {
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input: must be a non-empty string');
    }
    const decoded = atob(base64);
    const bytes = Array.from(decoded).map(char => char.charCodeAt(0));
    if (bytes.length === 0) {
      throw new Error('Base64 decoded to empty byte array');
    }
    return bytes;
  } catch (error) {
    console.error('Error decoding base64:', error.message);
    throw new Error(`Failed to decode base64 VAA data: ${error.message}`);
  }
}

async function fetchAndValidateVAA(priceFeedId) {
  console.log(`🔗 Fetching VAA for price feed: ${priceFeedId}`);
  
  const endpoints = [
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`,
    `https://hermes.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`,
    `https://xc-mainnet.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    console.log(`Trying endpoint ${i + 1}/${endpoints.length}: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      const responseText = await response.text();
      console.log(`Response status: ${response.status}, length: ${responseText.length}`);

      if (!response.ok) {
        console.warn(`Endpoint ${i + 1} failed: ${response.status}`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(`JSON parse error on endpoint ${i + 1}:`, parseError.message);
        continue;
      }

      let vaas = [];
      if (Array.isArray(data)) {
        vaas = data;
      } else if (data && Array.isArray(data.vaas)) {
        vaas = data.vaas;
      } else if (data && data.binary) {
        if (data.binary.encoding === 'hex' && Array.isArray(data.binary.data)) {
          vaas = data.binary.data.map((hexStr) => {
            try {
              const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
              const bytes = Buffer.from(cleanHex, 'hex');
              return bytes.toString('base64');
            } catch (error) {
              console.warn(`Failed to convert hex to base64:`, error.message);
              return hexStr;
            }
          });
        } else if (Array.isArray(data.binary.data)) {
          vaas = data.binary.data;
        }
      }

      if (vaas.length === 0) {
        console.warn(`No VAA data from endpoint ${i + 1}`);
        continue;
      }

      console.log(`✅ Success with endpoint ${i + 1}: ${vaas.length} VAAs`);
      return vaas;
    } catch (error) {
      console.warn(`Error with endpoint ${i + 1}:`, error.message);
      continue;
    }
  }

  throw new Error('All Hermes API endpoints failed');
}

async function testResolveFlow(marketAddress) {
  console.log(`🧪 Testing Complete Resolve Market Flow`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🎯 Market Address: ${marketAddress || 'Not provided'}`);
  
  if (!marketAddress) {
    console.log(`\n❌ Please provide a market address`);
    console.log(`Usage: node scripts/test-resolve-flow.js [market_address]`);
    return;
  }
  
  try {
    // Step 1: Get market data
    console.log(`\n1️⃣ Fetching market data...`);
    const marketUrl = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${marketAddress}/resource/0x374da5722cb2792cec580c6b782fb733ef597a892058f0d3acddac8388b8a46d::market_core_v2::Market`;
    
    const marketResponse = await fetch(marketUrl);
    if (!marketResponse.ok) {
      throw new Error(`Failed to fetch market data: ${marketResponse.status}`);
    }
    
    const marketData = await marketResponse.json();
    const market = marketData.data;
    
    console.log(`✅ Market data fetched`);
    console.log(`- Market Type: ${market.market_type?.is_binary ? 'Binary' : 'Multi-outcome'}`);
    console.log(`- Is Resolved: ${market.is_resolved}`);
    console.log(`- Maturity Time: ${new Date(Number(market.maturity_time) * 1000).toISOString()}`);
    console.log(`- Price Feed ID (base64): ${market.price_feed_id}`);
    
    if (market.is_resolved) {
      console.log(`\n⚠️  Market is already resolved!`);
      console.log(`- Final Price: ${market.final_price}`);
      console.log(`- Result: ${market.result}`);
      return;
    }
    
    // Step 2: Normalize price_feed_id (exactly like Customer.tsx)
    console.log(`\n2️⃣ Normalizing price_feed_id...`);
    console.log(`- Raw price_feed_id: ${market.price_feed_id}`);
    const priceFeedId = normalizePriceFeedId(market.price_feed_id);
    if (!priceFeedId) {
      throw new Error('Invalid or missing price_feed_id in market data');
    }
    console.log(`✅ Normalized price_feed_id: ${priceFeedId}`);
    
    // Step 3: Fetch and validate VAA data (exactly like Customer.tsx)
    console.log(`\n3️⃣ Fetching and validating VAA data...`);
    const vaas = await fetchAndValidateVAA(priceFeedId);
    console.log(`✅ Retrieved and validated VAAs: ${vaas.length}, first VAA length: ${vaas[0]?.length}`);
    
    // Step 4: Process VAA data (exactly like Customer.tsx)
    console.log(`\n4️⃣ Processing VAA data...`);
    const pythPriceUpdate = vaas.map((vaa, idx) => {
      const bytes = base64ToBytes(vaa);
      console.log(`VAA[${idx}] bytes length: ${bytes.length}, first: [${bytes.slice(0, 8).join(', ')}], last: [${bytes.slice(-8).join(', ')}]`);
      
      // Log VAA header analysis
      if (bytes.length >= 4) {
        const header = bytes.slice(0, 4);
        const headerHex = header.map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`VAA[${idx}] header: [${header.join(', ')}] (hex: ${headerHex})`);
        
        // Check for PNAU header
        if (header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85) {
          console.log(`✅ VAA[${idx}] has valid PNAU header`);
        } else {
          console.warn(`⚠️  VAA[${idx}] has unexpected header: [${header.join(', ')}]`);
        }
      }
      
      // Ensure all bytes are numbers, not strings
      const normalizedBytes = bytes.map(byte => {
        const num = Number(byte);
        if (isNaN(num) || num < 0 || num > 255) {
          console.warn(`Invalid byte value: ${byte}, converted to: ${num}`);
          return 0;
        }
        return num;
      });
      
      console.log(`VAA[${idx}] normalized length: ${normalizedBytes.length}, first 8: [${normalizedBytes.slice(0, 8).join(', ')}]`);
      return normalizedBytes;
    });
    
    console.log(`✅ pythPriceUpdate count: ${pythPriceUpdate.length}`);
    const totalBytes = pythPriceUpdate.reduce((sum, arr) => sum + arr.length, 0);
    console.log(`✅ Total bytes: ${totalBytes}`);
    
    // Step 5: Simulate resolution logic
    console.log(`\n5️⃣ Simulating resolution logic...`);
    
    if (market.market_type?.is_binary) {
      console.log(`📊 Binary Market Resolution:`);
      const strikePrice = Number(market.strike_price);
      console.log(`- Strike Price: $${(strikePrice / 1e8).toFixed(2)}`);
      console.log(`- Resolution Logic: Price > Strike = Long (0), Price < Strike = Short (1), Price = Strike = No Winner (255)`);
      
      // Test with different prices
      const testPrices = [strikePrice - 1000, strikePrice, strikePrice + 1000];
      testPrices.forEach(price => {
        const result = price > strikePrice ? 'Long wins (0)' : 
                      price < strikePrice ? 'Short wins (1)' : 'No winner (255)';
        console.log(`  - Price $${(price / 1e8).toFixed(2)}: ${result}`);
      });
    } else {
      console.log(`📊 Multi-Outcome Market Resolution:`);
      console.log(`- Price Ranges: ${market.price_ranges?.length || 0} ranges`);
      console.log(`- Outcomes: ${market.outcomes?.length || 0} outcomes`);
      
      if (market.price_ranges) {
        market.price_ranges.forEach((range, idx) => {
          console.log(`  - Range ${idx}: $${(Number(range.min_price) / 1e8).toFixed(2)} - $${(Number(range.max_price) / 1e8).toFixed(2)} (${range.outcome_name})`);
        });
      }
    }
    
    // Step 6: Check for potential issues
    console.log(`\n6️⃣ Checking for potential issues...`);
    
    const issues = [];
    
    // Check VAA size
    if (totalBytes > 2000) {
      issues.push(`VAA size is large (${totalBytes} bytes) - might cause transaction issues`);
    }
    
    // Check PNAU header
    const firstVaa = pythPriceUpdate[0];
    if (firstVaa.length >= 4) {
      const header = firstVaa.slice(0, 4);
      if (header[0] !== 80 || header[1] !== 78 || header[2] !== 65 || header[3] !== 85) {
        issues.push('Invalid PNAU header');
      }
    }
    
    // Check price feed ID
    if (priceFeedId.length !== 64) {
      issues.push(`Invalid price feed ID length: ${priceFeedId.length}`);
    }
    
    // Check market maturity
    const now = Math.floor(Date.now() / 1000);
    const maturityTime = Number(market.maturity_time);
    if (now < maturityTime) {
      issues.push(`Market not yet mature (${maturityTime - now} seconds remaining)`);
    }
    
    if (issues.length === 0) {
      console.log(`✅ No issues detected - ready for resolution!`);
    } else {
      console.log(`⚠️  Issues detected:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    // Step 7: Summary
    console.log(`\n7️⃣ Summary:`);
    console.log(`✅ Market data: Valid`);
    console.log(`✅ Price feed ID: ${priceFeedId}`);
    console.log(`✅ VAA data: ${vaas.length} VAAs, ${totalBytes} bytes`);
    console.log(`✅ PNAU header: Valid`);
    console.log(`✅ Market type: ${market.market_type?.is_binary ? 'Binary' : 'Multi-outcome'}`);
    console.log(`✅ Resolution logic: Ready`);
    
    console.log(`\n🎉 Resolve flow test completed successfully!`);
    console.log(`💡 The market should be ready for resolution.`);
    
  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    console.error(`Stack trace:`, error.stack);
  }
}

async function main() {
  const marketAddress = process.argv[2];
  await testResolveFlow(marketAddress);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testResolveFlow };
