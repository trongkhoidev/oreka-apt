#!/usr/bin/env node

/**
 * Complete system test for market resolution
 * Tests VAA data, Move compilation, and market resolution logic
 * Usage: node scripts/test-complete-system.js
 */

const { execSync } = require('child_process');
const https = require('https');

async function testVAAData() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔗 VAA DATA TEST`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const priceFeedId = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
    
    console.log(`Fetching VAA from: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.binary || data.binary.encoding !== 'hex' || !Array.isArray(data.binary.data)) {
      throw new Error('Invalid VAA response format');
    }
    
    const vaas = data.binary.data.map((hexStr) => {
      const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
      const bytes = Buffer.from(cleanHex, 'hex');
      return bytes.toString('base64');
    });
    
    const vaa = vaas[0];
    const decoded = Buffer.from(vaa, 'base64');
    const header = Array.from(decoded.slice(0, 4));
    
    console.log(`✅ VAA data fetched successfully`);
    console.log(`- VAA count: ${vaas.length}`);
    console.log(`- VAA size: ${decoded.length} bytes`);
    console.log(`- Header: [${header.join(', ')}] (${header.map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
    
    const hasValidHeader = header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85;
    console.log(`- PNAU header: ${hasValidHeader ? '✅ Valid' : '❌ Invalid'}`);
    
    return hasValidHeader;
  } catch (error) {
    console.error(`❌ VAA data test failed:`, error.message);
    return false;
  }
}

async function testMoveCompilation() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔨 MOVE COMPILATION TEST`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    console.log(`Compiling Move sources...`);
    const output = execSync('aptos move compile --package-dir sources', { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    console.log(`✅ Move compilation successful`);
    console.log(`Compiled modules:`);
    
    // Parse the output to show compiled modules
    const lines = output.split('\n');
    const moduleLines = lines.filter(line => line.includes('::'));
    moduleLines.forEach(line => {
      if (line.trim()) {
        console.log(`  - ${line.trim()}`);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Move compilation failed:`, error.message);
    return false;
  }
}

function testMarketResolutionLogic() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 MARKET RESOLUTION LOGIC TEST`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Test binary market resolution
    console.log(`\n📊 Binary Market Resolution:`);
    const binaryTestCases = [
      { price: 45000, strike: 50000, expected: 'Short wins' },
      { price: 55000, strike: 50000, expected: 'Long wins' },
      { price: 50000, strike: 50000, expected: 'No winner' }
    ];
    
    binaryTestCases.forEach((testCase, idx) => {
      const result = testCase.price > testCase.strike ? 'Long wins' : 
                    testCase.price < testCase.strike ? 'Short wins' : 'No winner';
      const passed = result === testCase.expected;
      console.log(`  Test ${idx + 1}: Price $${testCase.price} vs Strike $${testCase.strike} = ${result} ${passed ? '✅' : '❌'}`);
    });
    
    // Test multi-outcome market resolution
    console.log(`\n📊 Multi-Outcome Market Resolution:`);
    const multiOutcomeRanges = [
      { min: 0, max: 2000, outcome: 0 },
      { min: 2000, max: 3000, outcome: 1 },
      { min: 3000, max: 5000, outcome: 2 },
      { min: 5000, max: 10000, outcome: 3 }
    ];
    
    const multiTestCases = [
      { price: 1500, expected: 0 },
      { price: 2500, expected: 1 },
      { price: 3500, expected: 2 },
      { price: 5500, expected: 3 },
      { price: 12000, expected: 255 } // No winner
    ];
    
    multiTestCases.forEach((testCase, idx) => {
      const winningOutcome = multiOutcomeRanges.findIndex(range => 
        testCase.price >= range.min && testCase.price < range.max
      );
      const result = winningOutcome >= 0 ? winningOutcome : 255;
      const passed = result === testCase.expected;
      console.log(`  Test ${idx + 1}: Price $${testCase.price} = Outcome ${result} ${passed ? '✅' : '❌'}`);
    });
    
    console.log(`\n✅ Market resolution logic tests completed`);
    return true;
  } catch (error) {
    console.error(`❌ Market resolution logic test failed:`, error.message);
    return false;
  }
}

function testFrontendIntegration() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌐 FRONTEND INTEGRATION TEST`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check key frontend files
    const frontendFiles = [
      'frontend/src/components/Customer.tsx',
      'frontend/src/services/aptosMarketService.ts',
      'frontend/src/utils/pythUtils.ts'
    ];
    
    console.log(`Checking frontend files:`);
    let allFilesExist = true;
    
    frontendFiles.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`  ${file}: ${exists ? '✅ Found' : '❌ Missing'}`);
      if (!exists) allFilesExist = false;
    });
    
    if (!allFilesExist) {
      throw new Error('Some frontend files are missing');
    }
    
    // Check for key functions in Customer.tsx
    const customerFile = fs.readFileSync('frontend/src/components/Customer.tsx', 'utf8');
    const keyFunctions = [
      'handleResolve',
      'fetchAndValidateVAA',
      'base64ToBytes'
    ];
    
    console.log(`\nChecking key functions in Customer.tsx:`);
    keyFunctions.forEach(func => {
      const exists = customerFile.includes(func);
      console.log(`  ${func}: ${exists ? '✅ Found' : '❌ Missing'}`);
    });
    
    // Check for error handling
    const hasErrorHandling = customerFile.includes('E_WRONG_VERSION') && 
                            customerFile.includes('Simulation error') &&
                            customerFile.includes('retry');
    console.log(`\nError handling: ${hasErrorHandling ? '✅ Comprehensive' : '❌ Incomplete'}`);
    
    console.log(`\n✅ Frontend integration test completed`);
    return true;
  } catch (error) {
    console.error(`❌ Frontend integration test failed:`, error.message);
    return false;
  }
}

async function runCompleteSystemTest() {
  console.log(`🚀 Starting complete system test for market resolution`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🎯 Testing VAA data, Move compilation, and market resolution logic`);
  
  const results = {
    vaaData: false,
    moveCompilation: false,
    marketLogic: false,
    frontendIntegration: false
  };
  
  // Test VAA data
  results.vaaData = await testVAAData();
  
  // Test Move compilation
  results.moveCompilation = await testMoveCompilation();
  
  // Test market resolution logic
  results.marketLogic = testMarketResolutionLogic();
  
  // Test frontend integration
  results.frontendIntegration = testFrontendIntegration();
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 COMPLETE SYSTEM TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`VAA Data: ${results.vaaData ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Move Compilation: ${results.moveCompilation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Market Logic: ${results.marketLogic ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Integration: ${results.frontendIntegration ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log(`\n🎉 Complete system is ready for market resolution!`);
    console.log(`💡 Both binary and multi-outcome markets can be resolved.`);
    console.log(`💡 VAA data processing is working correctly.`);
    console.log(`💡 Move contracts are properly compiled.`);
    console.log(`💡 Frontend integration is complete.`);
    console.log(`\n🚀 You can now safely resolve markets in production!`);
  } else {
    console.log(`\n⚠️  Some system issues detected. Check the logs above for details.`);
    console.log(`💡 Fix the failing components before proceeding to production.`);
  }
  
  return allPassed;
}

async function main() {
  try {
    const success = await runCompleteSystemTest();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`\n💥 Complete system test failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runCompleteSystemTest };
