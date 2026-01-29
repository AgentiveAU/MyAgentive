import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../../db/database.js', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

import { forumManager } from '../forum-manager.js';
import { getDatabase } from '../../db/database.js';

describe('ForumManager', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    get: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStatement = {
      get: vi.fn(),
      run: vi.fn(),
    };
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStatement),
    };
    vi.mocked(getDatabase).mockReturnValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTopicSettings', () => {
    it('should return topic settings from database', () => {
      const mockRow = {
        id: 'topic-id-123',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: 'custom-session',
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      mockStatement.get.mockReturnValue(mockRow);

      const settings = forumManager.getTopicSettings(-100123456789, 42);

      expect(settings).toEqual({
        id: 'topic-id-123',
        chatId: -100123456789,
        topicId: 42,
        sessionName: 'custom-session',
        enabled: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM forum_topic_settings WHERE chat_id = ? AND topic_id = ?'
      );
    });

    it('should return null for unknown topic', () => {
      mockStatement.get.mockReturnValue(undefined);

      const settings = forumManager.getTopicSettings(-100123456789, 999);

      expect(settings).toBeNull();
    });

    it('should convert enabled=0 to false', () => {
      const mockRow = {
        id: 'topic-id-123',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: null,
        enabled: 0,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      mockStatement.get.mockReturnValue(mockRow);

      const settings = forumManager.getTopicSettings(-100123456789, 42);

      expect(settings?.enabled).toBe(false);
    });

    it('should handle database errors gracefully', () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Table not found');
      });

      const settings = forumManager.getTopicSettings(-100123456789, 42);

      expect(settings).toBeNull();
    });
  });

  describe('setTopicSettings', () => {
    it('should create new topic settings', () => {
      mockStatement.get.mockReturnValue(undefined); // No existing record

      forumManager.setTopicSettings(-100123456789, 42, {
        sessionName: 'my-session',
        enabled: true,
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO forum_topic_settings')
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'test-uuid-1234',
        -100123456789,
        42,
        'my-session',
        1, // enabled = true
        expect.any(String), // created_at
        expect.any(String) // updated_at
      );
    });

    it('should update existing topic settings', () => {
      // First call returns existing record
      mockStatement.get.mockReturnValueOnce({
        id: 'existing-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: 'old-session',
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      forumManager.setTopicSettings(-100123456789, 42, {
        sessionName: 'new-session',
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE forum_topic_settings')
      );
    });

    it('should handle partial updates (enabled only)', () => {
      mockStatement.get.mockReturnValueOnce({
        id: 'existing-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: 'existing-session',
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      forumManager.setTopicSettings(-100123456789, 42, {
        enabled: false,
      });

      expect(mockStatement.run).toHaveBeenCalledWith(
        'existing-session', // Keep existing session name
        0, // enabled = false
        expect.any(String),
        -100123456789,
        42
      );
    });

    it('should handle database errors gracefully', () => {
      mockStatement.get.mockReturnValue(undefined);
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Should not throw
      expect(() =>
        forumManager.setTopicSettings(-100123456789, 42, { enabled: true })
      ).not.toThrow();
    });
  });

  describe('isTopicEnabled', () => {
    it('should return true for enabled topic', () => {
      mockStatement.get.mockReturnValue({
        id: 'topic-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: null,
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const enabled = forumManager.isTopicEnabled(-100123456789, 42);

      expect(enabled).toBe(true);
    });

    it('should return false for disabled topic', () => {
      mockStatement.get.mockReturnValue({
        id: 'topic-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: null,
        enabled: 0,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const enabled = forumManager.isTopicEnabled(-100123456789, 42);

      expect(enabled).toBe(false);
    });

    it('should default to true for unknown topic', () => {
      mockStatement.get.mockReturnValue(undefined);

      const enabled = forumManager.isTopicEnabled(-100123456789, 999);

      expect(enabled).toBe(true);
    });
  });

  describe('getTopicSessionName', () => {
    it('should return custom session name if set', () => {
      mockStatement.get.mockReturnValue({
        id: 'topic-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: 'my-custom-session',
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const sessionName = forumManager.getTopicSessionName(-100123456789, 42);

      expect(sessionName).toBe('my-custom-session');
    });

    it('should return default format if no custom name', () => {
      mockStatement.get.mockReturnValue({
        id: 'topic-id',
        chat_id: -100123456789,
        topic_id: 42,
        session_name: null,
        enabled: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const sessionName = forumManager.getTopicSessionName(-100123456789, 42);

      expect(sessionName).toBe('group-100123456789-topic-42');
    });

    it('should return default format for unknown topic', () => {
      mockStatement.get.mockReturnValue(undefined);

      const sessionName = forumManager.getTopicSessionName(-100123456789, 42);

      expect(sessionName).toBe('group-100123456789-topic-42');
    });

    it('should handle positive chat IDs', () => {
      mockStatement.get.mockReturnValue(undefined);

      const sessionName = forumManager.getTopicSessionName(123456, 42);

      expect(sessionName).toBe('group-123456-topic-42');
    });
  });

  describe('isForumMessage', () => {
    it('should return true for valid thread ID', () => {
      expect(forumManager.isForumMessage(42)).toBe(true);
    });

    it('should return true for thread ID of 1', () => {
      expect(forumManager.isForumMessage(1)).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(forumManager.isForumMessage(undefined)).toBe(false);
    });

    it('should return false for thread ID of 0', () => {
      expect(forumManager.isForumMessage(0)).toBe(false);
    });

    it('should return false for negative thread ID', () => {
      expect(forumManager.isForumMessage(-1)).toBe(false);
    });
  });
});
