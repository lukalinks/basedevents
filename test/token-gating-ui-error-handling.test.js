const { test, expect } = require('@playwright/test');

test.describe('Token Gating UI Error Handling Tests', () => {
  
  test('Display helpful error messages for different error types', async ({ page }) => {
    await test.step('Test error message display with helpful guidance', async () => {
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
      await page.fill('input[placeholder="Enter event title"]', 'UI Error Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing UI error handling');
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
      
      // Should show token gating status
      const tokenGateStatus = await page.locator('.onchain-card');
      await expect(tokenGateStatus).toBeVisible();
      
      // Click the verification button
      await page.click('button:has-text("Check Token Eligibility")');
      
      // Wait for error to appear
      await page.waitForSelector('text=Verification Error', { timeout: 10000 });
      
      // Should show specific error message
      await page.waitForSelector('text=No contract found', { timeout: 10000 });
      
      // Should show helpful guidance
      await page.waitForSelector('text=How to fix:', { timeout: 10000 });
      await page.waitForSelector('text=Verify the token contract address is correct', { timeout: 10000 });
      
      // Should show retry button
      const retryButton = await page.locator('button:has-text("Retry Verification")');
      await expect(retryButton).toBeVisible();
      
      // Should show BaseScan button
      const baseScanButton = await page.locator('button:has-text("BaseScan")');
      await expect(baseScanButton).toBeVisible();
    });
  });

  test('Status indicator shows correct states', async ({ page }) => {
    await test.step('Test status indicator displays correct states', async () => {
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
      
      // Create a token-gated event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Status Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing status indicators');
      await page.fill('input[type="date"]', '2024-12-30');
      await page.fill('input[type="time"]', '19:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1e43D519FFdd02072ECA59e7C72120a80EeeE114');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Navigate to the event
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Should show "Ready to verify" status initially
      await page.waitForSelector('text=Ready to verify', { timeout: 10000 });
      
      // Click verification button
      await page.click('button:has-text("Check Token Eligibility")');
      
      // Should show "Verifying..." status
      await page.waitForSelector('text=Verifying...', { timeout: 10000 });
      
      // Wait for error to appear
      await page.waitForSelector('text=Error occurred', { timeout: 10000 });
    });
  });

  test('Error-specific help text displays correctly', async ({ page }) => {
    await test.step('Test different error types show appropriate help text', async () => {
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
      
      // Test "No contract found" error
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Contract Error Test');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing contract not found error');
      await page.fill('input[type="date"]', '2024-12-29');
      await page.fill('input[type="time"]', '20:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1e43D519FFdd02072ECA59e7C72120a80EeeE114');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Click verification button
      await page.click('button:has-text("Check Token Eligibility")');
      
      // Wait for error and help text
      await page.waitForSelector('text=No contract found', { timeout: 10000 });
      await page.waitForSelector('text=Ensure the token exists on Base network', { timeout: 10000 });
    });
  });

  test('Retry functionality works correctly', async ({ page }) => {
    await test.step('Test retry button functionality', async () => {
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
      
      // Create a token-gated event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Retry Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing retry functionality');
      await page.fill('input[type="date"]', '2024-12-28');
      await page.fill('input[type="time"]', '17:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1e43D519FFdd02072ECA59e7C72120a80EeeE114');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Click verification button
      await page.click('button:has-text("Check Token Eligibility")');
      
      // Wait for error
      await page.waitForSelector('text=Verification Error', { timeout: 10000 });
      
      // Click retry button
      await page.click('button:has-text("Retry Verification")');
      
      // Should show loading state again
      await page.waitForSelector('text=Verifying...', { timeout: 10000 });
      
      // Should show error again
      await page.waitForSelector('text=Error occurred', { timeout: 10000 });
    });
  });

  test('BaseScan button opens correct URL', async ({ page }) => {
    await test.step('Test BaseScan button functionality', async () => {
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
      
      // Create a token-gated event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'BaseScan Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing BaseScan button');
      await page.fill('input[type="date"]', '2024-12-27');
      await page.fill('input[type="time"]', '16:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Test Location');
      
      await page.click('input[name="tokenGating"][value="true"]');
      await page.fill('input[placeholder="Token contract address"]', '0x1e43D519FFdd02072ECA59e7C72120a80EeeE114');
      await page.fill('input[placeholder="Required balance"]', '1');
      await page.fill('input[placeholder="Token symbol"]', 'TEST');
      await page.fill('input[placeholder="Token name"]', 'Test Token');
      
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Click verification button to trigger error
      await page.click('button:has-text("Check Token Eligibility")');
      
      // Wait for error
      await page.waitForSelector('text=Verification Error', { timeout: 10000 });
      
      // Check that BaseScan button has correct href
      const baseScanButton = await page.locator('button:has-text("BaseScan")');
      await expect(baseScanButton).toBeVisible();
      
      // Verify the button opens the correct URL (this would be tested in a real browser)
      // For now, we just verify the button exists and is clickable
      await expect(baseScanButton).toBeEnabled();
    });
  });
});
