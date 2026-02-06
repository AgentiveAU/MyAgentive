import fs from "fs";
import path from "path";
import { Bot, InputFile } from "grammy";
import { sessionManager } from "../core/session-manager.js";
import type { OutgoingWSMessage } from "../types.js";
import { convertToTelegramMarkdown } from "./markdown-converter.js";
import { validateMediaPath, type DetectedMedia } from "../utils/media-detector.js";
import { config } from "../config.js";
import { replyModeManager } from "./reply-mode.js";
import { messageSessionTracker } from "./message-session-tracker.js";

// Attachment tag format from web uploads
const ATTACHMENT_PATTERN = /\[\[ATTACHMENT\|\|\|type:(\w+)\|\|\|url:([^\|]+)\|\|\|name:([^\]]+)\]\]/;

// Telegram message length limit
const MAX_MESSAGE_LENGTH = 4096;

// Split long text into chunks that fit Telegram's limit
function splitMessage(text: string, maxLength: number = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a natural break point (newline, then space)
    let splitIndex = maxLength;

    // Look for last newline within the limit
    const lastNewline = remaining.lastIndexOf('\n', maxLength);
    if (lastNewline > maxLength * 0.5) {
      splitIndex = lastNewline + 1;
    } else {
      // Look for last space within the limit
      const lastSpace = remaining.lastIndexOf(' ', maxLength);
      if (lastSpace > maxLength * 0.5) {
        splitIndex = lastSpace + 1;
      }
    }

    chunks.push(remaining.substring(0, splitIndex).trimEnd());
    remaining = remaining.substring(splitIndex).trimStart();
  }

  return chunks;
}

// Response timeout in minutes (default 60 minutes)
const RESPONSE_TIMEOUT_MINUTES = parseInt(process.env.TELEGRAM_RESPONSE_TIMEOUT_MINUTES || "60", 10);

// Track active responses (user is waiting for agent reply to their message)
interface ActiveResponse {
  messageId: number;
  originalMessageId: number; // The user's original message (for reaction removal)
  content: string;
  lastUpdate: number;
  timeout?: NodeJS.Timeout;
}

// Subscription state for a Telegram user
interface TelegramSubscription {
  chatId: number;
  sessionName: string;
  activeResponse: ActiveResponse | null;
}

class TelegramSubscriptionManager {
  private subscriptions: Map<number, TelegramSubscription> = new Map();
  private bot: Bot<any> | null = null;

  setBot(bot: Bot<any>) {
    this.bot = bot;
  }

  // Subscribe a Telegram user to a session
  subscribe(chatId: number, sessionName: string): void {
    const existing = this.subscriptions.get(chatId);

    // If already subscribed to a different session, unsubscribe first
    if (existing && existing.sessionName !== sessionName) {
      this.unsubscribe(chatId);
    }

    // Skip if already subscribed to this session
    if (existing?.sessionName === sessionName) {
      return;
    }

    const clientId = `telegram-persistent-${chatId}`;

    // Subscribe to session manager with callback for incoming messages
    sessionManager.subscribeClient(
      clientId,
      sessionName,
      "telegram",
      (message) => this.handleMessage(chatId, message)
    );

    this.subscriptions.set(chatId, {
      chatId,
      sessionName,
      activeResponse: null,
    });

    console.log(`Telegram user ${chatId} subscribed to session: ${sessionName}`);
  }

  // Unsubscribe from current session
  unsubscribe(chatId: number): void {
    const subscription = this.subscriptions.get(chatId);
    if (!subscription) return;

    const clientId = `telegram-persistent-${chatId}`;
    sessionManager.unsubscribeClient(clientId);

    // Clear any pending timeout
    if (subscription.activeResponse?.timeout) {
      clearTimeout(subscription.activeResponse.timeout);
    }

    this.subscriptions.delete(chatId);
    console.log(`Telegram user ${chatId} unsubscribed from session: ${subscription.sessionName}`);
  }

  // Get current session for a user
  getSessionName(chatId: number): string | null {
    return this.subscriptions.get(chatId)?.sessionName || null;
  }

  // Check if user is subscribed
  isSubscribed(chatId: number): boolean {
    return this.subscriptions.has(chatId);
  }

