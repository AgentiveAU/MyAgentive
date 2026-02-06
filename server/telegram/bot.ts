import { Bot, Context, session } from "grammy";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { config } from "../config.js";
import { telegramAuthMiddleware } from "../auth/telegram-auth.js";
import { sessionManager } from "../core/session-manager.js";
import { telegramSubscriptionManager } from "./subscription-manager.js";
import { handleCommand } from "./handlers/command-handler.js";
import { handleMessage } from "./handlers/message-handler.js";
import { handleMedia } from "./handlers/media-handler.js";
import { handleSticker } from "./sticker-handler.js";
import { handleLocation, handleVenue } from "./handlers/location-handler.js";
import { updateTracker } from "./update-tracker.js";
import { menuBuilder } from "./inline-menu.js";

// Session data stored per user
interface SessionData {
  currentSessionName: string;
}

// Extend context with session
type MyContext = Context & { session: SessionData };

// Bot instance - created lazily when Telegram is enabled
let bot: Bot<MyContext> | null = null;

// Check if Telegram is enabled
export function isTelegramEnabled(): boolean {
  return config.telegramEnabled;
}

// Get bot instance (for external use like monitoring)
export function getBotInstance(): Bot<MyContext> | null {
  return bot;
}

// Set up bot middleware and handlers
function setupBot(botInstance: Bot<MyContext>): void {
  // Apply API throttler to prevent rate limiting
  // Global: 30 messages/second across all chats
  // Per-chat: 1 message/second per chat (Telegram's limit)
  const throttler = apiThrottler({
    global: {
      reservoir: 30,
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 1000,
    },
    out: {
      reservoir: 1,
      reservoirRefreshAmount: 1,
      reservoirRefreshInterval: 1000,
    },
  });
  botInstance.api.config.use(throttler);

  // Update deduplication middleware - prevents processing same update twice
  botInstance.use(async (ctx, next) => {
    const updateId = ctx.update.update_id;

    if (updateTracker.isDuplicate(updateId)) {
      console.log(`Skipping duplicate update: ${updateId}`);
      return;
    }

    await next();
  });

  // Session middleware
  botInstance.use(
    session({
      initial: (): SessionData => ({
        currentSessionName: "default",
      }),
    })
  );

  // Auth middleware - only allow configured user
  botInstance.use(telegramAuthMiddleware);

  // Command handlers
  botInstance.command("start", async (ctx) => {
    await ctx.reply(
      `Welcome to MyAgentive!

Commands:
/session <name> - Switch to a named session
/new [name] - Create a new session
/list - List all sessions
/status - Show current session
/help - Show this help message

Send any message to chat with the agent.`
    );
  });

  botInstance.command("help", async (ctx) => {
    await ctx.reply(
      `MyAgentive Commands:

📂 Sessions:
/session <name> - Switch to a named session
/new [name] - Create a new session
/list - List all sessions
/status - Show current session info

🤖 Models:
/usage - Show API or subscription usage
/model - Show current model
/model <opus|sonnet|haiku> - Change model

🧠 Context:
/compact [instructions] - Compact context to free space

⚙️ Settings:
/replymode <off|first|all> - Reply threading mode
/menu - Interactive command menu

📎 Media:
Send voice, files, videos, photos, stickers, locations - they're saved and accessible by the agent.

/help - Show this message`
    );
  });

  botInstance.command("session", handleCommand);
  botInstance.command("new", handleCommand);
  botInstance.command("list", handleCommand);
  botInstance.command("status", handleCommand);
  botInstance.command("usage", handleCommand);
  botInstance.command("model", handleCommand);
  botInstance.command("replymode", handleCommand);
  botInstance.command("linkpreview", handleCommand);
  botInstance.command("compact", handleCommand);

  // Menu command - shows inline button menu
  botInstance.command("menu", async (ctx) => {
    const keyboard = menuBuilder.buildMenu(menuBuilder.getDefaultMenuItems(), 0);
    await ctx.reply("Choose an action:", { reply_markup: keyboard });
  });

  // Handle menu button clicks
  botInstance.callbackQuery(/^menu:/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parsed = menuBuilder.parseCallback(data);

    if (!parsed) {
      await ctx.answerCallbackQuery({ text: "Invalid action" });
      return;
    }

    switch (parsed.type) {
      case "page":
        // Navigate to different page
        const keyboard = menuBuilder.buildMenu(
          menuBuilder.getDefaultMenuItems(),
          parsed.page
        );
        await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        break;

      case "cmd":
        // Execute the command
        await ctx.answerCallbackQuery({ text: `Running /${parsed.command}...` });
        // Delete the menu message
        try {
          await ctx.deleteMessage();
        } catch {
          // Ignore if can't delete
        }
        // Send the command as if user typed it
        await ctx.reply(`/${parsed.command}`);
        break;

      case "noop":
        await ctx.answerCallbackQuery();
        break;
    }
  });

  // Media handlers (skip monitoring group)
  botInstance.on("message:voice", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleMedia(ctx);
  });
  botInstance.on("message:audio", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleMedia(ctx);
  });
  botInstance.on("message:document", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleMedia(ctx);
  });
  botInstance.on("message:video", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleMedia(ctx);
  });
  botInstance.on("message:photo", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleMedia(ctx);
  });

  // Sticker handler
  botInstance.on("message:sticker", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleSticker(ctx);
  });

  // Location handlers
  botInstance.on("message:location", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleLocation(ctx);
  });

  botInstance.on("message:venue", async (ctx) => {
    if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
    await handleVenue(ctx);
  });

  // Text message handler (must be last)
  botInstance.on("message:text", async (ctx) => {
    // Skip if it's a command (already handled)
    if (ctx.message.text.startsWith("/")) {
      return;
    }

    // Skip messages from the monitoring group - it's for logging only
    if (ctx.chat?.id === config.telegramMonitoringGroupId) {
      return;
    }

    await handleMessage(ctx);
  });

  // Error handler - catches all errors and prevents bot from crashing
  botInstance.catch((err) => {
    const error = err.error;
    const ctx = err.ctx;

    // Log error details
    console.error(`Telegram bot error in ${ctx?.update?.update_id || 'unknown'}:`);

    // Handle specific error types
    if (error && typeof error === 'object' && 'error_code' in error) {
      const grammyError = error as { error_code: number; description: string; parameters?: { retry_after?: number } };

      if (grammyError.error_code === 429) {
        // Rate limiting - log and wait
        const retryAfter = grammyError.parameters?.retry_after || 30;
        console.warn(`Rate limited by Telegram. Retry after ${retryAfter} seconds.`);
        return; // Don't re-throw, just continue
      }

      if (grammyError.error_code === 403) {
        // Bot blocked or chat not found
        console.warn(`Telegram API 403: ${grammyError.description}`);
        return;
      }

      if (grammyError.error_code === 400) {
        // Bad request - usually formatting issues
        console.warn(`Telegram API 400: ${grammyError.description}`);
        return;
      }

      console.error(`Telegram API error ${grammyError.error_code}: ${grammyError.description}`);
    } else {
      console.error("Unknown bot error:", error);
    }

    // Don't re-throw the error - this would crash the bot
    // The error is logged and the bot continues running
  });
}

