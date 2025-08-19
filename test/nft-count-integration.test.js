const { test, expect } = require('@playwright/test');

test.describe('NFT Count Integration Tests', () => {
  let testEventId;
  let testUserAddress = '0x1234567890123456789012345678901234567890';
  let testCreatorAddress = '0x9876543210987654321098765432109876543210';

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Mock wallet connection for testing
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method, params }) => {
          if (method === 'eth_accounts') {
            return [testUserAddress];
          }
          if (method === 'eth_chainId') {
            return '0x2105'; // Base mainnet
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
        isMetaMask: true
      };
    });
  });

  test('Complete NFT count flow from event creation to collection', async ({ page }) => {
    // Test 1: Create a paid event with NFT tickets
    await test.step('Create event with NFT tickets', async () => {
      await page.click('text=Create Event');
      
      // Fill event form
      await page.fill('input[placeholder="Enter event title"]', 'Test NFT Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Test event for NFT collection');
      await page.fill('input[type="date"]', '2024-12-31');
      await page.fill('input[type="time"]', '18:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Enable paid event
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '10');
      
      // Submit event
      await page.click('button:has-text("Create Event")');
      
      // Wait for event creation
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Get the event ID from the URL or response
      const eventUrl = page.url();
      testEventId = eventUrl.split('/events/')[1];
      expect(testEventId).toBeTruthy();
    });

    // Test 2: Register for the event (simulate payment and NFT minting)
    await test.step('Register for event and mint NFT', async () => {
      // Navigate to the event
      await page.goto(`http://localhost:3000/events/${testEventId}`);
      
      // Mock successful payment
      await page.addInitScript(() => {
        window.mockPaymentSuccess = true;
        window.mockNFTMintSuccess = true;
      });
      
      // Click register button
      await page.click('button:has-text("Register Now")');
      
      // Fill registration form
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      
      // Mock payment transaction
      await page.evaluate(() => {
        // Simulate successful USDC payment
        window.ethereum.request = async ({ method }) => {
          if (method === 'eth_sendTransaction') {
            return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          }
          return null;
        };
      });
      
      // Complete registration
      await page.click('button:has-text("Complete Registration")');
      
      // Wait for registration success
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
    });

    // Test 3: Verify NFT count in profile
    await test.step('Verify NFT count in profile', async () => {
      // Navigate to profile
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Wait for NFT count to load
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
      
      // Verify the count is displayed correctly
      const nftCountElement = await page.locator('text=1 NFT collected from events');
      await expect(nftCountElement).toBeVisible();
      
      // Verify the styling is correct
      const nftBadge = await page.locator('.bg-gradient-to-r.from-purple-100.to-pink-100');
      await expect(nftBadge).toBeVisible();
    });

    // Test 4: Create another event and register to test multiple NFTs
    await test.step('Create second event and test multiple NFT count', async () => {
      // Create another event
      await page.click('text=Create Event');
      
      await page.fill('input[placeholder="Enter event title"]', 'Second NFT Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Another test event');
      await page.fill('input[type="date"]', '2024-12-30');
      await page.fill('input[type="time"]', '19:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Second Location');
      
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '5');
      
      await page.click('button:has-text("Create Event")');
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Get second event ID
      const eventUrl = page.url();
      const secondEventId = eventUrl.split('/events/')[1];
      
      // Register for second event
      await page.goto(`http://localhost:3000/events/${secondEventId}`);
      await page.click('button:has-text("Register Now")');
      
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      
      await page.click('button:has-text("Complete Registration")');
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
      
      // Check profile again - should show 2 NFTs
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      await page.waitForSelector('text=2 NFTs collected from events', { timeout: 10000 });
      const nftCountElement = await page.locator('text=2 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
    });
  });

  test('NFT count loading states and error handling', async ({ page }) => {
    await test.step('Test loading state', async () => {
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Should show loading state initially
      const loadingElement = await page.locator('text=Loading NFT collection...');
      await expect(loadingElement).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForSelector('text=Loading NFT collection...', { state: 'hidden', timeout: 10000 });
    });

    await test.step('Test error handling', async () => {
      // Mock network error
      await page.addInitScript(() => {
        window.mockNetworkError = true;
      });
      
      await page.reload();
      await page.click('text=Profile');
      
      // Should handle error gracefully and show 0 NFTs
      await page.waitForSelector('text=0 NFTs collected from events', { timeout: 10000 });
    });
  });

  test('NFT count with different user scenarios', async ({ page }) => {
    await test.step('Test new user with no NFTs', async () => {
      // Mock new user address
      testUserAddress = '0x1111111111111111111111111111111111111111';
      
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Should show 0 NFTs for new user
      await page.waitForSelector('text=0 NFTs collected from events', { timeout: 10000 });
    });

    await test.step('Test user with existing NFTs', async () => {
      // Mock user with existing NFTs
      testUserAddress = '0x2222222222222222222222222222222222222222';
      
      // Mock existing NFT data
      await page.addInitScript(() => {
        window.mockExistingNFTs = [
          { id: '1', event: { title: 'Past Event 1' } },
          { id: '2', event: { title: 'Past Event 2' } },
          { id: '3', event: { title: 'Past Event 3' } }
        ];
      });
      
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Should show 3 NFTs
      await page.waitForSelector('text=3 NFTs collected from events', { timeout: 10000 });
    });
  });

  test('NFT count updates after event cancellation', async ({ page }) => {
    await test.step('Test NFT count after event cancellation', async () => {
      // Create and register for an event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Cancellable Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Event to be cancelled');
      await page.fill('input[type="date"]', '2024-12-29');
      await page.fill('input[type="time"]', '20:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Cancellable Location');
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '15');
      await page.click('button:has-text("Create Event")');
      
      // Register for the event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      await page.click('button:has-text("Register Now")');
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      await page.click('button:has-text("Complete Registration")');
      
      // Verify NFT count increased
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
      
      // Cancel the event
      await page.goto(`http://localhost:3000/events/${eventId}`);
      await page.click('button:has-text("Cancel Event")');
      await page.click('button:has-text("Cancel Event")'); // Confirm cancellation
      
      // NFT count should remain the same (NFTs are still valid collectibles)
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
    });
  });

  test('NFT count with free events', async ({ page }) => {
    await test.step('Test NFT count with free events', async () => {
      // Create a free event with optional NFT
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Free NFT Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Free event with NFT');
      await page.fill('input[type="date"]', '2024-12-28');
      await page.fill('input[type="time"]', '17:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Free Location');
      
      // Keep as free event
      await page.click('input[name="eventType"][value="free"]');
      
      await page.click('button:has-text("Create Event")');
      
      // Register for free event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      await page.click('button:has-text("Register Now")');
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      await page.click('button:has-text("Complete Registration")');
      
      // Verify NFT count includes free event NFT
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
    });
  });
});
