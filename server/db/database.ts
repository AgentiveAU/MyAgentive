import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

// Embedded migrations for compiled binary
const EMBEDDED_MIGRATIONS: Record<string, string> = {
  "001-initial.sql": `
-- Sessions: named, accessible from any interface
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'web'
);

CREATE INDEX idx_sessions_name ON sessions(name);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);

-- Messages: conversation history
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT DEFAULT 'web',
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON messages(session_id, timestamp);

-- Auth tokens for web sessions
CREATE TABLE auth_tokens (
    id TEXT PRIMARY KEY,
    user_type TEXT NOT NULL DEFAULT 'web',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    last_used_at TEXT
);

CREATE INDEX idx_tokens_expires ON auth_tokens(expires_at);

-- User session tracking (which session each client is on)
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    client_type TEXT NOT NULL,
    client_id TEXT NOT NULL,
    current_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (current_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_sessions_client ON user_sessions(client_type, client_id);

-- Media files downloaded from Telegram
CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    telegram_file_id TEXT,
    file_type TEXT NOT NULL,
    original_filename TEXT,
    stored_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_media_session ON media_files(session_id);
CREATE INDEX idx_media_telegram ON media_files(telegram_file_id);

-- Activity log for monitoring
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    activity_type TEXT NOT NULL,
    summary TEXT,
    details TEXT,
    sent_to_monitoring INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
`,
  "002-add-archived.sql": `
-- Add archived column to sessions table
ALTER TABLE sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- Index for filtering by archived status with ordering
CREATE INDEX idx_sessions_archived ON sessions(archived, updated_at DESC);
`,
  "003-add-transcription.sql": `
-- Add transcription column to media_files table
ALTER TABLE media_files ADD COLUMN transcription TEXT;

-- Index for finding transcribed files
CREATE INDEX idx_media_transcription ON media_files(transcription) WHERE transcription IS NOT NULL;
`,
};

export function getDatabase(): Database {
  if (!db) {
    // Ensure data directory exists
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.databasePath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");

    console.log(`Database connected: ${config.databasePath}`);
  }
  return db;
}

export function runMigrations(): void {
  const database = getDatabase();
  const migrationsDir = path.join(__dirname, "migrations");

  // Create migrations tracking table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get list of applied migrations
  const applied = new Set(
    database
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((row: any) => row.name)
  );

  // Try to read from filesystem first (development), fall back to embedded (production)
  let migrations: Array<{ name: string; sql: string }> = [];

  if (fs.existsSync(migrationsDir)) {
    // Development mode: read from files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      migrations.push({
        name: file,
        sql: fs.readFileSync(path.join(migrationsDir, file), "utf-8"),
      });
    }
  } else {
    // Production mode: use embedded migrations
    console.log("Using embedded migrations");
    migrations = Object.entries(EMBEDDED_MIGRATIONS)
      .map(([name, sql]) => ({ name, sql }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    console.log(`Applying migration: ${migration.name}`);

    database.transaction(() => {
      database.exec(migration.sql);
      database.prepare("INSERT INTO _migrations (name) VALUES (?)").run(migration.name);
    })();

    console.log(`Migration applied: ${migration.name}`);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("Database connection closed");
  }
}
