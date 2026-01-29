import { vi } from 'vitest';

/**
 * Create a mock Grammy context for testing handlers.
 * Override any properties as needed for specific test cases.
 */
export function createMockContext(overrides: any = {}) {
  const mockApi = {
    setMessageReaction: vi.fn().mockResolvedValue(undefined),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue({ message_id: 999 }),
    editMessageText: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides.api,
  };

  return {
    message: {
      message_id: 123,
      text: 'test message',
      date: Math.floor(Date.now() / 1000),
      chat: { id: 456, type: 'private' },
      from: { id: 789, first_name: 'Test', is_bot: false },
      ...overrides.message,
    },
    chat: { id: 456, type: 'private', ...overrides.chat },
    from: { id: 789, first_name: 'Test', is_bot: false, ...overrides.from },
    session: { currentSessionName: 'default', ...overrides.session },
    me: { id: 111, username: 'testbot', first_name: 'TestBot', is_bot: true },
    react: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue({ message_id: 999 }),
    replyWithChatAction: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    editMessageReplyMarkup: vi.fn().mockResolvedValue(undefined),
    answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    api: mockApi,
    update: { update_id: 12345 },
    ...overrides,
  };
}

/**
 * Create a mock callback query context for testing inline button handlers.
 */
export function createMockCallbackQueryContext(data: string, overrides: any = {}) {
  return createMockContext({
    callbackQuery: {
      id: 'callback-123',
      data,
      from: { id: 789, first_name: 'Test', is_bot: false },
      chat_instance: 'chat-instance-123',
      ...overrides.callbackQuery,
    },
    ...overrides,
  });
}
