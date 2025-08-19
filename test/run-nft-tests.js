#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running NFT Count Integration Tests...\n');

// Test scenarios to run
const testScenarios = [
  {
    name: 'NFT Count Component Tests',
    file: 'nft-count-component.test.js',
    description: 'Testing the NFT count display component functionality'
  },
  {
    name: 'NFT Count Integration Tests',
    file: 'nft-count-integration.test.js',
    description: 'Testing the complete flow from event creation to NFT collection'
  },
  {
    name: 'Onchain Ticket Creation Tests',
    file: 'onchain-ticket-creation.test.js',
    description: 'Testing onchain ticket creation and NFT minting features'
  },
  {
    name: 'Smart Contract Integration Tests',
    file: 'smart-contract-integration.test.js',
    description: 'Testing smart contract integration and environment configuration'
  },
  {
    name: 'Token Gating Error Handling Tests',
    file: 'token-gating-error-handling.test.js',
    description: 'Testing token gating error handling for invalid addresses and network issues'
  },
  {
    name: 'Token Gating UI Error Handling Tests',
    file: 'token-gating-ui-error-handling.test.js',
    description: 'Testing token gating UI error handling and user feedback'
  }
];

async function runTests() {
  let allTestsPassed = true;
  
  for (const scenario of testScenarios) {
    console.log(`📋 ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);
    
    try {
      const testPath = path.join(__dirname, scenario.file);
      execSync(`npx playwright test ${testPath} --reporter=list`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(`✅ ${scenario.name} - PASSED\n`);
    } catch (error) {
      console.log(`❌ ${scenario.name} - FAILED\n`);
      allTestsPassed = false;
    }
  }
  
  if (allTestsPassed) {
    console.log('🎉 All NFT count tests passed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ NFT count component displays correctly');
    console.log('   ✅ Loading states work properly');
    console.log('   ✅ Error handling is robust');
    console.log('   ✅ Integration flow works end-to-end');
    console.log('   ✅ Styling and responsiveness verified');
    console.log('   ✅ Performance with large collections');
  } else {
    console.log('💥 Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Check if Playwright is installed
try {
  execSync('npx playwright --version', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ Playwright is not installed. Installing...');
  try {
    execSync('npm install -D @playwright/test', { stdio: 'inherit' });
    execSync('npx playwright install', { stdio: 'inherit' });
    console.log('✅ Playwright installed successfully!\n');
  } catch (installError) {
    console.log('❌ Failed to install Playwright. Please install manually:');
    console.log('   npm install -D @playwright/test');
    console.log('   npx playwright install');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
