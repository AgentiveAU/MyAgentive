import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../database.js";
import { sessionRepo } from "./session-repo.js";

export interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  source: string | null;
  metadata: string | null;
}

export interface CreateMessageInput {
  session_id: string;
  role: "user" | "assistant" | "tool_use" | "tool_result";
  content: string;
  source?: string;
  metadata?: Record<string, any>;
}

export const messageRepo = {
  create(input: CreateMessageInput): Message {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    db.prepare(
      `INSERT INTO messages (id, session_id, role, content, timestamp, source, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.session_id, input.role, input.content, now, input.source || null, metadata);

    // Touch the session to update its updated_at
    sessionRepo.touch(input.session_id);

    return this.getById(id)!;
  },

  getById(id: string): Message | null {
    const db = getDatabase();
    return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Message | null;
  },

  getBySessionId(sessionId: string, limit: number = 100): Message[] {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT * FROM messages
         WHERE session_id = ?
         ORDER BY timestamp ASC
         LIMIT ?`
      )
      .all(sessionId, limit) as Message[];
  },

  getBySessionName(sessionName: string, limit: number = 100): Message[] {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN sessions s ON m.session_id = s.id
         WHERE s.name = ?
         ORDER BY m.timestamp ASC
         LIMIT ?`
      )
      .all(sessionName, limit) as Message[];
  },

  getRecentBySessionId(sessionId: string, limit: number = 10): Message[] {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT * FROM messages
         WHERE session_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(sessionId, limit) as Message[];
  },

  deleteBySessionId(sessionId: string): number {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
    return result.changes;
  },

  count(sessionId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM messages WHERE session_id = ?")
      .get(sessionId) as { count: number };
    return result.count;
  },

  // Get the most recent assistant message for a session
  getLastAssistantMessage(sessionId: string): Message | null {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT * FROM messages
         WHERE session_id = ? AND role = 'assistant'
         ORDER BY timestamp DESC
         LIMIT 1`
      )
      .get(sessionId) as Message | null;
  },

  // Update message metadata (merges with existing metadata)
  updateMetadata(messageId: string, newMetadata: Record<string, any>): void {
    const db = getDatabase();
    const message = this.getById(messageId);
    if (!message) return;

    const existingMetadata = message.metadata ? JSON.parse(message.metadata) : {};
    const mergedMetadata = { ...existingMetadata, ...newMetadata };

    db.prepare("UPDATE messages SET metadata = ? WHERE id = ?").run(
      JSON.stringify(mergedMetadata),
      messageId
    );
  },
};
