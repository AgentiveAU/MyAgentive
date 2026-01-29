import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FragmentBuffer } from '../fragment-buffer.js';

describe('FragmentBuffer', () => {
  let buffer: FragmentBuffer;
  let flushCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    flushCallback = vi.fn();
    buffer = new FragmentBuffer(500, flushCallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add', () => {
    it('should not buffer short messages', () => {
      const shortText = 'Hello, this is a short message.';
      const result = buffer.add(123, 1, shortText);

      expect(result).toBe(false);
      expect(buffer.hasPending(123)).toBe(false);
    });

    it('should buffer long messages (>= 4000 chars)', () => {
      const longText = 'A'.repeat(4000);
      const result = buffer.add(123, 1, longText);

      expect(result).toBe(true);
      expect(buffer.hasPending(123)).toBe(true);
    });

    it('should combine multiple fragments', () => {
      const fragment1 = 'A'.repeat(4000);
      const fragment2 = 'B'.repeat(4000);

      buffer.add(123, 1, fragment1);
      buffer.add(123, 2, fragment2);

      // Trigger flush
      vi.advanceTimersByTime(501);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      const [chatId, combined, firstMessageId] = flushCallback.mock.calls[0];

      expect(chatId).toBe(123);
      expect(combined).toBe(fragment1 + fragment2);
      expect(firstMessageId).toBe(1);
    });

    it('should add to existing buffer when pending', () => {
      const longText1 = 'A'.repeat(4000);
      const shortText = 'Short addition';

      buffer.add(123, 1, longText1);

      // Short text should be added to pending buffer
      const result = buffer.add(123, 2, shortText);
      expect(result).toBe(true);

      vi.advanceTimersByTime(501);

      const [, combined] = flushCallback.mock.calls[0];
      expect(combined).toBe(longText1 + shortText);
    });
  });

  describe('flush timing', () => {
    it('should flush after timeout', () => {
      const longText = 'A'.repeat(4000);
      buffer.add(123, 1, longText);

      // Not flushed yet
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance time just before flush
      vi.advanceTimersByTime(499);
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance past flush time
      vi.advanceTimersByTime(2);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('should reset timeout on new fragment', () => {
      const fragment1 = 'A'.repeat(4000);
      const fragment2 = 'B'.repeat(4000);

      buffer.add(123, 1, fragment1);

      // Advance 300ms
      vi.advanceTimersByTime(300);

      // Add another fragment - should reset timer
      buffer.add(123, 2, fragment2);

      // Advance another 300ms
      vi.advanceTimersByTime(300);

      // Should not have flushed yet (timer was reset)
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance remaining time
      vi.advanceTimersByTime(201);

      // Now should be flushed
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear buffer without flushing', () => {
      const longText = 'A'.repeat(4000);
      buffer.add(123, 1, longText);

      expect(buffer.hasPending(123)).toBe(true);

      buffer.clear(123);

      expect(buffer.hasPending(123)).toBe(false);

      // Advance time - should not flush
      vi.advanceTimersByTime(1000);
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('hasPending', () => {
    it('should detect pending buffers', () => {
      expect(buffer.hasPending(123)).toBe(false);

      const longText = 'A'.repeat(4000);
      buffer.add(123, 1, longText);

      expect(buffer.hasPending(123)).toBe(true);
      expect(buffer.hasPending(456)).toBe(false);
    });

    it('should return false after flush', () => {
      const longText = 'A'.repeat(4000);
      buffer.add(123, 1, longText);

      vi.advanceTimersByTime(501);

      expect(buffer.hasPending(123)).toBe(false);
    });
  });

  describe('separate chat buffers', () => {
    it('should maintain separate buffers per chat', () => {
      const text1 = 'A'.repeat(4000);
      const text2 = 'B'.repeat(4000);

      buffer.add(111, 1, text1);
      buffer.add(222, 2, text2);

      vi.advanceTimersByTime(501);

      expect(flushCallback).toHaveBeenCalledTimes(2);

      // Check first flush
      const call1 = flushCallback.mock.calls.find((c) => c[0] === 111);
      expect(call1[1]).toBe(text1);

      // Check second flush
      const call2 = flushCallback.mock.calls.find((c) => c[0] === 222);
      expect(call2[1]).toBe(text2);
    });
  });
});
