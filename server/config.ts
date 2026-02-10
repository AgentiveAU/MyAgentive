import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Base directory for MyAgentive installation
// Uses MYAGENTIVE_HOME if set, otherwise ~/.myagentive
// NOTE: This is a function to ensure environment variables are read at runtime,
// not at compile time (important for compiled binaries)
function getMyAgentiveHome(): string {
  return process.env.MYAGENTIVE_HOME || path.join(process.env.HOME || "", ".myagentive");
}

/**
 * Load configuration from the correct location.
 * Priority order:
 * 1. ~/.myagentive/config (production config file)
 * 2. .env in current working directory (development fallback)
 *
 * This fixes Issue #108: Previously, `import "dotenv/config"` loaded .env
 * from cwd before we could direct it to the right location.
 */
function loadConfig(): void {
  const myAgentiveHome = getMyAgentiveHome();
  const configPath = path.join(myAgentiveHome, "config");

  if (fs.existsSync(configPath)) {
    // Production: load from ~/.myagentive/config
    dotenv.config({ path: configPath });
    console.log(`Loaded config from: ${configPath}`);
  } else {
    // Development fallback: load from .env in cwd
    dotenv.config();
  }
}

// Load config immediately on module import
loadConfig();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Resolve a path to absolute, relative to MYAGENTIVE_HOME if not already absolute.
 * This ensures paths work correctly regardless of the process's current working directory.
 * Examples:
 *   "./media" -> "/Users/x/.myagentive/media"
 *   "media" -> "/Users/x/.myagentive/media"
 *   "/custom/path" -> "/custom/path" (unchanged)
 */
function resolvePath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  // Strip leading ./ if present, then resolve relative to MYAGENTIVE_HOME
  const cleanPath = rawPath.replace(/^\.\//, "");
  return path.join(getMyAgentiveHome(), cleanPath);
}

export const config = {
  // Server
  port: parseInt(optional("PORT", "3847")),
  nodeEnv: optional("NODE_ENV", "development"),
  domain: optional("DOMAIN", "localhost"),

  // Authentication
  webPassword: required("WEB_PASSWORD"),
  apiKey: required("API_KEY"),

  // Telegram (optional - web-only mode if not configured)
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  // Supports comma-separated user IDs: "507299420" or "507299420,123456789"
  telegramUserIds: (process.env.TELEGRAM_USER_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "" && !isNaN(parseInt(id)))
    .map((id) => parseInt(id)),

  // Helper to check if Telegram is properly configured
  get telegramEnabled(): boolean {
    return !!this.telegramBotToken && this.telegramUserIds.length > 0;
  },
  telegramMonitoringGroupId: process.env.TELEGRAM_MONITORING_GROUP_ID
    ? parseInt(process.env.TELEGRAM_MONITORING_GROUP_ID)
    : null,
  // Comma-separated list of group/channel IDs where bot should process messages
  // Bot only responds when @mentioned in these groups. Empty = no groups allowed.
  telegramAllowedGroups: optional("TELEGRAM_ALLOWED_GROUPS", "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "")
    .map((id) => parseInt(id)),

  // Database - resolve to absolute path for consistent access
  databasePath: resolvePath(optional("DATABASE_PATH", "./data/myagentive.db")),

  // Media - resolve to absolute path so agent can find uploaded files
  mediaPath: resolvePath(optional("MEDIA_PATH", "./media")),

  // Agent identification (shown in web UI to distinguish instances)
  agentId: optional("AGENT_ID", ""),

  // Deepgram (for voice transcription)
  deepgramApiKey: optional("DEEPGRAM_API_KEY", ""),

  // Telegram enhancement features
  telegramReactionAck: optional("TELEGRAM_REACTION_ACK", "true") === "true",
  telegramFragmentBufferMs: parseInt(optional("TELEGRAM_FRAGMENT_BUFFER_MS", "500")),
  telegramLinkPreview: optional("TELEGRAM_LINK_PREVIEW", "true") === "true",

  // Group policy: "open" | "allowlist" | "disabled"
  telegramGroupPolicy: optional("TELEGRAM_GROUP_POLICY", "allowlist") as
    | "open"
    | "allowlist"
    | "disabled",
  // Per-group policies (JSON): '{"123456789": "open", "-987654321": "disabled"}'
  telegramGroupPolicies: (() => {
    const raw = optional("TELEGRAM_GROUP_POLICIES", "{}");
    try {
      return JSON.parse(raw) as Record<string, "open" | "allowlist" | "disabled">;
    } catch {
      return {};
    }
  })(),

  // Derived
  isDev: optional("NODE_ENV", "development") === "development",
  isProd: optional("NODE_ENV", "development") === "production",
};

export type Config = typeof config;
