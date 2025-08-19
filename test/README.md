# NFT Count Feature Tests

This directory contains comprehensive tests for the NFT count feature that displays the number of NFTs collected from events on user profiles.

## 🎯 Test Coverage

### 1. NFT Count Component Tests (`nft-count-component.test.js`)
Tests the core NFT count display component functionality:

- ✅ **Loading States**: Verifies loading spinner appears while fetching data
- ✅ **Zero NFTs**: Tests display for users with no NFT collection
- ✅ **Single NFT**: Tests display for users with 1 NFT
- ✅ **Multiple NFTs**: Tests display for users with multiple NFTs
- ✅ **Error Handling**: Tests graceful error handling and fallback to 0
- ✅ **Styling**: Verifies visual elements (gradient, star icon, colors)
- ✅ **Responsiveness**: Tests on different screen sizes
- ✅ **Performance**: Tests with large NFT collections (100+ NFTs)

### 2. NFT Count Integration Tests (`nft-count-integration.test.js`)
Tests the complete end-to-end flow:

- ✅ **Event Creation**: Creates paid events with NFT tickets
- ✅ **Event Registration**: Registers for events and mints NFTs
- ✅ **NFT Count Updates**: Verifies count increases after registration
- ✅ **Multiple Events**: Tests count with multiple event registrations
- ✅ **Event Cancellation**: Tests count behavior when events are cancelled
- ✅ **Free Events**: Tests NFT count with free events
- ✅ **Different Users**: Tests various user scenarios

## 🚀 Running the Tests

### Prerequisites
- Node.js installed
- The app running on `http://localhost:3000`
- Playwright installed (will be auto-installed if missing)

### Quick Start
```bash
# Run all NFT count tests
node test/run-nft-tests.js

# Or run individual test files
npx playwright test test/nft-count-component.test.js
npx playwright test test/nft-count-integration.test.js
```

### Manual Setup
```bash
# Install Playwright if not already installed
npm install -D @playwright/test
npx playwright install

# Start the development server
npm run dev

# Run tests in another terminal
npx playwright test test/
```

## 📋 Test Scenarios

### Component Tests
1. **Loading State**: Shows spinner while fetching NFT data
2. **Empty Collection**: Displays "0 NFTs collected from events"
3. **Single NFT**: Displays "1 NFT collected from events"
4. **Multiple NFTs**: Displays "X NFTs collected from events"
5. **Error Handling**: Gracefully handles network errors
6. **Visual Design**: Purple gradient background with star icon
7. **Responsive Design**: Works on mobile, tablet, and desktop

### Integration Tests
1. **Complete Flow**: Event creation → Registration → NFT minting → Count display
2. **Multiple Events**: Register for multiple events and verify count
3. **Event Cancellation**: Verify NFT count remains after event cancellation
4. **Free Events**: Test NFT count with free events
5. **User Scenarios**: Test different user states (new user, existing user)

## 🔧 Test Configuration

### Mock Data
The tests use mock data to simulate:
- Wallet connections
- NFT ticket collections
- Network responses
- Payment transactions

### Test Environment
- **Base URL**: `http://localhost:3000`
- **Network**: Base mainnet (chain ID: 0x2105)
- **Timeout**: 10 seconds for most operations
- **Viewport**: Responsive testing on multiple screen sizes

## 📊 Expected Results

### Successful Test Run
```
🚀 Running NFT Count Integration Tests...

📋 NFT Count Component Tests
   Testing the NFT count display component functionality

✅ NFT Count Component Tests - PASSED

📋 NFT Count Integration Tests
   Testing the complete flow from event creation to NFT collection

✅ NFT Count Integration Tests - PASSED

🎉 All NFT count tests passed!

📊 Test Summary:
   ✅ NFT count component displays correctly
   ✅ Loading states work properly
   ✅ Error handling is robust
   ✅ Integration flow works end-to-end
   ✅ Styling and responsiveness verified
   ✅ Performance with large collections
```

## 🐛 Troubleshooting

### Common Issues

1. **App not running**: Make sure the development server is running on port 3000
2. **Playwright not installed**: The test runner will auto-install Playwright
3. **Network timeouts**: Increase timeout values in test files if needed
4. **Mock data issues**: Check that mock functions are properly injected

### Debug Mode
```bash
# Run tests in debug mode
npx playwright test test/ --debug

# Run with verbose output
npx playwright test test/ --reporter=verbose
```

## 📝 Test Maintenance

### Adding New Tests
1. Create new test file in `test/` directory
2. Follow naming convention: `feature-name.test.js`
3. Add to `run-nft-tests.js` if it's part of the NFT count feature
4. Update this README with new test scenarios

### Updating Existing Tests
- Keep mock data realistic
- Maintain test isolation
- Update selectors if UI changes
- Ensure tests are still relevant

## 🎯 Test Goals

These tests ensure that:
- Users can see their NFT collection count on their profile
- The count updates correctly when they register for new events
- The feature works reliably across different scenarios
- The UI is responsive and visually appealing
- Error states are handled gracefully
- Performance remains good with large collections
