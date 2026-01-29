import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../db/database.js', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../core/session-manager.js', () => ({
  sessionManager: {
    getOrCreateSession: vi.fn(),
  },
}));

vi.mock('../subscription-manager.js', () => ({
  telegramSubscriptionManager: {
    isSubscribed: vi.fn(),
    getSessionName: vi.fn(),
    subscribe: vi.fn(),
    startActiveResponse: vi.fn(),
  },
}));

vi.mock('../reply-mode.js', () => ({
  replyModeManager: {
    recordUserMessage: vi.fn(),
  },
}));

vi.mock('../../config.js', () => ({
  config: {
    telegramReactionAck: true,
  },
}));

import { handleSticker } from '../sticker-handler.js';
import { getDatabase } from '../../db/database.js';
import { sessionManager } from '../../core/session-manager.js';
import { telegramSubscriptionManager } from '../subscription-manager.js';
import { replyModeManager } from '../reply-mode.js';
import { config } from '../../config.js';

describe('handleSticker', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    get: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
  let mockSession: {
    sendMessage: ReturnType<typeof vi.fn>;
  };
  let mockCtx: any;

  beforeEach(() => {
    // Database mock
    mockStatement = {
      get: vi.fn(),
      run: vi.fn(),
    };
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStatement),
    };
    vi.mocked(getDatabase).mockReturnValue(mockDb as any);

    // Session mock
    mockSession = {
      sendMessage: vi.fn(),
    };
    vi.mocked(sessionManager.getOrCreateSession).mockReturnValue(mockSession as any);

    // Subscription manager mock
    vi.mocked(telegramSubscriptionManager.isSubscribed).mockReturnValue(true);
    vi.mocked(telegramSubscriptionManager.getSessionName).mockReturnValue('default');

    // Context mock
    mockCtx = {
      message: {
        message_id: 123,
        sticker: {
          file_id: 'sticker-file-id',
          file_unique_id: 'sticker-unique-id',
          emoji: '😀',
          set_name: 'TestStickerPack',
          width: 512,
          height: 512,
        },
      },
      chat: { id: 456 },
      session: { currentSessionName: 'default' },
      react: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue({ message_id: 999 }),
      replyWithChatAction: vi.fn().mockResolvedValue(undefined),
      api: {
        editMessageText: vi.fn().mockResolvedValue(undefined),
      },
    };

    // Reset config
    (config as any).telegramReactionAck = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return early if no sticker', async () => {
    mockCtx.message.sticker = undefined;

    await handleSticker(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
    expect(sessionManager.getOrCreateSession).not.toHaveBeenCalled();
  });

  it('should return early if no chat ID', async () => {
    mockCtx.chat = undefined;

    await handleSticker(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should return early if no message ID', async () => {
    mockCtx.message.message_id = undefined;

    await handleSticker(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should ensure user subscription', async () => {
    vi.mocked(telegramSubscriptionManager.isSubscribed).mockReturnValue(false);

    await handleSticker(mockCtx);

    expect(telegramSubscriptionManager.subscribe).toHaveBeenCalledWith(456, 'default');
  });

  it('should subscribe if session name changed', async () => {
    vi.mocked(telegramSubscriptionManager.getSessionName).mockReturnValue('other-session');

    await handleSticker(mockCtx);

    expect(telegramSubscriptionManager.subscribe).toHaveBeenCalledWith(456, 'default');
  });

  it('should record user message for reply mode', async () => {
    await handleSticker(mockCtx);

    expect(replyModeManager.recordUserMessage).toHaveBeenCalledWith(456, 123);
  });

  it('should react with emoji when enabled', async () => {
    await handleSticker(mockCtx);

    expect(mockCtx.react).toHaveBeenCalledWith('👀');
  });

  it('should skip reaction when disabled', async () => {
    (config as any).telegramReactionAck = false;

    await handleSticker(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should handle reaction errors gracefully', async () => {
    mockCtx.react.mockRejectedValue(new Error('Reactions not supported'));

    // Should not throw
    await expect(handleSticker(mockCtx)).resolves.not.toThrow();
  });

  it('should check sticker cache', async () => {
    mockStatement.get.mockReturnValue({
      file_unique_id: 'sticker-unique-id',
      emoji: '😀',
      set_name: 'TestStickerPack',
      description: '[Cached sticker description]',
      created_at: '2024-01-01T00:00:00.000Z',
    });

    await handleSticker(mockCtx);

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM sticker_descriptions')
    );
    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      '[Cached sticker description]',
      'telegram'
    );
  });

  it('should cache new sticker descriptions', async () => {
    mockStatement.get.mockReturnValue(null); // Not cached

    await handleSticker(mockCtx);

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO sticker_descriptions')
    );
    expect(mockStatement.run).toHaveBeenCalledWith(
      'sticker-unique-id',
      '😀',
      'TestStickerPack',
      expect.stringContaining('[Sticker:'),
      expect.any(String)
    );
  });

  it('should generate description from emoji and set name', async () => {
    mockStatement.get.mockReturnValue(null);

    await handleSticker(mockCtx);

    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      '[Sticker: 😀 emoji from the "TestStickerPack" sticker pack]',
      'telegram'
    );
  });

  it('should generate description without set name', async () => {
    mockStatement.get.mockReturnValue(null);
    mockCtx.message.sticker.set_name = null;

    await handleSticker(mockCtx);

    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      '[Sticker: 😀 emoji]',
      'telegram'
    );
  });

  it('should handle missing emoji', async () => {
    mockStatement.get.mockReturnValue(null);
    mockCtx.message.sticker.emoji = undefined;

    await handleSticker(mockCtx);

    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Sticker:'),
      'telegram'
    );
  });

  it('should send typing indicator', async () => {
    await handleSticker(mockCtx);

    expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
  });

  it('should create placeholder message', async () => {
    await handleSticker(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith('Processing sticker...');
  });

  it('should start active response tracking', async () => {
    await handleSticker(mockCtx);

    expect(telegramSubscriptionManager.startActiveResponse).toHaveBeenCalledWith(
      456,
      999, // Placeholder message ID
      123 // Original message ID
    );
  });

  it('should send to session manager', async () => {
    await handleSticker(mockCtx);

    expect(sessionManager.getOrCreateSession).toHaveBeenCalledWith('default', 'telegram');
    expect(mockSession.sendMessage).toHaveBeenCalled();
  });

  it('should handle session errors gracefully', async () => {
    vi.mocked(sessionManager.getOrCreateSession).mockImplementation(() => {
      throw new Error('Session error');
    });

    await handleSticker(mockCtx);

    expect(mockCtx.api.editMessageText).toHaveBeenCalledWith(
      456,
      999,
      'Error: Session error'
    );
  });

  it('should handle database cache errors gracefully', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT')) {
        throw new Error('Table not found');
      }
      return mockStatement;
    });

    // Should not throw, will generate new description
    await expect(handleSticker(mockCtx)).resolves.not.toThrow();
    expect(mockSession.sendMessage).toHaveBeenCalled();
  });
});
