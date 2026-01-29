import { describe, it, expect, beforeEach } from 'vitest';
import { replyModeManager, parseReplyMode } from '../reply-mode.js';

describe('ReplyModeManager', () => {
  beforeEach(() => {
    // Reset to default mode and clear all contexts
    replyModeManager.setMode('first');
  });

  describe('parseReplyMode', () => {
    it('should parse valid mode strings', () => {
      expect(parseReplyMode('off')).toBe('off');
      expect(parseReplyMode('first')).toBe('first');
      expect(parseReplyMode('all')).toBe('all');
    });

    it('should handle case insensitivity', () => {
      expect(parseReplyMode('OFF')).toBe('off');
      expect(parseReplyMode('First')).toBe('first');
      expect(parseReplyMode('ALL')).toBe('all');
    });

    it('should handle whitespace', () => {
      expect(parseReplyMode('  off  ')).toBe('off');
      expect(parseReplyMode('\tfirst\n')).toBe('first');
    });

    it('should reject invalid mode strings', () => {
      expect(parseReplyMode('invalid')).toBeNull();
      expect(parseReplyMode('')).toBeNull();
      expect(parseReplyMode('always')).toBeNull();
      expect(parseReplyMode('none')).toBeNull();
    });
  });

  describe('mode management', () => {
    it('should get and set mode', () => {
      expect(replyModeManager.getMode()).toBe('first');

      replyModeManager.setMode('off');
      expect(replyModeManager.getMode()).toBe('off');

      replyModeManager.setMode('all');
      expect(replyModeManager.getMode()).toBe('all');
    });
  });

  describe('recordUserMessage', () => {
    it('should track first message per chat', () => {
      const chatId = 123;

      // First message should set first and last
      const replyTo1 = replyModeManager.recordUserMessage(chatId, 100);
      expect(replyTo1).toBe(100); // In 'first' mode, returns first message

      // Second message should update last but not first
      const replyTo2 = replyModeManager.recordUserMessage(chatId, 200);
      expect(replyTo2).toBe(100); // Still returns first message
    });

    it('should track last message per chat', () => {
      const chatId = 456;
      replyModeManager.setMode('all');

      replyModeManager.recordUserMessage(chatId, 100);
      const replyTo1 = replyModeManager.recordUserMessage(chatId, 200);
      expect(replyTo1).toBe(200); // In 'all' mode, returns last message

      const replyTo2 = replyModeManager.recordUserMessage(chatId, 300);
      expect(replyTo2).toBe(300);
    });

    it('should maintain separate chat contexts', () => {
      const chat1 = 111;
      const chat2 = 222;

      replyModeManager.recordUserMessage(chat1, 100);
      replyModeManager.recordUserMessage(chat2, 200);

      // Each chat should have its own first message
      expect(replyModeManager.getReplyToId(chat1)).toBe(100);
      expect(replyModeManager.getReplyToId(chat2)).toBe(200);
    });
  });

  describe('getReplyToId', () => {
    it('should return undefined in "off" mode', () => {
      const chatId = 123;
      replyModeManager.setMode('off');

      replyModeManager.recordUserMessage(chatId, 100);
      expect(replyModeManager.getReplyToId(chatId)).toBeUndefined();
    });

    it('should return first message in "first" mode', () => {
      const chatId = 123;
      replyModeManager.setMode('first');

      replyModeManager.recordUserMessage(chatId, 100);
      replyModeManager.recordUserMessage(chatId, 200);
      replyModeManager.recordUserMessage(chatId, 300);

      expect(replyModeManager.getReplyToId(chatId)).toBe(100);
    });

    it('should return last message in "all" mode', () => {
      const chatId = 123;
      replyModeManager.setMode('all');

      replyModeManager.recordUserMessage(chatId, 100);
      expect(replyModeManager.getReplyToId(chatId)).toBe(100);

      replyModeManager.recordUserMessage(chatId, 200);
      expect(replyModeManager.getReplyToId(chatId)).toBe(200);

      replyModeManager.recordUserMessage(chatId, 300);
      expect(replyModeManager.getReplyToId(chatId)).toBe(300);
    });

    it('should return undefined for unknown chat', () => {
      expect(replyModeManager.getReplyToId(99999)).toBeUndefined();
    });
  });

  describe('clearContext', () => {
    it('should clear chat context', () => {
      const chatId = 123;

      replyModeManager.recordUserMessage(chatId, 100);
      expect(replyModeManager.getReplyToId(chatId)).toBe(100);

      replyModeManager.clearContext(chatId);
      expect(replyModeManager.getReplyToId(chatId)).toBeUndefined();
    });

    it('should only clear specified chat', () => {
      const chat1 = 111;
      const chat2 = 222;

      replyModeManager.recordUserMessage(chat1, 100);
      replyModeManager.recordUserMessage(chat2, 200);

      replyModeManager.clearContext(chat1);

      expect(replyModeManager.getReplyToId(chat1)).toBeUndefined();
      expect(replyModeManager.getReplyToId(chat2)).toBe(200);
    });
  });

  describe('resetFirst', () => {
    it('should reset first message tracking', () => {
      const chatId = 123;

      replyModeManager.recordUserMessage(chatId, 100);
      replyModeManager.recordUserMessage(chatId, 200);

      // First should be 100
      expect(replyModeManager.getReplyToId(chatId)).toBe(100);

      // Reset first - sets firstMessageId to null
      replyModeManager.resetFirst(chatId);

      // After reset, getReplyToId returns undefined in 'first' mode
      // because firstMessageId is null
      expect(replyModeManager.getReplyToId(chatId)).toBeUndefined();
    });

    it('should still track last message in "all" mode after reset', () => {
      const chatId = 123;
      replyModeManager.setMode('all');

      replyModeManager.recordUserMessage(chatId, 100);
      replyModeManager.recordUserMessage(chatId, 200);
      replyModeManager.resetFirst(chatId);

      // In 'all' mode, we still get the last message
      replyModeManager.recordUserMessage(chatId, 300);
      expect(replyModeManager.getReplyToId(chatId)).toBe(300);
    });
  });
});