  // Start an active response (user sent a message, waiting for reply)
  startActiveResponse(chatId: number, messageId: number, originalMessageId?: number): void {
    const subscription = this.subscriptions.get(chatId);
    if (!subscription) return;

    // Clear any existing timeout
    if (subscription.activeResponse?.timeout) {
      clearTimeout(subscription.activeResponse.timeout);
    }

    // Set timeout for long-running requests
    const timeout = setTimeout(async () => {
      const sub = this.subscriptions.get(chatId);
      if (sub?.activeResponse) {
        const content = sub.activeResponse.content || "Response timed out";
        await this.updateActiveMessage(chatId, content + `\n\n[Timed out after ${RESPONSE_TIMEOUT_MINUTES} minutes]`);
        // Remove reaction on timeout
        await this.removeReactionAck(chatId, sub.activeResponse.originalMessageId);
        sub.activeResponse = null;
      }
    }, RESPONSE_TIMEOUT_MINUTES * 60 * 1000);

    subscription.activeResponse = {
      messageId,
      originalMessageId: originalMessageId || messageId,
      content: "",
      lastUpdate: Date.now(),
      timeout,
    };

    // Track this placeholder message for thread-based context switching
    messageSessionTracker.trackMessage(chatId, messageId, subscription.sessionName);
  }

  // Remove the acknowledgement reaction from a message
  private async removeReactionAck(chatId: number, messageId: number): Promise<void> {
    if (!this.bot || !config.telegramReactionAck) return;

    try {
      await this.bot.api.setMessageReaction(chatId, messageId, []);
    } catch {
      // Ignore reaction removal errors (message may be too old, or reactions not supported)
    }
  }

  // Handle incoming messages from session manager
  private async handleMessage(chatId: number, message: OutgoingWSMessage): Promise<void> {
    if (!this.bot) return;

    const subscription = this.subscriptions.get(chatId);
    if (!subscription) return;

    try {
      switch (message.type) {
        case "user_message":
          // Message from another source (web) - show it in Telegram
          if (message.source !== "telegram") {
            await this.sendWebUserMessage(chatId, message.content);
          }
          break;

        case "assistant_message":
          if (subscription.activeResponse) {
            // We're waiting for a response - accumulate and update
            subscription.activeResponse.content += message.content;

            // Throttle updates (max every 1 second) - plain text during streaming
            const now = Date.now();
            if (now - subscription.activeResponse.lastUpdate > 1000) {
              subscription.activeResponse.lastUpdate = now;
              await this.updateActiveMessage(chatId, subscription.activeResponse.content);
            }
          } else {
            // Message from agent triggered by another source - send as new message
            await this.sendNewMessage(chatId, message.content, true);
          }
          break;

        case "tool_use":
          // Only show tool use indicator if we have an active response with no content
          if (subscription.activeResponse && !subscription.activeResponse.content) {
            const now = Date.now();
            if (now - subscription.activeResponse.lastUpdate > 2000) {
              subscription.activeResponse.lastUpdate = now;
              await this.updateActiveMessage(chatId, `Working... (using ${message.toolName})`);
            }
          }
          break;

        case "result":
          if (subscription.activeResponse && message.success) {
            // Clear timeout
            if (subscription.activeResponse.timeout) {
              clearTimeout(subscription.activeResponse.timeout);
            }

            // Remove the acknowledgement reaction
            await this.removeReactionAck(chatId, subscription.activeResponse.originalMessageId);

            // Final update with markdown formatting
            if (subscription.activeResponse.content) {
              const fullContent = subscription.activeResponse.content;

              // If content fits in one message, just update the placeholder
              if (fullContent.length <= MAX_MESSAGE_LENGTH) {
                await this.updateActiveMessage(chatId, fullContent, true);
              } else {
                // Content is too long - delete placeholder and send as multiple messages
                try {
                  await this.bot!.api.deleteMessage(chatId, subscription.activeResponse.messageId);
                } catch {
                  // Ignore delete errors
                }
                await this.sendNewMessage(chatId, fullContent, true);
              }
            } else {
              await this.updateActiveMessage(chatId, "Done (no text response)");
            }

            subscription.activeResponse = null;
          }
          break;

        case "file_delivery":
          // Handle explicit file delivery from outbox or send-file API
          await this.deliverFileToUser(chatId, message.filePath, message.filename, message.caption);
          break;

        case "error":
          if (subscription.activeResponse) {
            // Clear timeout
            if (subscription.activeResponse.timeout) {
              clearTimeout(subscription.activeResponse.timeout);
            }

            // Remove the acknowledgement reaction
            await this.removeReactionAck(chatId, subscription.activeResponse.originalMessageId);

            await this.updateActiveMessage(chatId, `Error: ${message.error}`);
            subscription.activeResponse = null;
          } else {
            await this.sendNewMessage(chatId, `Error: ${message.error}`);
          }
          break;
      }
    } catch (error) {
      console.error(`Error handling message for Telegram user ${chatId}:`, error);
    }
  }

