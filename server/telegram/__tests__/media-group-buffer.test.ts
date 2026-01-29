import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaGroupBuffer } from '../media-group-buffer.js';

describe('MediaGroupBuffer', () => {
  let buffer: MediaGroupBuffer;
  let flushCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    flushCallback = vi.fn();
    buffer = new MediaGroupBuffer(1000, flushCallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add', () => {
    it('should not buffer single media (no media_group_id)', () => {
      const result = buffer.add(123, undefined, 1, 'photo', 'file-id-1');

      expect(result).toBe(false);
      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('should buffer media with group ID', () => {
      const result = buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      expect(result).toBe(true);
      expect(buffer.hasPending('group-123')).toBe(true);
    });

    it('should accumulate items in same group', () => {
      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1', 'Caption 1');
      buffer.add(123, 'group-123', 2, 'photo', 'file-id-2');
      buffer.add(123, 'group-123', 3, 'photo', 'file-id-3');

      // Should still be pending (not flushed yet)
      expect(buffer.hasPending('group-123')).toBe(true);

      // Advance time to trigger flush
      vi.advanceTimersByTime(1001);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      const flushedGroup = flushCallback.mock.calls[0][0];
      expect(flushedGroup.items).toHaveLength(3);
      expect(flushedGroup.items[0].fileId).toBe('file-id-1');
      expect(flushedGroup.items[0].caption).toBe('Caption 1');
      expect(flushedGroup.items[1].fileId).toBe('file-id-2');
    });

    it('should handle different groups separately', () => {
      buffer.add(123, 'group-A', 1, 'photo', 'file-A-1');
      buffer.add(456, 'group-B', 2, 'photo', 'file-B-1');

      expect(buffer.hasPending('group-A')).toBe(true);
      expect(buffer.hasPending('group-B')).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(flushCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush timing', () => {
    it('should flush after timeout', () => {
      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      // Not flushed yet
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance time just before flush
      vi.advanceTimersByTime(999);
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance past flush time
      vi.advanceTimersByTime(2);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('should reset timeout on new item', () => {
      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      // Advance 500ms
      vi.advanceTimersByTime(500);

      // Add another item - should reset timer
      buffer.add(123, 'group-123', 2, 'photo', 'file-id-2');

      // Advance another 500ms (total 1000ms from start, 500ms from second add)
      vi.advanceTimersByTime(500);

      // Should not have flushed yet (timer was reset)
      expect(flushCallback).not.toHaveBeenCalled();

      // Advance remaining 500ms
      vi.advanceTimersByTime(501);

      // Now should be flushed
      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback.mock.calls[0][0].items).toHaveLength(2);
    });
  });

  describe('flush callback data', () => {
    it('should call onFlush with all items and metadata', async () => {
      buffer.add(123, 'group-123', 10, 'photo', 'file-1', 'Caption');
      buffer.add(123, 'group-123', 11, 'video', 'file-2');

      vi.advanceTimersByTime(1001);

      expect(flushCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 123,
          mediaGroupId: 'group-123',
          firstMessageId: 10,
          items: expect.arrayContaining([
            expect.objectContaining({
              type: 'photo',
              fileId: 'file-1',
              caption: 'Caption',
              messageId: 10,
            }),
            expect.objectContaining({
              type: 'video',
              fileId: 'file-2',
              messageId: 11,
            }),
          ]),
        })
      );
    });
  });

  describe('clear', () => {
    it('should clear buffer without flushing', () => {
      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      expect(buffer.hasPending('group-123')).toBe(true);

      buffer.clear('group-123');

      expect(buffer.hasPending('group-123')).toBe(false);

      // Advance time - should not flush
      vi.advanceTimersByTime(2000);
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('hasPending', () => {
    it('should return true for pending groups', () => {
      expect(buffer.hasPending('group-123')).toBe(false);

      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      expect(buffer.hasPending('group-123')).toBe(true);
    });

    it('should return false after flush', () => {
      buffer.add(123, 'group-123', 1, 'photo', 'file-id-1');

      vi.advanceTimersByTime(1001);

      expect(buffer.hasPending('group-123')).toBe(false);
    });
  });
});
