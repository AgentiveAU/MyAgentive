import type { Context } from "grammy";
import { sessionManager } from "../../core/session-manager.js";
import { telegramSubscriptionManager } from "../subscription-manager.js";
import { replyModeManager } from "../reply-mode.js";
import { config } from "../../config.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

/**
 * Handle a location message.
 */
export async function handleLocation(ctx: MyContext): Promise<void> {
  const location = ctx.message?.location;
  if (!location) return;

  const chatId = ctx.chat?.id;
  const originalMessageId = ctx.message?.message_id;
  if (!chatId || !originalMessageId) return;

  const sessionName = ctx.session.currentSessionName;

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

  // Format location for AI
  const { latitude, longitude } = location;
  const locationText = `[User shared location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}]`;

  // Send "typing" indicator
  await ctx.replyWithChatAction("typing");

  // Create placeholder for agent response
  const placeholder = await ctx.reply("Processing location...");
  telegramSubscriptionManager.startActiveResponse(
    chatId,
    placeholder.message_id,
    originalMessageId
  );

  // Send to AI
  try {
    const session = sessionManager.getOrCreateSession(sessionName, "telegram");
    session.sendMessage(locationText, "telegram");
  } catch (error) {
    console.error("Error handling location:", error);
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `Error: ${(error as Error).message}`
    );
  }
}

/**
 * Handle a venue message (location with name and address).
 */
export async function handleVenue(ctx: MyContext): Promise<void> {
  const venue = ctx.message?.venue;
  if (!venue) return;

  const chatId = ctx.chat?.id;
  const originalMessageId = ctx.message?.message_id;
  if (!chatId || !originalMessageId) return;

  const sessionName = ctx.session.currentSessionName;

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

  // Format venue for AI
  const { title, address, location } = venue;
  const venueText = `[User shared venue: "${title}" at ${address} (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})]`;

  // Send "typing" indicator
  await ctx.replyWithChatAction("typing");

  // Create placeholder for agent response
  const placeholder = await ctx.reply("Processing venue...");
  telegramSubscriptionManager.startActiveResponse(
    chatId,
    placeholder.message_id,
    originalMessageId
  );

  // Send to AI
  try {
    const session = sessionManager.getOrCreateSession(sessionName, "telegram");
    session.sendMessage(venueText, "telegram");
  } catch (error) {
    console.error("Error handling venue:", error);
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `Error: ${(error as Error).message}`
    );
  }
}
