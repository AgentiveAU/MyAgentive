import { config } from "../config.js";
import { getDatabase } from "../db/database.js";

export type GroupPolicy = "open" | "allowlist" | "disabled";

interface GroupPolicyRecord {
  chat_id: number;
  policy: GroupPolicy;
  updated_at: string;
}

class GroupPolicyManager {
  /**
   * Get the policy for a specific chat.
   * Priority: Database > Config JSON > Allowlist > Default
   */
  getPolicy(chatId: number): GroupPolicy {
    // Check database first for runtime overrides
    const dbPolicy = this.getDbPolicy(chatId);
    if (dbPolicy) {
      return dbPolicy;
    }

    // Check explicit policy from config JSON
    const explicitPolicy = config.telegramGroupPolicies[chatId.toString()];
    if (explicitPolicy) {
      return explicitPolicy;
    }

    // Check if in legacy allowlist
    if (config.telegramAllowedGroups.includes(chatId)) {
      return "allowlist";
    }

    // Return default policy
    return config.telegramGroupPolicy;
  }

  /**
   * Get policy from database if set.
   */
  private getDbPolicy(chatId: number): GroupPolicy | null {
    try {
      const db = getDatabase();
      const record = db
        .prepare("SELECT policy FROM group_policies WHERE chat_id = ?")
        .get(chatId) as { policy: GroupPolicy } | undefined;

      return record?.policy || null;
    } catch {
      // Table may not exist yet
      return null;
    }
  }

  /**
   * Set policy for a chat (runtime, stored in database).
   */
  setPolicy(chatId: number, policy: GroupPolicy): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT OR REPLACE INTO group_policies (chat_id, policy, updated_at)
        VALUES (?, ?, ?)
      `).run(chatId, policy, now);
    } catch (error) {
      console.error("Error setting group policy:", error);
    }
  }

  /**
   * Check if bot should respond in this chat.
   * @param chatId The chat ID
   * @param isMentioned Whether the bot was @mentioned
   * @param userId The user who sent the message (for allowlist checks)
   */
  shouldRespond(
    chatId: number,
    isMentioned: boolean,
    userId?: number
  ): boolean {
    const policy = this.getPolicy(chatId);

    switch (policy) {
      case "disabled":
        return false;

      case "open":
        // Respond when mentioned in open groups
        return isMentioned;

      case "allowlist":
        // Only respond when mentioned by allowed users in allowed groups
        if (!isMentioned) {
          return false;
        }
        // Check if group is in allowlist
        return config.telegramAllowedGroups.includes(chatId);

      default:
        return false;
    }
  }

  /**
   * Parse a policy string.
   */
  static parsePolicy(input: string): GroupPolicy | null {
    const normalized = input.toLowerCase().trim();
    if (
      normalized === "open" ||
      normalized === "allowlist" ||
      normalized === "disabled"
    ) {
      return normalized as GroupPolicy;
    }
    return null;
  }
}

export const groupPolicyManager = new GroupPolicyManager();
