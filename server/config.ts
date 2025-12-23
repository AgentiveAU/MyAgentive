import "dotenv/config";

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

export const config = {
  // Server
  port: parseInt(optional("PORT", "3847")),
  nodeEnv: optional("NODE_ENV", "development"),
  domain: optional("DOMAIN", "localhost"),

  // Authentication
  webPassword: required("WEB_PASSWORD"),
  apiKey: required("API_KEY"),

  // Telegram
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  telegramUserId: parseInt(required("TELEGRAM_USER_ID")),
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

  // Database
  databasePath: optional("DATABASE_PATH", "./data/myagentive.db"),

  // Media
  mediaPath: optional("MEDIA_PATH", "./media"),

  // Derived
  isDev: optional("NODE_ENV", "development") === "development",
  isProd: optional("NODE_ENV", "development") === "production",
};

export type Config = typeof config;
