import { Bot } from "grammy";
import { config } from "../config.js";
import { sessionManager } from "../core/session-manager.js";
import type { ActivityEvent } from "../types.js";

// Monitor bot instance - created lazily when Telegram is enabled
let monitorBot: Bot | null = null;

// Get or create monitor bot instance
function getMonitorBot(): Bot | null {
  if (!config.telegramEnabled) {
    return null;
  }
  if (!monitorBot) {
    monitorBot = new Bot(config.telegramBotToken);
  }
  return monitorBot;
}

// Queue for batching messages
let messageQueue: string[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Rate limiting
const MIN_FLUSH_INTERVAL = 2000; // Minimum 2 seconds between messages
let lastFlushTime = 0;

// Format activity event for Telegram
function formatActivity(event: ActivityEvent): string {
  const timestamp = new Date().toLocaleTimeString();
  const sessionLabel = `[${event.sessionName}]`;

  switch (event.type) {
    case "message":
      return `${timestamp} ${sessionLabel} 💬 ${event.summary}`;

    case "tool_use":
      const toolName = event.details?.toolName || "unknown";
      const toolInput = event.details?.toolInput;
      let inputPreview = "";
      if (toolInput) {
        // Format tool input as readable text instead of JSON
        if (typeof toolInput === "object") {
          const entries = Object.entries(toolInput);
          inputPreview = entries
            .map(([key, value]) => {
              const valStr = typeof value === "string" ? value : JSON.stringify(value);
              const truncated = valStr.length > 80 ? valStr.substring(0, 80) + "..." : valStr;
              return `  ${key}: ${truncated}`;
            })
            .join("\n");
        } else {
          inputPreview = String(toolInput);
        }
      }
      return `${timestamp} ${sessionLabel} 🔧 ${toolName}${inputPreview ? "\n" + inputPreview : ""}`;

    case "tool_result":
      return `${timestamp} ${sessionLabel} ✅ Tool completed`;

    case "error":
      return `${timestamp} ${sessionLabel} ❌ Error: ${event.summary}`;

    case "session_switch":
      return `${timestamp} ${sessionLabel} 🔄 Session switch`;

    default:
      return `${timestamp} ${sessionLabel} ${event.summary || "Activity"}`;
  }
}

// Send message to monitoring group
async function flushQueue(): Promise<void> {
  if (messageQueue.length === 0) return;
  if (!config.telegramMonitoringGroupId) {
    messageQueue.length = 0; // Clear queue if no monitoring group
    return;
  }

  const now = Date.now();
  const timeSinceLastFlush = now - lastFlushTime;

  if (timeSinceLastFlush < MIN_FLUSH_INTERVAL) {
    // Schedule flush for later
    if (!flushTimeout) {
      flushTimeout = setTimeout(() => {
        flushTimeout = null;
        flushQueue();
      }, MIN_FLUSH_INTERVAL - timeSinceLastFlush);
    }
    return;
  }

  // Get all queued messages
  const messages = messageQueue.splice(0, messageQueue.length);
  const combined = messages.join("\n\n");

  // Truncate if too long (Telegram limit is 4096)
  const text = combined.length > 4000 ? combined.substring(0, 4000) + "\n..." : combined;

  try {
    const bot = getMonitorBot();
    if (!bot) return;
    await bot.api.sendMessage(config.telegramMonitoringGroupId, text, {
      disable_notification: true,
    });
    lastFlushTime = Date.now();
  } catch (error) {
    console.error("Error sending to monitoring group:", error);
  }
}

// Queue a message for sending
function queueMessage(text: string): void {
  messageQueue.push(text);

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    const now = Date.now();
    const timeSinceLastFlush = now - lastFlushTime;
    const delay = Math.max(0, MIN_FLUSH_INTERVAL - timeSinceLastFlush);

    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      flushQueue();
    }, delay);
  }
}

// Public function to send to monitoring group
export async function sendToMonitoringGroup(text: string): Promise<void> {
  queueMessage(text);
}

// Log activity event
export async function logActivity(event: ActivityEvent): Promise<void> {
  const formatted = formatActivity(event);
  queueMessage(formatted);
}

// Set up activity listener
export function setupActivityMonitoring(): void {
  if (!config.telegramMonitoringGroupId) {
    console.log("Activity monitoring disabled (no monitoring group configured)");
    return;
  }

  sessionManager.on("activity", (event: ActivityEvent) => {
    logActivity(event).catch(console.error);
  });

  console.log("Activity monitoring enabled");
}

// Send startup message
export async function sendStartupMessage(): Promise<void> {
  if (!config.telegramMonitoringGroupId) return;
  const timestamp = new Date().toLocaleString();
  await sendToMonitoringGroup(`🚀 MyAgentive started at ${timestamp}`);
}

// Send shutdown message
export async function sendShutdownMessage(): Promise<void> {
  if (!config.telegramMonitoringGroupId) return;
  const bot = getMonitorBot();
  if (!bot) return;
  const timestamp = new Date().toLocaleString();
  // Flush immediately for shutdown
  await bot.api.sendMessage(
    config.telegramMonitoringGroupId,
    `🛑 MyAgentive stopped at ${timestamp}`,
    { disable_notification: true }
  );
}
