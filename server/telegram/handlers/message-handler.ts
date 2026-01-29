import type { Context, Api, RawApi } from "grammy";
import { sessionManager } from "../../core/session-manager.js";
import { telegramSubscriptionManager } from "../subscription-manager.js";
import { config } from "../../config.js";
import { createFragmentBuffer } from "../fragment-buffer.js";
import { replyModeManager } from "../reply-mode.js";
import { forumManager } from "../forum-manager.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

// Store context info for buffered messages
interface BufferedContext {
  sessionName: string;
  api: Api<RawApi>;
}

const bufferedContexts: Map<number, BufferedContext> = new Map();

// Create fragment buffer with callback to process combined messages
const fragmentBuffer = createFragmentBuffer(async (chatId, combinedText, firstMessageId) => {
  const ctx = bufferedContexts.get(chatId);
  if (!ctx) return;

  await processMessage(chatId, combinedText, firstMessageId, ctx.sessionName, ctx.api);
  bufferedContexts.delete(chatId);
});

/**
 * Process a message (either direct or from buffer).
 */
async function processMessage(
  chatId: number,
  text: string,
  originalMessageId: number,
  sessionName: string,
  api: Api<RawApi>
): Promise<void> {
  // Record user message for reply-to mode tracking
  replyModeManager.recordUserMessage(chatId, originalMessageId);

  // React with eyes emoji to acknowledge receipt (if enabled)
  if (config.telegramReactionAck) {
    try {
      await api.setMessageReaction(chatId, originalMessageId, [{ type: "emoji", emoji: "👀" }]);
    } catch {
      // Reactions may not be supported in all chats (e.g., old groups)
    }
  }

  // Send "typing" indicator
  await api.sendChatAction(chatId, "typing");

  // Create a placeholder message for the response
  const placeholder = await api.sendMessage(chatId, "Thinking...");

  // Start active response tracking (for message editing)
  // Pass the original message ID for reaction removal later
  telegramSubscriptionManager.startActiveResponse(chatId, placeholder.message_id, originalMessageId);

  try {
    // Get the session and send the message
    const session = sessionManager.getOrCreateSession(sessionName, "telegram");
    session.sendMessage(text, "telegram");
  } catch (error) {
    console.error("Error handling Telegram message:", error);
    await api.editMessageText(
      chatId,
      placeholder.message_id,
      `Error: ${(error as Error).message}`
    );
  }
}

export async function handleMessage(ctx: MyContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const chatId = ctx.chat?.id;
  const originalMessageId = ctx.message?.message_id;
  if (!chatId || !originalMessageId) return;

  // Check for forum topic
  const topicId = ctx.message?.message_thread_id;
  let sessionName = ctx.session.currentSessionName;

  // Handle forum topics - use topic-specific session
  if (topicId && forumManager.isForumMessage(topicId)) {
    // Check if topic is enabled
    if (!forumManager.isTopicEnabled(chatId, topicId)) {
      return; // Topic is disabled, silently ignore
    }

    // Use topic-specific session
    sessionName = forumManager.getTopicSessionName(chatId, topicId);
  }

  // Ensure user is subscribed to the session (for persistent updates)
  if (!telegramSubscriptionManager.isSubscribed(chatId) ||
      telegramSubscriptionManager.getSessionName(chatId) !== sessionName) {
    telegramSubscriptionManager.subscribe(chatId, sessionName);
  }

  // Check if this message should be buffered (long text fragments)
  if (fragmentBuffer.add(chatId, originalMessageId, text)) {
    // Message is being buffered, store context for later processing
    bufferedContexts.set(chatId, {
      sessionName,
      api: ctx.api,
    });
    return;
  }

  // Process immediately (not a fragment)
  await processMessage(chatId, text, originalMessageId, sessionName, ctx.api);
}
