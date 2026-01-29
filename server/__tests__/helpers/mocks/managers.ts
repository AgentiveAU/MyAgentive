import { vi } from 'vitest';

/**
 * Create a mock session manager for testing.
 */
export function createMockSessionManager() {
  const mockSession = {
    sendMessage: vi.fn(),
    name: 'default',
    id: 'session-123',
  };

  return {
    getOrCreateSession: vi.fn().mockReturnValue(mockSession),
    getSession: vi.fn().mockReturnValue(null),
    listSessions: vi.fn().mockReturnValue([]),
    subscribeClient: vi.fn(),
    unsubscribeClient: vi.fn(),
    // Expose mock session for assertions
    _mockSession: mockSession,
  };
}

/**
 * Create a mock Telegram subscription manager for testing.
 */
export function createMockSubscriptionManager() {
  return {
    isSubscribed: vi.fn().mockReturnValue(true),
    getSessionName: vi.fn().mockReturnValue('default'),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    startActiveResponse: vi.fn(),
    setBot: vi.fn(),
  };
}

/**
 * Create a mock reply mode manager for testing.
 */
export function createMockReplyModeManager() {
  return {
    recordUserMessage: vi.fn().mockReturnValue(123),
    getReplyToId: vi.fn().mockReturnValue(undefined),
    getMode: vi.fn().mockReturnValue('first'),
    setMode: vi.fn(),
    clearContext: vi.fn(),
    resetFirst: vi.fn(),
  };
}

/**
 * Create a mock config object for testing.
 */
export function createMockConfig(overrides: any = {}) {
  return {
    telegramReactionAck: true,
    telegramFragmentBufferMs: 500,
    telegramGroupPolicy: 'allowlist' as const,
    telegramGroupPolicies: {} as Record<string, 'open' | 'allowlist' | 'disabled'>,
    telegramAllowedGroups: [] as number[],
    telegramLinkPreview: true,
    telegramMonitoringGroupId: null,
    ...overrides,
  };
}
