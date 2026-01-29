-- Sticker description cache for AI context
CREATE TABLE IF NOT EXISTS sticker_descriptions (
    file_unique_id TEXT PRIMARY KEY,
    emoji TEXT NOT NULL,
    set_name TEXT,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sticker_set ON sticker_descriptions(set_name);

-- Forum topic settings for supergroup forums
CREATE TABLE IF NOT EXISTS forum_topic_settings (
    id TEXT PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    session_name TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(chat_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_chat ON forum_topic_settings(chat_id);

-- Group policy settings for runtime updates
CREATE TABLE IF NOT EXISTS group_policies (
    chat_id INTEGER PRIMARY KEY,
    policy TEXT NOT NULL DEFAULT 'allowlist',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User preferences for per-user settings
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
    user_id INTEGER PRIMARY KEY,
    link_preview INTEGER NOT NULL DEFAULT 1,
    reply_mode TEXT NOT NULL DEFAULT 'first',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