// Register bot commands with Telegram's menu
async function registerBotCommands(botInstance: Bot<MyContext>): Promise<void> {
  const commands = [
    { command: "new", description: "Create a new session" },
    { command: "list", description: "List all sessions" },
    { command: "session", description: "Switch to a named session" },
    { command: "status", description: "Show current session info" },
    { command: "menu", description: "Interactive command menu" },
    { command: "model", description: "Show or change AI model" },
    { command: "usage", description: "Show API usage" },
    { command: "compact", description: "Compact context to free space" },
    { command: "replymode", description: "Set reply threading mode" },
    { command: "linkpreview", description: "Toggle link previews" },
    { command: "help", description: "Show help message" },
  ];

  try {
    await botInstance.api.setMyCommands(commands);
    console.log("Telegram bot commands registered");
  } catch (error) {
    console.error("Failed to register bot commands:", error);
  }
}

// Start function
export async function startTelegramBot(): Promise<void> {
  if (!config.telegramEnabled) {
    console.log("Telegram not configured - skipping bot startup");
    return;
  }

  console.log("Starting Telegram bot...");

  // Create and set up bot
  bot = new Bot<MyContext>(config.telegramBotToken);
  setupBot(bot);

  // Set bot instance on subscription manager for persistent subscriptions
  telegramSubscriptionManager.setBot(bot);

  // Register commands with Telegram's menu button
  await registerBotCommands(bot);

  await bot.start({
    onStart: (botInfo) => {
      console.log(`Telegram bot started: @${botInfo.username}`);
    },
  });
}

// Stop function for graceful shutdown
export async function stopTelegramBot(): Promise<void> {
  if (!bot) {
    return; // Nothing to stop
  }
  console.log("Stopping Telegram bot...");
  await bot.stop();
}
