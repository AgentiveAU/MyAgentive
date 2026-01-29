/**
 * Test fixtures for Telegram-related tests.
 */

export const fixtures = {
  // Sticker fixture
  sticker: {
    file_id: 'test-sticker-file-id',
    file_unique_id: 'test-sticker-unique-id',
    emoji: '😀',
    set_name: 'TestStickerSet',
    width: 512,
    height: 512,
    is_animated: false,
    is_video: false,
    type: 'regular',
  },

  // Location fixture (Sydney Opera House)
  location: {
    latitude: -33.8568,
    longitude: 151.2153,
  },

  // Venue fixture
  venue: {
    location: {
      latitude: -33.8568,
      longitude: 151.2153,
    },
    title: 'Sydney Opera House',
    address: 'Bennelong Point, Sydney NSW 2000, Australia',
  },

  // Media group fixture
  mediaGroup: {
    media_group_id: 'test-media-group-123',
    photo: [
      { file_id: 'photo-1-small', width: 320, height: 240 },
      { file_id: 'photo-1-medium', width: 800, height: 600 },
      { file_id: 'photo-1-large', width: 1280, height: 960 },
    ],
  },

  // Voice message fixture
  voice: {
    file_id: 'test-voice-file-id',
    file_unique_id: 'test-voice-unique-id',
    duration: 5,
    mime_type: 'audio/ogg',
  },

  // User fixture
  user: {
    id: 789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    is_bot: false,
  },

  // Chat fixtures
  privateChat: {
    id: 456,
    type: 'private' as const,
  },

  groupChat: {
    id: -100123456789,
    type: 'supergroup' as const,
    title: 'Test Group',
  },

  forumChat: {
    id: -100987654321,
    type: 'supergroup' as const,
    title: 'Test Forum',
    is_forum: true,
  },

  // Forum topic fixture
  forumTopic: {
    message_thread_id: 42,
    name: 'Test Topic',
  },

  // Long text for fragment buffer testing (>4000 chars)
  longText: 'A'.repeat(4100),

  // Short text
  shortText: 'Hello, this is a test message.',
};

/**
 * Create a message fixture with specific properties.
 */
export function createMessage(overrides: any = {}) {
  return {
    message_id: 123,
    date: Math.floor(Date.now() / 1000),
    chat: fixtures.privateChat,
    from: fixtures.user,
    text: fixtures.shortText,
    ...overrides,
  };
}
