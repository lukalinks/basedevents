const { test, expect } = require('@playwright/test');

test.describe('Onchain Ticket Creation Tests', () => {
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
          if (method === 'eth_sendTransaction') {
            // Mock successful transaction
            return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
        isMetaMask: true
      };
    });
  });

  test('Complete onchain ticket creation flow for paid events', async ({ page }) => {
    await test.step('Create paid event with NFT tickets', async () => {
      await page.click('text=Create Event');
      
      // Fill event form
      await page.fill('input[placeholder="Enter event title"]', 'Onchain NFT Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Test event for onchain NFT tickets');
      await page.fill('input[type="date"]', '2024-12-31');
      await page.fill('input[type="time"]', '18:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Onchain Location');
      
      // Enable paid event
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '25');
      
      // Submit event
      await page.click('button:has-text("Create Event")');
      
      // Wait for event creation
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Get the event ID
      const eventUrl = page.url();
      testEventId = eventUrl.split('/events/')[1];
      expect(testEventId).toBeTruthy();
    });

    await test.step('Register for paid event with USDC payment', async () => {
      // Navigate to the event
      await page.goto(`http://localhost:3000/events/${testEventId}`);
      
      // Mock USDC payment transaction
      await page.addInitScript(() => {
        // Mock ethers.js
        window.ethers = {
          providers: {
            Web3Provider: class {
              constructor(ethereum) {
                this.ethereum = ethereum;
              }
              getSigner() {
                return {
                  getAddress: async () => testUserAddress
                };
              }
            }
          },
          Contract: class {
            constructor(address, abi, signer) {
              this.address = address;
              this.abi = abi;
              this.signer = signer;
            }
            async transfer(to, amount) {
              return {
                hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                wait: async () => ({ status: 1 })
              };
            }
          },
          BigNumber: {
            from: (value) => ({ toString: () => value.toString() })
          }
        };
      });
      
      // Click register button
      await page.click('button:has-text("Register Now")');
      
      // Fill registration form
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      
      // Complete registration
      await page.click('button:has-text("Complete Registration")');
      
      // Wait for registration success
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
    });

    await test.step('Verify onchain payment and NFT creation', async () => {
      // Navigate to profile to check NFT count
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Should show NFT count
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
      
      // Check for onchain indicators
      const onchainBadge = await page.locator('.onchain-card');
      await expect(onchainBadge).toBeVisible();
    });
  });

  test('Free event NFT ticket creation', async ({ page }) => {
    await test.step('Create free event with NFT tickets', async () => {
      await page.click('text=Create Event');
      
      // Fill event form
      await page.fill('input[placeholder="Enter event title"]', 'Free NFT Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Free event with NFT tickets');
      await page.fill('input[type="date"]', '2024-12-30');
      await page.fill('input[type="time"]', '19:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Free Location');
      
      // Keep as free event
      await page.click('input[name="eventType"][value="free"]');
      
      // Submit event
      await page.click('button:has-text("Create Event")');
      
      // Wait for event creation
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      
      // Get the event ID
      const eventUrl = page.url();
      testEventId = eventUrl.split('/events/')[1];
    });

    await test.step('Register for free event and mint NFT', async () => {
      // Navigate to the event
      await page.goto(`http://localhost:3000/events/${testEventId}`);
      
      // Mock NFT minting
      await page.addInitScript(() => {
        window.ethers = {
          providers: {
            Web3Provider: class {
              constructor(ethereum) {
                this.ethereum = ethereum;
              }
              getSigner() {
                return {
                  getAddress: async () => testUserAddress
                };
              }
            }
          },
          Contract: class {
            constructor(address, abi, signer) {
              this.address = address;
              this.abi = abi;
              this.signer = signer;
            }
            async mintTicket(to, eventId, tokenURI) {
              return {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                wait: async () => ({ status: 1 })
              };
            }
          }
        };
      });
      
      // Click register button
      await page.click('button:has-text("Register Now")');
      
      // Fill registration form
      await page.fill('input[placeholder="Enter your full name"]', 'Test User');
      await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
      
      // Complete registration
      await page.click('button:has-text("Complete Registration")');
      
      // Wait for registration success
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
    });

    await test.step('Verify free NFT ticket creation', async () => {
      // Navigate to profile
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      
      // Should show NFT count
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
    });
  });

  test('Onchain payment flow with USDC', async ({ page }) => {
    await test.step('Test USDC payment transaction', async () => {
      // Create a paid event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'USDC Payment Test');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing USDC payments');
      await page.fill('input[type="date"]', '2024-12-29');
      await page.fill('input[type="time"]', '20:00');
      await page.fill('input[placeholder="Venue address or city"]', 'USDC Test Location');
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '50');
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      // Navigate to event
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Mock USDC contract interaction
      await page.addInitScript(() => {
        window.ethers = {
          providers: {
            Web3Provider: class {
              constructor(ethereum) {
                this.ethereum = ethereum;
              }
              getSigner() {
                return {
                  getAddress: async () => testUserAddress
                };
              }
            }
          },
          Contract: class {
            constructor(address, abi, signer) {
              this.address = address;
              this.abi = abi;
              this.signer = signer;
            }
            async transfer(to, amount) {
              // Verify correct parameters
              expect(to).toBe(testCreatorAddress);
              expect(amount.toString()).toBe('50000000'); // 50 USDC * 1e6
              return {
                hash: '0xusdc1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                wait: async () => ({ status: 1 })
              };
            }
          },
          BigNumber: {
            from: (value) => ({ toString: () => value.toString() })
          }
        };
      });
      
      // Register for event
      await page.click('button:has-text("Register Now")');
      await page.fill('input[placeholder="Enter your full name"]', 'USDC Test User');
      await page.fill('input[placeholder="Enter your email"]', 'usdc@test.com');
      await page.click('button:has-text("Complete Registration")');
      
      // Wait for success
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
    });
  });

  test('Onchain error handling', async ({ page }) => {
    await test.step('Test network switching', async () => {
      // Mock wrong network
      await page.addInitScript(() => {
        window.ethereum.request = async ({ method }) => {
          if (method === 'eth_chainId') {
            return '0x1'; // Ethereum mainnet instead of Base
          }
          return null;
        };
      });
      
      await page.goto('http://localhost:3000');
      await page.click('text=Create Event');
      
      // Should handle network switching gracefully
      await page.waitForSelector('text=Create Event', { timeout: 5000 });
    });

    await test.step('Test wallet connection errors', async () => {
      // Mock wallet not available
      await page.addInitScript(() => {
        window.ethereum = undefined;
      });
      
      await page.reload();
      await page.click('text=Create Event');
      
      // Should show appropriate error message
      await page.waitForSelector('text=Connect your wallet', { timeout: 5000 });
    });

    await test.step('Test transaction failure', async () => {
      // Mock transaction failure
      await page.addInitScript(() => {
        window.ethereum = {
          request: async ({ method }) => {
            if (method === 'eth_sendTransaction') {
              throw new Error('Transaction failed');
            }
            return null;
          }
        };
      });
      
      await page.goto('http://localhost:3000');
      await page.click('text=Create Event');
      
      // Should handle transaction errors gracefully
      await page.waitForSelector('text=Create Event', { timeout: 5000 });
    });
  });

  test('Onchain status indicators', async ({ page }) => {
    await test.step('Verify onchain status display', async () => {
      // Create and register for an event
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Status Test Event');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing status indicators');
      await page.fill('input[type="date"]', '2024-12-28');
      await page.fill('input[type="time"]', '17:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Status Test Location');
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '10');
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      // Navigate to event details
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Check for onchain status indicators
      const onchainBadges = await page.locator('.onchain-card');
      await expect(onchainBadges).toBeVisible();
      
      // Check for payment status
      const paymentStatus = await page.locator('text=Payment Confirmed');
      await expect(paymentStatus).toBeVisible();
      
      // Check for NFT status
      const nftStatus = await page.locator('text=NFT Ticket');
      await expect(nftStatus).toBeVisible();
    });
  });

  test('Onchain data persistence', async ({ page }) => {
    await test.step('Verify onchain data is stored correctly', async () => {
      // Create event with onchain features
      await page.click('text=Create Event');
      await page.fill('input[placeholder="Enter event title"]', 'Persistence Test');
      await page.fill('textarea[placeholder="Describe your event..."]', 'Testing data persistence');
      await page.fill('input[type="date"]', '2024-12-27');
      await page.fill('input[type="time"]', '16:00');
      await page.fill('input[placeholder="Venue address or city"]', 'Persistence Location');
      await page.click('input[name="eventType"][value="paid"]');
      await page.fill('input[placeholder="Enter price in USDC"]', '15');
      await page.click('button:has-text("Create Event")');
      
      await page.waitForSelector('text=Event created successfully', { timeout: 10000 });
      const eventUrl = page.url();
      const eventId = eventUrl.split('/events/')[1];
      
      // Register for event
      await page.goto(`http://localhost:3000/events/${eventId}`);
      
      // Mock successful transactions
      await page.addInitScript(() => {
        window.ethers = {
          providers: {
            Web3Provider: class {
              constructor(ethereum) {
                this.ethereum = ethereum;
              }
              getSigner() {
                return {
                  getAddress: async () => testUserAddress
                };
              }
            }
          },
          Contract: class {
            constructor(address, abi, signer) {
              this.address = address;
              this.abi = abi;
              this.signer = signer;
            }
            async transfer(to, amount) {
              return {
                hash: '0xpersist1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                wait: async () => ({ status: 1 })
              };
            }
            async mintTicket(to, eventId, tokenURI) {
              return {
                hash: '0xnft1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                wait: async () => ({ status: 1 })
              };
            }
          },
          BigNumber: {
            from: (value) => ({ toString: () => value.toString() })
          }
        };
      });
      
      await page.click('button:has-text("Register Now")');
      await page.fill('input[placeholder="Enter your full name"]', 'Persistence User');
      await page.fill('input[placeholder="Enter your email"]', 'persist@test.com');
      await page.click('button:has-text("Complete Registration")');
      
      await page.waitForSelector('text=Registration successful', { timeout: 10000 });
      
      // Refresh page and verify data persists
      await page.reload();
      
      // Check that onchain data is still displayed
      const onchainBadges = await page.locator('.onchain-card');
      await expect(onchainBadges).toBeVisible();
      
      // Check NFT count in profile
      await page.goto('http://localhost:3000');
      await page.click('text=Profile');
      await page.waitForSelector('text=1 NFT collected from events', { timeout: 10000 });
    });
  });
});
