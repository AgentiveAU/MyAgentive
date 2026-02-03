import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../database.js";

export interface Session {
  id: string;
  name: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  archived: number; // SQLite uses 0/1 for boolean
  pinned: number; // SQLite uses 0/1 for boolean
  sdk_session_id: string | null; // Claude Agent SDK session ID for resume
}

export interface ListSessionsOptions {
  archived?: boolean;
}

export interface CreateSessionInput {
  name: string;
  title?: string;
  created_by?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSessionName(): string {
  const adjectives = ["quick", "bright", "calm", "bold", "swift", "keen"];
  const nouns = ["fox", "owl", "hawk", "wolf", "bear", "lion"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}

export const sessionRepo = {
  create(input: CreateSessionInput): Session {
    const db = getDatabase();
    const id = uuidv4();
    const name = input.name ? slugify(input.name) : generateSessionName();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO sessions (id, name, title, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, input.title || null, now, now, input.created_by || "web");

    return this.getById(id)!;
  },

  getById(id: string): Session | null {
    const db = getDatabase();
    return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session | null;
  },

  getByName(name: string): Session | null {
    const db = getDatabase();
    return db.prepare("SELECT * FROM sessions WHERE name = ?").get(name) as Session | null;
  },

  getOrCreateByName(name: string, createdBy: string = "web"): Session {
    let session = this.getByName(name);
    if (!session) {
      session = this.create({ name, created_by: createdBy });
    }
    return session;
  },

  list(options: ListSessionsOptions = {}): Session[] {
    const db = getDatabase();

    // Default to showing non-archived sessions
    const archived = options.archived ?? false;

    // Sort: pinned first, then by updated_at
    return db
      .prepare("SELECT * FROM sessions WHERE archived = ? ORDER BY pinned DESC, updated_at DESC")
      .all(archived ? 1 : 0) as Session[];
  },

  archive(id: string): boolean {
    const db = getDatabase();
    // Clear pinned status when archiving, don't update updated_at (preserves sort order)
    const result = db.prepare(
      "UPDATE sessions SET archived = 1, pinned = 0 WHERE id = ?"
    ).run(id);
    return result.changes > 0;
  },

  archiveByName(name: string): boolean {
    const db = getDatabase();
    // Clear pinned status when archiving, don't update updated_at (preserves sort order)
    const result = db.prepare(
      "UPDATE sessions SET archived = 1, pinned = 0 WHERE name = ?"
    ).run(name);
    return result.changes > 0;
  },

  unarchive(id: string): boolean {
    const db = getDatabase();
    // Don't update updated_at so session returns to its original position
    const result = db.prepare(
      "UPDATE sessions SET archived = 0 WHERE id = ?"
    ).run(id);
    return result.changes > 0;
  },

  unarchiveByName(name: string): boolean {
    const db = getDatabase();
    // Don't update updated_at so session returns to its original position
    const result = db.prepare(
      "UPDATE sessions SET archived = 0 WHERE name = ?"
    ).run(name);
    return result.changes > 0;
  },

  pin(id: string): boolean {
    const db = getDatabase();
    // Don't update updated_at - sort order based on message activity only
    const result = db.prepare(
      "UPDATE sessions SET pinned = 1 WHERE id = ?"
    ).run(id);
    return result.changes > 0;
  },

  pinByName(name: string): boolean {
    const db = getDatabase();
    // Don't update updated_at - sort order based on message activity only
    const result = db.prepare(
      "UPDATE sessions SET pinned = 1 WHERE name = ?"
    ).run(name);
    return result.changes > 0;
  },

  unpin(id: string): boolean {
    const db = getDatabase();
    // Don't update updated_at - sort order based on message activity only
    const result = db.prepare(
      "UPDATE sessions SET pinned = 0 WHERE id = ?"
    ).run(id);
    return result.changes > 0;
  },

  unpinByName(name: string): boolean {
    const db = getDatabase();
    // Don't update updated_at - sort order based on message activity only
    const result = db.prepare(
      "UPDATE sessions SET pinned = 0 WHERE name = ?"
    ).run(name);
    return result.changes > 0;
  },

  updateTitle(id: string, title: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?").run(
      title,
      now,
      id
    );
  },

  touch(id: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return result.changes > 0;
  },

  deleteByName(name: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM sessions WHERE name = ?").run(name);
    return result.changes > 0;
  },

  // Update SDK session ID (for session resume functionality)
  updateSdkSessionId(id: string, sdkSessionId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE sessions SET sdk_session_id = ?, updated_at = ? WHERE id = ?"
    ).run(sdkSessionId, now, id);
  },

  // Clear SDK session ID (when session cannot be resumed)
  clearSdkSessionId(id: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE sessions SET sdk_session_id = NULL, updated_at = ? WHERE id = ?"
    ).run(now, id);
  },
};
