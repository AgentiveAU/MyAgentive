import type { Context } from "grammy";
import { sessionManager } from "../../core/session-manager.js";
import { telegramSubscriptionManager } from "../subscription-manager.js";
import { getCurrentModel, setCurrentModel } from "../../core/ai-client.js";
import { replyModeManager, parseReplyMode } from "../reply-mode.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

export async function handleCommand(ctx: MyContext): Promise<void> {
  const text = ctx.message?.text || "";
  const parts = text.split(" ");
  const command = parts[0].replace("/", "").replace("@myagentive_bot", "");
  const args = parts.slice(1);

  switch (command) {
    case "session":
      await handleSessionCommand(ctx, args);
      break;
    case "new":
      await handleNewCommand(ctx, args);
      break;
    case "list":
      await handleListCommand(ctx);
      break;
    case "status":
      await handleStatusCommand(ctx);
      break;
    case "usage":
      await handleUsageCommand(ctx);
      break;
    case "model":
      await handleModelCommand(ctx, args);
      break;
    case "replymode":
      await handleReplyModeCommand(ctx, args);
      break;
    case "linkpreview":
      await handleLinkPreviewCommand(ctx, args);
      break;
    default:
      await ctx.reply(`Unknown command: ${command}`);
  }
}

async function handleSessionCommand(ctx: MyContext, args: string[]): Promise<void> {
  if (args.length === 0) {
    await ctx.reply(
      "Usage: /session <name>\n\nExample: /session my-project\n\nUse /list to see available sessions."
    );
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const sessionName = args[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");

  // Update session in context
  ctx.session.currentSessionName = sessionName;

  // Get or create the session
  sessionManager.getOrCreateSession(sessionName, "telegram");

  // Subscribe to the session for persistent updates
  telegramSubscriptionManager.subscribe(chatId, sessionName);

  await ctx.reply(`Switched to session: ${sessionName}\n\nYou'll now see messages from web and Telegram in real-time.`);
}

async function handleNewCommand(ctx: MyContext, args: string[]): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  let sessionName: string;

  if (args.length > 0) {
    sessionName = args[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");
  } else {
    // Generate random name
    const adjectives = ["quick", "bright", "calm", "bold", "swift", "keen"];
    const nouns = ["fox", "owl", "hawk", "wolf", "bear", "lion"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    sessionName = `${adj}-${noun}-${num}`;
  }

  // Create the session
  sessionManager.getOrCreateSession(sessionName, "telegram");

  // Update context
  ctx.session.currentSessionName = sessionName;

  // Subscribe to the session for persistent updates
  telegramSubscriptionManager.subscribe(chatId, sessionName);

  await ctx.reply(`Created and switched to new session: ${sessionName}\n\nYou'll now see messages from web and Telegram in real-time.`);
}

async function handleListCommand(ctx: MyContext): Promise<void> {
  const sessions = sessionManager.listSessions();

  if (sessions.length === 0) {
    await ctx.reply("No sessions yet. Send a message to create one, or use /new <name>");
    return;
  }

  const current = ctx.session.currentSessionName;
  const lines = sessions.map((s) => {
    const indicator = s.name === current ? " ← current" : "";
    const title = s.title ? ` (${s.title.substring(0, 30)}...)` : "";
    return `• ${s.name}${title}${indicator}`;
  });

  await ctx.reply(`Sessions:\n\n${lines.join("\n")}\n\nUse /session <name> to switch.`);
}

async function handleStatusCommand(ctx: MyContext): Promise<void> {
  const current = ctx.session.currentSessionName;
  const sessions = sessionManager.listSessions();
  const session = sessions.find((s) => s.name === current);

  if (session) {
    const title = session.title || "(no title)";
    const created = new Date(session.createdAt).toLocaleString();
    const updated = new Date(session.updatedAt).toLocaleString();

    await ctx.reply(
      `Current session: ${session.name}\nTitle: ${title}\nCreated: ${created}\nLast updated: ${updated}`
    );
  } else {
    await ctx.reply(
      `Current session: ${current}\n(Session will be created when you send a message)`
    );
  }
}

async function handleUsageCommand(ctx: MyContext): Promise<void> {
  // Get current model info
  const model = getCurrentModel();
  const sessions = sessionManager.listSessions();

  await ctx.reply(
    `📊 **MyAgentive Status**

🤖 Current model: **${model}**
📂 Active sessions: ${sessions.length}

_Using Claude Code subscription._
_For detailed usage, check claude.ai account settings._`
  , { parse_mode: "Markdown" });
}

async function handleModelCommand(ctx: MyContext, args: string[]): Promise<void> {
  const currentModel = getCurrentModel();

  if (args.length === 0) {
    // Show current model
    await ctx.reply(
      `🤖 Current model: **${currentModel}**

To change: /model <opus|sonnet|haiku>

Note: New sessions will use the new model. Existing sessions keep their model.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const model = args[0].toLowerCase() as "opus" | "sonnet" | "haiku";
  const validModels = ["opus", "sonnet", "haiku"];

  if (!validModels.includes(model)) {
    await ctx.reply(`Invalid model. Choose one of: ${validModels.join(", ")}`);
    return;
  }

  if (model === currentModel) {
    await ctx.reply(`Already using **${model}**`, { parse_mode: "Markdown" });
    return;
  }

  setCurrentModel(model);

  await ctx.reply(
    `🤖 Model changed to **${model}**

New sessions will use ${model}. Use /new to start a fresh session with this model.`,
    { parse_mode: "Markdown" }
  );
}

async function handleReplyModeCommand(ctx: MyContext, args: string[]): Promise<void> {
  const currentMode = replyModeManager.getMode();

  if (args.length === 0) {
    // Show current mode
    await ctx.reply(
      `🔗 Reply mode: **${currentMode}**

Modes:
• **off** - No reply threading
• **first** - Reply to first message only
• **all** - Reply to each message

Usage: /replymode <off|first|all>`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const newMode = parseReplyMode(args[0]);

  if (!newMode) {
    await ctx.reply(`Invalid mode. Choose one of: off, first, all`);
    return;
  }

  if (newMode === currentMode) {
    await ctx.reply(`Reply mode is already **${currentMode}**`, { parse_mode: "Markdown" });
    return;
  }

  replyModeManager.setMode(newMode);
  await ctx.reply(`🔗 Reply mode changed to **${newMode}**`, { parse_mode: "Markdown" });
}

async function handleLinkPreviewCommand(ctx: MyContext, args: string[]): Promise<void> {
  // This is a simple toggle - actual implementation would need config persistence
  // For now, just show status message
  await ctx.reply(
    `🔗 Link preview settings

Link preview in responses is controlled by the TELEGRAM_LINK_PREVIEW environment variable.

Current setting: check your .env file`
  );
}