  // Handle a user message from web, parsing any attachment tags into native Telegram media
  private async sendWebUserMessage(chatId: number, content: string): Promise<void> {
    const match = content.match(ATTACHMENT_PATTERN);

    if (match) {
      const [fullMatch, fileType, webUrl, filename] = match;
      const userText = content.replace(fullMatch, "").trim();

      // Resolve the web URL to a file path on disk
      // webUrl format: /api/media/photos/uuid.jpg → relative: photos/uuid.jpg
      const relativePath = webUrl.replace(/^\/api\/media\//, "");
      const fullPath = validateMediaPath(relativePath, config.mediaPath);

      if (fullPath) {
        // Map the attachment type to DetectedMedia type
        const typeMap: Record<string, DetectedMedia["type"]> = {
          photo: "image",
          video: "video",
          audio: "audio",
          voice: "voice",
          document: "document",
        };

        const media: DetectedMedia = {
          type: typeMap[fileType] || "document",
          path: fullPath,
          filename: filename.trim(),
          relativePath,
          webUrl,
          size: 0,
        };

        // Send a label so the user knows it's from web
        const caption = userText ? `[Web] ${userText}` : "[Web] Sent a file";
        await this.sendNewMessage(chatId, caption);
        await this.sendMediaFile(chatId, media);
      } else {
        // File not found on disk, send as text fallback
        const displayText = userText || `Sent a ${fileType}: ${filename.trim()}`;
        await this.sendNewMessage(chatId, `[Web] ${displayText}`);
      }
    } else {
      // No attachment, send as plain text
      await this.sendNewMessage(chatId, `[Web] ${content}`);
    }
  }

  // Send a new message to the user (splits long messages automatically)
  private async sendNewMessage(chatId: number, content: string, formatted: boolean = false): Promise<void> {
    if (!this.bot) return;

    // Get the subscription to track messages
    const subscription = this.subscriptions.get(chatId);

    // Split long messages into chunks
    const chunks = splitMessage(content);

    // Get reply-to message ID based on current mode (only for first chunk)
    const replyToId = replyModeManager.getReplyToId(chatId);

    // Get link preview options (only enable for last chunk)
    const linkPreviewDisabled = { link_preview_options: { is_disabled: true } };
    const linkPreviewEnabled = config.telegramLinkPreview ? {} : linkPreviewDisabled;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirst = i === 0;
      const isLast = i === chunks.length - 1;

      // Reply-to only on first message
      const replyOptions = isFirst && replyToId ? { reply_to_message_id: replyToId } : {};
      // Link preview only on last message
      const linkPreviewOptions = isLast ? linkPreviewEnabled : linkPreviewDisabled;

      try {
        let sentMessage;
        if (formatted) {
          const { content: formattedContent, parseMode } = convertToTelegramMarkdown(chunk);
          sentMessage = await this.bot.api.sendMessage(chatId, formattedContent, {
            parse_mode: parseMode,
            ...replyOptions,
            ...linkPreviewOptions,
          });
        } else {
          sentMessage = await this.bot.api.sendMessage(chatId, chunk, {
            ...replyOptions,
            ...linkPreviewOptions,
          });
        }

        // Track sent message for thread-based context switching
        if (subscription && sentMessage?.message_id) {
          messageSessionTracker.trackMessage(chatId, sentMessage.message_id, subscription.sessionName);
        }
      } catch (error) {
        // If formatted message fails, retry without formatting
        if (formatted) {
          console.error(`Formatted message failed, retrying plain text:`, error);
          try {
            const sentMessage = await this.bot.api.sendMessage(chatId, chunk, {
              ...replyOptions,
              ...linkPreviewOptions,
            });

            // Track sent message for thread-based context switching
            if (subscription && sentMessage?.message_id) {
              messageSessionTracker.trackMessage(chatId, sentMessage.message_id, subscription.sessionName);
            }
          } catch (retryError) {
            console.error(`Failed to send message to Telegram user ${chatId}:`, retryError);
          }
        } else {
          console.error(`Failed to send message to Telegram user ${chatId}:`, error);
        }
      }
    }
  }

  // Send a media file to the user
  // Note: Uses Buffer instead of file path to work around Bun's FormData/multipart upload issues
  private async sendMediaFile(chatId: number, media: DetectedMedia): Promise<void> {
    if (!this.bot) return;

    try {
      // Read file as Buffer to work around Bun's file streaming issues with HTTPS uploads
      const fileBuffer = fs.readFileSync(media.path);
      const inputFile = new InputFile(fileBuffer, media.filename);

      switch (media.type) {
        case "audio":
          await this.bot.api.sendAudio(chatId, inputFile, {
            title: media.filename,
          });
          break;
        case "voice":
          await this.bot.api.sendVoice(chatId, inputFile);
          break;
        case "video":
          await this.bot.api.sendVideo(chatId, inputFile);
          break;
        case "image":
          await this.bot.api.sendPhoto(chatId, inputFile);
          break;
        case "document":
        default:
          await this.bot.api.sendDocument(chatId, inputFile);
          break;
      }

      console.log(`[Telegram] Sent ${media.type} to ${chatId}: ${media.filename}`);
    } catch (error) {
      console.error(`[Telegram] Failed to send ${media.type} to ${chatId}:`, error);
    }
  }

  // Deliver a file directly to the user (called from file_delivery event)
  // Note: Uses Buffer instead of file path to work around Bun's FormData/multipart upload issues
  // See: https://github.com/oven-sh/bun/issues/10505, https://github.com/oven-sh/bun/issues/21467
  private async deliverFileToUser(chatId: number, filePath: string, filename: string, caption?: string): Promise<void> {
    if (!this.bot) return;

    if (!fs.existsSync(filePath)) {
      console.error(`[Telegram] File not found for delivery: ${filePath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    // Read file as Buffer to work around Bun's file streaming issues with HTTPS uploads
    const fileBuffer = fs.readFileSync(filePath);
    const inputFile = new InputFile(fileBuffer, filename);

    try {
      // Determine file type and send appropriately with optional caption
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
        await this.bot.api.sendPhoto(chatId, inputFile, { caption });
      } else if ([".mp4", ".mov", ".webm", ".avi"].includes(ext)) {
        await this.bot.api.sendVideo(chatId, inputFile, { caption });
      } else if ([".mp3", ".wav", ".m4a", ".aac", ".flac"].includes(ext)) {
        await this.bot.api.sendAudio(chatId, inputFile, { caption, title: filename });
      } else if ([".ogg", ".oga"].includes(ext)) {
        await this.bot.api.sendVoice(chatId, inputFile, { caption });
      } else {
        await this.bot.api.sendDocument(chatId, inputFile, { caption });
      }
      console.log(`[Telegram] Delivered file: ${filename}${caption ? ` with caption` : ""}`);
    } catch (error) {
      console.error(`[Telegram] Failed to deliver file:`, error);
    }
  }

  // Update the active response message (during streaming - may truncate, full content sent on completion)
  private async updateActiveMessage(chatId: number, content: string, formatted: boolean = false): Promise<void> {
    if (!this.bot) return;

    const subscription = this.subscriptions.get(chatId);
    if (!subscription?.activeResponse) return;

    let displayContent = content;
    if (content.length > MAX_MESSAGE_LENGTH) {
      // During streaming, show truncated preview with indicator
      displayContent = content.substring(0, MAX_MESSAGE_LENGTH - 50) + "\n\n... (streaming, full response on completion)";
    }

    try {
      if (formatted) {
        const { content: formattedContent, parseMode } = convertToTelegramMarkdown(displayContent);
        await this.bot.api.editMessageText(
          chatId,
          subscription.activeResponse.messageId,
          formattedContent || "...",
          { parse_mode: parseMode }
        );
      } else {
        await this.bot.api.editMessageText(
          chatId,
          subscription.activeResponse.messageId,
          displayContent || "..."
        );
      }
    } catch (error: any) {
      // Ignore "message not modified" errors
      if (!error.message?.includes("message is not modified")) {
        // If formatted message fails, retry without formatting
        if (formatted) {
          console.error(`Formatted edit failed, retrying plain text:`, error);
          try {
            await this.bot.api.editMessageText(
              chatId,
              subscription.activeResponse.messageId,
              displayContent || "..."
            );
          } catch (retryError: any) {
            if (!retryError.message?.includes("message is not modified")) {
              console.error(`Failed to update message for Telegram user ${chatId}:`, retryError);
            }
          }
        } else {
          console.error(`Failed to update message for Telegram user ${chatId}:`, error);
        }
      }
    }
  }
}

// Singleton instance
export const telegramSubscriptionManager = new TelegramSubscriptionManager();
