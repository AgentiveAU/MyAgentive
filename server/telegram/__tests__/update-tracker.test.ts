import { describe, it, expect, beforeEach } from 'vitest';
import { updateTracker } from '../update-tracker.js';

describe('UpdateTracker', () => {
  beforeEach(() => {
    // Clear the tracker before each test
    updateTracker.clear();
  });

  describe('isDuplicate', () => {
    it('should return false for new update IDs', () => {
      expect(updateTracker.isDuplicate(1)).toBe(false);
      expect(updateTracker.isDuplicate(2)).toBe(false);
      expect(updateTracker.isDuplicate(3)).toBe(false);
    });

    it('should return true for duplicate update IDs', () => {
      // First occurrence
      expect(updateTracker.isDuplicate(1)).toBe(false);
      // Second occurrence - should be duplicate
      expect(updateTracker.isDuplicate(1)).toBe(true);
      // Third occurrence - still duplicate
      expect(updateTracker.isDuplicate(1)).toBe(true);
    });

    it('should track multiple different IDs correctly', () => {
      expect(updateTracker.isDuplicate(100)).toBe(false);
      expect(updateTracker.isDuplicate(200)).toBe(false);
      expect(updateTracker.isDuplicate(100)).toBe(true);
      expect(updateTracker.isDuplicate(200)).toBe(true);
      expect(updateTracker.isDuplicate(300)).toBe(false);
    });
  });

  describe('size', () => {
    it('should report correct size', () => {
      expect(updateTracker.size).toBe(0);

      updateTracker.isDuplicate(1);
      expect(updateTracker.size).toBe(1);

      updateTracker.isDuplicate(2);
      expect(updateTracker.size).toBe(2);

      // Duplicate doesn't increase size
      updateTracker.isDuplicate(1);
      expect(updateTracker.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all tracked IDs', () => {
      updateTracker.isDuplicate(1);
      updateTracker.isDuplicate(2);
      updateTracker.isDuplicate(3);
      expect(updateTracker.size).toBe(3);

      updateTracker.clear();
      expect(updateTracker.size).toBe(0);

      // Previously tracked IDs should no longer be duplicates
      expect(updateTracker.isDuplicate(1)).toBe(false);
      expect(updateTracker.isDuplicate(2)).toBe(false);
    });
  });

  describe('capacity management', () => {
    it('should evict oldest when at capacity', () => {
      // The default maxSize is 1000, let's test with that
      // Add 1001 updates
      for (let i = 1; i <= 1001; i++) {
        updateTracker.isDuplicate(i);
      }

      // Size should be capped at 1000
      expect(updateTracker.size).toBe(1000);

      // The first ID (1) should have been evicted
      expect(updateTracker.isDuplicate(1)).toBe(false);
      // Note: isDuplicate(1) returned false and re-added 1, evicting 2

      // The last ID (1001) should still be tracked
      expect(updateTracker.isDuplicate(1001)).toBe(true);

      // ID 3 should still be tracked (not evicted yet)
      expect(updateTracker.isDuplicate(3)).toBe(true);
    });

    it('should evict in FIFO order', () => {
      // Test with smaller numbers to be more precise
      updateTracker.clear();

      // Add 1000 items
      for (let i = 0; i < 1000; i++) {
        updateTracker.isDuplicate(i);
      }
      expect(updateTracker.size).toBe(1000);

      // Add one more - should evict 0
      expect(updateTracker.isDuplicate(1000)).toBe(false);
      expect(updateTracker.size).toBe(1000);

      // 0 should now be evicted
      expect(updateTracker.isDuplicate(0)).toBe(false); // Not a duplicate, was evicted

      // 999 should still be there
      expect(updateTracker.isDuplicate(999)).toBe(true);
    });
  });
});
