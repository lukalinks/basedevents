const { test, expect } = require('@playwright/test');

test.describe('Token Gating Error Handling Tests', () => {
  
  test('Handle invalid token address gracefully', async ({ page }) => {
    await test.step('Test invalid token address error handling', async () => {
      // Mock wallet connection
      await page.addInitScript(() => {
        window.ethereum = {
          request: async ({ method }) => {
            if (method === 'eth_accounts') {
              return ['0x1234567890123456789012345678901234567890'];
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

      await page.goto('http://localhost:3000');
      
      // Create a token-gated event with invalid token address
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Invalid Token Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing invalid token address handling');
      await page.fill('input[type="date"]', '2024-12-31');
      await page.fill('input[type="time"]', '18:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Enable token gating with invalid address
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1e43D519FFdd02072ECA59e7C72120a80EeeE114'); // Invalid address
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Navigate to the event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Should show token gating status with error handling
      const tokenGateStatus = await page.locator('.onchain-card');
      await expect(tokenGateStatus).toBeVisible();
      
      // Should show appropriate error message for invalid token
      await page.waitForSelector('text=No contract found', { timeout: 10000 });
    });
  });

  test('Handle network errors gracefully', async ({ page }) => {
    await test.step('Test network error handling', async () => {
      // Mock network errors
      await page.addInitScript(() => {
        window.ethereum = {
          request: async ({ method }) => {
            if (method === 'eth_accounts') {
              return ['0x1234567890123456789012345678901234567890'];
            }
            if (method === 'eth_chainId') {
              return '0x2105';
            }
            return null;
          },
          on: () => {},
          removeListener: () => {},
          isMetaMask: true
        };
        
        // Mock network errors in the token gating functions
        window.mockNetworkError = true;
      });

      await page.goto('http://localhost:3000');
      
      // Create a token-gated event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Network Error Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing network error handling');
      await page.fill('input[type="date"]', '2024-12-30');
      await page.fill('input[type="time"]', '19:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Enable token gating with valid USDC address
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'USDC');
      await page.fill('input[placeholder="Token name"]', 'USD Coin');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Navigate to the event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Should handle network errors gracefully
      const tokenGateStatus = await page.locator('.onchain-card');
      await expect(tokenGateStatus).toBeVisible();
    });
  });

  test('Handle malformed token addresses', async ({ page }) => {
    await test.step('Test malformed address validation', async () => {
      await page.goto('http://localhost:3000');
      
      // Create a token-gated event with malformed address
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Malformed Address Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing malformed address handling');
      await page.fill('input[type="date"]', '2024-12-29');
      await page.fill('input[type="time"]', '20:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Try to enable token gating with malformed address
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', 'invalid-address'); // Malformed
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      // Should show validation error for malformed address
      await page.waitForSelector('text=Invalid address format', { timeout: 10000 });
    });
  });

  test('Handle empty token addresses', async ({ page }) => {
    await test.step('Test empty address validation', async () => {
      await page.goto('http://localhost:3000');
      
      // Create a token-gated event with empty address
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Empty Address Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing empty address handling');
      await page.fill('input[type="date"]', '2024-12-28');
      await page.fill('input[type="time"]', '17:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Try to enable token gating with empty address
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', ''); // Empty
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      // Should show validation error for empty address
      await page.waitForSelector('text=Token address is required', { timeout: 10000 });
    });
  });

  test('Handle valid token addresses successfully', async ({ page }) => {
    await test.step('Test valid token address handling', async () => {
      // Mock successful token verification
      await page.addInitScript(() => {
        window.ethereum = {
          request: async ({ method }) => {
            if (method === 'eth_accounts') {
              return ['0x1234567890123456789012345678901234567890'];
            }
            if (method === 'eth_chainId') {
              return '0x2105';
            }
            return null;
          },
          on: () => {},
          removeListener: () => {},
          isMetaMask: true
        };
      });

      await page.goto('http://localhost:3000');
      
      // Create a token-gated event with valid USDC address
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Valid Token Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing valid token address handling');
      await page.fill('input[type="date"]', '2024-12-27');
      await page.fill('input[type="time"]', '16:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      // Enable token gating with valid USDC address
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'USDC');
      await page.fill('input[placeholder="Token name"]', 'USD Coin');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Navigate to the event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Should show token gating status without errors
      const tokenGateStatus = await page.locator('.onchain-card');
      await expect(tokenGateStatus).toBeVisible();
      
      // Should not show error messages for valid token
      const errorMessage = await page.locator('text=No contract found');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test('Handle different token types correctly', async ({ page }) => {
    await test.step('Test different token type handling', async () => {
      // Mock wallet connection
      await page.addInitScript(() => {
        window.ethereum = {
          request: async ({ method }) => {
            if (method === 'eth_accounts') {
              return ['0x1234567890123456789012345678901234567890'];
            }
            if (method === 'eth_chainId') {
              return '0x2105';
            }
            return null;
          },
          on: () => {},
          removeListener: () => {},
          isMetaMask: true
        };
      });

      await page.goto('http://localhost:3000');
      
      // Test ERC20 token
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'ERC20 Token Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing ERC20 token handling');
      await page.fill('input[type="date"]', '2024-12-26');
      await page.fill('input[type="time"]', '15:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC
      await page.selectOption('select[name="tokenType"]', 'ERC20');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'USDC');
      await page.fill('input[placeholder="Token name"]', 'USD Coin');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Test ERC721 token
      await page.goto('http://localhost:3000');
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'ERC721 Token Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing ERC721 token handling');
      await page.fill('input[type="date"]', '2024-12-25');
      await page.fill('input[type="time"]', '14:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1234567890123456789012345678901234567890'); // Mock NFT
      await page.selectOption('select[name="tokenType"]', 'ERC721');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'NFT');
      await page.fill('input[placeholder="Token name"]', 'Test NFT');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
    });
  });
});
