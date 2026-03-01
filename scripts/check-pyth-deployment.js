#!/usr/bin/env node

/**
 * Check Pyth contract deployment status
 * Usage: node scripts/check-pyth-deployment.js
 */

const https = require('https');

async function checkPythDeployment() {
  console.log(`🔍 Checking Pyth Contract Deployment`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check if Pyth contract is deployed
    const pythAddress = '0x430c8e64a91b84b4b97015d8334cf58f1ac24e4ea1c43a94c9a5f02b0dcb3d8c';
    const url = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${pythAddress}`;
    
    console.log(`\n🔗 Checking Pyth contract at: ${pythAddress}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Pyth contract is deployed`);
      console.log(`- Sequence number: ${data.sequence_number}`);
      console.log(`- Authentication key: ${data.authentication_key}`);
    } else {
      console.log(`❌ Pyth contract not found or not accessible`);
      console.log(`- Status: ${response.status}`);
      console.log(`- This might be the issue!`);
    }
    
    // Check our contract deployment
    const ourAddress = '0x288411cf0c7d7fe21fde828a8958f1971934dd9237fb69be36e15470b857449d';
    const ourUrl = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${ourAddress}`;
    
    console.log(`\n🔗 Checking our contract at: ${ourAddress}`);
    
    const ourResponse = await fetch(ourUrl);
    if (ourResponse.ok) {
      const ourData = await ourResponse.json();
      console.log(`✅ Our contract is deployed`);
      console.log(`- Sequence number: ${ourData.sequence_number}`);
    } else {
      console.log(`❌ Our contract not found`);
      console.log(`- Status: ${ourResponse.status}`);
    }
    
  } catch (error) {
    console.error(`❌ Deployment check failed:`, error.message);
  }
}

async function main() {
  await checkPythDeployment();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkPythDeployment };
