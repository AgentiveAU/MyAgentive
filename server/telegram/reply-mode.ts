/**
 * Manages reply-to modes for Telegram messages.
 *
 * Modes:
 * - "off": No reply threading (messages sent without reply_to)
 * - "first": Reply only to the first message in a conversation
 * - "all": Reply to each message separately
 */

export type ReplyMode = "off" | "first" | "all";

interface ReplyContext {
  chatId: number;
  firstMessageId: number | null;
  lastUserMessageId: number;
}

class ReplyModeManager {
  private contexts: Map<number, ReplyContext> = new Map();
  private mode: ReplyMode = "first";

  /**
   * Set the global reply mode.
   */
  setMode(mode: ReplyMode): void {
    this.mode = mode;
  }

  /**
   * Get the current reply mode.
   */
  getMode(): ReplyMode {
    return this.mode;
  }

  /**
   * Record a user message and return the message ID to reply to (if any).
   */
  recordUserMessage(chatId: number, messageId: number): number | undefined {
    let context = this.contexts.get(chatId);

    if (!context) {
      context = {
        chatId,
        firstMessageId: messageId,
        lastUserMessageId: messageId,
      };
      this.contexts.set(chatId, context);
    } else {
      context.lastUserMessageId = messageId;
    }

    return this.getReplyToId(chatId);
  }

  /**
   * Get the message ID to reply to based on current mode.
   */
  getReplyToId(chatId: number): number | undefined {
    const context = this.contexts.get(chatId);
    if (!context) return undefined;

    switch (this.mode) {
      case "off":
        return undefined;
      case "first":
        return context.firstMessageId ?? undefined;
      case "all":
        return context.lastUserMessageId;
      default:
        return undefined;
    }
  }

  /**
   * Clear context for a chat (e.g., when conversation ends).
   */
  clearContext(chatId: number): void {
    this.contexts.delete(chatId);
  }

  /**
   * Reset first message tracking (e.g., when starting a new topic).
   */
  resetFirst(chatId: number): void {
    const context = this.contexts.get(chatId);
    if (context) {
      context.firstMessageId = null;
    }
  }

  /**
   * Parse a reply mode from string input.
   */
  static parseMode(input: string): ReplyMode | null {
    const normalized = input.toLowerCase().trim();
    if (normalized === "off" || normalized === "first" || normalized === "all") {
      return normalized as ReplyMode;
    }
    return null;
  }
}

export const replyModeManager = new ReplyModeManager();

// Export static method for parsing
export const parseReplyMode = ReplyModeManager.parseMode;
