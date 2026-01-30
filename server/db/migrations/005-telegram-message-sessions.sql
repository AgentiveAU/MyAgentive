-- Telegram message to session mapping for thread-based context switching
CREATE TABLE IF NOT EXISTS telegram_message_sessions (
    message_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    session_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_tms_chat ON telegram_message_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_tms_created ON telegram_message_sessions(created_at);
