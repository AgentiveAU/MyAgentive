import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../../core/session-manager.js', () => ({
  sessionManager: {
    getOrCreateSession: vi.fn(),
  },
}));

vi.mock('../../subscription-manager.js', () => ({
  telegramSubscriptionManager: {
    isSubscribed: vi.fn(),
    getSessionName: vi.fn(),
    subscribe: vi.fn(),
    startActiveResponse: vi.fn(),
  },
}));

vi.mock('../../reply-mode.js', () => ({
  replyModeManager: {
    recordUserMessage: vi.fn(),
  },
}));

vi.mock('../../../config.js', () => ({
  config: {
    telegramReactionAck: true,
  },
}));

import { handleLocation, handleVenue } from '../../handlers/location-handler.js';
import { sessionManager } from '../../../core/session-manager.js';
import { telegramSubscriptionManager } from '../../subscription-manager.js';
import { replyModeManager } from '../../reply-mode.js';
import { config } from '../../../config.js';

describe('handleLocation', () => {
  let mockSession: {
    sendMessage: ReturnType<typeof vi.fn>;
  };
  let mockCtx: any;

  beforeEach(() => {
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
        location: {
          latitude: -33.868820,
          longitude: 151.209290,
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

  it('should return early if no location', async () => {
    mockCtx.message.location = undefined;

    await handleLocation(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
    expect(sessionManager.getOrCreateSession).not.toHaveBeenCalled();
  });

  it('should return early if no chat ID', async () => {
    mockCtx.chat = undefined;

    await handleLocation(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should return early if no message ID', async () => {
    mockCtx.message.message_id = undefined;

    await handleLocation(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should ensure user subscription', async () => {
    vi.mocked(telegramSubscriptionManager.isSubscribed).mockReturnValue(false);

    await handleLocation(mockCtx);

    expect(telegramSubscriptionManager.subscribe).toHaveBeenCalledWith(456, 'default');
  });

  it('should subscribe if session name changed', async () => {
    vi.mocked(telegramSubscriptionManager.getSessionName).mockReturnValue('other-session');

    await handleLocation(mockCtx);

    expect(telegramSubscriptionManager.subscribe).toHaveBeenCalledWith(456, 'default');
  });

  it('should record user message for reply mode', async () => {
    await handleLocation(mockCtx);

    expect(replyModeManager.recordUserMessage).toHaveBeenCalledWith(456, 123);
  });

  it('should react with emoji when enabled', async () => {
    await handleLocation(mockCtx);

    expect(mockCtx.react).toHaveBeenCalledWith('👀');
  });

  it('should skip reaction when disabled', async () => {
    (config as any).telegramReactionAck = false;

    await handleLocation(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should handle reaction errors gracefully', async () => {
    mockCtx.react.mockRejectedValue(new Error('Reactions not supported'));

    await expect(handleLocation(mockCtx)).resolves.not.toThrow();
  });

  it('should format location correctly', async () => {
    await handleLocation(mockCtx);

    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      '[User shared location: -33.868820, 151.209290]',
      'telegram'
    );
  });

  it('should send typing indicator', async () => {
    await handleLocation(mockCtx);

    expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
  });

  it('should create placeholder message', async () => {
    await handleLocation(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith('Processing location...');
  });

  it('should start active response tracking', async () => {
    await handleLocation(mockCtx);

    expect(telegramSubscriptionManager.startActiveResponse).toHaveBeenCalledWith(
      456,
      999, // Placeholder message ID
      123 // Original message ID
    );
  });

  it('should send to session manager', async () => {
    await handleLocation(mockCtx);

    expect(sessionManager.getOrCreateSession).toHaveBeenCalledWith('default', 'telegram');
    expect(mockSession.sendMessage).toHaveBeenCalled();
  });

  it('should handle session errors gracefully', async () => {
    vi.mocked(sessionManager.getOrCreateSession).mockImplementation(() => {
      throw new Error('Session error');
    });

    await handleLocation(mockCtx);

    expect(mockCtx.api.editMessageText).toHaveBeenCalledWith(
      456,
      999,
      'Error: Session error'
    );
  });
});

describe('handleVenue', () => {
  let mockSession: {
    sendMessage: ReturnType<typeof vi.fn>;
  };
  let mockCtx: any;

  beforeEach(() => {
    // Clear all mocks from previous tests
    vi.clearAllMocks();

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
        venue: {
          location: {
            latitude: -33.856784,
            longitude: 151.215297,
          },
          title: 'Sydney Opera House',
          address: 'Bennelong Point, Sydney NSW 2000',
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

  it('should return early if no venue', async () => {
    mockCtx.message.venue = undefined;

    await handleVenue(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
    expect(sessionManager.getOrCreateSession).not.toHaveBeenCalled();
  });

  it('should return early if no chat ID', async () => {
    mockCtx.chat = undefined;

    await handleVenue(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should return early if no message ID', async () => {
    mockCtx.message.message_id = undefined;

    await handleVenue(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should ensure user subscription', async () => {
    vi.mocked(telegramSubscriptionManager.isSubscribed).mockReturnValue(false);

    await handleVenue(mockCtx);

    expect(telegramSubscriptionManager.subscribe).toHaveBeenCalledWith(456, 'default');
  });

  it('should record user message for reply mode', async () => {
    await handleVenue(mockCtx);

    expect(replyModeManager.recordUserMessage).toHaveBeenCalledWith(456, 123);
  });

  it('should react with emoji when enabled', async () => {
    await handleVenue(mockCtx);

    expect(mockCtx.react).toHaveBeenCalledWith('👀');
  });

  it('should skip reaction when disabled', async () => {
    (config as any).telegramReactionAck = false;

    await handleVenue(mockCtx);

    expect(mockCtx.react).not.toHaveBeenCalled();
  });

  it('should format venue correctly', async () => {
    await handleVenue(mockCtx);

    expect(mockSession.sendMessage).toHaveBeenCalledWith(
      '[User shared venue: "Sydney Opera House" at Bennelong Point, Sydney NSW 2000 (-33.856784, 151.215297)]',
      'telegram'
    );
  });

  it('should send typing indicator', async () => {
    await handleVenue(mockCtx);

    expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
  });

  it('should create placeholder message', async () => {
    await handleVenue(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith('Processing venue...');
  });

  it('should start active response tracking', async () => {
    await handleVenue(mockCtx);

    expect(telegramSubscriptionManager.startActiveResponse).toHaveBeenCalledWith(
      456,
      999, // Placeholder message ID
      123 // Original message ID
    );
  });

  it('should send to session manager', async () => {
    await handleVenue(mockCtx);

    expect(sessionManager.getOrCreateSession).toHaveBeenCalledWith('default', 'telegram');
    expect(mockSession.sendMessage).toHaveBeenCalled();
  });

  it('should handle session errors gracefully', async () => {
    vi.mocked(sessionManager.getOrCreateSession).mockImplementation(() => {
      throw new Error('Session error');
    });

    await handleVenue(mockCtx);

    expect(mockCtx.api.editMessageText).toHaveBeenCalledWith(
      456,
      999,
      'Error: Session error'
    );
  });
});
