import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/database.js";

interface TopicSettings {
  id: string;
  chatId: number;
  topicId: number;
  sessionName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TopicSettingsRow {
  id: string;
  chat_id: number;
  topic_id: number;
  session_name: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

class ForumManager {
  /**
   * Get settings for a specific topic.
   */
  getTopicSettings(chatId: number, topicId: number): TopicSettings | null {
    try {
      const db = getDatabase();
      const row = db
        .prepare(
          "SELECT * FROM forum_topic_settings WHERE chat_id = ? AND topic_id = ?"
        )
        .get(chatId, topicId) as TopicSettingsRow | undefined;

      if (!row) return null;

      return {
        id: row.id,
        chatId: row.chat_id,
        topicId: row.topic_id,
        sessionName: row.session_name,
        enabled: row.enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      // Table may not exist yet
      return null;
    }
  }

  /**
   * Set settings for a topic.
   */
  setTopicSettings(
    chatId: number,
    topicId: number,
    settings: Partial<Pick<TopicSettings, "sessionName" | "enabled">>
  ): void {
    try {
      const db = getDatabase();
      const existing = this.getTopicSettings(chatId, topicId);
      const now = new Date().toISOString();

      if (existing) {
        // Update existing
        const sessionName =
          settings.sessionName !== undefined
            ? settings.sessionName
            : existing.sessionName;
        const enabled =
          settings.enabled !== undefined ? settings.enabled : existing.enabled;

        db.prepare(
          `UPDATE forum_topic_settings
           SET session_name = ?, enabled = ?, updated_at = ?
           WHERE chat_id = ? AND topic_id = ?`
        ).run(sessionName, enabled ? 1 : 0, now, chatId, topicId);
      } else {
        // Insert new
        const id = uuidv4();
        const sessionName = settings.sessionName ?? null;
        const enabled = settings.enabled ?? true;

        db.prepare(
          `INSERT INTO forum_topic_settings
           (id, chat_id, topic_id, session_name, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(id, chatId, topicId, sessionName, enabled ? 1 : 0, now, now);
      }
    } catch (error) {
      console.error("Error setting topic settings:", error);
    }
  }

  /**
   * Check if a topic is enabled.
   */
  isTopicEnabled(chatId: number, topicId: number): boolean {
    const settings = this.getTopicSettings(chatId, topicId);
    return settings?.enabled ?? true; // Default to enabled
  }

  /**
   * Get the session name for a topic.
   * Returns a default name if not explicitly set.
   */
  getTopicSessionName(chatId: number, topicId: number): string {
    const settings = this.getTopicSettings(chatId, topicId);
    if (settings?.sessionName) {
      return settings.sessionName;
    }
    // Default: use chat-topic format
    return `group-${Math.abs(chatId)}-topic-${topicId}`;
  }

  /**
   * Check if a message is from a forum topic.
   */
  isForumMessage(messageThreadId: number | undefined): boolean {
    return messageThreadId !== undefined && messageThreadId > 0;
  }
}

export const forumManager = new ForumManager();
