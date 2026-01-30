import { getDatabase } from "../db/database.js";

const MAPPING_TTL_DAYS = 30;
const CLEANUP_PROBABILITY = 0.01; // 1% chance to trigger cleanup on each track

/**
 * Tracks which session generated each Telegram message.
 * Enables thread-based context switching: replying to a bot message
 * routes the conversation to the session that generated it.
 */
class MessageSessionTracker {
  /**
   * Track a message's session mapping.
   * Occasionally cleans up old entries (lazy cleanup).
   */
  trackMessage(chatId: number, messageId: number, sessionName: string): void {
    try {
      const db = getDatabase();

      db.prepare(`
        INSERT OR REPLACE INTO telegram_message_sessions
        (chat_id, message_id, session_name, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(chatId, messageId, sessionName);

      // Lazy cleanup: ~1% chance to delete old entries
      if (Math.random() < CLEANUP_PROBABILITY) {
        this.cleanupOldMappings();
      }
    } catch (error) {
      // Table may not exist yet, ignore
      console.warn("Failed to track message session:", error);
    }
  }

  /**
   * Get the session name for a message, or null if not found.
   */
  getSessionForMessage(chatId: number, messageId: number): string | null {
    try {
      const db = getDatabase();

      const row = db.prepare(`
        SELECT session_name FROM telegram_message_sessions
        WHERE chat_id = ? AND message_id = ?
      `).get(chatId, messageId) as { session_name: string } | undefined;

      return row?.session_name || null;
    } catch {
      // Table may not exist yet
      return null;
    }
  }

  /**
   * Clear all mappings for a session (called when session is deleted).
   */
  clearSessionMappings(sessionName: string): void {
    try {
      const db = getDatabase();

      db.prepare(`
        DELETE FROM telegram_message_sessions
        WHERE session_name = ?
      `).run(sessionName);
    } catch {
      // Table may not exist yet, ignore
    }
  }

  /**
   * Remove mappings older than TTL.
   */
  private cleanupOldMappings(): void {
    try {
      const db = getDatabase();

      const result = db.prepare(`
        DELETE FROM telegram_message_sessions
        WHERE created_at < datetime('now', ?)
      `).run(`-${MAPPING_TTL_DAYS} days`);

      if (result.changes > 0) {
        console.log(`Cleaned up ${result.changes} old message session mappings`);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Singleton instance
export const messageSessionTracker = new MessageSessionTracker();
