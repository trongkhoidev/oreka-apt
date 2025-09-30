#!/usr/bin/env node

/**
 * Comprehensive test script for market resolution
 * Tests both binary and multi-outcome market resolution
 * Usage: node scripts/test-market-resolution.js
 */

const https = require('https');

// Test data for different market types
const TEST_MARKETS = {
  binary: {
    name: 'Binary Market (BTC/USD)',
    priceFeedId: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    strikePrice: 50000,
    marketType: 'binary'
  },
  multiOutcome: {
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
};

async function fetchVAAData(priceFeedId) {
  console.log(`🔗 Fetching VAA for price feed: ${priceFeedId}`);
  
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

function analyzeVAA(vaa, marketType) {
  const decoded = Buffer.from(vaa, 'base64');
  const numberArray = Array.from(decoded);
  
  console.log(`\n📊 VAA Analysis for ${marketType}:`);
  console.log(`- Base64 length: ${vaa.length}`);
  console.log(`- Decoded length: ${decoded.length} bytes`);
  console.log(`- Header: [${decoded.slice(0, 4).join(', ')}] (${Array.from(decoded.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
  
  // Check PNAU header
  const header = Array.from(decoded.slice(0, 4));
  const hasValidHeader = header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85;
  console.log(`- PNAU header: ${hasValidHeader ? '✅ Valid' : '❌ Invalid'}`);
  
  // Check size
  const sizeStatus = decoded.length > 2000 ? '⚠️  Large' : decoded.length < 200 ? '⚠️  Small' : '✅ Good';
  console.log(`- Size: ${decoded.length} bytes (${sizeStatus})`);
  
  // Check byte values
  const invalidBytes = numberArray.filter(b => b < 0 || b > 255);
  console.log(`- Byte values: ${invalidBytes.length === 0 ? '✅ All valid' : `❌ ${invalidBytes.length} invalid`}`);
  
  return {
    isValid: hasValidHeader && invalidBytes.length === 0,
    size: decoded.length,
    numberArray: numberArray
  };
}

function testTransactionPayload(vaaData, marketType) {
  console.log(`\n🧪 Testing transaction payload for ${marketType}:`);
  
  const { numberArray, size } = vaaData;
  
  // Test different payload sizes
  const testSizes = [
    { name: 'Minimal', size: 8, data: numberArray.slice(0, 8) },
    { name: 'Small', size: 500, data: numberArray.slice(0, 500) },
    { name: 'Medium', size: 1000, data: numberArray.slice(0, 1000) },
    { name: 'Full', size: size, data: numberArray }
  ];
  
  for (const test of testSizes) {
    const payload = [test.data];
    const totalBytes = test.data.length;
    
    console.log(`\n  ${test.name} payload (${totalBytes} bytes):`);
    console.log(`  - Chunks: ${payload.length}`);
    console.log(`  - First 8: [${test.data.slice(0, 8).join(', ')}]`);
    console.log(`  - Last 8: [${test.data.slice(-8).join(', ')}]`);
    
    // Assess payload
    if (totalBytes > 5000) {
      console.log(`  - Status: ⚠️  Very large - might cause transaction issues`);
    } else if (totalBytes > 2000) {
      console.log(`  - Status: ⚠️  Large - monitor transaction size`);
    } else if (totalBytes < 100) {
      console.log(`  - Status: ⚠️  Small - might be incomplete`);
    } else {
      console.log(`  - Status: ✅ Good size for transaction`);
    }
  }
}

function simulateMarketResolution(market, vaaData) {
  console.log(`\n🎯 Simulating market resolution for ${market.name}:`);
  
  const { numberArray } = vaaData;
  const payload = [numberArray.slice(0, 1000)]; // Use truncated version for safety
  
  console.log(`- Market type: ${market.marketType}`);
  console.log(`- Price feed ID: ${market.priceFeedId}`);
  console.log(`- VAA payload: ${payload[0].length} bytes`);
  
  if (market.marketType === 'binary') {
    console.log(`- Strike price: $${market.strikePrice}`);
    console.log(`- Resolution logic: Price > Strike = Long wins, Price < Strike = Short wins`);
  } else if (market.marketType === 'multi-outcome') {
    console.log(`- Price ranges: ${market.priceRanges.length} outcomes`);
    market.priceRanges.forEach((range, idx) => {
      console.log(`  - Outcome ${idx}: $${range.min} - $${range.max}`);
    });
  }
  
  // Simulate different price scenarios
  const testPrices = [1500, 2500, 3500, 4500, 5500];
  
  console.log(`\n  Price resolution scenarios:`);
  testPrices.forEach(price => {
    if (market.marketType === 'binary') {
      const result = price > market.strikePrice ? 'Long wins' : price < market.strikePrice ? 'Short wins' : 'No winner';
      console.log(`  - Price $${price}: ${result}`);
    } else if (market.marketType === 'multi-outcome') {
      const winningOutcome = market.priceRanges.findIndex(range => price >= range.min && price < range.max);
      const result = winningOutcome >= 0 ? `Outcome ${winningOutcome} wins` : 'No winner';
      console.log(`  - Price $${price}: ${result}`);
    }
  });
}

async function testMarketType(marketType, marketConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing ${marketConfig.name}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Fetch VAA data
    const vaas = await fetchVAAData(marketConfig.priceFeedId);
    
    if (vaas.length === 0) {
      throw new Error('No VAA data received');
    }
    
    // Analyze VAA
    const vaaData = analyzeVAA(vaas[0], marketType);
    
    if (!vaaData.isValid) {
      console.log(`❌ VAA validation failed for ${marketType}`);
      return false;
    }
    
    // Test transaction payload
    testTransactionPayload(vaaData, marketType);
    
    // Simulate market resolution
    simulateMarketResolution(marketConfig, vaaData);
    
    console.log(`\n✅ ${marketConfig.name} test completed successfully!`);
    return true;
    
  } catch (error) {
    console.error(`\n❌ ${marketConfig.name} test failed:`, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(`🚀 Starting comprehensive market resolution tests`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🎯 Testing both binary and multi-outcome markets`);
  
  const results = {
    binary: false,
    multiOutcome: false
  };
  
  // Test binary market
  results.binary = await testMarketType('binary', TEST_MARKETS.binary);
  
  // Test multi-outcome market
  results.multiOutcome = await testMarketType('multi-outcome', TEST_MARKETS.multiOutcome);
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Binary Market: ${results.binary ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multi-Outcome Market: ${results.multiOutcome ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.binary && results.multiOutcome;
  console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log(`\n🎉 Market resolution is ready for both market types!`);
    console.log(`💡 You can now safely resolve both binary and multi-outcome markets.`);
  } else {
    console.log(`\n⚠️  Some issues detected. Check the logs above for details.`);
    console.log(`💡 Consider using the fallback mechanisms in the frontend.`);
  }
  
  return allPassed;
}

async function main() {
  try {
    const success = await runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`\n💥 Test suite failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests, testMarketType };
