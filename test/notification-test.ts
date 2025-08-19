/**
 * Test file for Farcaster notification system
 * This file tests the notification functionality for event cancellation and deletion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  notifyEventCancellation, 
  notifyEventDeletion, 
  notifyEventCreatorOfCancellation,
  getAddressFid 
} from '../lib/farcaster';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Farcaster Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Event Cancellation Notifications', () => {
    it('should send cancellation notifications to all attendees', async () => {
      const mockAttendees = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012'
      ];

      const mockEventTitle = 'Test Event';
      const mockEventDate = 'Dec 25, 2024';

      // Mock successful API responses
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      const results = await notifyEventCancellation(
        mockEventTitle,
        mockEventDate,
        mockAttendees
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle attendees without Farcaster accounts gracefully', async () => {
      const mockAttendees = [
        '0x1234567890123456789012345678901234567890', // Has FID
        '0x2345678901234567890123456789012345678901'  // No FID
      ];

      const mockEventTitle = 'Test Event';
      const mockEventDate = 'Dec 25, 2024';

      // Mock successful API response for first attendee
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      const results = await notifyEventCancellation(
        mockEventTitle,
        mockEventDate,
        mockAttendees
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].reason).toBe('no_fid');
    });

    it('should handle API errors gracefully', async () => {
      const mockAttendees = ['0x1234567890123456789012345678901234567890'];
      const mockEventTitle = 'Test Event';
      const mockEventDate = 'Dec 25, 2024';

      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error'
      });

      const results = await notifyEventCancellation(
        mockEventTitle,
        mockEventDate,
        mockAttendees
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('api_error');
    });
  });

  describe('Event Deletion Notifications', () => {
    it('should send deletion notifications to all attendees', async () => {
      const mockAttendees = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901'
      ];

      const mockEventTitle = 'Test Event';
      const mockEventDate = 'Dec 25, 2024';

      // Mock successful API responses
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      const results = await notifyEventDeletion(
        mockEventTitle,
        mockEventDate,
        mockAttendees
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Creator Notifications', () => {
    it('should send cancellation notification to event creator', async () => {
      const mockCreatorAddress = '0x1234567890123456789012345678901234567890';
      const mockEventTitle = 'Test Event';

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      const result = await notifyEventCreatorOfCancellation(
        mockCreatorAddress,
        mockEventTitle,
        'cancelled'
      );

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should send deletion notification to event creator', async () => {
      const mockCreatorAddress = '0x1234567890123456789012345678901234567890';
      const mockEventTitle = 'Test Event';

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'success' })
      });

      const result = await notifyEventCreatorOfCancellation(
        mockCreatorAddress,
        mockEventTitle,
        'deleted'
      );

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle creator without notifications enabled', async () => {
      const mockCreatorAddress = '0x1234567890123456789012345678901234567890';
      const mockEventTitle = 'Test Event';

      // Mock no_token response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'no_token' })
      });

      const result = await notifyEventCreatorOfCancellation(
        mockCreatorAddress,
        mockEventTitle,
        'cancelled'
      );

      expect(result).toBe(false);
    });
  });

  describe('FID Resolution', () => {
    it('should resolve address to FID successfully', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockFid = 12345;

      // Mock Neynar API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [{ fid: mockFid }] })
      });

      const result = await getAddressFid(mockAddress);

      expect(result).toBe(mockFid);
    });

    it('should return null for address without FID', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';

      // Mock empty response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] })
      });

      const result = await getAddressFid(mockAddress);

      expect(result).toBeNull();
    });
  });
});