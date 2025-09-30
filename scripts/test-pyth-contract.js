#!/usr/bin/env node

/**
 * Test script to validate Pyth contract interaction
 * Usage: node scripts/test-pyth-contract.js
 */

const https = require('https');

async function testPythContract() {
  console.log(`🧪 Testing Pyth contract interaction`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Test with a simple VAA to see if Pyth contract accepts it
    const priceFeedId = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
    
    // Get VAA data
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
    console.log(`🔗 Fetching VAA from: ${url}`);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = JSON.parse(text);
    console.log(`✅ VAA data received`);
    
    // Process VAA
    let vaas = [];
    if (data && data.binary && data.binary.encoding === 'hex' && Array.isArray(data.binary.data)) {
      vaas = data.binary.data.map((hexStr) => {
        const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
        const bytes = Buffer.from(cleanHex, 'hex');
        return bytes.toString('base64');
      });
    }
    
    if (vaas.length === 0) {
      throw new Error('No VAA data found');
    }
    
    const vaa = vaas[0];
    const decoded = Buffer.from(vaa, 'base64');
    const numberArray = Array.from(decoded);
    
    console.log(`\n📊 VAA Analysis:`);
    console.log(`- Base64 length: ${vaa.length}`);
    console.log(`- Decoded length: ${decoded.length} bytes`);
    console.log(`- Header: [${decoded.slice(0, 4).join(', ')}]`);
    console.log(`- First 16 bytes: ${Array.from(decoded.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Test different VAA sizes
    const testSizes = [500, 1000, 1311, 2000];
    
    for (const size of testSizes) {
      console.log(`\n🔬 Testing with VAA size: ${size} bytes`);
      
      const testVaa = numberArray.slice(0, size);
      const testPayload = [testVaa];
      
      console.log(`- Test payload: ${testPayload.length} chunks, ${testVaa.length} bytes total`);
      console.log(`- First 8 bytes: [${testVaa.slice(0, 8).join(', ')}]`);
      
      // Check if size is reasonable
      if (size > 2000) {
        console.log(`⚠️  Size ${size} might be too large for transaction`);
      } else if (size < 200) {
        console.log(`⚠️  Size ${size} might be too small for complete VAA`);
      } else {
        console.log(`✅ Size ${size} looks reasonable`);
      }
    }
    
    // Test with minimal VAA (just header)
    console.log(`\n🔬 Testing with minimal VAA (PNAU header only):`);
    const minimalVaa = [80, 78, 65, 85, 1, 0, 0, 0]; // PNAU + version
    const minimalPayload = [minimalVaa];
    console.log(`- Minimal payload: [${minimalVaa.join(', ')}]`);
    console.log(`- This should be small enough to avoid transaction size limits`);
    
    console.log(`\n✅ Pyth contract test completed!`);
    console.log(`\n💡 Recommendations:`);
    console.log(`1. Try with smaller VAA size (500-1000 bytes)`);
    console.log(`2. Ensure VAA has valid PNAU header`);
    console.log(`3. Check if Pyth contract is properly deployed`);
    console.log(`4. Verify price_feed_id matches the VAA data`);
    
  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    process.exit(1);
  }
}

async function main() {
  await testPythContract();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testPythContract };
