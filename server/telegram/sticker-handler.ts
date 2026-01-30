import type { Context } from "grammy";
import { getDatabase } from "../db/database.js";
import { sessionManager } from "../core/session-manager.js";
import { telegramSubscriptionManager } from "./subscription-manager.js";
import { replyModeManager } from "./reply-mode.js";
import { config } from "../config.js";
import { messageSessionTracker } from "./message-session-tracker.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

interface StickerDescription {
  file_unique_id: string;
  emoji: string;
  set_name: string | null;
  description: string;
  created_at: string;
}

/**
 * Get cached sticker description or return null.
 */
function getCachedDescription(fileUniqueId: string): StickerDescription | null {
  try {
    const db = getDatabase();
    return db.prepare(
      "SELECT * FROM sticker_descriptions WHERE file_unique_id = ?"
    ).get(fileUniqueId) as StickerDescription | null;
  } catch {
    // Table may not exist yet
    return null;
  }
}

/**
 * Store a sticker description in cache.
 */
function cacheDescription(
  fileUniqueId: string,
  emoji: string,
  setName: string | null,
  description: string
): void {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO sticker_descriptions
      (file_unique_id, emoji, set_name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(fileUniqueId, emoji, setName, description, now);
  } catch {
    // Table may not exist yet, ignore
  }
}

/**
 * Generate a basic description for a sticker based on emoji and set name.
 */
function describeSticker(emoji: string, setName: string | null): string {
  const emojiName = emoji || "unknown";
  const setInfo = setName ? ` from the "${setName}" sticker pack` : "";
  return `[Sticker: ${emojiName} emoji${setInfo}]`;
}

/**
 * Handle a sticker message.
 */
export async function handleSticker(ctx: MyContext): Promise<void> {
  const sticker = ctx.message?.sticker;
  if (!sticker) return;

  const chatId = ctx.chat?.id;
  const originalMessageId = ctx.message?.message_id;
  if (!chatId || !originalMessageId) return;

  let sessionName = ctx.session.currentSessionName;

  // Check if user is replying to a bot message for thread-based context switching
  const replyToMessage = ctx.message?.reply_to_message;
  if (replyToMessage?.from?.is_bot && replyToMessage.message_id) {
    const replySessionName = messageSessionTracker.getSessionForMessage(
      chatId,
      replyToMessage.message_id
    );
    if (replySessionName) {
      sessionName = replySessionName;
      ctx.session.currentSessionName = replySessionName;
    }
  }

  // Ensure user is subscribed to the session
  if (
    !telegramSubscriptionManager.isSubscribed(chatId) ||
    telegramSubscriptionManager.getSessionName(chatId) !== sessionName
  ) {
    telegramSubscriptionManager.subscribe(chatId, sessionName);
  }

  // Record user message for reply-to mode tracking
  replyModeManager.recordUserMessage(chatId, originalMessageId);

  // React with eyes emoji to acknowledge receipt (if enabled)
  if (config.telegramReactionAck) {
    try {
      await ctx.react("👀");
    } catch {
      // Reactions may not be supported in all chats
    }
  }

  // Check cache first
  let description = getCachedDescription(sticker.file_unique_id)?.description;

  if (!description) {
    // Generate basic description
    description = describeSticker(sticker.emoji || "", sticker.set_name || null);

    // Cache it for future use
    cacheDescription(
      sticker.file_unique_id,
      sticker.emoji || "",
      sticker.set_name || null,
      description
    );
  }

  // Send "typing" indicator
  await ctx.replyWithChatAction("typing");

  // Create placeholder for agent response
  const placeholder = await ctx.reply("Processing sticker...");
  telegramSubscriptionManager.startActiveResponse(
    chatId,
    placeholder.message_id,
    originalMessageId
  );

  // Send to AI as a message
  try {
    const session = sessionManager.getOrCreateSession(sessionName, "telegram");
    session.sendMessage(description, "telegram");
  } catch (error) {
    console.error("Error handling sticker:", error);
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `Error: ${(error as Error).message}`
    );
  }
}
