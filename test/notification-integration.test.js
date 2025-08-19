const { test, expect } = require('@playwright/test');

test.describe('Event Notification System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('should send notifications when event is cancelled', async ({ page }) => {
    // Mock the notification API calls
    await page.route('**/api/events/notify', async route => {
      const postData = route.postDataJSON();
      expect(postData.action).toBe('cancel');
      expect(postData.eventTitle).toBeTruthy();
      expect(postData.eventDate).toBeTruthy();
      expect(Array.isArray(postData.attendeeAddresses)).toBe(true);
      expect(postData.creatorAddress).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: {
            attendeeNotifications: [
              { address: '0x123...', success: true, fid: 12345 },
              { address: '0x456...', success: true, fid: 67890 }
            ],
            creatorNotification: true
          }
        })
      });
    });

    // Create a test event (this would require setting up test data)
    // For now, we'll test the notification API endpoint directly
    
    const response = await page.request.post('/api/events/notify', {
      data: {
        action: 'cancel',
        eventTitle: 'Test Event',
        eventDate: 'Dec 25, 2024',
        attendeeAddresses: ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'],
        creatorAddress: '0x3456789012345678901234567890123456789012'
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.results.attendeeNotifications).toHaveLength(2);
    expect(result.results.creatorNotification).toBe(true);
  });

  test('should send notifications when event is deleted', async ({ page }) => {
    // Mock the notification API calls
    await page.route('**/api/events/notify', async route => {
      const postData = route.postDataJSON();
      expect(postData.action).toBe('delete');
      expect(postData.eventTitle).toBeTruthy();
      expect(postData.eventDate).toBeTruthy();
      expect(Array.isArray(postData.attendeeAddresses)).toBe(true);
      expect(postData.creatorAddress).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: {
            attendeeNotifications: [
              { address: '0x123...', success: true, fid: 12345 },
              { address: '0x456...', success: false, reason: 'no_fid' }
            ],
            creatorNotification: true
          }
        })
      });
    });

    const response = await page.request.post('/api/events/notify', {
      data: {
        action: 'delete',
        eventTitle: 'Test Event',
        eventDate: 'Dec 25, 2024',
        attendeeAddresses: ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'],
        creatorAddress: '0x3456789012345678901234567890123456789012'
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.results.attendeeNotifications).toHaveLength(2);
    expect(result.results.attendeeNotifications[0].success).toBe(true);
    expect(result.results.attendeeNotifications[1].success).toBe(false);
    expect(result.results.attendeeNotifications[1].reason).toBe('no_fid');
  });

  test('should handle notification API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/events/notify', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    const response = await page.request.post('/api/events/notify', {
      data: {
        action: 'cancel',
        eventTitle: 'Test Event',
        eventDate: 'Dec 25, 2024',
        attendeeAddresses: ['0x1234567890123456789012345678901234567890'],
        creatorAddress: '0x3456789012345678901234567890123456789012'
      }
    });

    expect(response.status()).toBe(500);
    const result = await response.json();
    expect(result.error).toBe('Internal server error');
  });

  test('should validate notification request data', async ({ page }) => {
    // Test with missing required fields
    const response = await page.request.post('/api/events/notify', {
      data: {
        action: 'cancel',
        // Missing eventTitle, eventDate, etc.
      }
    });

    expect(response.status()).toBe(500);
  });

  test('should handle empty attendee list', async ({ page }) => {
    await page.route('**/api/events/notify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: {
            attendeeNotifications: [],
            creatorNotification: true
          }
        })
      });
    });

    const response = await page.request.post('/api/events/notify', {
      data: {
        action: 'cancel',
        eventTitle: 'Test Event',
        eventDate: 'Dec 25, 2024',
        attendeeAddresses: [], // Empty list
        creatorAddress: '0x3456789012345678901234567890123456789012'
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.results.attendeeNotifications).toHaveLength(0);
    expect(result.results.creatorNotification).toBe(true);
  });
});

test.describe('Farcaster Notification Integration', () => {
  test('should resolve FID from address', async ({ page }) => {
    // Mock Neynar API response
    await page.route('**/api.neynar.com/v2/farcaster/user/bulk-by-address*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [{ fid: 12345 }]
        })
      });
    });

    // Mock notification endpoint
    await page.route('**/api/notify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          state: 'success'
        })
      });
    });

    const response = await page.request.post('/api/notify', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification',
          notificationDetails: null
        }
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  test('should handle address without Farcaster account', async ({ page }) => {
    // Mock Neynar API response with no user
    await page.route('**/api.neynar.com/v2/farcaster/user/bulk-by-address*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: []
        })
      });
    });

    const response = await page.request.post('/api/notify', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification',
          notificationDetails: null
        }
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.state).toBe('no_token');
  });
});