#!/usr/bin/env node

/**
 * Debug script to test VAA data and identify E_WRONG_VERSION issues
 * Usage: node scripts/debug-vaa.js [price_feed_id]
 */

const https = require('https');

// Default price feed ID for BTC/USD
const DEFAULT_PRICE_FEED_ID = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

async function fetchVAA(priceFeedId) {
  const endpoints = [
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`,
    `https://hermes.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`,
    `https://xc-mainnet.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    console.log(`\n=== Trying endpoint ${i + 1}/${endpoints.length} ===`);
    console.log(`URL: ${url}`);
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response length: ${text.length}`);
      console.log(`Response preview: ${text.slice(0, 200)}...`);
      
      if (!response.ok) {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        continue;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log(`❌ JSON parse error:`, parseError.message);
        continue;
      }
      
      // Handle different response formats
      let vaas = [];
      if (Array.isArray(data)) {
        vaas = data;
      } else if (data && Array.isArray(data.vaas)) {
        vaas = data.vaas;
      } else if (data && data.binary) {
        // Handle v2 API response format - check encoding
        if (data.binary.encoding === 'hex' && Array.isArray(data.binary.data)) {
          // Convert hex strings to base64
          vaas = data.binary.data.map((hexStr) => {
            try {
              // Remove any 0x prefix
              const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
              // Convert hex to base64
              const bytes = Buffer.from(cleanHex, 'hex');
              return bytes.toString('base64');
            } catch (error) {
              console.warn(`Failed to convert hex to base64:`, error);
              return hexStr; // Return as-is if conversion fails
            }
          });
        } else if (Array.isArray(data.binary.data)) {
          vaas = data.binary.data;
        }
      } else if (data && Array.isArray(data.updates)) {
        vaas = data.updates;
      }
      
      console.log(`✅ Found ${vaas.length} VAAs`);
      
      if (vaas.length > 0) {
        // Analyze first VAA
        const vaa = vaas[0];
        console.log(`\n--- VAA Analysis ---`);
        console.log(`VAA length: ${vaa.length} characters`);
        
        try {
          const decoded = Buffer.from(vaa, 'base64');
          console.log(`Decoded length: ${decoded.length} bytes`);
          
          if (decoded.length >= 4) {
            const version = decoded[0];
            const guardianSetIndex = decoded.readUInt32BE(1);
            const signatureCount = decoded[5];
            
            console.log(`Version: ${version}`);
            console.log(`Guardian Set Index: ${guardianSetIndex}`);
            console.log(`Signature Count: ${signatureCount}`);
            
            // Check for common issues
            if (version !== 1 && version !== 2) {
              console.log(`⚠️  WARNING: Unsupported VAA version ${version}`);
            }
            
            if (decoded.length < 100) {
              console.log(`⚠️  WARNING: VAA seems too short (${decoded.length} bytes)`);
            }
            
            console.log(`First 16 bytes:`, Array.from(decoded.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            return {
              endpoint: url,
              vaas: vaas,
              analysis: {
                version,
                guardianSetIndex,
                signatureCount,
                length: decoded.length
              }
            };
          } else {
            console.log(`❌ VAA too short to analyze`);
          }
        } catch (decodeError) {
          console.log(`❌ Base64 decode error:`, decodeError.message);
        }
      }
      
    } catch (error) {
      console.log(`❌ Request error:`, error.message);
    }
  }
  
  throw new Error('All endpoints failed');
}

async function main() {
  const priceFeedId = process.argv[2] || DEFAULT_PRICE_FEED_ID;
  
  console.log(`🔍 Debugging VAA for price feed ID: ${priceFeedId}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    const result = await fetchVAA(priceFeedId);
    console.log(`\n✅ SUCCESS!`);
    console.log(`Working endpoint: ${result.endpoint}`);
    console.log(`VAA version: ${result.analysis.version}`);
    console.log(`VAA length: ${result.analysis.length} bytes`);
    
    // Test base64 to bytes conversion
    console.log(`\n--- Base64 to Bytes Test ---`);
    const vaa = result.vaas[0];
    const bytes = Array.from(Buffer.from(vaa, 'base64'));
    console.log(`Converted to ${bytes.length} bytes`);
    console.log(`First 8 bytes: [${bytes.slice(0, 8).join(', ')}]`);
    console.log(`Last 8 bytes: [${bytes.slice(-8).join(', ')}]`);
    
  } catch (error) {
    console.log(`\n❌ FAILED:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchVAA };
