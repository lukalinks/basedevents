const { test, expect } = require('@playwright/test');

test.describe('NFT Count Component Tests', () => {
  
  test('NFT count displays correctly for different scenarios', async ({ page }) => {
    // Mock the getUserNFTTickets function
    await page.addInitScript(() => {
      // Mock the events module
      window.mockNFTTickets = [];
      
      // Override the getUserNFTTickets function
      window.getUserNFTTickets = async (userAddress) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.mockNetworkError) {
          throw new Error('Network error');
        }
        
        return window.mockNFTTickets;
      };
    });

    await page.goto('http://localhost:3000');
    
    // Test 1: Loading state
    await test.step('Shows loading state initially', async () => {
      await page.click('text=Profile');
      
      const loadingElement = await page.locator('text=Loading NFT collection...');
      await expect(loadingElement).toBeVisible();
    });

    // Test 2: Zero NFTs
    await test.step('Shows 0 NFTs for new user', async () => {
      await page.evaluate(() => {
        window.mockNFTTickets = [];
      });
      
      await page.reload();
      await page.click('text=Profile');
      
      await page.waitForSelector('text=0 NFTs collected from events', { timeout: 5000 });
      const nftCountElement = await page.locator('text=0 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
    });

    // Test 3: Single NFT
    await test.step('Shows 1 NFT correctly', async () => {
      await page.evaluate(() => {
        window.mockNFTTickets = [
          { id: '1', event: { title: 'Test Event' } }
        ];
      });
      
      await page.reload();
      await page.click('text=Profile');
      
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 5000 });
      const nftCountElement = await page.locator('text=1 NFT collected from events');
      await expect(nftCountElement).toBeVisible();
    });

    // Test 4: Multiple NFTs
    await test.step('Shows multiple NFTs correctly', async () => {
      await page.evaluate(() => {
        window.mockNFTTickets = [
          { id: '1', event: { title: 'Event 1' } },
          { id: '2', event: { title: 'Event 2' } },
          { id: '3', event: { title: 'Event 3' } },
          { id: '4', event: { title: 'Event 4' } },
          { id: '5', event: { title: 'Event 5' } }
        ];
      });
      
      await page.reload();
      await page.click('text=Profile');
      
      await page.waitForSelector('text=5 NFTs collected from events', { timeout: 5000 });
      const nftCountElement = await page.locator('text=5 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
    });

    // Test 5: Error handling
    await test.step('Handles errors gracefully', async () => {
      await page.evaluate(() => {
        window.mockNetworkError = true;
      });
      
      await page.reload();
      await page.click('text=Profile');
      
      // Should show 0 NFTs on error
      await page.waitForSelector('text=0 NFTs collected from events', { timeout: 5000 });
      const nftCountElement = await page.locator('text=0 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
    });
  });

  test('NFT count styling and visual elements', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Profile');
    
    // Test visual elements
    await test.step('Has correct styling', async () => {
      // Check for the purple gradient background
      const nftBadge = await page.locator('.bg-gradient-to-r.from-purple-100.to-pink-100');
      await expect(nftBadge).toBeVisible();
      
      // Check for the star icon
      const starIcon = await page.locator('svg[stroke="currentColor"]');
      await expect(starIcon).toBeVisible();
      
      // Check for proper text color
      const nftText = await page.locator('.text-purple-700');
      await expect(nftText).toBeVisible();
    });

    await test.step('Has proper spacing and layout', async () => {
      const nftContainer = await page.locator('.mt-3.flex.items-center.gap-2');
      await expect(nftContainer).toBeVisible();
      
      // Check that it appears below the wallet address
      const walletAddress = await page.locator('.text-sm.text-\\[var\\(--app-foreground-muted\\)\\]');
      const nftCount = await page.locator('text=0 NFTs collected from events');
      
      // Verify the order (NFT count should come after wallet address)
      const walletRect = await walletAddress.boundingBox();
      const nftRect = await nftCount.boundingBox();
      
      expect(nftRect.y).toBeGreaterThan(walletRect.y);
    });
  });

  test('NFT count updates when user changes', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Mock different user scenarios
    await test.step('Updates count for different users', async () => {
      // User 1: 0 NFTs
      await page.evaluate(() => {
        window.mockNFTTickets = [];
      });
      
      await page.click('text=Profile');
      await page.waitForSelector('text=0 NFTs collected from events', { timeout: 5000 });
      
      // User 2: 3 NFTs
      await page.evaluate(() => {
        window.mockNFTTickets = [
          { id: '1', event: { title: 'Event 1' } },
          { id: '2', event: { title: 'Event 2' } },
          { id: '3', event: { title: 'Event 3' } }
        ];
      });
      
      await page.reload();
      await page.click('text=Profile');
      await page.waitForSelector('text=3 NFTs collected from events', { timeout: 5000 });
      
      // User 3: 1 NFT
      await page.evaluate(() => {
        window.mockNFTTickets = [
          { id: '1', event: { title: 'Single Event' } }
        ];
      });
      
      await page.reload();
      await page.click('text=Profile');
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 5000 });
    });
  });

  test('NFT count performance and responsiveness', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    await test.step('Handles large NFT collections', async () => {
      // Create a large collection of NFTs
      await page.evaluate(() => {
        window.mockNFTTickets = Array.from({ length: 100 }, (_, i) => ({
          id: `${i + 1}`,
          event: { title: `Event ${i + 1}` }
        }));
      });
      
      await page.click('text=Profile');
      
      // Should handle 100 NFTs without performance issues
      await page.waitForSelector('text=100 NFTs collected from events', { timeout: 5000 });
      const nftCountElement = await page.locator('text=100 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
    });

    await test.step('Responsive on different screen sizes', async () => {
      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.click('text=Profile');
      
      const nftCountElement = await page.locator('text=100 NFTs collected from events');
      await expect(nftCountElement).toBeVisible();
      
      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.click('text=Profile');
      
      await expect(nftCountElement).toBeVisible();
      
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await page.click('text=Profile');
      
      await expect(nftCountElement).toBeVisible();
    });
  });
});
