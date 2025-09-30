#!/usr/bin/env node

/**
 * Test script to validate VAA data for market resolution
 * Usage: node scripts/test-vaa-resolution.js [price_feed_id]
 */

const https = require('https');

// Default price feed ID for BTC/USD
const DEFAULT_PRICE_FEED_ID = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

async function testVAAResolution(priceFeedId) {
  console.log(`🧪 Testing VAA resolution for price feed ID: ${priceFeedId}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Test Hermes API v2 endpoint
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
    console.log(`\n🔗 Fetching from: ${url}`);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = JSON.parse(text);
    console.log(`✅ Response received: ${text.length} characters`);
    
    // Process VAA data
    let vaas = [];
    if (data && data.binary && data.binary.encoding === 'hex' && Array.isArray(data.binary.data)) {
      console.log(`📦 Found ${data.binary.data.length} hex-encoded VAAs`);
      
      // Convert hex to base64
      vaas = data.binary.data.map((hexStr, idx) => {
        const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
        const bytes = Buffer.from(cleanHex, 'hex');
        const base64 = bytes.toString('base64');
        
        console.log(`VAA[${idx}]: ${hexStr.length} hex chars -> ${bytes.length} bytes -> ${base64.length} base64 chars`);
        return base64;
      });
    } else {
      throw new Error('Unexpected response format');
    }
    
    // Analyze VAA data
    console.log(`\n🔍 Analyzing VAA data...`);
    
    for (let i = 0; i < vaas.length; i++) {
      const vaa = vaas[i];
      const decoded = Buffer.from(vaa, 'base64');
      
      console.log(`\n--- VAA ${i} Analysis ---`);
      console.log(`Base64 length: ${vaa.length}`);
      console.log(`Decoded length: ${decoded.length} bytes`);
      
      if (decoded.length >= 4) {
        const header = Array.from(decoded.slice(0, 4));
        const headerHex = header.map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`Header: [${header.join(', ')}] (hex: ${headerHex})`);
        
        // Check for PNAU header
        if (header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85) {
          console.log(`✅ Valid PNAU header detected`);
        } else {
          console.log(`⚠️  Unexpected header - not PNAU format`);
        }
      }
      
      // Check size
      if (decoded.length > 2000) {
        console.log(`⚠️  VAA is large (${decoded.length} bytes) - might cause transaction issues`);
      } else if (decoded.length < 200) {
        console.log(`⚠️  VAA seems small (${decoded.length} bytes) - might be incomplete`);
      } else {
        console.log(`✅ VAA size looks reasonable (${decoded.length} bytes)`);
      }
      
      // Convert to number array format (as used in frontend)
      const numberArray = Array.from(decoded);
      console.log(`Number array length: ${numberArray.length}`);
      console.log(`First 8 numbers: [${numberArray.slice(0, 8).join(', ')}]`);
      console.log(`Last 8 numbers: [${numberArray.slice(-8).join(', ')}]`);
      
      // Check for invalid values
      const invalidValues = numberArray.filter(n => n < 0 || n > 255);
      if (invalidValues.length > 0) {
        console.log(`❌ Invalid byte values found: ${invalidValues.length} values`);
      } else {
        console.log(`✅ All byte values are valid (0-255)`);
      }
    }
    
    // Test transaction payload format
    console.log(`\n📋 Testing transaction payload format...`);
    const pythPriceUpdate = vaas.map(vaa => {
      const decoded = Buffer.from(vaa, 'base64');
      return Array.from(decoded);
    });
    
    const totalBytes = pythPriceUpdate.reduce((sum, chunk) => sum + chunk.length, 0);
    console.log(`Total payload size: ${totalBytes} bytes across ${pythPriceUpdate.length} chunks`);
    
    if (totalBytes > 10000) {
      console.log(`⚠️  Payload is very large - consider truncating`);
      
      // Test truncated version
      const truncated = pythPriceUpdate.map(chunk => chunk.slice(0, 2000));
      const truncatedSize = truncated.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`Truncated size: ${truncatedSize} bytes`);
    }
    
    console.log(`\n✅ VAA resolution test completed successfully!`);
    
  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    process.exit(1);
  }
}

async function main() {
  const priceFeedId = process.argv[2] || DEFAULT_PRICE_FEED_ID;
  await testVAAResolution(priceFeedId);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testVAAResolution };
